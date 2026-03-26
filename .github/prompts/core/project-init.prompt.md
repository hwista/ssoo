# project-init.prompt.md

> 프로젝트 초기화 프롬프트 - 빈 폴더에서 프로젝트 구조 생성

---

## 사용법

```markdown
@orchestrator

#file:prompts/core/project-init.prompt.md

## 프로젝트 초기화 요청

[아래 템플릿 작성]
```

---

## 프롬프트 템플릿

```markdown
## 1. 프로젝트 정보

| 항목 | 값 |
|------|-----|
| 프로젝트명 | [my-project] |
| 설명 | [프로젝트 한 줄 설명] |
| 버전 | 0.0.1 |

## 2. 기술 스택 (확정)

| 레이어 | 선택 |
|--------|------|
| 프론트엔드 | [Next.js 15 / React / Vue / ...] |
| 백엔드 | [NestJS / Express / FastAPI / ASP.NET / ...] |
| 데이터베이스 | [PostgreSQL / MySQL / MongoDB / ...] |
| ORM | [Prisma / TypeORM / Entity Framework / ...] |
| 패키지 매니저 | [pnpm / npm / yarn] |

## 3. 아키텍처 (확정)

| 항목 | 선택 |
|------|------|
| 구조 | [모노레포 / 멀티레포] |
| 백엔드 패턴 | [모듈러 모놀리스 / 레이어드 / 클린 아키텍처] |
| API 스타일 | [REST / GraphQL] |

## 4. 앱 구성

| 앱명 | 경로 | 설명 |
|------|------|------|
| [web-main] | apps/web/main | 메인 웹 클라이언트 |
| [server] | apps/server | 백엔드 API |
| [database] | packages/database | DB 스키마/ORM |
| [types] | packages/types | 공유 타입 |

## 5. 생성 요청

다음을 생성해주세요:

### 5.1 폴더 구조
- 위 앱 구성에 맞는 폴더 구조

### 5.2 설정 파일
- 루트: package.json, tsconfig.base.json
- 모노레포: pnpm-workspace.yaml, turbo.json (해당 시)
- 각 앱: package.json, tsconfig.json

### 5.3 ESLint/Prettier
- 루트 설정 + 앱별 확장

### 5.4 copilot-instructions.md
- 프로젝트 전역 규칙
- 기술 스택에 맞는 네이밍 규칙
- 폴더 구조 설명
- 금지 사항

### 5.5 instructions/*.md
- 각 앱/패키지별 경로 인스트럭션

### 5.6 docs/ 구조
- 기본 문서 폴더 구조
```

---

## AI 응답 형식

### Phase 1: 구조 확인 (사용자 승인 필요)

```markdown
## 생성할 구조 미리보기

### 폴더 구조
\`\`\`
my-project/
├── .github/
│   ├── copilot-instructions.md
│   ├── instructions/
│   │   ├── server.instructions.md
│   │   └── web-main.instructions.md
│   ├── prompts/
│   │   ├── core/           # (복사됨)
│   │   └── [project]/      # (신규 생성)
│   └── ...
├── apps/
│   ├── server/
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/
│       └── main/
│           ├── src/
│           ├── package.json
│           └── tsconfig.json
├── packages/
│   ├── database/
│   └── types/
├── docs/
│   ├── README.md
│   ├── common/
│   └── [app]/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
\`\`\`

### 주요 파일 내용 요약
- copilot-instructions.md: [핵심 규칙 3개]
- server.instructions.md: [적용 규칙]
- ...

## 확인 요청

위 구조로 진행해도 될까요?
- 변경이 필요하면 알려주세요.
- 승인하시면 파일을 생성합니다.
```

### Phase 2: 파일 생성 (승인 후)

모든 파일을 생성합니다.

### Phase 3: 검증

```markdown
## 생성 완료 검증

### 파일 체크리스트
- [x] .github/copilot-instructions.md
- [x] .github/instructions/server.instructions.md
- [x] apps/server/package.json
- [x] ...

### 다음 단계

1. 의존성 설치
   \`\`\`bash
   pnpm install
   \`\`\`

2. 빌드 확인
   \`\`\`bash
   pnpm build
   \`\`\`

3. 린트 확인
   \`\`\`bash
   pnpm lint
   \`\`\`

### 검증 결과 보고

위 명령어 실행 후 오류가 있으면 알려주세요.
100% 성공할 때까지 반복 수정합니다.
```

---

## 기술 스택별 템플릿 참조

### TypeScript 모노레포 (NestJS + Next.js)

```
templates/folder-structure/typescript-monorepo.md
templates/copilot-instructions/typescript-web.md
```

### Python 백엔드 (FastAPI)

```
templates/folder-structure/python-fastapi.md
templates/copilot-instructions/python.md
```

### .NET 엔터프라이즈

```
templates/folder-structure/dotnet-clean.md
templates/copilot-instructions/dotnet.md
```

---

## 품질 수렴 루프

```
생성 → 검증 → 미달 시 수정 → 검증 → ... → 100%
```

### 검증 항목

| 항목 | 명령어 | 목표 |
|------|--------|------|
| 의존성 설치 | `pnpm install` | 오류 없음 |
| 빌드 | `pnpm build` | 성공 |
| 린트 | `pnpm lint` | 오류 0개 |
| 타입체크 | `pnpm typecheck` | 오류 0개 |

### 미달 시 프롬프트

```markdown
@developer

## 초기화 오류 수정

### 현재 오류
\`\`\`
[오류 메시지]
\`\`\`

### 수정 요청
위 오류를 해결해주세요.

### 검증
수정 후 [명령어] 재실행
```

---

## 관련 문서

- [01-new-project.md](../guides/01-new-project.md) - 전체 프로젝트 시작 가이드
- [03-tech-stack.md](../guides/03-tech-stack.md) - 기술 스택 선정 가이드
- `templates/` - 폴더 구조 및 설정 템플릿

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-05 | 초기 버전 - 프로젝트 초기화 프롬프트 |

