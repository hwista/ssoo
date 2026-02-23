/**
 * 임베딩 서비스
 * 문서 텍스트 → 벡터 임베딩 생성 및 pgvector 저장
 */

import { embedMany, embed } from 'ai';
import { getEmbeddingModel } from './provider';
import { getPool } from '../db';
import { logger, PerformanceTimer } from '@/lib/utils/errorUtils';

/**
 * 텍스트를 청크로 분할
 * 간단한 단락 기반 분할 (향후 개선 가능)
 */
export function chunkText(text: string, maxChunkSize = 1000, overlap = 200): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // 오버랩: 마지막 overlap 글자를 다음 청크에 포함
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + '\n\n' + trimmed;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text.trim()];
}

/**
 * 단일 쿼리의 임베딩 벡터 생성
 */
export async function embedQuery(query: string): Promise<number[]> {
  const model = await getEmbeddingModel();
  const { embedding } = await embed({ model, value: query });
  return embedding;
}

/**
 * 여러 텍스트의 임베딩 벡터 일괄 생성
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const model = await getEmbeddingModel();
  const { embeddings } = await embedMany({ model, values: texts });
  return embeddings;
}

/**
 * 문서 임베딩을 DB에 저장 (upsert)
 */
export async function upsertDocumentEmbeddings(
  filePath: string,
  title: string,
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<number> {
  const timer = new PerformanceTimer('임베딩 저장');
  const pool = getPool();

  try {
    const chunks = chunkText(content);
    const vectors = await embedTexts(chunks);

    // 기존 임베딩 삭제 (파일 재인덱싱)
    await pool.query(
      'DELETE FROM dms_document_embeddings WHERE file_path = $1',
      [filePath]
    );

    // 청크별 임베딩 삽입
    for (let i = 0; i < chunks.length; i++) {
      const vectorStr = `[${vectors[i].join(',')}]`;
      await pool.query(
        `INSERT INTO dms_document_embeddings 
         (file_path, chunk_index, chunk_text, title, embedding, metadata)
         VALUES ($1, $2, $3, $4, $5::vector, $6)
         ON CONFLICT (file_path, chunk_index) 
         DO UPDATE SET chunk_text = $3, title = $4, embedding = $5::vector, 
                       metadata = $6, updated_at = NOW()`,
        [filePath, i, chunks[i], title, vectorStr, JSON.stringify(metadata)]
      );
    }

    logger.info('임베딩 저장 완료', { filePath, chunks: chunks.length });
    timer.end({ filePath, chunks: chunks.length });
    return chunks.length;
  } catch (error) {
    logger.error('임베딩 저장 실패', error, { filePath });
    timer.end({ filePath, error: true });
    throw error;
  }
}

/**
 * pgvector 코사인 유사도 검색
 */
export async function searchSimilarDocuments(
  queryEmbedding: number[],
  limit = 5,
  threshold = 0.7
): Promise<Array<{
  filePath: string;
  chunkIndex: number;
  chunkText: string;
  title: string;
  similarity: number;
  metadata: Record<string, unknown>;
}>> {
  const pool = getPool();
  const vectorStr = `[${queryEmbedding.join(',')}]`;

  const result = await pool.query(
    `SELECT 
       file_path, chunk_index, chunk_text, title, metadata,
       1 - (embedding <=> $1::vector) as similarity
     FROM dms_document_embeddings
     WHERE 1 - (embedding <=> $1::vector) > $2
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [vectorStr, threshold, limit]
  );

  return result.rows.map((row) => ({
    filePath: row.file_path,
    chunkIndex: row.chunk_index,
    chunkText: row.chunk_text,
    title: row.title || '',
    similarity: parseFloat(row.similarity),
    metadata: row.metadata || {},
  }));
}

/**
 * 특정 문서의 임베딩 삭제
 */
export async function deleteDocumentEmbeddings(filePath: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    'DELETE FROM dms_document_embeddings WHERE file_path = $1',
    [filePath]
  );
}

/**
 * 임베딩 통계 조회
 */
export async function getEmbeddingStats(): Promise<{
  totalDocuments: number;
  totalChunks: number;
}> {
  const pool = getPool();
  const result = await pool.query(`
    SELECT 
      COUNT(DISTINCT file_path) as total_documents,
      COUNT(*) as total_chunks
    FROM dms_document_embeddings
  `);
  return {
    totalDocuments: parseInt(result.rows[0]?.total_documents || '0'),
    totalChunks: parseInt(result.rows[0]?.total_chunks || '0'),
  };
}
