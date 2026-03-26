# UI Design Documentation

> SSOO 프로젝트의 UI/UX 설계 문서 모음

## 📁 문서 구조

### 1. 레이아웃 시스템
- [layout-system.md](./layout-system.md) - 레이아웃 구조 및 컴포넌트
  - AppLayout, Sidebar, Header, TabBar, ContentArea
  - 레이아웃 치수 (사이드바 56/340px, 헤더 60px, 탭바 53px)

### 2. UI 컴포넌트
- [ui-components.md](./ui-components.md) - 공통 UI 컴포넌트
  - Radix UI + shadcn/ui 기반 컴포넌트
  - Button, Card, Input, Dialog 등

### 3. 페이지 레이아웃
- [page-layouts.md](./page-layouts.md) - 표준 페이지 레이아웃 설계
  - 목록 페이지 (ListPageTemplate)
  - 등록/수정 페이지 (FormPageTemplate)

### 4. 보안 및 라우팅
- [page-security-routing.md](./page-security-routing.md) - 페이지 보안 및 라우팅 전략
  - Next.js 라우팅 노출 방지
  - 미들웨어 기반 접근 차단
  - 404 자동 리다이렉트
  - 동적 컴포넌트 로딩

### 5. 디자인 시스템
- [design-system.md](./design-system.md) - 디자인 시스템 가이드
  - 색상 체계 (그룹웨어 기반: Primary #003876, Secondary #235a98)
  - 레이아웃 (헤더 60px, 사이드바 340px, 탭바 53px)
  - 컨트롤 높이 표준 (36px)
  - 타이포그래피 (H1, H2, H3, Body)
  - 아이콘 크기 표준
  - 버튼 스타일 및 크기
  - 사용 예시

### 6. 컴포넌트 아키텍처
- [component-hierarchy.md](./component-hierarchy.md) - 컴포넌트 계층 구조
  - Level 0: shadcn/ui 원자 컴포넌트
  - Level 1: UI 기본 컴포넌트
  - Level 2: 공통 복합 컴포넌트 (common/)
  - Level 3: 페이지 템플릿 (templates/)
  - Level 4: 도메인 페이지 (pages/)

### 7. 스크롤바
- [scrollbar.md](./scrollbar.md) - 커스텀 스크롤바 가이드
  - 스크롤바 CSS 유틸리티 클래스
  - ScrollArea 컴포넌트
  - 브라우저 호환성

---

## 🎨 디자인 토큰 요약

### 레이아웃 크기
| 요소 | 값 | 설명 |
|------|-----|------|
| 헤더 높이 | 60px | `h-[60px]` |
| 사이드바 너비 (펼침) | 340px | |
| 사이드바 너비 (접힘) | 56px | |
| 탭바 높이 | 53px | 사이드바 검색 영역과 정렬 |
| 컨트롤 높이 | 36px | `h-control-h` |

### 색상 (그룹웨어 기준)
| 색상 | HEX | 용도 |
|------|-----|------|
| Primary | `#003876` | 헤더, 브랜드, 주요 액션 |
| Secondary | `#235a98` | 보조 액션, hover |
| SSOO Red | `#FA002D` | 회사 메인 레드, 삭제/경고 |
| Content Border | `#9FC1E7` | 외곽 테두리, 선택 상태 |
| Content Background | `#DEE7F1` | 사이드바 배경 |
| Hover Background | `#F6FBFF` | 은은한 hover |
| Internal Border | `gray-200` | 내부 구분선 |

---

## 🎨 UI 라이브러리 스택

| 라이브러리 | 용도 |
|-----------|------|
| shadcn/ui | 기본 UI 컴포넌트 (Radix UI + Tailwind) |
| TanStack Table | 데이터 테이블 |
| TanStack Virtual | 가상 스크롤 |
| Recharts | 차트 |
| xlsx | 엑셀 Export |
| Lucide React | 아이콘 |

---

## 📐 설계 원칙

1. **템플릿 기반 표준화**: 모든 페이지는 3가지 템플릿 중 하나를 따름
2. **재사용성 우선**: 비즈니스 로직과 UI 분리
3. **일관된 UX**: 모든 페이지에서 동일한 패턴 사용
4. **접근성**: ARIA 레이블, 키보드 네비게이션 지원
5. **반응형**: 데스크톱 우선, 모바일은 별도 UI 제공
6. **보안 우선**: 라우팅 구조 숨김, 권한 기반 접근 제어
7. **디자인 일관성**: 타이포그래피, 색상, 버튼 스타일 통일

---

## 🔗 참고 문서

- [../planning/backlog.md](../planning/backlog.md) - 전체 개발 백로그
- [../guides/database-guide.md](../guides/database-guide.md) - 데이터베이스 가이드
- [../domain/service-overview.md](../explanation/domain/service-overview.md) - 서비스 개요
