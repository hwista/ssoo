````mdc
# DMS 기술 스택

> 최종 업데이트: 2026-04-07

DMS(Document Management System) 프론트엔드 전용 기술 스택입니다.

> 📌 공용 기술 스택: [common/architecture/tech-stack.md](../../common/architecture/tech-stack.md)

---

## 개요

DMS는 pnpm workspace 앱으로 운영되며, 공통 계약 타입은 `@ssoo/types`를 통해 공유한다.

현재 원격 데이터 계층은 `src/app/providers.tsx`의 `QueryClientProvider`, `src/lib/api/endpoints/*`, `src/hooks/queries/*`를 기준으로 정리한다.

---

## 프론트엔드 (apps/web/dms)

> 상세: [package-spec.md](package-spec.md)

| 기술 | 버전 | 용도 |
|------|------|------|
| **Next.js** | ^15.1.0 | React 프레임워크 |
| **React** | 19.2.0 | UI 라이브러리 |
| **TypeScript** | ^5 | 언어 |
| **Tailwind CSS** | ^3.4.0 | 스타일링 |
| **tailwind-merge** | ^2.6.0 | 클래스 병합 |
| **@tanstack/react-query** | ^5.x | 서버 상태/캐시, query provider |
| **CodeMirror** | 6.x | 블록 기반 마크다운 에디터 런타임 |
| **react-markdown** | ^10.1.0 | 문서 렌더링 |
| **Lucide React** | 0.548.x | 아이콘 |

---

## DMS 전용 기능

### 리치 텍스트 에디터
- CodeMirror 기반 block editor
- slash command / 링크 / 이미지 / 테이블 삽입 지원
- markdown 문자열을 단일 소스로 유지

### 마크다운 처리
- `marked`, `react-markdown` - 파싱 및 렌더링
- viewer는 DOM 기반 검색 하이라이트를 사용

### AI / 벡터 검색
- `ai` (Vercel AI SDK) - LLM 프로바이더 추상화, 스트리밍
- `@ai-sdk/azure` - Azure OpenAI 프로바이더
- `pg` + pgvector - PostgreSQL 벡터 검색

---

## 서비스 URL (개발 환경)

| 서비스 | URL | 설명 |
|--------|-----|------|
| DMS Frontend | http://localhost:3001 | 도큐먼트 관리 시스템 |

---

## 관련 문서

- [공용 기술 스택](../../common/architecture/tech-stack.md) - 백엔드, DB, 개발 도구
- [package-spec.md](package-spec.md) - 패키지 상세 명세
- [아키텍처 아카이브](../../_archive/architecture/README.md) - 과거 통합 계획/완료 기록

````

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-07 | `@tanstack/react-query`, `QueryClientProvider`, `lib/api/endpoints/*`, `hooks/queries/*` 기반 데이터 계층 정리를 반영 |
| 2026-04-07 | DMS workspace 통합과 `@ssoo/types` 공유 계약 도입을 반영 |
| 2026-03-12 | 현재 활성 런타임 기준으로 CodeMirror/react-markdown 중심 기술 스택으로 정정 |
| 2026-02-24 | Codex 품질 게이트 엄격 모드 적용에 맞춰 문서 메타 섹션 보강 |
