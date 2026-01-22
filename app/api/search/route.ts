import { NextRequest, NextResponse } from 'next/server';
import { searchSimilar, getDocumentCount } from '@/lib/vectorStore';

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 5 } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: '검색어가 필요합니다' },
        { status: 400 }
      );
    }

    // 벡터 유사도 검색
    const results = await searchSimilar(query, limit);

    return NextResponse.json({
      success: true,
      query,
      results: results.map(r => ({
        id: r.document.id,
        content: r.document.content,
        fileName: r.document.fileName,
        filePath: r.document.filePath,
        chunkIndex: r.document.chunkIndex,
        score: r.score
      })),
      totalResults: results.length
    });

  } catch (error) {
    console.error('검색 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '검색 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 인덱스 상태 조회
export async function GET() {
  try {
    const count = await getDocumentCount();

    return NextResponse.json({
      success: true,
      indexedDocuments: count,
      status: count > 0 ? 'ready' : 'empty'
    });

  } catch (error) {
    console.error('인덱스 상태 조회 오류:', error);
    return NextResponse.json(
      { error: '인덱스 상태 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
