# PMS 패키지 명세서

> 📅 기준일: 2026-02-02  
> 📦 패키지명: `web-pms` v0.0.1

---

## 1. 개요

| 항목 | 값 |
|------|-----|
| **프로젝트명** | web-pms |
| **경로** | `apps/web/pms/` |
| **용도** | 프로젝트 관리 시스템 (Project Management System) |
| **포트** | 3000 |

---

## 2. 코어 프레임워크

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `next` | ^15.1.0 | React 프레임워크 (App Router) |
| `react` | ^19.2.4 | UI 라이브러리 |
| `react-dom` | ^19.2.4 | React DOM 렌더링 |
| `typescript` | ^5.7.0 | 타입 시스템 |

---

## 3. UI 컴포넌트

### 3.1 디자인 시스템

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `tailwindcss` | ^3.4.0 | 유틸리티 CSS |
| `tailwindcss-animate` | ^1.0.7 | Tailwind 애니메이션 |
| `tailwind-merge` | ^2.6.0 | 클래스 병합 유틸리티 |
| `class-variance-authority` | ^0.7.1 | 컴포넌트 변형 관리 |
| `clsx` | ^2.1.0 | 조건부 클래스 결합 |

### 3.2 Radix UI (shadcn/ui 기반)

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@radix-ui/react-alert-dialog` | ^1.1.15 | 알림 대화상자 |
| `@radix-ui/react-checkbox` | ^1.3.3 | 체크박스 |
| `@radix-ui/react-dialog` | ^1.1.15 | 다이얼로그/모달 |
| `@radix-ui/react-dropdown-menu` | ^2.1.16 | 드롭다운 메뉴 |
| `@radix-ui/react-label` | ^2.1.8 | 폼 라벨 |
| `@radix-ui/react-select` | ^2.2.6 | 셀렉트박스 |
| `@radix-ui/react-separator` | ^1.1.8 | 구분선 |
| `@radix-ui/react-slot` | ^1.2.4 | 컴포넌트 합성 |
| `@radix-ui/react-tooltip` | ^1.2.8 | 툴팁 |

### 3.3 아이콘 & 시각화

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `lucide-react` | ^0.548.0 | 아이콘 라이브러리 |
| `recharts` | ^3.6.0 | 차트 라이브러리 |

---

## 4. 상태 관리 & 데이터

### 4.1 상태 관리

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `zustand` | ^5.0.0 | 클라이언트 상태 관리 |
| `@tanstack/react-query` | ^5.62.0 | 서버 상태 관리 |

### 4.2 테이블 & 가상화

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@tanstack/react-table` | ^8.21.3 | 데이터 테이블 |
| `@tanstack/react-virtual` | ^3.13.18 | 가상 스크롤 |

### 4.3 HTTP 클라이언트

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `axios` | ^1.7.0 | HTTP 클라이언트 |

---

## 5. 폼 & 유효성 검사

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `react-hook-form` | ^7.54.0 | 폼 상태 관리 |
| `@hookform/resolvers` | ^3.9.0 | 스키마 연동 리졸버 |
| `zod` | ^3.24.0 | 스키마 유효성 검사 |

---

## 6. 유틸리티

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `dayjs` | ^1.11.0 | 날짜/시간 처리 |
| `numeral` | ^2.0.0 | 숫자 포맷팅 |
| `xlsx` | ^0.18.5 | 엑셀 파일 처리 |
| `sonner` | ^1.7.0 | 토스트 알림 |

---

## 7. 실시간 통신

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `socket.io-client` | ^4.8.0 | WebSocket 클라이언트 |

---

## 8. 내부 패키지

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@ssoo/types` | workspace:* | 공유 타입 정의 |

---

## 9. 개발 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@tanstack/react-query-devtools` | ^5.91.2 | React Query 개발도구 |
| `eslint` | ^9.0.0 | 코드 린팅 |
| `eslint-config-next` | ^15.1.0 | Next.js ESLint 설정 |
| `autoprefixer` | ^10.4.0 | CSS 벤더 프리픽스 |
| `postcss` | ^8.4.0 | CSS 후처리 |
| `storybook` | ^8.6.15 | 컴포넌트 문서화 |
| `typedoc` | ^0.28.16 | API 문서 생성 |
| `rimraf` | ^6.0.0 | 디렉토리 삭제 유틸 |

---

## 10. 스크립트

```json
{
  "dev": "next dev --port 3000",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "storybook": "storybook dev -p 6006",
  "build-storybook": "storybook build -o ../../../docs/pms/reference/storybook",
  "docs:typedoc": "typedoc --options typedoc.json",
  "clean": "rimraf .next"
}
```

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-02-02 | React 버전 업데이트, @radix-ui/react-alert-dialog 추가, devDependencies 업데이트 |
| 2026-01-27 | 초기 작성 - 현행 패키지 기준 |

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

