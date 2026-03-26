import { extname } from 'node:path';
import { logger } from '@/lib/utils/errorUtils';
import {
  MAX_EXTRACTED_TEXT_LENGTH,
  MAX_EXTRACTED_IMAGES,
  MAX_EXTRACTED_IMAGE_SIZE,
  EXTRACTABLE_IMAGE_MIMES,
  PDF_MAX_RENDER_PAGES,
  PDF_RENDER_SCALE,
} from '@/lib/constants/file';
import { configService } from '@/server/services/config/ConfigService';

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

// ── 런타임 설정값 헬퍼 (ConfigService → file.ts 폴백) ────

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

/**
 * 파일 Buffer에서 텍스트와 이미지를 추출한다.
 * 바이너리 형식(pdf, docx, pptx, xlsx)은 서버사이드 파서로 처리하고,
 * 텍스트 형식은 UTF-8로 직접 변환한다.
 */
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
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('텍스트 추출 실패', { fileName, ext, error: msg });
    return { text: '', images: [] };
  }
}

// ── 설정 타입 ────────────────────────────────────────

interface ExtractionCfg {
  maxTextLength: number;
  maxImages: number;
  maxImageSize: number;
  pdfMaxRenderPages: number;
  pdfRenderScale: number;
}

// ── 공통: ZIP 기반 Office 문서 이미지 추출 ─────────────

interface ZipEntry { entryName: string; getData: () => Buffer }

function extractImagesFromZip(buffer: Buffer, mediaPrefix: string, cfg: ExtractionCfg): ExtractedImage[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(buffer);
  const entries: ZipEntry[] = zip.getEntries();
  const images: ExtractedImage[] = [];

  const mediaEntries = entries
    .filter((e) => e.entryName.startsWith(mediaPrefix))
    .sort((a, b) => a.entryName.localeCompare(b.entryName));

  for (const entry of mediaEntries) {
    if (images.length >= cfg.maxImages) break;

    const ext = extname(entry.entryName).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const mimeType = mimeMap[ext];
    if (!mimeType || !EXTRACTABLE_IMAGE_MIMES.has(mimeType)) continue;

    const data = entry.getData();
    if (data.length > cfg.maxImageSize) continue;

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

// ── PDF (unpdf + @napi-rs/canvas) ────────────────────

let pdfjsModuleDefined = false;

async function ensurePdfJsModule() {
  if (pdfjsModuleDefined) return;

  // Node.js 환경에서 pdfjs-dist가 필요로 하는 브라우저 API를 @napi-rs/canvas에서 폴리필
  const canvas = await import('@napi-rs/canvas');
  if (!globalThis.DOMMatrix) globalThis.DOMMatrix = canvas.DOMMatrix as unknown as typeof DOMMatrix;
  if (!globalThis.DOMPoint) globalThis.DOMPoint = canvas.DOMPoint as unknown as typeof DOMPoint;
  if (!globalThis.Path2D) globalThis.Path2D = canvas.Path2D as unknown as typeof Path2D;
  if (!globalThis.ImageData) globalThis.ImageData = canvas.ImageData as unknown as typeof ImageData;

  const { definePDFJSModule } = await import('unpdf');
  // Node.js에서는 legacy 빌드 사용 (DOMMatrix 등 완전 폴리필 불필요)
  await definePDFJSModule(() => import('pdfjs-dist/legacy/build/pdf.mjs'));
  pdfjsModuleDefined = true;
}

async function extractPdf(buffer: Buffer, cfg: ExtractionCfg): Promise<ExtractionResult> {
  await ensurePdfJsModule();

  const { getDocumentProxy, extractText, renderPageAsImage } = await import('unpdf');

  const uint8 = new Uint8Array(buffer);
  const pdf = await getDocumentProxy(uint8);

  // 텍스트 추출 (PDF 내부 텍스트 스트림에서 직접 파싱)
  const { text: rawText } = await extractText(pdf, { mergePages: true });
  const text = (typeof rawText === 'string' ? rawText : '').slice(0, cfg.maxTextLength);

  // 페이지 이미지 렌더링 (차트, 다이어그램 등 시각 요소 포착)
  const images: ExtractedImage[] = [];
  const maxPages = Math.min(pdf.numPages, cfg.pdfMaxRenderPages, cfg.maxImages);

  for (let i = 1; i <= maxPages; i++) {
    try {
      const pngArrayBuffer = await renderPageAsImage(pdf, i, {
        canvasImport: () => import('@napi-rs/canvas'),
        scale: cfg.pdfRenderScale,
      });
      const buf = Buffer.from(pngArrayBuffer);

      if (buf.length <= cfg.maxImageSize) {
        images.push({
          base64: buf.toString('base64'),
          mimeType: 'image/png',
          name: `page-${i}.png`,
          size: buf.length,
        });
      }
    } catch (pageError) {
      logger.warn(`PDF 페이지 ${i} 렌더링 실패`, {
        error: pageError instanceof Error ? pageError.message : String(pageError),
      });
    }
  }

  return { text, images };
}

// ── DOCX ─────────────────────────────────────────────

async function extractDocx(buffer: Buffer, cfg: ExtractionCfg): Promise<ExtractionResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require('mammoth') as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };
  const result = await mammoth.extractRawText({ buffer });
  const text = (result.value ?? '').slice(0, cfg.maxTextLength);
  const images = extractImagesFromZip(buffer, 'word/media/', cfg);
  return { text, images };
}

// ── XLSX ─────────────────────────────────────────────

function extractXlsxText(buffer: Buffer, cfg: ExtractionCfg): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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

// ── PPTX ─────────────────────────────────────────────

function extractPptxText(buffer: Buffer, cfg: ExtractionCfg): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(buffer);
  const entries: ZipEntry[] = zip.getEntries();

  const slideEntries = entries
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName))
    .sort((a, b) => {
      const numA = parseInt(a.entryName.match(/slide(\d+)/)?.[1] ?? '0', 10);
      const numB = parseInt(b.entryName.match(/slide(\d+)/)?.[1] ?? '0', 10);
      return numA - numB;
    });

  const parts: string[] = [];

  for (const entry of slideEntries) {
    const xml = entry.getData().toString('utf-8');
    const texts: string[] = [];
    const regex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xml)) !== null) {
      const text = match[1].trim();
      if (text) texts.push(text);
    }
    if (texts.length > 0) {
      const slideNum = entry.entryName.match(/slide(\d+)/)?.[1] ?? '?';
      parts.push(`[슬라이드 ${slideNum}]\n${texts.join(' ')}`);
    }
  }

  return parts.join('\n\n').slice(0, cfg.maxTextLength);
}
