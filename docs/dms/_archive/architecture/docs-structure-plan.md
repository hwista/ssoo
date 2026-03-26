# 문서 구조 정리 계획 (DMS)

> 작성일: 2026-01-21  
> 완료일: 2026-01-27  
> 상태: ✅ 완료  
> 목적: DMS 문서를 PMS 구조와 대칭으로 정리하기 위한 기준을 확정

---

## ✅ 완료된 구조

```
docs/dms/                    # DMS 문서 정본
├── README.md                # 문서 인덱스
├── AGENTS.md                # 에이전트 온보딩 가이드
├── tutorials/               # Tutorial
├── guides/                  # How-to
├── reference/               # Reference
├── explanation/             # Explanation
│   ├── architecture/
│   ├── domain/
│   └── design/
├── planning/                # 계획/진행 문서
├── tests/
└── _archive/                # 레거시 문서 아카이브
```

---

## 적용된 원칙

1. **`docs/dms/` 단일 정본**
2. **PMS와 대칭 구조** (tutorials/guides/reference/explanation/planning/tests)
3. **런타임 위키 자산 분리** (`apps/web/dms/data/wiki/`)

---

## 완료 항목

| ID | 항목 | 상태 |
|----|------|------|
| DMS-DOC-01 | DMS 문서 구조 수립 | ✅ 완료 |
| DMS-DOC-02 | DMS 문서 인덱스 구성 | ✅ 완료 |
| DMS-DOC-03 | DMS 문서 정본 단일화(`docs/dms`) | ✅ 완료 |
| DMS-DOC-04 | README 리팩토링 | ✅ 완료 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-21 | DMS 문서 구조 정리 계획 초안 작성 |
| 2026-01-27 | 구조 정리 완료 - DMS 내부를 정본으로 확정 |
| 2026-02-23 | `apps/web/dms/docs` 제거, 위키 자산을 `apps/web/dms/data/wiki`로 분리 |
