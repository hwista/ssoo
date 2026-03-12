# 도큐먼트 관리 시스템 통합 계획

> 작성일: 2026-01-21  
> 상태: 진행 중  
> 범위: 도큐먼트 관리 시스템(DMS) + 공용 백엔드 + PMS 연동

---

## 개요

도큐먼트 관리 시스템(DMS)을 모노레포에 통합하고, 추후 공용 백엔드(server)와 연동할 수 있는 구조로 정리한다. DMS는 별도 빌드/배포를 유지하되, 문서/산출물 연동을 위한 구조적 기반을 마련한다.

---

## 목적

- 문서 관리(DMS)와 프로젝트 산출물 연결
- 공용 백엔드 기반의 권한/사용자/조직 정보 공유
- 문서 시스템의 단일 허브화 및 중복 제거
- 운영/개발 문서의 일관된 접근 방식 유지

---

## 문제 정의

- 문서 시스템이 여러 곳에 분산될 경우, 권한/검색/원본 관리가 이원화됨
- 현재 /docs 기반 문서 시스템은 향후 DMS와 중복될 가능성이 높음
- DMS는 독립 배포를 유지해야 하므로, 모노레포 내 통합 구조가 필요

---

## 해결 방안

### 구조

```
apps/
  server/   # 공용 백엔드 (4000)
  web/
    pms/    # 프로젝트 관리 (3000)
    dms/    # 도큐먼트 관리 시스템 (3001)
packages/
  types/
  ui/
  config/
```

- DMS는 GitLab 레포를 submodule로 연결
- 각 앱은 독립 빌드/배포
- 공용 백엔드는 모듈러 모노리스 구조로 확장

### 모듈러 모노리스 구조 (초안)

```
apps/server/src/
  common/            # 공용 유틸/응답/가드
  database/          # Prisma/DB 접근 계층
  modules/
    common/
      auth/          # 인증/토큰
      user/          # 사용자/조직
      health/        # 헬스체크
    pms/
      menu/          # 메뉴/권한
      project/       # 프로젝트 도메인
    docs/            # 문서/산출물(추후)
  app.module.ts
  main.ts
```

- 모듈 경계 기준은 **도메인/권한/데이터 소유권**으로 분리
- 공용 레이어는 `common/`, 데이터 접근은 `database/`로 고정
- 각 모듈은 `controller/service/dto` 기본 구조를 유지

### 프론트 포함 모듈러 구조에 대한 판단

- `apps/`는 실행 단위(서버/웹앱)이고, 모듈은 실행 단위 내부로 두는 것이 기본이다.
- 프론트까지 공유해야 하는 도메인 로직이 있다면 `packages/`로 분리한다.
- 따라서 **서버 모듈은 `apps/server/src/modules`**, 공용 도메인 로직은 **`packages/`**로 정리한다.

### 권한 모델

- 프로젝트 시스템: 기능 접근 권한
- 도큐먼트 관리 시스템: 문서 접근 권한
- 권한 모델은 분리 설계, 백엔드에서 공통 사용자/조직 정보만 공유

### 문서 원본 정책

- 문서 원본은 파일 기반 유지
- DB는 보조 저장 또는 전수 전환 시에만 원본으로 사용
- 이원화는 금지 (전환 시 일괄 전환)
- 문서는 `docs/pms`, `docs/dms`로 **완전 분리**하여 관리
- 공통 문서는 별도 합치지 않고 필요 시 PMS/DMS에 동일 문서를 유지
- `docs/dms`는 DMS 소스 반영 이후에 채운다

### 연동 전략

- 도큐먼트 기본 루트: 전사/공용 문서
- 프로젝트 폴더: 프로젝트 산출물 전용 경로
- 시스템 문서: `/docs/{systemCode}` 등으로 분리 접근
  - 빌드 결과물에서는 하나의 `docs/`로 병합된 상태 유지

---

## 문서 시스템 구성 (DMS 기준)

### 계획했던 구성

1. **MDX 기반 가이드 문서**
2. **OpenAPI 렌더러 (ReDoc)**
3. **TypeDoc 기반 코드 레퍼런스**
4. **Storybook 기반 UI 문서**

### 구성 요소 역할

- **`@nestjs/swagger`**: 서버에서 OpenAPI JSON을 생성하는 용도 (필수)
- **Swagger UI**: OpenAPI를 화면에 보여주는 뷰어 (선택)
- **ReDoc**: OpenAPI를 화면에 보여주는 뷰어 (선택)

> ReDoc는 Swagger UI를 대체하는 **뷰어**이며, 서버의 OpenAPI JSON 생성(@nestjs/swagger)을 대체하지 않는다.

### TypeDoc/Storybook 역할

- **TypeDoc**: TypeScript 코드(클래스/함수/타입)를 자동으로 문서화해 “내부 API 레퍼런스”를 만든다.
- **Storybook**: UI 컴포넌트의 예제/Props/상호작용을 문서로 제공해 “디자인 시스템/컴포넌트 매뉴얼” 역할을 한다.

> 두 도구는 DMS에서 통합 제공하는 것이 구조적으로 적합하다.

### 현재 적용 상태

- `apps/server`: TypeDoc 설정 분리 (`typedoc.common.json`, `typedoc.pms.json`, `docs:typedoc`)
  - TypeDoc 출력(공용): `docs/common/reference/typedoc/server`
  - TypeDoc 출력(PMS): `docs/pms/reference/typedoc/server`
- `apps/web/pms`: TypeDoc/Storybook 설정 추가
  - TypeDoc 출력: `docs/pms/reference/typedoc/web`
  - Storybook 실행: `pnpm --filter web-pms storybook` (기본 포트 6006)
  - Storybook 빌드 출력: `docs/pms/reference/storybook`
- DMS는 생성된 결과물을 수집/렌더링하는 역할로 유지한다.
- 서버 공용 설정: Joi 기반 환경변수 검증 적용 (JWT/DB 필수, 미설정 시 부팅 실패)

### 문서 출력 경로 정책 (목표)

 - 공용 서버 레퍼런스(TypeDoc): `docs/common/reference/typedoc/server`
 - PMS 서버 레퍼런스(TypeDoc): `docs/pms/reference/typedoc/server`
 - PMS 웹 레퍼런스(TypeDoc): `docs/pms/reference/typedoc/web`
 - PMS 레퍼런스(Storybook): `docs/pms/reference/storybook`
- 생성 결과는 **빌드 시점에 복제/수집**하여 DMS가 접근하도록 정리한다.

---

## 실행 계획

### Phase 0: 준비

1. 통합 계획 문서화 (이 문서)
2. 롤백 포인트 확보 (현재 브랜치 상태 정리)
3. DMS submodule 연결 방식 확정

### Phase 1: 통합 구조 구성

1. `apps/web/dms` 디렉토리 준비
2. Git submodule 연결
3. `pnpm-workspace.yaml` 반영
4. Turborepo 파이프라인 추가 (DMS 빌드/린트)

### Phase 2: 운영 정책 정리

1. DMS 권한 체계 정의
2. 문서 원본 정책 명문화
3. 문서/프로젝트 문서 링크 규칙 정의

### Phase 3: 백엔드 연동 준비

1. server 모듈 구조 설계 (docs 모듈 분리)
2. 공용 사용자/조직 연동 계획 수립
3. 문서/산출물 메타데이터 구조 정의

---

## 표준 작업 프로세스 준수

모든 작업은 아래 순서로 진행한다.

1. 코드 변경
2. 문서 업데이트
3. 커밋

---

## Backlog

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| DOC-01 | DMS submodule 추가 | P1 | 🔲 대기 |
| DOC-02 | pnpm-workspace/turbo pipeline 반영 | P1 | 🔲 대기 |
| DOC-03 | DMS 권한 모델 초안 | P2 | 🔲 대기 |
| DOC-04 | 문서/산출물 연동 규칙 정의 | P2 | 🔲 대기 |
| DOC-05 | server docs 모듈 설계 | P3 | 🔲 대기 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-21 | DMS 통합 계획서 초안 작성 |
