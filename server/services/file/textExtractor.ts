import { extname } from 'node:path';
import { logger } from '@/lib/utils/errorUtils';
import {
  MAX_EXTRACTED_TEXT_LENGTH,
  MAX_EXTRACTED_IMAGES,
  MAX_EXTRACTED_IMAGE_SIZE,
  EXTRACTABLE_IMAGE_MIMES,
} from '@/lib/constants/file';

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

  try {
    switch (ext) {
      case '.pdf':
        return await extractPdf(buffer);
      case '.doc':
      case '.docx':
        return await extractDocx(buffer);
      case '.ppt':
      case '.pptx':
        return extractOfficeZip(buffer, 'ppt/media/', extractPptxText);
      case '.xls':
      case '.xlsx':
        return extractOfficeZip(buffer, 'xl/media/', extractXlsxText);
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
        return { text: buffer.toString('utf-8').slice(0, MAX_EXTRACTED_TEXT_LENGTH), images: [] };
      default:
        return { text: '', images: [] };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('텍스트 추출 실패', { fileName, ext, error: msg });
    return { text: '', images: [] };
  }
}

// ── 공통: ZIP 기반 Office 문서 이미지 추출 ─────────────

interface ZipEntry { entryName: string; getData: () => Buffer }

function extractImagesFromZip(buffer: Buffer, mediaPrefix: string): ExtractedImage[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(buffer);
  const entries: ZipEntry[] = zip.getEntries();
  const images: ExtractedImage[] = [];

  const mediaEntries = entries
    .filter((e) => e.entryName.startsWith(mediaPrefix))
    .sort((a, b) => a.entryName.localeCompare(b.entryName));

  for (const entry of mediaEntries) {
    if (images.length >= MAX_EXTRACTED_IMAGES) break;

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
    if (data.length > MAX_EXTRACTED_IMAGE_SIZE) continue;

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
  textFn: (buffer: Buffer) => string,
): ExtractionResult {
  return {
    text: textFn(buffer),
    images: extractImagesFromZip(buffer, mediaPrefix),
  };
}

// ── PDF ──────────────────────────────────────────────

async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
  const result = await pdfParse(buffer);
  const text = (result.text ?? '').slice(0, MAX_EXTRACTED_TEXT_LENGTH);

  // PDF 이미지 추출: pdfjs-dist의 저수준 API로 XObject 이미지를 추출할 수 있으나
  // Node.js에서 canvas 없이는 디코딩이 제한적. 텍스트만 추출하고 이미지는 빈 배열.
  return { text, images: [] };
}

// ── DOCX ─────────────────────────────────────────────

async function extractDocx(buffer: Buffer): Promise<ExtractionResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require('mammoth') as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };
  const result = await mammoth.extractRawText({ buffer });
  const text = (result.value ?? '').slice(0, MAX_EXTRACTED_TEXT_LENGTH);
  const images = extractImagesFromZip(buffer, 'word/media/');
  return { text, images };
}

// ── XLSX ─────────────────────────────────────────────

function extractXlsxText(buffer: Buffer): string {
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
  return parts.join('\n---\n').slice(0, MAX_EXTRACTED_TEXT_LENGTH);
}

// ── PPTX ─────────────────────────────────────────────

function extractPptxText(buffer: Buffer): string {
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

  return parts.join('\n\n').slice(0, MAX_EXTRACTED_TEXT_LENGTH);
}
