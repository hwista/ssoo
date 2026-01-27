import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { indexDocuments } from '@/lib/vectorStore';

const UPLOAD_DIR = path.join(process.cwd(), 'docs/wiki/uploads');
const DATA_DIR = path.join(process.cwd(), 'data');

// 업로드 디렉토리 생성
async function ensureDirectories() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

// 파일명 정규화 (한글, 공백 처리)
function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename);
  const name = path.basename(filename, ext);
  const sanitized = name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100);
  return `${Date.now()}_${sanitized}${ext}`;
}

// 텍스트를 청크로 분할 (검색용)
function splitTextToChunks(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?。！？]\s*/);

  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // overlap 처리: 이전 청크의 마지막 부분 포함
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.floor(overlap / 5)).join(' ');
      currentChunk = overlapWords + ' ' + sentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export async function POST(request: NextRequest) {
  try {
    await ensureDirectories();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 });
    }

    // 파일 타입 검증 (마크다운 파일만 허용)
    const allowedExtensions = ['.md', '.markdown', '.txt'];
    const fileExt = path.extname(file.name).toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
      return NextResponse.json({
        error: '마크다운 파일(.md, .markdown) 또는 텍스트 파일(.txt)만 업로드 가능합니다'
      }, { status: 400 });
    }

    // 파일 크기 제한 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다' }, { status: 400 });
    }

    // 파일 내용 읽기
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = buffer.toString('utf-8');

    // 파일 저장 (원본 확장자를 .md로 통일)
    const sanitizedName = sanitizeFilename(file.name).replace(/\.(txt|markdown)$/, '.md');
    const filePath = path.join(UPLOAD_DIR, sanitizedName);
    await writeFile(filePath, text);

    // 텍스트 청크 분할
    const chunks = splitTextToChunks(text);

    // 메타데이터 저장
    const metadata = {
      id: Date.now().toString(),
      originalName: file.name,
      savedName: sanitizedName,
      filePath: filePath,
      fileSize: file.size,
      mimeType: file.type || 'text/markdown',
      textLength: text.length,
      chunksCount: chunks.length,
      uploadedAt: new Date().toISOString()
    };

    // 추출된 텍스트와 청크를 JSON으로 저장
    const dataPath = path.join(DATA_DIR, `${metadata.id}.json`);
    await writeFile(dataPath, JSON.stringify({
      ...metadata,
      fullText: text,
      chunks: chunks.map((chunk, index) => ({
        id: `${metadata.id}_${index}`,
        content: chunk,
        index
      }))
    }, null, 2));

    // 벡터 인덱싱 (선택적 - API 키가 있을 때만)
    let indexed = false;
    if (process.env.GEMINI_API_KEY) {
      try {
        const relativePath = path.relative(process.cwd(), filePath);
        const documents = chunks.map((chunk, index) => ({
          content: chunk,
          filePath: relativePath,
          fileName: sanitizedName,
          chunkIndex: index,
          createdAt: new Date().toISOString()
        }));
        await indexDocuments(documents);
        indexed = true;
      } catch (indexError) {
        console.error('벡터 인덱싱 실패 (업로드는 성공):', indexError);
      }
    }

    return NextResponse.json({
      success: true,
      message: indexed ? '마크다운 업로드 및 인덱싱 완료' : '마크다운 업로드 완료',
      data: {
        id: metadata.id,
        originalName: file.name,
        savedName: sanitizedName,
        textLength: text.length,
        chunksCount: chunks.length,
        mdFile: sanitizedName,
        indexed
      }
    });

  } catch (error) {
    console.error('업로드 처리 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '업로드 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 업로드된 파일 목록 조회
export async function GET() {
  try {
    await ensureDirectories();

    const files = await readdir(DATA_DIR);

    const uploads = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async (f) => {
          const content = await readFile(path.join(DATA_DIR, f), 'utf-8');
          const data = JSON.parse(content);
          return {
            id: data.id,
            originalName: data.originalName,
            savedName: data.savedName,
            textLength: data.textLength,
            chunksCount: data.chunksCount,
            uploadedAt: data.uploadedAt
          };
        })
    );

    return NextResponse.json({
      success: true,
      data: uploads.sort((a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )
    });

  } catch (error) {
    console.error('파일 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '파일 목록 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
