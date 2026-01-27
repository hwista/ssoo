// 마크다운 템플릿 정의

export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'document' | 'meeting' | 'project' | 'technical' | 'other';
  icon: string;
  content: string;
}

export const templates: Template[] = [
  // 문서 템플릿
  {
    id: 'blank',
    name: '빈 문서',
    description: '빈 마크다운 문서로 시작합니다',
    category: 'document',
    icon: '📄',
    content: `# 제목

내용을 입력하세요.
`
  },
  {
    id: 'basic-doc',
    name: '기본 문서',
    description: '제목, 목차, 본문이 포함된 기본 문서',
    category: 'document',
    icon: '📝',
    content: `# 문서 제목

## 목차
- [개요](#개요)
- [상세 내용](#상세-내용)
- [참고 자료](#참고-자료)

---

## 개요

문서의 개요를 작성합니다.

## 상세 내용

### 섹션 1

내용을 입력하세요.

### 섹션 2

내용을 입력하세요.

## 참고 자료

- [링크 제목](URL)
`
  },
  {
    id: 'faq',
    name: 'FAQ 문서',
    description: '자주 묻는 질문과 답변 형식',
    category: 'document',
    icon: '❓',
    content: `# 자주 묻는 질문 (FAQ)

## 카테고리 1

### Q: 질문 1?

A: 답변 1을 작성합니다.

### Q: 질문 2?

A: 답변 2를 작성합니다.

## 카테고리 2

### Q: 질문 3?

A: 답변 3을 작성합니다.

---

> 추가 질문이 있으시면 담당자에게 문의해주세요.
`
  },

  // 회의 템플릿
  {
    id: 'meeting-notes',
    name: '회의록',
    description: '회의 내용을 기록하는 템플릿',
    category: 'meeting',
    icon: '📋',
    content: `# 회의록

## 회의 정보

| 항목 | 내용 |
|------|------|
| 일시 | YYYY-MM-DD HH:MM |
| 장소 | 회의실 |
| 참석자 | 이름1, 이름2, 이름3 |
| 작성자 | 이름 |

---

## 안건

1. 안건 1
2. 안건 2
3. 안건 3

---

## 논의 내용

### 안건 1: 제목

- 논의 내용
- 결정 사항

### 안건 2: 제목

- 논의 내용
- 결정 사항

---

## 결정 사항

- [ ] 액션 아이템 1 (담당: OOO, 기한: YYYY-MM-DD)
- [ ] 액션 아이템 2 (담당: OOO, 기한: YYYY-MM-DD)

---

## 다음 회의

- 일시: YYYY-MM-DD HH:MM
- 장소: 회의실
`
  },
  {
    id: 'daily-standup',
    name: '데일리 스탠드업',
    description: '일일 스크럼 미팅 기록',
    category: 'meeting',
    icon: '🌅',
    content: `# 데일리 스탠드업

**날짜**: YYYY-MM-DD

---

## 참석자

- 이름1
- 이름2
- 이름3

---

## 이름1

### 어제 한 일
- 작업 내용

### 오늘 할 일
- 계획

### 블로커
- 없음 / 이슈 내용

---

## 이름2

### 어제 한 일
- 작업 내용

### 오늘 할 일
- 계획

### 블로커
- 없음 / 이슈 내용

---

## 공유 사항

- 전달 사항
`
  },

  // 프로젝트 템플릿
  {
    id: 'project-plan',
    name: '프로젝트 계획서',
    description: '프로젝트 계획 및 일정 관리',
    category: 'project',
    icon: '📊',
    content: `# 프로젝트 계획서

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | |
| 시작일 | YYYY-MM-DD |
| 종료일 | YYYY-MM-DD |
| PM | |
| 팀원 | |

---

## 프로젝트 목표

1. 목표 1
2. 목표 2
3. 목표 3

---

## 마일스톤

| 단계 | 내용 | 예정일 | 상태 |
|------|------|--------|------|
| M1 | 기획 완료 | YYYY-MM-DD | ⬜ |
| M2 | 개발 완료 | YYYY-MM-DD | ⬜ |
| M3 | 테스트 완료 | YYYY-MM-DD | ⬜ |
| M4 | 배포 | YYYY-MM-DD | ⬜ |

---

## 리스크 관리

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|-----------|
| 리스크 1 | 높음/중간/낮음 | 대응 방안 |

---

## 참고 자료

- [관련 문서](링크)
`
  },
  {
    id: 'release-notes',
    name: '릴리즈 노트',
    description: '버전 릴리즈 내역 문서',
    category: 'project',
    icon: '🚀',
    content: `# 릴리즈 노트

## 버전 X.Y.Z

**릴리즈 일자**: YYYY-MM-DD

---

### ✨ 새로운 기능

- 기능 1 설명
- 기능 2 설명

### 🐛 버그 수정

- 버그 1 수정 내용
- 버그 2 수정 내용

### ⚡ 개선 사항

- 성능 개선 내용
- UX 개선 내용

### 🔧 기술적 변경

- 기술 변경 사항

### ⚠️ 주의 사항

- 마이그레이션 필요 사항
- 호환성 이슈

---

### 다음 버전 예정

- 예정된 기능 1
- 예정된 기능 2
`
  },

  // 기술 문서 템플릿
  {
    id: 'api-doc',
    name: 'API 문서',
    description: 'REST API 엔드포인트 문서',
    category: 'technical',
    icon: '🔌',
    content: `# API 문서

## 개요

API에 대한 간단한 설명을 작성합니다.

**Base URL**: \`https://api.example.com/v1\`

---

## 인증

\`\`\`
Authorization: Bearer <token>
\`\`\`

---

## 엔드포인트

### GET /resource

리소스 목록을 조회합니다.

**Request**

\`\`\`bash
curl -X GET https://api.example.com/v1/resource \\
  -H "Authorization: Bearer <token>"
\`\`\`

**Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| limit | number | X | 결과 개수 (기본값: 20) |
| offset | number | X | 시작 위치 |

**Response**

\`\`\`json
{
  "success": true,
  "data": []
}
\`\`\`

---

### POST /resource

새 리소스를 생성합니다.

**Request Body**

\`\`\`json
{
  "name": "string",
  "value": "string"
}
\`\`\`

**Response**

\`\`\`json
{
  "success": true,
  "data": {
    "id": "string"
  }
}
\`\`\`

---

## 에러 코드

| 코드 | 설명 |
|------|------|
| 400 | 잘못된 요청 |
| 401 | 인증 실패 |
| 404 | 리소스 없음 |
| 500 | 서버 오류 |
`
  },
  {
    id: 'troubleshooting',
    name: '트러블슈팅 가이드',
    description: '문제 해결 가이드 문서',
    category: 'technical',
    icon: '🔧',
    content: `# 트러블슈팅 가이드

## 문제 1: 에러 메시지

### 증상

문제가 발생했을 때 나타나는 증상을 설명합니다.

\`\`\`
에러 메시지 예시
\`\`\`

### 원인

문제의 원인을 설명합니다.

### 해결 방법

1. 첫 번째 단계
2. 두 번째 단계
3. 세 번째 단계

\`\`\`bash
# 해결 명령어 예시
command --option
\`\`\`

### 예방 방법

- 예방 팁 1
- 예방 팁 2

---

## 문제 2: 다른 에러

### 증상

...

### 원인

...

### 해결 방법

...

---

## 추가 도움말

문제가 해결되지 않으면 담당자에게 문의하세요.

- 이메일: support@example.com
- Slack: #support-channel
`
  },
  {
    id: 'code-review',
    name: '코드 리뷰 체크리스트',
    description: '코드 리뷰 시 확인할 항목',
    category: 'technical',
    icon: '✅',
    content: `# 코드 리뷰 체크리스트

## PR 정보

| 항목 | 내용 |
|------|------|
| PR 번호 | #000 |
| 작성자 | |
| 리뷰어 | |
| 리뷰 일자 | YYYY-MM-DD |

---

## 체크리스트

### 코드 품질

- [ ] 코드가 읽기 쉽고 이해하기 쉬운가?
- [ ] 함수/메서드가 단일 책임을 가지는가?
- [ ] 중복 코드가 없는가?
- [ ] 적절한 네이밍 컨벤션을 따르는가?

### 기능

- [ ] 요구사항을 충족하는가?
- [ ] 엣지 케이스가 처리되어 있는가?
- [ ] 에러 핸들링이 적절한가?

### 보안

- [ ] SQL 인젝션 취약점이 없는가?
- [ ] XSS 취약점이 없는가?
- [ ] 민감 정보가 노출되지 않는가?

### 성능

- [ ] 불필요한 API 호출이 없는가?
- [ ] 적절한 인덱스가 사용되는가?
- [ ] 메모리 누수가 없는가?

### 테스트

- [ ] 단위 테스트가 작성되어 있는가?
- [ ] 테스트 커버리지가 충분한가?
- [ ] 모든 테스트가 통과하는가?

---

## 피드백

### 필수 수정

1.

### 권장 수정

1.

### 칭찬할 점

1.

---

## 결론

- [ ] 승인
- [ ] 수정 후 재리뷰 필요
- [ ] 반려
`
  }
];

// 카테고리 정보
export const categories = {
  document: { name: '문서', icon: '📄' },
  meeting: { name: '회의', icon: '📋' },
  project: { name: '프로젝트', icon: '📊' },
  technical: { name: '기술', icon: '🔧' },
  other: { name: '기타', icon: '📁' }
};

// 템플릿 조회
export function getTemplateById(id: string): Template | undefined {
  return templates.find(t => t.id === id);
}

// 카테고리별 템플릿 조회
export function getTemplatesByCategory(category: Template['category']): Template[] {
  return templates.filter(t => t.category === category);
}

// 템플릿 내용에 변수 치환 (선택적)
export function applyTemplateVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  // 날짜 자동 치환
  result = result.replace(/YYYY-MM-DD/g, new Date().toISOString().split('T')[0]);
  return result;
}
