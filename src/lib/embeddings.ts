import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API 클라이언트 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// 임베딩 모델 (text-embedding-004 사용)
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

export interface EmbeddingResult {
  text: string;
  embedding: number[];
}

// 단일 텍스트 임베딩 생성
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('임베딩 생성 오류:', error);
    throw new Error('임베딩 생성에 실패했습니다');
  }
}

// 여러 텍스트 배치 임베딩 생성
export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  try {
    const results: EmbeddingResult[] = [];

    // Gemini API는 배치 처리를 직접 지원하지 않으므로 순차 처리
    // 속도 개선을 위해 병렬 처리 (5개씩)
    const batchSize = 5;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const embeddings = await Promise.all(
        batch.map(async (text) => {
          const embedding = await generateEmbedding(text);
          return { text, embedding };
        })
      );
      results.push(...embeddings);
    }

    return results;
  } catch (error) {
    console.error('배치 임베딩 생성 오류:', error);
    throw new Error('배치 임베딩 생성에 실패했습니다');
  }
}

// 임베딩 차원 수 (text-embedding-004는 768 차원)
export const EMBEDDING_DIMENSION = 768;
