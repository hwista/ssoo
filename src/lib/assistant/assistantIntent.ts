export type AssistantIntent = 'ask' | 'search' | 'help';

const SEARCH_PATTERNS: RegExp[] = [
  /^\/search\b/i,
  /검색해(줘|주세요|봐|봐줘)?/,
  /찾아(줘|주세요|봐|봐줘)?/,
  /(파일|문서).*(목록|리스트|경로|위치)/,
  /(목록|리스트|경로|위치).*(파일|문서)/,
];

const HELP_PATTERNS: RegExp[] = [
  /(사용법|사용 방법|어떻게 사용|어떻게 써|가이드|도움말|헬프)/,
  /(기능|화면|메뉴).*(어디|어떻게|어떤)/,
  /(열어줘|이동해줘|바로가|들어가고 싶)/,
  /(설정|검색|작성|생성|편집).*(어디서|어떻게)/,
];

const ASK_BIAS_PATTERNS: RegExp[] = [
  /왜|어떻게|무엇|뭐야|설명|요약|정리|비교|추천|의미|알려줘|말해줘/,
];

export function detectAssistantIntent(input: string): AssistantIntent {
  const normalized = input.trim();
  if (!normalized) return 'ask';

  if (HELP_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return 'help';
  }

  if (ASK_BIAS_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return 'ask';
  }

  return SEARCH_PATTERNS.some((pattern) => pattern.test(normalized)) ? 'search' : 'ask';
}
