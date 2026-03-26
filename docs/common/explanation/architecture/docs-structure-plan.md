# 문서 구조 정리 계획

> 작성일: 2026-01-21  
> 상태: 적용 완료  
> 목적: PMS 문서를 기준으로 구조를 정리하고 이관 기준을 확정

---

## 목표 구조

```
docs/
  pms/               # 프로젝트 관리 시스템 문서
  pms/common/        # PMS 공통 가이드/프로세스/운영
  pms/api/           # PMS API 문서
  pms/architecture/  # PMS 아키텍처
  pms/database/      # PMS DB 설계/스키마
  pms/_archive/      # PMS 아카이브
```

---

## 이관 원칙

1. **현재 문서는 PMS 기준으로 정리**하고 `docs/pms`에 수렴
2. **공통 분리는 보류**하고 필요 시 동일 문서를 복제 유지
3. 이관은 **문서 단위로 체크포인트 커밋**

---

## 이관 매핑

### 루트 문서

| 현재 경로 | 대상 경로 | 구분 |
|---|---|---|
| `docs/README.md` | `docs/README.md` | 허브 유지 |
| `docs/SETUP.md` | `docs/pms/common/setup.md` | PMS 공통 |
| `docs/ROADMAP.md` | `docs/pms/common/roadmap.md` | PMS 공통 |
| `docs/BACKLOG.md` | `docs/pms/common/backlog.md` | PMS 공통 |
| `docs/CHANGELOG.md` | `docs/pms/common/changelog.md` | PMS 공통 |

### 도메인

| 현재 경로 | 대상 경로 | 구분 |
|---|---|---|
| `docs/domain/service-overview.md` | `docs/pms/domain/service-overview.md` | PMS |
| `docs/domain/concepts.md` | `docs/pms/domain/concepts.md` | PMS |
| `docs/domain/menu-structure.md` | `docs/pms/domain/menu-structure.md` | PMS |
| `docs/domain/actions/*` | `docs/pms/domain/actions/*` | PMS |
| `docs/domain/workflows/*` | `docs/pms/domain/workflows/*` | PMS |

### 아키텍처

| 현재 경로 | 대상 경로 | 구분 |
|---|---|---|
| `docs/architecture/*` | `docs/pms/architecture/*` | PMS |

### API

| 현재 경로 | 대상 경로 | 구분 |
|---|---|---|
| `docs/api/*` | `docs/pms/api/*` | PMS |

### DB

| 현재 경로 | 대상 경로 | 구분 |
|---|---|---|
| `docs/pms/database/*` | `docs/pms/database/*` | PMS |

### UI/테스트

| 현재 경로 | 대상 경로 | 구분 |
|---|---|---|
| `docs/ui-design/*` | `docs/pms/ui-design/*` | PMS |
| `docs/tests/*` | `docs/pms/tests/*` | PMS |

---

## 실행 단계

1. **이관 매핑 확정** (이 문서 기준)
2. **폴더 정리**: `docs/pms`로 구조 수렴
3. **문서 이동** + 링크/인덱스 갱신
4. **CHANGELOG/README 업데이트**
5. **체크포인트 커밋**

---

## 실행 로그

| 날짜 | 내용 | 상태 |
|------|------|------|
| 2026-01-21 | PMS 기준 구조로 문서 이동 | ✅ |
| 2026-01-21 | 인덱스/링크 정리 | ✅ |

---

## 적용 결과 요약

- `docs/tests`, `docs/ui-design`은 `docs/pms`로 이동
- `docs/api`, `docs/architecture`, `docs/database`, `docs/_archive`는 `docs/pms`로 이동
- PMS 공통 문서는 `docs/pms/common`에 정리
- `docs/README.md`는 구조 허브로 재작성

---

## Backlog

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| DOCS-01 | 문서 구조 이관 매핑 확정 | P1 | ✅ 완료 |
| DOCS-02 | PMS 기준 구조 수렴 | P1 | ✅ 완료 |
| DOCS-03 | 문서 이동 및 링크 정리 | P1 | ✅ 완료 |
| DOCS-04 | 문서 인덱스 갱신 | P1 | ✅ 완료 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-21 | 문서 구조 정리 계획 초안 작성 |
| 2026-01-21 | 적용 결과 반영 및 상태 갱신 |
