# 검증 프롬프트

> 구현 결과를 검증하고 패턴 일치를 확인하는 프롬프트

---

## 기본 사용법

```markdown
@reviewer.agent.md

## 검토 대상
[파일 경로 또는 기능명]

## 검토 기준
1. 기능 동작 정확성
2. copilot-instructions.md 규칙 준수
3. 기존 코드 패턴 일치
4. Dead Code 없음
5. any 타입 없음
```

---

## 예시: 특정 파일 검토

```markdown
@reviewer.agent.md

## 검토 대상
[검토할 파일/폴더 경로]

## 검토 기준
1. 기능 동작 정확성 - 요구사항 충족
2. copilot-instructions.md 규칙 준수
3. 기존 코드 패턴 일치 - [similar-module] 참조
4. Dead Code 없음
5. any 타입 없음

## 추가 확인
- API 문서 자동 생성 여부
- 에러 응답 형식 일관성
```

---

## 예시: 일관성 검증

```markdown
@reviewer.agent.md

## 일관성 검증 요청
신규 구현: [new-module-path]
기존 참조: [similar-module-path]

## 체크리스트
- [ ] 네이밍 규칙 일치
- [ ] 폴더 구조 일치
- [ ] Export 방식 일치
- [ ] DTO/타입 패턴 일치
- [ ] 에러 처리 패턴 일치

## 불일치 발견 시
- 기존 패턴에 맞춰 리팩토링 제안
```

---

## 예시: 커밋 범위 검토

```markdown
@reviewer.agent.md

## 검토 대상
마지막 커밋 (또는 특정 커밋 범위)

## 검토 기준
1. 변경된 파일들의 일관성
2. 불필요한 변경 없음
3. 커밋 메시지 규칙 준수
4. 문서 업데이트 포함 여부
```

---

## 단축 버전

빠른 검증 시:

```markdown
@reviewer.agent.md
[파일] 검토. 기존 패턴 일치 + Dead Code 확인.
```

---

## 검토 결과 형식

검토 후 다음 형식으로 결과 제공:

```markdown
## 검토 결과

### ✅ 통과 항목
- ...

### ⚠️ 주의 항목
- ...

### ❌ 수정 필요
- [파일:라인] 문제 설명
- 권장 수정: ...

### 종합 판정
- [ ] 승인 (Approve)
- [ ] 수정 후 재검토 (Request Changes)
```

---

## 자동 체크 항목

| 항목 | 검증 방법 |
|------|----------|
| 네이밍 규칙 | copilot-instructions.md 참조 |
| 폴더 구조 | 기존 유사 모듈과 비교 |
| Export 방식 | 와일드카드 export 사용 금지 |
| Dead Code | 미사용 import, 함수, 변수 |
| any 타입 | TypeScript strict 준수 |
| 문서 동기화 | Changelog 업데이트 여부 |
