const SUBJECTS = [
  '현재 문서 체계',
  '최근 변경사항',
  '온보딩 관점',
  '운영 관점',
  '개발자 관점',
];

const TARGETS = [
  '핵심 규칙',
  '주의 포인트',
  '실행 절차',
  '검증 체크리스트',
  '리스크',
];

const SEARCH_KEYWORDS = [
  '릴리즈',
  '배포',
  '리팩토링',
  '아키텍처',
  '가이드',
  '규칙',
];

const SEARCH_SCOPES = [
  '관련 문서',
  '체크리스트 문서',
  '설계 문서',
  '운영 문서',
];

const TEMPLATES = [
  '{subject} 기준으로 {target}를 5줄로 요약해줘.',
  '{subject}를 처음 보는 사람 기준으로 핵심만 정리해줘.',
  '{subject}에서 실제 적용 순서를 단계별로 설명해줘.',
  '{subject} 관련해서 가장 자주 실수하는 부분을 알려줘.',
  '{keyword} 관련 {scope} 찾아줘.',
  '{keyword} 관련 문서 경로 목록 보여줘.',
  '{keyword}를 설명하는 문서 찾아줘.',
  '{keyword} 기준으로 최신성 높은 문서를 찾아줘.',
  'AI 검색 기능은 어떻게 쓰는지 알려줘.',
  '새 문서를 어디서 작성하는지 안내해줘.',
  '새 문서에서 인라인 AI 작성 기능을 여는 방법 알려줘.',
  '설정 화면으로 이동해서 확인하는 순서를 알려줘.',
];

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function fillTemplate(template: string): string {
  return template
    .replaceAll('{subject}', randomItem(SUBJECTS))
    .replaceAll('{target}', randomItem(TARGETS))
    .replaceAll('{keyword}', randomItem(SEARCH_KEYWORDS))
    .replaceAll('{scope}', randomItem(SEARCH_SCOPES));
}

export function generateAssistantSuggestions(count = 6): string[] {
  const unique = new Set<string>();
  const maxAttempts = count * 10;
  let attempts = 0;

  while (unique.size < count && attempts < maxAttempts) {
    attempts += 1;
    unique.add(fillTemplate(randomItem(TEMPLATES)));
  }

  if (unique.size < count) {
    for (const template of TEMPLATES) {
      if (unique.size >= count) break;
      unique.add(fillTemplate(template));
    }
  }

  return Array.from(unique).slice(0, count);
}
