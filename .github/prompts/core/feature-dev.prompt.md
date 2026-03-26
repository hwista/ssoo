# 기능 개발 프롬프트

> 새 기능 개발 시 사용하는 통합 프롬프트

---

## 기본 사용법

```markdown
@orchestrator.agent.md

## 작업: [기능명]

### 요구사항
- [스펙 1]
- [스펙 2]

### 참조 (기존 패턴)
- 유사 기능: [기존 파일/모듈 경로]

### 완료 조건
1. ✅ 기능 구현
2. ✅ 기존 패턴과 100% 일치 확인
3. ✅ Dead Code 없음
4. ✅ 문서 업데이트 (Changelog)
```

---

## 예시: 백엔드 API 추가

```markdown
@orchestrator.agent.md

## 작업: [도메인] 관리 API

### 요구사항
- [도메인] CRUD API
- [비즈니스 로직 1]
- 목록 조회 (페이지네이션)

### 참조 (기존 패턴)
- 유사 기능: [backend-path]/[similar-module]/

### 완료 조건
1. ✅ Controller, Service, Module, DTO 구현
2. ✅ API 문서 자동 생성
3. ✅ 기존 [similar-module] 패턴과 일치
4. ✅ 테스트 추가
```

---

## 예시: 프론트엔드 페이지 추가

```markdown
@orchestrator.agent.md

## 작업: [도메인] 관리 페이지

### 요구사항
- 목록 테이블
- 추가/수정 폼
- [비즈니스 로직]

### 참조 (기존 패턴)
- 유사 기능: [frontend-path]/[similar-page]/

### 완료 조건
1. ✅ 페이지 컴포넌트 구현
2. ✅ API 연동
3. ✅ 기존 [similar-page] 패턴과 일치
4. ✅ 반응형 레이아웃
```

---

## 단축 버전

빠른 작업 시:

```markdown
@developer.agent.md
[기능] 구현. 참조: [기존 파일]. 패턴 일치 필수.
```

---

## 변수

| 변수 | 설명 | 예시 |
|------|------|------|
| `[기능명]` | 구현할 기능 이름 | 사용자의 프로젝트에 맞게 |
| `[스펙 N]` | 세부 요구사항 | 비즈니스 요구사항 |
| `[backend-path]` | 백엔드 소스 경로 | `src/`, `apps/api/src/` |
| `[frontend-path]` | 프론트엔드 소스 경로 | `src/`, `apps/web/src/` |
| `[similar-module]` | 참조할 유사 모듈 | 기존 코드에서 유사 기능 |
| `[similar-page]` | 참조할 유사 페이지 | 기존 코드에서 유사 UI |

---

## 체크리스트 (자동 적용)

- [ ] 기존 코드 패턴 분석
- [ ] 네이밍 규칙 일치
- [ ] 폴더 구조 일치
- [ ] Export 방식 일치 (명시적 re-export)
- [ ] DTO/타입 패턴 일치
- [ ] 에러 처리 패턴 일치
- [ ] Dead Code 없음
- [ ] any 타입 없음
- [ ] 문서 Changelog 업데이트
