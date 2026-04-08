import { extname } from 'node:path';
import { configService } from '../runtime/dms-config.service.js';
import { createDmsLogger } from '../runtime/dms-logger.js';
import {
  MAX_EXTRACTED_TEXT_LENGTH,
  MAX_EXTRACTED_IMAGES,
  MAX_EXTRACTED_IMAGE_SIZE,
  EXTRACTABLE_IMAGE_MIMES,
  PDF_MAX_RENDER_PAGES,
  PDF_RENDER_SCALE,
} from './file.constants.js';

const logger = createDmsLogger('DmsTextExtractor');

export interface ExtractedImage {
  base64: string;
  mimeType: string;
  name: string;
  size: number;
}

export interface ExtractionResult {
  text: string;
  images: ExtractedImage[];
}

function getExtractionConfig() {
  try {
    const cfg = configService.getConfig().extraction;
    if (cfg) {
      return {
        maxTextLength: cfg.maxTextLength ?? MAX_EXTRACTED_TEXT_LENGTH,
        maxImages: cfg.maxImages ?? MAX_EXTRACTED_IMAGES,
        maxImageSize: (cfg.maxImageSizeMb ?? 1) * 1024 * 1024,
        pdfMaxRenderPages: cfg.pdfMaxRenderPages ?? PDF_MAX_RENDER_PAGES,
        pdfRenderScale: cfg.pdfRenderScale ?? PDF_RENDER_SCALE,
      };
    }
  } catch {
    // ConfigService 미초기화 시 폴백
  }

  return {
    maxTextLength: MAX_EXTRACTED_TEXT_LENGTH,
    maxImages: MAX_EXTRACTED_IMAGES,
    maxImageSize: MAX_EXTRACTED_IMAGE_SIZE,
    pdfMaxRenderPages: PDF_MAX_RENDER_PAGES,
    pdfRenderScale: PDF_RENDER_SCALE,
  };
}

export async function extractTextFromFile(
  buffer: Buffer,
  fileName: string,
): Promise<ExtractionResult> {
  const ext = extname(fileName).toLowerCase();
  const cfg = getExtractionConfig();

  try {
    switch (ext) {
      case '.pdf':
        return await extractPdf(buffer, cfg);
      case '.doc':
      case '.docx':
        return await extractDocx(buffer, cfg);
      case '.ppt':
      case '.pptx':
        return extractOfficeZip(buffer, 'ppt/media/', extractPptxText, cfg);
      case '.xls':
      case '.xlsx':
        return extractOfficeZip(buffer, 'xl/media/', extractXlsxText, cfg);
      case '.txt':
      case '.md':
      case '.json':
      case '.csv':
      case '.xml':
      case '.yaml':
      case '.yml':
      case '.log':
      case '.html':
      case '.htm':
        return { text: buffer.toString('utf-8').slice(0, cfg.maxTextLength), images: [] };
      default:
        return { text: '', images: [] };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('텍스트 추출 실패', undefined, { fileName, ext, error: message });
    return { text: '', images: [] };
  }
}

interface ExtractionCfg {
  maxTextLength: number;
  maxImages: number;
  maxImageSize: number;
  pdfMaxRenderPages: number;
  pdfRenderScale: number;
}

interface ZipEntry {
  entryName: string;
  getData: () => Buffer;
}

interface PdfRuntimeGlobals {
  DOMMatrix?: unknown;
  DOMPoint?: unknown;
  Path2D?: unknown;
  ImageData?: unknown;
}

function extractImagesFromZip(buffer: Buffer, mediaPrefix: string, cfg: ExtractionCfg): ExtractedImage[] {
   
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(buffer);
  const entries: ZipEntry[] = zip.getEntries();
  const images: ExtractedImage[] = [];

  const mediaEntries = entries
    .filter((entry) => entry.entryName.startsWith(mediaPrefix))
    .sort((left, right) => left.entryName.localeCompare(right.entryName));

  for (const entry of mediaEntries) {
    if (images.length >= cfg.maxImages) {
      break;
    }

    const ext = extname(entry.entryName).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const mimeType = mimeMap[ext];
    if (!mimeType || !EXTRACTABLE_IMAGE_MIMES.has(mimeType)) {
      continue;
    }

    const data = entry.getData();
    if (data.length > cfg.maxImageSize) {
      continue;
    }

    images.push({
      base64: data.toString('base64'),
      mimeType,
      name: entry.entryName.split('/').pop() ?? entry.entryName,
      size: data.length,
    });
  }

  return images;
}

function extractOfficeZip(
  buffer: Buffer,
  mediaPrefix: string,
  textFn: (buffer: Buffer, cfg: ExtractionCfg) => string,
  cfg: ExtractionCfg,
): ExtractionResult {
  return {
    text: textFn(buffer, cfg),
    images: extractImagesFromZip(buffer, mediaPrefix, cfg),
  };
}

let pdfjsModuleDefined = false;

async function ensurePdfJsModule() {
  if (pdfjsModuleDefined) {
    return;
  }

  const runtimeGlobals = globalThis as typeof globalThis & PdfRuntimeGlobals;
  const canvas = await import('@napi-rs/canvas');
  if (!runtimeGlobals.DOMMatrix) runtimeGlobals.DOMMatrix = canvas.DOMMatrix;
  if (!runtimeGlobals.DOMPoint) runtimeGlobals.DOMPoint = canvas.DOMPoint;
  if (!runtimeGlobals.Path2D) runtimeGlobals.Path2D = canvas.Path2D;
  if (!runtimeGlobals.ImageData) runtimeGlobals.ImageData = canvas.ImageData;

  const { definePDFJSModule } = await import('unpdf');
  await definePDFJSModule(() => import('pdfjs-dist/legacy/build/pdf.mjs'));
  pdfjsModuleDefined = true;
}

async function extractPdf(buffer: Buffer, cfg: ExtractionCfg): Promise<ExtractionResult> {
  await ensurePdfJsModule();

  const { getDocumentProxy, extractText, renderPageAsImage } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buffer));

  const { text: rawText } = await extractText(pdf, { mergePages: true });
  const text = (typeof rawText === 'string' ? rawText : '').slice(0, cfg.maxTextLength);

  const images: ExtractedImage[] = [];
  const maxPages = Math.min(pdf.numPages, cfg.pdfMaxRenderPages, cfg.maxImages);
  for (let index = 1; index <= maxPages; index += 1) {
    try {
      const pngArrayBuffer = await renderPageAsImage(pdf, index, {
        canvasImport: () => import('@napi-rs/canvas'),
        scale: cfg.pdfRenderScale,
      });
      const imageBuffer = Buffer.from(pngArrayBuffer);
      if (imageBuffer.length <= cfg.maxImageSize) {
        images.push({
          base64: imageBuffer.toString('base64'),
          mimeType: 'image/png',
          name: `page-${index}.png`,
          size: imageBuffer.length,
        });
      }
    } catch (pageError) {
      logger.warn(`PDF 페이지 ${index} 렌더링 실패`, {
        error: pageError instanceof Error ? pageError.message : String(pageError),
      });
    }
  }

  return { text, images };
}

async function extractDocx(buffer: Buffer, cfg: ExtractionCfg): Promise<ExtractionResult> {
   
  const mammoth = require('mammoth') as {
    extractRawText: (options: { buffer: Buffer }) => Promise<{ value: string }>;
  };
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: (result.value ?? '').slice(0, cfg.maxTextLength),
    images: extractImagesFromZip(buffer, 'word/media/', cfg),
  };
}

function extractXlsxText(buffer: Buffer, cfg: ExtractionCfg): string {
   
  const XLSX = require('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const parts: string[] = [];

  for (const sheetName of workbook.SheetNames as string[]) {
    const csv: string = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
    if (csv.trim()) {
      parts.push(`[${sheetName}]\n${csv}`);
    }
  }

  return parts.join('\n---\n').slice(0, cfg.maxTextLength);
}

function extractPptxText(buffer: Buffer, cfg: ExtractionCfg): string {
   
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(buffer);
  const entries: ZipEntry[] = zip.getEntries();

  const slideEntries = entries
    .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/i.test(entry.entryName))
    .sort((left, right) => {
      const leftValue = parseInt(left.entryName.match(/slide(\d+)/)?.[1] ?? '0', 10);
      const rightValue = parseInt(right.entryName.match(/slide(\d+)/)?.[1] ?? '0', 10);
      return leftValue - rightValue;
    });

  const parts: string[] = [];
  for (const entry of slideEntries) {
    const xml = entry.getData().toString('utf-8');
    const texts: string[] = [];
    const regex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
    let match: RegExpExecArray | null;
    match = regex.exec(xml);
    while (match !== null) {
      const value = match[1].trim();
      if (value) {
        texts.push(value);
      }
      match = regex.exec(xml);
    }

    if (texts.length > 0) {
      const slideNumber = entry.entryName.match(/slide(\d+)/)?.[1] ?? '?';
      parts.push(`[슬라이드 ${slideNumber}]\n${texts.join(' ')}`);
    }
  }

  return parts.join('\n\n').slice(0, cfg.maxTextLength);
}
