# 문서 구조 정리 계획 (DMS)

> 작성일: 2026-01-21  
> 완료일: 2026-01-27  
> 상태: ✅ 완료  
> 목적: DMS 문서를 PMS 구조와 대칭으로 정리하기 위한 기준을 확정

---

## ✅ 완료된 구조

```
apps/web/dms/docs/development/   # DMS 내부 정본
├── README.md                    # 문서 인덱스
├── architecture/                # 아키텍처 문서
│   ├── tech-stack.md
│   ├── package-spec.md
│   └── docs-structure-plan.md
├── domain/                      # 도메인 문서
│   └── service-overview.md
├── design/                      # 디자인 문서
│   └── design-system.md
├── guides/                      # 개발 가이드
│   ├── hooks.md
│   ├── components.md
│   └── api.md
├── planning/                    # 계획/진행 문서
│   ├── README.md
│   ├── roadmap.md
│   ├── backlog.md
│   └── changelog.md
└── _archive/                    # 아카이브
```

---

## 적용된 원칙

1. **DMS 내부 문서가 정본** (`apps/web/dms/docs/development/`)
2. **모노레포 `docs/dms`는 참조용** (통합 계획 문서만 유지)
3. **PMS와 대칭 구조** (architecture/, domain/, design/, guides/, planning/)

---

## 완료 항목

| ID | 항목 | 상태 |
|----|------|------|
| DMS-DOC-01 | DMS 문서 구조 수립 | ✅ 완료 |
| DMS-DOC-02 | DMS 문서 인덱스 구성 | ✅ 완료 |
| DMS-DOC-03 | docs/dms → DMS 내부 이관 | ✅ 완료 |
| DMS-DOC-04 | README 리팩토링 | ✅ 완료 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-21 | DMS 문서 구조 정리 계획 초안 작성 |
| 2026-01-27 | 구조 정리 완료 - DMS 내부를 정본으로 확정 |
