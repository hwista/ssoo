import { extname } from 'node:path';
import { logger } from '@/lib/utils/errorUtils';

const MAX_TEXT_LENGTH = 12000;

/**
 * 파일 Buffer에서 텍스트를 추출한다.
 * 바이너리 형식(pdf, docx, pptx, xlsx)은 서버사이드 파서로 처리하고,
 * 텍스트 형식은 UTF-8로 직접 변환한다.
 */
export async function extractTextFromFile(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
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
        return extractPptx(buffer);
      case '.xls':
      case '.xlsx':
        return extractXlsx(buffer);
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
        return buffer.toString('utf-8').slice(0, MAX_TEXT_LENGTH);
      default:
        return '';
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('텍스트 추출 실패', { fileName, ext, error: msg });
    return '';
  }
}

// ── PDF ──────────────────────────────────────────────

async function extractPdf(buffer: Buffer): Promise<string> {
  // pdf-parse는 named export가 아닌 모듈 자체가 함수
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
  const result = await pdfParse(buffer);
  return (result.text ?? '').slice(0, MAX_TEXT_LENGTH);
}

// ── DOCX ─────────────────────────────────────────────

async function extractDocx(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require('mammoth') as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };
  const result = await mammoth.extractRawText({
    buffer,
  });
  return (result.value ?? '').slice(0, MAX_TEXT_LENGTH);
}

// ── XLSX ─────────────────────────────────────────────

function extractXlsx(buffer: Buffer): string {
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
  return parts.join('\n---\n').slice(0, MAX_TEXT_LENGTH);
}

// ── PPTX ─────────────────────────────────────────────
// pptx는 ZIP(XML) 구조. ppt/slides/slide*.xml 내 <a:t> 태그에서 텍스트 추출.

function extractPptx(buffer: Buffer): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  // 슬라이드 파일만 필터 (slide1.xml, slide2.xml, ...)
  const slideEntries = entries
    .filter((e: { entryName: string }) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName))
    .sort((a: { entryName: string }, b: { entryName: string }) => {
      const numA = parseInt(a.entryName.match(/slide(\d+)/)?.[1] ?? '0', 10);
      const numB = parseInt(b.entryName.match(/slide(\d+)/)?.[1] ?? '0', 10);
      return numA - numB;
    });

  const parts: string[] = [];

  for (const entry of slideEntries) {
    const xml = (entry as { getData: () => Buffer }).getData().toString('utf-8');
    // <a:t> 태그 내부 텍스트 추출
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

  return parts.join('\n\n').slice(0, MAX_TEXT_LENGTH);
}
