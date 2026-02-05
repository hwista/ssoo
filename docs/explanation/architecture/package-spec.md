# DMS 패키지 명세서

> 📅 기준일: 2026-01-28  
> 📦 패키지명: `markdown-wiki` v0.1.0

---

## 1. 개요

| 항목 | 값 |
|------|-----|
| **프로젝트명** | markdown-wiki |
| **경로** | `apps/web/dms/` |
| **용도** | 문서 관리 시스템 (Document Management System) |
| **포트** | 3001 |
| **원본 저장소** | GitLab `http://10.125.31.72:8010/LSITC_WEB/LSWIKI.git` |

---

## 2. 코어 프레임워크

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `next` | ^15.1.0 | React 프레임워크 (App Router) |
| `react` | 19.2.0 | UI 라이브러리 |
| `react-dom` | 19.2.0 | React DOM 렌더링 |
| `typescript` | ^5 | 타입 시스템 |

---

## 3. UI 컴포넌트

### 3.1 디자인 시스템

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `tailwindcss` | ^3.4.0 | 유틸리티 CSS |
| `tailwind-merge` | ^2.6.0 | 클래스 병합 유틸리티 |
| `tailwindcss-animate` | ^1.0.7 | 애니메이션 유틸리티 |
| `class-variance-authority` | ^0.7.1 | 컴포넌트 변형 관리 |
| `clsx` | ^2.1.1 | 조건부 클래스 결합 |

### 3.2 Radix UI (Primitives)

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@radix-ui/react-dialog` | ^1.1.15 | Dialog |
| `@radix-ui/react-dropdown-menu` | ^2.1.16 | Dropdown menu |
| `@radix-ui/react-tooltip` | ^1.2.8 | Tooltip |
| `@radix-ui/react-context-menu` | ^2.2.16 | Context menu |
| `@radix-ui/react-progress` | ^1.1.8 | Progress |
| `@radix-ui/react-slot` | ^1.2.4 | Slot |

### 3.3 MUI (Material UI)

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@mui/material` | ^7.3.4 | 핵심 UI 컴포넌트 |
| `@mui/lab` | ^7.0.1-beta.18 | 실험적 컴포넌트 |
| `@mui/x-tree-view` | ^8.15.0 | 트리 뷰 컴포넌트 |
| `@emotion/react` | ^11.14.0 | MUI 스타일 엔진 |
| `@emotion/styled` | ^11.14.1 | MUI 스타일 컴포넌트 |

### 3.4 아이콘

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `lucide-react` | ^0.548.0 | 아이콘 라이브러리 |

---

## 4. 상태/폼/검증/알림

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `zustand` | ^5.0.10 | 상태 관리 |
| `react-hook-form` | ^7.71.1 | 폼 관리 |
| `@hookform/resolvers` | ^3.10.0 | Zod 연동 resolver |
| `zod` | ^3.25.76 | 스키마 검증 |
| `sonner` | ^1.7.4 | 토스트 알림 |

---

## 5. 리치 텍스트 에디터 (Tiptap)

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@tiptap/react` | ^3.16.0 | React 바인딩 |
| `@tiptap/starter-kit` | ^3.16.0 | 기본 에디터 번들 |
| `@tiptap/pm` | ^3.16.0 | ProseMirror 코어 |
| `@tiptap/suggestion` | ^3.16.0 | 슬래시 명령어 |
| `@tiptap/extension-code-block-lowlight` | ^3.16.0 | 코드 하이라이트 |
| `@tiptap/extension-highlight` | ^3.16.0 | 텍스트 하이라이트 |
| `@tiptap/extension-image` | ^3.16.0 | 이미지 삽입 |
| `@tiptap/extension-link` | ^3.16.0 | 링크 처리 |
| `@tiptap/extension-placeholder` | ^3.16.0 | 플레이스홀더 |
| `@tiptap/extension-table` | ^3.16.0 | 테이블 기본 |
| `@tiptap/extension-table-cell` | ^3.16.0 | 테이블 셀 |
| `@tiptap/extension-table-header` | ^3.16.0 | 테이블 헤더 |
| `@tiptap/extension-table-row` | ^3.16.0 | 테이블 행 |
| `@tiptap/extension-task-item` | ^3.16.0 | 체크리스트 항목 |
| `@tiptap/extension-task-list` | ^3.16.0 | 체크리스트 |
| `lowlight` | ^3.3.0 | 코드 구문 강조 |
| `tippy.js` | ^6.3.7 | 툴팁 (에디터 메뉴) |

---

## 6. 마크다운 처리

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `marked` | ^17.0.1 | 마크다운 파서 |
| `react-markdown` | ^10.1.0 | 마크다운 렌더링 |
| `remark-gfm` | ^4.0.1 | GitHub Flavored Markdown |
| `turndown` | ^7.2.2 | HTML → 마크다운 변환 |

---

## 7. AI / Vector 검색 (RAG)

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@google/generative-ai` | ^0.24.1 | Google Gemini API |
| `@lancedb/lancedb` | ^0.23.0 | 벡터 데이터베이스 |

---

## 8. 파일 처리 & 서버

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `formidable` | ^3.5.4 | 파일 업로드 파싱 |
| `multer` | ^2.0.2 | 멀티파트 파일 업로드 |
| `chokidar` | ^4.0.3 | 파일 시스템 감시 |
| `nodemailer` | ^7.0.12 | 이메일 발송 |

---

### 8.1 타입 패키지 (현재 dependencies 포함)

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@types/formidable` | ^3.4.6 | 타입 정의 |
| `@types/multer` | ^2.0.0 | 타입 정의 |
| `@types/nodemailer` | ^7.0.5 | 타입 정의 |
| `@types/turndown` | ^5.0.6 | 타입 정의 |

---

## 9. 내부 패키지

| 패키지 | 버전 | 용도 |
|--------|------|------|
| (없음) | - | 모노레포 패키지 미연동 |

---

## 10. 개발 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `eslint` | ^9 | 코드 린팅 |
| `eslint-config-next` | ^15.1.0 | Next.js ESLint 설정 |
| `autoprefixer` | ^10.4.21 | CSS 벤더 프리픽스 |
| `postcss` | ^8.5.6 | CSS 후처리 |
| `@tailwindcss/typography` | ^0.5.19 | 타이포그래피 플러그인 |

---

## 11. 스크립트

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start"
}
```

> ✅ Next.js 15.x로 다운그레이드 후 `--webpack` 플래그 불필요

---

## 12. 알려진 이슈

### 12.1 타입 패키지 위치

`@types/*` 패키지가 dependencies에 포함되어 있음. 빌드/배포에 영향이 없으면 devDependencies 이동 검토 필요.

### 12.2 UI 라이브러리 혼용

- **MUI** (Material UI v7)
- **Radix UI**
- **Tailwind CSS**

3개의 UI 시스템이 혼용되어 있어 스타일 충돌 가능성 있음.

### 12.3 Tailwind 설정 파일 형식

DMS는 독립 실행 원칙을 유지하기 위해 `tailwind.config.js`(CJS)를 사용한다.  
`tailwind.config.ts` 전환은 통합 과정에서 로더/빌드 환경을 함께 정리할 때 진행한다.

---

## Backlog

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| PKG-01 | 의존성 실제 사용 여부 재검증 (MUI/Emotion, chokidar, formidable, multer) | P2 | 🔄 진행중 |
| PKG-02 | @types 패키지 devDependencies 이동 검토 | P3 | 🔲 대기 |

---

## Changelog

| 날짜 | 내용 |
|------|------|
| 2026-01-27 | 초기 작성 - GitLab subtree 기준 |
| 2026-01-27 | PMS 호환성을 위해 다운그레이드: Next.js 16→15, tailwind-merge 3→2 |
| 2026-01-28 | Fluent UI 목록 제거, Radix/상태 패키지 추가, 알려진 이슈 정리 |
| 2026-01-28 | Tailwind 설정 파일 형식(JS 유지) 근거 추가 |
