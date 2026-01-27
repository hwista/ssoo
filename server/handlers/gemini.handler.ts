/**
 * Gemini Handler - Gemini AI 관련 작업을 담당하는 핸들러
 * Route: /api/gemini
 * 
 * 질문 기반 파일 검색 + Gemini AI 답변 생성
 */

import fs from 'fs/promises';
import path from 'path';

const WIKI_DIR = path.join(process.cwd(), 'docs', 'wiki');
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// ============================================================================
// Types
// ============================================================================

export interface SearchResult {
  file: string;
  snippet: string;
  score: number;
  hits: string[];
}

export type HandlerResult<T = unknown> = 
  | { success: true; data: T }
  | { success: false; error: string; status: number };

// ============================================================================
// State Management
// ============================================================================

// 간단한 인메모리 캐시 (서버 재시작 시 초기화 됨)
let markdownIndex: { file: string; content: string }[] | null = null;

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * 재귀적으로 마크다운 파일 수집
 */
async function collectMarkdownFiles(dir: string): Promise<{ file: string; content: string }[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: { file: string; content: string }[] = [];
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const rel = path.relative(WIKI_DIR, fullPath).replace(/\\/g, '/');
        results.push({ file: rel, content });
      } catch { /* ignore */ }
    }
  }
  return results;
}

/**
 * 텍스트 토큰화
 */
function tokenize(text: string): string[] {
  const raw = text.toLowerCase().match(/[\w\u3131-\uD79D]+/g) || [];
  const filtered = raw.filter(t => t.length > 1 && !/^\d+$/.test(t));
  return Array.from(new Set(filtered)).slice(0, 30);
}

/**
 * 컨텐츠 점수 계산
 */
function scoreContent(content: string, tokens: string[]): { score: number; hits: string[] } {
  const lower = content.toLowerCase();
  let score = 0;
  const hits: string[] = [];
  
  for (const token of tokens) {
    if (lower.includes(token)) {
      hits.push(token);
      score += 1 + Math.min(token.length / 5, 2);
    }
  }
  return { score, hits };
}

/**
 * 스니펫 추출
 */
function extractSnippet(content: string, tokens: string[]): string {
  const lower = content.toLowerCase();
  let idx = -1;
  let tok = '';
  
  for (const t of tokens) {
    idx = lower.indexOf(t);
    if (idx !== -1) { tok = t; break; }
  }
  
  if (idx === -1) return content.slice(0, 300) + (content.length > 300 ? '...' : '');
  
  const radius = 180;
  const start = Math.max(0, idx - radius);
  const end = Math.min(content.length, idx + tok.length + radius);
  let snippet = content.slice(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  return snippet;
}

/**
 * 재귀적으로 파일을 찾는 헬퍼 함수
 */
async function findFileRecursive(directory: string, fileName: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        const found = await findFileRecursive(fullPath, fileName);
        if (found) return found;
      } else if (entry.isFile() && entry.name.toLowerCase() === fileName.toLowerCase()) {
        return fullPath;
      }
    }
  } catch {
    // 디렉터리 읽기 오류 무시
  }
  return null;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Gemini AI로 질문 처리
 */
export async function askGemini(
  question: string,
  apiKey: string
): Promise<HandlerResult<{
  answer: string;
  matchedFiles: string[];
}>> {
  if (!question || typeof question !== 'string' || !question.trim()) {
    return { success: false, error: '질문이 비어있거나 올바르지 않습니다.', status: 400 };
  }

  // 질문에서 .md 파일명 추출
  const mdFileRegex = /([\w\u3131-\uD79D\-.]+\.md)/g;
  const matches = question.match(mdFileRegex);
  let fileContents = '';
  let searchedResults: SearchResult[] = [];

  if (matches && matches.length > 0) {
    // 파일명이 명시된 경우 해당 파일 읽기
    for (const fileName of matches) {
      const filePath = await findFileRecursive(WIKI_DIR, fileName);

      try {
        if (!filePath) {
          throw new Error('File not found');
        }
        const content = await fs.readFile(filePath, 'utf-8');
        fileContents += `\n[${fileName}]\n${content}\n`;
      } catch {
        fileContents += `\n[${fileName}]\n(파일을 찾을 수 없습니다)\n`;
      }
    }
  } else {
    // 인덱스 없으면 로드
    if (!markdownIndex) {
      try {
        markdownIndex = await collectMarkdownFiles(WIKI_DIR);
      } catch {
        markdownIndex = [];
      }
    }
    
    const tokens = tokenize(question);
    if (tokens.length > 0) {
      for (const md of markdownIndex) {
        const { score, hits } = scoreContent(md.content, tokens);
        if (score > 0) {
          searchedResults.push({ file: md.file, snippet: extractSnippet(md.content, hits), score, hits });
        }
      }
      searchedResults.sort((a, b) => b.score - a.score);
      searchedResults = searchedResults.slice(0, 5);
    }
  }

  // 프롬프트 구성
  let promptText = question;
  if (fileContents) {
    promptText = `다음은 참고할 .md 파일 전체 내용입니다.\n${fileContents}\n위 내용을 바탕으로 질문에 답변하세요. 답변에는 사용한 파일명을 명시하십시오.\n질문: ${question}`;
  } else if (searchedResults.length > 0) {
    const contextBlocks = searchedResults.map(r => 
      `파일: ${r.file}\n매칭 토큰: ${r.hits.join(', ')}\n내용 발췌:\n${r.snippet}`
    ).join('\n\n---\n\n');
    promptText = `다음은 질문과 연관된 .md 파일들의 발췌입니다. 각 파일을 근거로 정확하고 요약된 답변을 주세요. 반드시 관련된 파일명을 답변에 포함하고, 불확실한 부분은 명시하세요.\n\n${contextBlocks}\n\n질문: ${question}`;
  } else {
    promptText = `다음 질문에 답변하세요. 관련 .md 파일에서 직접적인 매칭을 찾지 못했습니다. 일반적 지식이나 추론을 활용하되, 로컬 파일 근거는 없음을 명시하십시오.\n질문: ${question}`;
  }

  try {
    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });
    
    const data = await geminiRes.json();
    console.log('Gemini API response:', JSON.stringify(data));
    
    if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return {
        success: true,
        data: {
          answer: data.candidates[0].content.parts[0].text,
          matchedFiles: fileContents ? (matches || []) : searchedResults.map(r => r.file)
        }
      };
    }
    
    if (data?.error?.message) {
      return { success: false, error: 'Gemini API 오류: ' + data.error.message, status: 500 };
    }
    
    return { 
      success: false, 
      error: '답변을 가져올 수 없습니다. (API 응답: ' + JSON.stringify(data) + ')', 
      status: 500 
    };
  } catch (err) {
    const errorMsg = typeof err === 'object' && err !== null && 'message' in err 
      ? (err as { message: string }).message 
      : String(err);
    return { success: false, error: 'Gemini API 오류: ' + errorMsg, status: 500 };
  }
}

/**
 * 마크다운 인덱스 초기화 (캐시 리셋)
 */
export function resetMarkdownIndex(): void {
  markdownIndex = null;
}
