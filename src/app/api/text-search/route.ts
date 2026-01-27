import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';

const WIKI_DIR = path.join(process.cwd(), 'docs/wiki');

interface SearchResult {
  filePath: string;
  fileName: string;
  matches: {
    line: number;
    content: string;
    highlight: string;
  }[];
  totalMatches: number;
}

// 파일 내용에서 검색어 찾기
function searchInContent(content: string, query: string, caseSensitive: boolean = false): SearchResult['matches'] {
  const lines = content.split('\n');
  const matches: SearchResult['matches'] = [];
  const searchQuery = caseSensitive ? query : query.toLowerCase();

  lines.forEach((line, index) => {
    const searchLine = caseSensitive ? line : line.toLowerCase();
    if (searchLine.includes(searchQuery)) {
      // 하이라이트 생성 (검색어 부분을 **로 감싸기)
      const regex = new RegExp(`(${escapeRegex(query)})`, caseSensitive ? 'g' : 'gi');
      const highlight = line.replace(regex, '**$1**');

      matches.push({
        line: index + 1,
        content: line.trim(),
        highlight: highlight.trim()
      });
    }
  });

  return matches;
}

// 정규식 특수문자 이스케이프
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 디렉토리 재귀 탐색
async function searchFiles(
  dir: string,
  query: string,
  caseSensitive: boolean,
  results: SearchResult[]
): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await searchFiles(fullPath, query, caseSensitive, results);
    } else if (entry.name.endsWith('.md')) {
      try {
        const content = await readFile(fullPath, 'utf-8');
        const matches = searchInContent(content, query, caseSensitive);

        if (matches.length > 0) {
          const relativePath = path.relative(WIKI_DIR, fullPath).replace(/\\/g, '/');
          results.push({
            filePath: relativePath,
            fileName: entry.name,
            matches: matches.slice(0, 10), // 파일당 최대 10개 매치만 반환
            totalMatches: matches.length
          });
        }
      } catch (error) {
        console.error(`파일 읽기 오류: ${fullPath}`, error);
      }
    }
  }
}

// 텍스트 검색 API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const caseSensitive = searchParams.get('caseSensitive') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: '검색어는 2자 이상이어야 합니다' },
        { status: 400 }
      );
    }

    const results: SearchResult[] = [];
    await searchFiles(WIKI_DIR, query.trim(), caseSensitive, results);

    // 매치 수가 많은 순으로 정렬
    results.sort((a, b) => b.totalMatches - a.totalMatches);

    // 전체 매치 수 계산
    const totalMatches = results.reduce((sum, r) => sum + r.totalMatches, 0);

    return NextResponse.json({
      success: true,
      query,
      results: results.slice(0, limit),
      totalFiles: results.length,
      totalMatches,
      caseSensitive
    });

  } catch (error) {
    console.error('텍스트 검색 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '검색 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
