# DMS 변경 이력

> 최종 업데이트: 2026-01-27

---

## 2026-01-27

### 문서

- **문서 구조 개편**: PMS 양식에 맞춰 문서 체계 재구성
  - `development/` 하위에 architecture/, domain/, design/, guides/, planning/ 생성
  - 기존 문서 재배치 및 신규 문서 작성
- **정합성 검증 완료**: 실제 코드와 문서 100% 일치 확인
  - Hooks: 9개 (라인 수 검증)
  - Components: 35개
  - API: 19개

### 이동된 문서

| 기존 위치 | 새 위치 |
|----------|---------|
| `docs/dms/architecture/tech-stack.md` | `development/architecture/` |
| `docs/dms/architecture/package-spec.md` | `development/architecture/` |

---

## 2026-01-21

### 문서

- DMS 문서 구조 정리 계획 초안 작성
- 위키 통합 계획 문서 추가
- TypeDoc/Storybook 역할 정리

---

## 변경 유형 범례

| 태그 | 설명 |
|------|------|
| 기능 | 새로운 기능 추가 |
| 수정 | 버그 수정 |
| 리팩터링 | 코드 구조 개선 |
| 문서 | 문서화 작업 |
| 설정 | 설정 파일 변경 |
| 스타일 | UI/UX 개선 |
