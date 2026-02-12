/**
 * PostgreSQL 연결 클라이언트 (pgvector)
 * DMS 독립 DB 연결 - 임베딩 저장 및 시맨틱 검색용
 */

import { Pool } from 'pg';
import { logger } from '@/lib/utils/errorUtils';

let pool: Pool | null = null;

/**
 * PostgreSQL 연결 풀 인스턴스 (싱글톤)
 */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DMS_DATABASE_URL;
    if (!connectionString) {
      throw new Error('DMS_DATABASE_URL 환경변수가 설정되지 않았습니다.');
    }

    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      logger.error('PostgreSQL pool 에러', err);
    });
  }
  return pool;
}

/**
 * pgvector 확장 및 테이블 초기화
 * 앱 시작 시 1회 실행
 */
export async function initDatabase(): Promise<void> {
  const db = getPool();
  try {
    // pgvector 확장 활성화
    await db.query('CREATE EXTENSION IF NOT EXISTS vector');

    // 문서 임베딩 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS dms_document_embeddings (
        id SERIAL PRIMARY KEY,
        file_path TEXT NOT NULL,
        chunk_index INTEGER NOT NULL DEFAULT 0,
        chunk_text TEXT NOT NULL,
        title TEXT,
        embedding vector(1536),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(file_path, chunk_index)
      )
    `);

    // 벡터 검색 인덱스 (IVFFlat)
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_dms_embeddings_vector 
      ON dms_document_embeddings 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `).catch(() => {
      // 데이터가 적을 때 IVFFlat 인덱스 생성 실패 가능 - 무시
      logger.info('IVFFlat 인덱스 생성 스킵 (데이터 부족 가능)');
    });

    logger.info('DMS 데이터베이스 초기화 완료');
  } catch (error) {
    logger.error('DMS 데이터베이스 초기화 실패', error);
    throw error;
  }
}

/**
 * 연결 풀 종료
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
