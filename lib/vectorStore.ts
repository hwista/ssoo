import * as lancedb from '@lancedb/lancedb';
import path from 'path';
import { generateEmbedding, generateEmbeddings, EMBEDDING_DIMENSION } from './embeddings';

// LanceDB 데이터베이스 경로
const DB_PATH = path.join(process.cwd(), 'vectordb');
const TABLE_NAME = 'documents';

// 문서 인터페이스
export interface Document {
  id: string;
  content: string;
  filePath: string;
  fileName: string;
  chunkIndex: number;
  createdAt: string;
}

// 벡터 포함 문서 인터페이스 (LanceDB Record 호환)
export interface VectorDocument {
  id: string;
  content: string;
  filePath: string;
  fileName: string;
  chunkIndex: number;
  createdAt: string;
  vector: number[];
  [key: string]: string | number | number[];
}

// 검색 결과 인터페이스
export interface SearchResult {
  document: Document;
  score: number;
}

// 데이터베이스 연결
let db: lancedb.Connection | null = null;

async function getDatabase(): Promise<lancedb.Connection> {
  if (!db) {
    db = await lancedb.connect(DB_PATH);
  }
  return db;
}

// 테이블 가져오기 또는 생성
async function getOrCreateTable(): Promise<lancedb.Table> {
  const database = await getDatabase();
  const tableNames = await database.tableNames();

  if (tableNames.includes(TABLE_NAME)) {
    return database.openTable(TABLE_NAME);
  }

  // 빈 테이블 생성 (스키마 정의)
  const emptyData: VectorDocument[] = [];
  return database.createTable(TABLE_NAME, emptyData, {
    mode: 'overwrite'
  });
}

// 입력 문서 인터페이스
interface InputDocument {
  content: string;
  filePath: string;
  fileName: string;
  chunkIndex: number;
  createdAt: string;
}

// 문서 인덱싱 (벡터 생성 및 저장)
export async function indexDocuments(documents: InputDocument[]): Promise<void> {
  try {
    const database = await getDatabase();

    // 임베딩 생성
    const contents: string[] = documents.map(doc => doc.content);
    const embeddings = await generateEmbeddings(contents);

    // 벡터 문서 생성
    const vectorDocs: VectorDocument[] = documents.map((doc, index) => ({
      id: `${doc.filePath}_${doc.chunkIndex}_${Date.now()}`,
      content: doc.content,
      filePath: doc.filePath,
      fileName: doc.fileName,
      chunkIndex: doc.chunkIndex,
      createdAt: doc.createdAt,
      vector: embeddings[index].embedding
    }));

    // 테이블에 추가
    const tableNames = await database.tableNames();

    if (tableNames.includes(TABLE_NAME)) {
      const table = await database.openTable(TABLE_NAME);
      await table.add(vectorDocs);
    } else {
      await database.createTable(TABLE_NAME, vectorDocs);
    }

    console.log(`${vectorDocs.length}개 문서 인덱싱 완료`);
  } catch (error) {
    console.error('문서 인덱싱 오류:', error);
    throw new Error('문서 인덱싱에 실패했습니다');
  }
}

// 유사도 검색
export async function searchSimilar(query: string, limit: number = 5): Promise<SearchResult[]> {
  try {
    const database = await getDatabase();
    const tableNames = await database.tableNames();

    if (!tableNames.includes(TABLE_NAME)) {
      return [];
    }

    const table = await database.openTable(TABLE_NAME);

    // 쿼리 임베딩 생성
    const queryEmbedding = await generateEmbedding(query);

    // 유사도 검색
    const results = await table
      .vectorSearch(queryEmbedding)
      .limit(limit)
      .toArray();

    return results.map((result: Record<string, unknown>) => ({
      document: {
        id: result.id as string,
        content: result.content as string,
        filePath: result.filePath as string,
        fileName: result.fileName as string,
        chunkIndex: result.chunkIndex as number,
        createdAt: result.createdAt as string
      },
      score: result._distance as number
    }));
  } catch (error) {
    console.error('유사도 검색 오류:', error);
    throw new Error('검색에 실패했습니다');
  }
}

// 파일별 문서 삭제
export async function deleteDocumentsByFile(filePath: string): Promise<void> {
  try {
    const database = await getDatabase();
    const tableNames = await database.tableNames();

    if (!tableNames.includes(TABLE_NAME)) {
      return;
    }

    const table = await database.openTable(TABLE_NAME);
    await table.delete(`filePath = '${filePath}'`);

    console.log(`파일 ${filePath}의 문서 삭제 완료`);
  } catch (error) {
    console.error('문서 삭제 오류:', error);
    throw new Error('문서 삭제에 실패했습니다');
  }
}

// 전체 문서 수 조회
export async function getDocumentCount(): Promise<number> {
  try {
    const database = await getDatabase();
    const tableNames = await database.tableNames();

    if (!tableNames.includes(TABLE_NAME)) {
      return 0;
    }

    const table = await database.openTable(TABLE_NAME);
    return await table.countRows();
  } catch (error) {
    console.error('문서 수 조회 오류:', error);
    return 0;
  }
}

// 모든 문서 조회
export async function getAllDocuments(): Promise<Document[]> {
  try {
    const database = await getDatabase();
    const tableNames = await database.tableNames();

    if (!tableNames.includes(TABLE_NAME)) {
      return [];
    }

    const table = await database.openTable(TABLE_NAME);
    const results = await table.query().toArray();

    return results.map((result: Record<string, unknown>) => ({
      id: result.id as string,
      content: result.content as string,
      filePath: result.filePath as string,
      fileName: result.fileName as string,
      chunkIndex: result.chunkIndex as number,
      createdAt: result.createdAt as string
    }));
  } catch (error) {
    console.error('문서 조회 오류:', error);
    return [];
  }
}
