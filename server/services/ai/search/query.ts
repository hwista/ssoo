const QUERY_STOPWORDS = new Set([
  '문서', '관련', '내용', '기능', '화면', '페이지', '설명', '정리', '요약', '검색',
  '찾아', '찾아줘', '찾아주세요', '알려줘', '알려주세요', '보여줘', '보여주세요',
  '해줘', '해주세요', '해줘요', '해주세요요', '대한', '위한', '기준', '에서', '으로',
  'what', 'where', 'when', 'how', 'why', 'find', 'show', 'search', 'about', 'please',
]);

function normalizeSearchToken(raw: string): string {
  let token = raw
    .toLowerCase()
    .replace(/^[^a-z0-9가-힣]+|[^a-z0-9가-힣]+$/g, '')
    .trim();

  if (!token) return '';

  token = token
    .replace(/(해줘요|해주세요요|해주세요|해줘|알려줘|보여줘|찾아줘|정리해줘|요약해줘)$/g, '')
    .replace(/(입니다|인가요|인가|일까|할까|해요|해라)$/g, '')
    .replace(/(에서|으로|에게|한테|까지|부터|보다|처럼)$/g, '')
    .replace(/(은|는|이|가|을|를|의|와|과|도|만|로|에)$/g, '')
    .trim();

  return token;
}

export function tokenizeQuery(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .split(/[\s,.;:!?()[\]{}"'`/\\|]+/)
    .map(normalizeSearchToken)
    .filter((token) => token.length >= 2)
    .filter((token) => !QUERY_STOPWORDS.has(token));

  return Array.from(new Set(tokens));
}
