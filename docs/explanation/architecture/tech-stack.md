````mdc
# DMS 기술 스택

> 최종 업데이트: 2026-02-02

DMS(Document Management System) 프론트엔드 전용 기술 스택입니다.

> 📌 공용 기술 스택: [common/architecture/tech-stack.md](../../common/architecture/tech-stack.md)

---

## 개요

DMS는 모노레포 내 독립 앱으로 운영되며, **npm**을 사용한다 (pnpm workspace에서 제외).

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
| **Tiptap** | ^3.16.0 | 리치 텍스트 에디터 |
| **MUI X Tree View** | ^8.15.0 | 트리 뷰 컴포넌트 |
| **Lucide React** | 0.548.x | 아이콘 |

---

## DMS 전용 기능

### 리치 텍스트 에디터 (Tiptap)
- 블록 기반 에디터
- 마크다운 지원
- 코드 구문 강조

### 마크다운 처리
- `marked`, `react-markdown` - 파싱 및 렌더링
- `turndown` - HTML → MD 변환

### AI / 벡터 검색
- `@google/generative-ai` - Gemini API
- `@lancedb/lancedb` - 벡터 데이터베이스

---

## 서비스 URL (개발 환경)

| 서비스 | URL | 설명 |
|--------|-----|------|
| DMS Frontend | http://localhost:3001 | 도큐먼트 관리 시스템 |

---

## 관련 문서

- [공용 기술 스택](../../common/architecture/tech-stack.md) - 백엔드, DB, 개발 도구
- [package-spec.md](package-spec.md) - 패키지 상세 명세
- [package-integration-plan.md](package-integration-plan.md) - PMS 통합 계획

````
