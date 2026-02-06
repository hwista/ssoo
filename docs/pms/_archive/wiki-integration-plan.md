# PMS 문서 시스템 정리 (DMS 통합 대비)

> 작성일: 2026-01-21  
> 상태: 진행 중  
> 범위: 프로젝트 관리 시스템(PMS) 문서 정리 및 롤백 기준

---

## 개요

PMS 내부에 임시로 붙였던 문서 시스템 시도를 롤백하고, DMS 통합 시점에 맞춰 PMS 문서 구조와 정책을 정리한다.

> DMS 통합 전체 계획은 `docs/dms/architecture/wiki-integration-plan.md`를 참조한다.

---

## 문서 시스템 구성 정리 (롤백 기준)

### 계획했던 구성

1. **MDX 기반 가이드 문서**
2. **OpenAPI 렌더러 (ReDoc)**
3. **TypeDoc 기반 코드 레퍼런스**
4. **Storybook 기반 UI 문서**

### 실제 적용된 범위 (PMS 기준)

- **ReDoc 기반 API Reference UI**: web-pms에 적용됨
- **Markdown 렌더링(파일 기반)**: web-pms에 적용됨
- **OpenAPI JSON 제공**: server에 `/api/openapi.json` 추가
- **TypeDoc/Storybook**: 적용됨 (정적 레퍼런스 산출)

### 구성 요소 역할

- **`@nestjs/swagger`**: 서버에서 OpenAPI JSON을 생성하는 용도 (필수)
- **Swagger UI**: OpenAPI를 화면에 보여주는 뷰어 (선택)
- **ReDoc**: OpenAPI를 화면에 보여주는 뷰어 (선택)

> ReDoc는 Swagger UI를 대체하는 **뷰어**이며, 서버의 OpenAPI JSON 생성(@nestjs/swagger)을 대체하지 않는다.

### 롤백 기준

- **web-pms 내부 문서 UI/렌더링**은 롤백 대상
- **서버 OpenAPI JSON 제공**은 유지
- **TypeDoc/Storybook**은 DMS 수집 대상(정적 산출물)

### 문서 전환 원칙

- 자동 생성 문서(TypeDoc/Storybook)로 대체 가능한 레퍼런스는 단계적으로 정리한다.
- 대체 완료 기준: 자동 생성 문서가 동일/상위 품질로 제공되고, 링크/탐색이 보장될 때만 기존 문서를 정리한다.
- 전환은 문서 섹션 단위로 진행하고, 공지/링크 리디렉션을 포함한다.

---

## PMS 적용 내역

| 날짜 | 변경 내용 | 상태 |
|------|----------|------|
| 2026-01-21 | apps/web → apps/web/pms 리네임 완료 | ✅ |
| 2026-01-21 | apps/web-dms 디렉토리 슬롯 준비 | ✅ |
| 2026-01-21 | PMS 문서 UI/렌더링 롤백 | 🔄 |

---

## 표준 작업 프로세스 준수

모든 작업은 아래 순서로 진행한다.

1. 코드 변경
2. 문서 업데이트
3. 커밋

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-21 | PMS 문서 시스템 롤백 기준 정리 |
| 2026-01-21 | web 앱 명칭을 web-pms로 정리 |
