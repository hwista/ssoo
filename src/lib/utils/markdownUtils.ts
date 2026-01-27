/**
 * 마크다운 유틸리티 함수들
 * 
 * Phase 2.1.5 Step 2에서 추가된 유틸리티 확장
 * 마크다운 처리, 변환, 검증을 위한 독립적인 유틸리티 함수들
 */

/**
 * 마크다운 토큰 타입
 */
export type MarkdownTokenType = 
  | 'heading' 
  | 'paragraph' 
  | 'code_block' 
  | 'inline_code' 
  | 'link' 
  | 'image' 
  | 'list' 
  | 'blockquote' 
  | 'table' 
  | 'horizontal_rule'
  | 'bold'
  | 'italic'
  | 'strikethrough';

/**
 * 마크다운 토큰 인터페이스
 */
export interface MarkdownToken {
  type: MarkdownTokenType;
  content: string;
  level?: number; // 헤딩 레벨
  language?: string; // 코드 블록 언어
  href?: string; // 링크 URL
  alt?: string; // 이미지 alt 텍스트
  title?: string; // 링크/이미지 제목
  start?: number; // 시작 위치
  end?: number; // 끝 위치
}

/**
 * 마크다운 구문 패턴
 */
export const MARKDOWN_PATTERNS = {
  heading: /^(#{1,6})\s+(.+)$/gm,
  codeBlock: /```(\w*)\n([\s\S]*?)```/g,
  inlineCode: /`([^`]+)`/g,
  link: /\[([^\]]+)\]\(([^)]+)(?:\s+"([^"]*)")?\)/g,
  image: /!\[([^\]]*)\]\(([^)]+)(?:\s+"([^"]*)")?\)/g,
  bold: /\*\*([^*]+)\*\*/g,
  italic: /\*([^*]+)\*/g,
  strikethrough: /~~([^~]+)~~/g,
  blockquote: /^>\s+(.+)$/gm,
  unorderedList: /^[-*+]\s+(.+)$/gm,
  orderedList: /^\d+\.\s+(.+)$/gm,
  horizontalRule: /^[-*_]{3,}$/gm,
  table: /^\|(.+)\|$/gm,
  frontMatter: /^---\n([\s\S]*?)\n---\n/
} as const;

/**
 * 마크다운 콘텐츠를 토큰으로 파싱
 */
export function tokenizeMarkdown(content: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = [];

  // 프론트 매터 제거
  const contentWithoutFrontMatter = removeFrontMatter(content);
  
  // 각 패턴별로 토큰 추출
  extractHeadings(contentWithoutFrontMatter, tokens);
  extractCodeBlocks(contentWithoutFrontMatter, tokens);
  extractLinks(contentWithoutFrontMatter, tokens);
  extractImages(contentWithoutFrontMatter, tokens);
  extractInlineFormatting(contentWithoutFrontMatter, tokens);

  // 위치 순으로 정렬
  return tokens.sort((a, b) => (a.start || 0) - (b.start || 0));
}

/**
 * 헤딩 추출
 */
export function extractHeadings(content: string, tokens: MarkdownToken[] = []): MarkdownToken[] {
  const headingRegex = MARKDOWN_PATTERNS.heading;
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    tokens.push({
      type: 'heading',
      content: match[2],
      level: match[1].length,
      start: match.index,
      end: match.index + match[0].length
    });
  }

  return tokens;
}

/**
 * 코드 블록 추출
 */
export function extractCodeBlocks(content: string, tokens: MarkdownToken[] = []): MarkdownToken[] {
  const codeBlockRegex = MARKDOWN_PATTERNS.codeBlock;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    tokens.push({
      type: 'code_block',
      content: match[2],
      language: match[1] || 'text',
      start: match.index,
      end: match.index + match[0].length
    });
  }

  return tokens;
}

/**
 * 링크 추출
 */
export function extractLinks(content: string, tokens: MarkdownToken[] = []): MarkdownToken[] {
  const linkRegex = MARKDOWN_PATTERNS.link;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    tokens.push({
      type: 'link',
      content: match[1],
      href: match[2],
      title: match[3],
      start: match.index,
      end: match.index + match[0].length
    });
  }

  return tokens;
}

/**
 * 이미지 추출
 */
export function extractImages(content: string, tokens: MarkdownToken[] = []): MarkdownToken[] {
  const imageRegex = MARKDOWN_PATTERNS.image;
  let match;

  while ((match = imageRegex.exec(content)) !== null) {
    tokens.push({
      type: 'image',
      content: match[2], // src
      alt: match[1],
      title: match[3],
      start: match.index,
      end: match.index + match[0].length
    });
  }

  return tokens;
}

/**
 * 인라인 포맷팅 추출 (볼드, 이탤릭, 취소선)
 */
export function extractInlineFormatting(content: string, tokens: MarkdownToken[] = []): MarkdownToken[] {
  // 볼드 추출
  const boldRegex = MARKDOWN_PATTERNS.bold;
  let match;

  while ((match = boldRegex.exec(content)) !== null) {
    tokens.push({
      type: 'bold',
      content: match[1],
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // 이탤릭 추출
  const italicRegex = MARKDOWN_PATTERNS.italic;
  while ((match = italicRegex.exec(content)) !== null) {
    tokens.push({
      type: 'italic',
      content: match[1],
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // 취소선 추출
  const strikethroughRegex = MARKDOWN_PATTERNS.strikethrough;
  while ((match = strikethroughRegex.exec(content)) !== null) {
    tokens.push({
      type: 'strikethrough',
      content: match[1],
      start: match.index,
      end: match.index + match[0].length
    });
  }

  return tokens;
}

/**
 * 프론트 매터 제거
 */
export function removeFrontMatter(content: string): string {
  return content.replace(MARKDOWN_PATTERNS.frontMatter, '');
}

/**
 * 프론트 매터 추출
 */
export function extractFrontMatter(content: string): { content: string; frontMatter: string | null } {
  const match = content.match(MARKDOWN_PATTERNS.frontMatter);
  
  if (match) {
    return {
      content: content.substring(match[0].length),
      frontMatter: match[1]
    };
  }

  return {
    content,
    frontMatter: null
  };
}

/**
 * 목차 생성
 */
export function generateTableOfContents(content: string): Array<{
  text: string;
  level: number;
  anchor: string;
  id: string;
}> {
  const headings = extractHeadings(content);
  
  return headings.map((heading, index) => ({
    text: heading.content,
    level: heading.level || 1,
    anchor: generateAnchor(heading.content),
    id: `heading-${index}`
  }));
}

/**
 * 앵커 링크 생성
 */
export function generateAnchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣-]/g, '') // 특수문자 제거 (한글 보존)
    .replace(/\s+/g, '-') // 공백을 하이픈으로
    .replace(/-+/g, '-') // 연속 하이픈 제거
    .replace(/^-|-$/g, ''); // 시작/끝 하이픈 제거
}

/**
 * 마크다운을 플레인 텍스트로 변환
 */
export function markdownToPlainText(content: string): string {
  let text = content;

  // 프론트 매터 제거
  text = removeFrontMatter(text);

  // 코드 블록 제거
  text = text.replace(MARKDOWN_PATTERNS.codeBlock, '');

  // 인라인 코드 제거
  text = text.replace(MARKDOWN_PATTERNS.inlineCode, '$1');

  // 링크를 텍스트로 변환
  text = text.replace(MARKDOWN_PATTERNS.link, '$1');

  // 이미지를 alt 텍스트로 변환
  text = text.replace(MARKDOWN_PATTERNS.image, '$1');

  // 헤딩 마커 제거
  text = text.replace(MARKDOWN_PATTERNS.heading, '$2');

  // 포맷팅 마커 제거
  text = text.replace(MARKDOWN_PATTERNS.bold, '$1');
  text = text.replace(MARKDOWN_PATTERNS.italic, '$1');
  text = text.replace(MARKDOWN_PATTERNS.strikethrough, '$1');

  // 블록쿼트 마커 제거
  text = text.replace(MARKDOWN_PATTERNS.blockquote, '$1');

  // 리스트 마커 제거
  text = text.replace(MARKDOWN_PATTERNS.unorderedList, '$1');
  text = text.replace(MARKDOWN_PATTERNS.orderedList, '$1');

  // 수평선 제거
  text = text.replace(MARKDOWN_PATTERNS.horizontalRule, '');

  // 여러 줄바꿈을 하나로
  text = text.replace(/\n{3,}/g, '\n\n');

  // 앞뒤 공백 제거
  return text.trim();
}

/**
 * 마크다운 통계 계산
 */
export function calculateMarkdownStats(content: string): {
  wordCount: number;
  charCount: number;
  lineCount: number;
  paragraphCount: number;
  headingCount: number;
  codeBlockCount: number;
  linkCount: number;
  imageCount: number;
  readingTime: number; // 분
} {
  const plainText = markdownToPlainText(content);
  const tokens = tokenizeMarkdown(content);

  const stats = {
    wordCount: countWords(plainText),
    charCount: plainText.length,
    lineCount: content.split('\n').length,
    paragraphCount: plainText.split(/\n\s*\n/).filter(p => p.trim().length > 0).length,
    headingCount: tokens.filter(t => t.type === 'heading').length,
    codeBlockCount: tokens.filter(t => t.type === 'code_block').length,
    linkCount: tokens.filter(t => t.type === 'link').length,
    imageCount: tokens.filter(t => t.type === 'image').length,
    readingTime: 0
  };

  // 읽기 시간 계산 (분당 200단어 기준)
  stats.readingTime = Math.ceil(stats.wordCount / 200);

  return stats;
}

/**
 * 단어 수 계산
 */
export function countWords(text: string): number {
  return text
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length;
}

/**
 * 마크다운 링크 검증
 */
export function validateMarkdownLinks(content: string): Array<{
  text: string;
  href: string;
  isValid: boolean;
  type: 'internal' | 'external' | 'anchor' | 'email';
  line?: number;
}> {
  const links = extractLinks(content);
  const lines = content.split('\n');
  
  return links.map(link => {
    // 링크가 있는 라인 찾기
    let line = 0;
    let position = 0;
    for (let i = 0; i < lines.length; i++) {
      if (position + lines[i].length >= (link.start || 0)) {
        line = i + 1;
        break;
      }
      position += lines[i].length + 1; // +1 for newline
    }

    return {
      text: link.content,
      href: link.href || '',
      isValid: isValidUrl(link.href || ''),
      type: getLinkType(link.href || ''),
      line
    };
  });
}

/**
 * URL 유효성 검사
 */
export function isValidUrl(url: string): boolean {
  // 앵커 링크
  if (url.startsWith('#')) return true;
  
  // 이메일
  if (url.startsWith('mailto:')) {
    const email = url.substring(7);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // HTTP/HTTPS URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // 상대 경로
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return true;
  }

  // 파일 확장자가 있는 상대 경로
  if (/\.\w+$/.test(url)) {
    return true;
  }

  return false;
}

/**
 * 링크 타입 결정
 */
export function getLinkType(url: string): 'internal' | 'external' | 'anchor' | 'email' {
  if (url.startsWith('#')) return 'anchor';
  if (url.startsWith('mailto:')) return 'email';
  if (url.startsWith('http://') || url.startsWith('https://')) return 'external';
  return 'internal';
}

/**
 * 마크다운 헤딩 구조 검증
 */
export function validateHeadingStructure(content: string): Array<{
  line: number;
  level: number;
  text: string;
  issue?: string;
}> {
  const headings = extractHeadings(content);
  const lines = content.split('\n');
  const result: Array<{
    line: number;
    level: number;
    text: string;
    issue?: string;
  }> = [];

  let currentPos = 0;
  let prevLevel = 0;

  for (const heading of headings) {
    // 라인 번호 찾기
    let line = 0;
    let tempPos = 0;
    for (let i = 0; i < lines.length; i++) {
      if (tempPos + lines[i].length >= (heading.start || 0)) {
        line = i + 1;
        break;
      }
      tempPos += lines[i].length + 1;
    }

    const level = heading.level || 1;
    let issue: string | undefined;

    // 헤딩 레벨 검증
    if (prevLevel > 0 && level > prevLevel + 1) {
      issue = `헤딩 레벨이 너무 많이 증가했습니다 (이전: h${prevLevel}, 현재: h${level})`;
    }

    // 빈 헤딩 검증
    if (!heading.content.trim()) {
      issue = '빈 헤딩입니다';
    }

    result.push({
      line,
      level,
      text: heading.content,
      issue
    });

    prevLevel = level;
  }

  return result;
}

/**
 * 마크다운 포맷팅 정리
 */
export function cleanupMarkdown(content: string): string {
  let cleaned = content;

  // 여러 개의 연속된 빈 줄을 두 개로 제한
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

  // 헤딩 앞뒤 빈 줄 정리
  cleaned = cleaned.replace(/(\n#{1,6}\s+.*)\n{3,}/g, '$1\n\n');
  cleaned = cleaned.replace(/\n{3,}(#{1,6}\s+.*)/g, '\n\n$1');

  // 코드 블록 앞뒤 빈 줄 정리
  cleaned = cleaned.replace(/(\n```[\s\S]*?```)\n{3,}/g, '$1\n\n');
  cleaned = cleaned.replace(/\n{3,}(```[\s\S]*?```)/g, '\n\n$1');

  // 리스트 앞뒤 빈 줄 정리
  cleaned = cleaned.replace(/(\n[-*+]\s+.*)\n{3,}/g, '$1\n\n');
  cleaned = cleaned.replace(/\n{3,}([-*+]\s+.*)/g, '\n\n$1');

  // 블록쿼트 앞뒤 빈 줄 정리
  cleaned = cleaned.replace(/(\n>\s+.*)\n{3,}/g, '$1\n\n');
  cleaned = cleaned.replace(/\n{3,}(>\s+.*)/g, '\n\n$1');

  // 문서 시작과 끝의 불필요한 빈 줄 제거
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * 마크다운 요소 추출 (통합)
 */
export function extractMarkdownElements(content: string): {
  headings: MarkdownToken[];
  links: MarkdownToken[];
  images: MarkdownToken[];
  codeBlocks: MarkdownToken[];
  frontMatter: string | null;
} {
  const { content: contentWithoutFrontMatter, frontMatter } = extractFrontMatter(content);
  
  return {
    headings: extractHeadings(contentWithoutFrontMatter),
    links: extractLinks(contentWithoutFrontMatter),
    images: extractImages(contentWithoutFrontMatter),
    codeBlocks: extractCodeBlocks(contentWithoutFrontMatter),
    frontMatter
  };
}

/**
 * 마크다운 미리보기 생성 (첫 N 단어)
 */
export function generateMarkdownPreview(content: string, wordLimit: number = 50): string {
  const plainText = markdownToPlainText(content);
  const words = plainText.split(/\s+/).filter(word => word.length > 0);
  
  if (words.length <= wordLimit) {
    return plainText;
  }

  return words.slice(0, wordLimit).join(' ') + '...';
}

/**
 * 마크다운 검색 (키워드 기반)
 */
export function searchInMarkdown(content: string, query: string, options: {
  caseSensitive?: boolean;
  wholeWords?: boolean;
  includeCodeBlocks?: boolean;
} = {}): Array<{
  line: number;
  text: string;
  match: string;
  context: string;
}> {
  const {
    caseSensitive = false,
    wholeWords = false,
    includeCodeBlocks = true
  } = options;

  let searchContent = content;
  
  // 코드 블록 제외 옵션
  if (!includeCodeBlocks) {
    searchContent = searchContent.replace(MARKDOWN_PATTERNS.codeBlock, '');
  }

  const lines = searchContent.split('\n');
  const results: Array<{
    line: number;
    text: string;
    match: string;
    context: string;
  }> = [];

  let searchQuery = query;
  if (!caseSensitive) {
    searchQuery = query.toLowerCase();
  }

  // 전체 단어 매칭을 위한 정규식
  const wordBoundary = wholeWords ? '\\b' : '';
  const regex = new RegExp(
    `${wordBoundary}${escapeRegExp(searchQuery)}${wordBoundary}`,
    caseSensitive ? 'g' : 'gi'
  );

  lines.forEach((line, index) => {
    const matches = line.match(regex);
    
    if (matches) {
      matches.forEach(match => {
        // 컨텍스트 생성 (앞뒤 50글자)
        const matchIndex = line.indexOf(match);
        const start = Math.max(0, matchIndex - 50);
        const end = Math.min(line.length, matchIndex + match.length + 50);
        const context = line.substring(start, end);

        results.push({
          line: index + 1,
          text: line,
          match,
          context: start > 0 ? '...' + context : context
        });
      });
    }
  });

  return results;
}

/**
 * 정규식 이스케이프
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 마크다운 변환 유틸리티들 내보내기
 */
export const MarkdownUtils = {
  tokenizeMarkdown,
  extractHeadings,
  extractCodeBlocks,
  extractLinks,
  extractImages,
  extractInlineFormatting,
  removeFrontMatter,
  extractFrontMatter,
  generateTableOfContents,
  generateAnchor,
  markdownToPlainText,
  calculateMarkdownStats,
  countWords,
  validateMarkdownLinks,
  isValidUrl,
  getLinkType,
  validateHeadingStructure,
  cleanupMarkdown,
  extractMarkdownElements,
  generateMarkdownPreview,
  searchInMarkdown,
  MARKDOWN_PATTERNS
};