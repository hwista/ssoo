---
applyTo: "**/*.{test,spec}.*"
---

# Codex Testing Instructions

> 최종 업데이트: 2026-02-27
> 정본: `.github/instructions/testing.instructions.md`

## 테스트 철학

1. **코드 작성 후 테스트 필수** - 기능 구현 후 반드시 테스트 작성
2. **Jest 미도입이라도 테스트 코드 작성** - 추후 도입 대비
3. **수동 테스트 시나리오 문서화** - 자동화 전까지 수동 검증 가이드

## 테스트 우선순위

| 등급 | 설명 | 자동화 |
|------|------|--------|
| P0 | 핵심 기능 (로그인, 권한) | 필수 |
| P1 | 주요 기능 (CRUD) | 권장 |
| P2 | 보조 기능 | 선택 |
| P3 | 엣지 케이스 | 여유 시 |

## 테스트 파일 구조

```
tests/
├── unit/                  # 단위 테스트
│   ├── services/
│   ├── utils/
│   └── hooks/
├── integration/           # 통합 테스트
│   └── api/
└── e2e/                   # E2E 테스트 (Playwright)
    └── flows/
```

## 테스트 케이스 형식

```typescript
// AAA 패턴: Arrange → Act → Assert
describe('UserService', () => {
  describe('login', () => {
    it('should return tokens when credentials are valid', async () => {
      // Arrange
      const input = { loginId: 'admin', password: 'admin123!' };
      // Act
      const result = await userService.login(input);
      // Assert
      expect(result.accessToken).toBeDefined();
    });
  });
});
```

## 백엔드 테스트 패턴

- NestJS `Test.createTestingModule` 사용
- `PrismaService` mock 주입
- API 테스트: Supertest 사용

## 프론트엔드 테스트 패턴

- 컴포넌트: React Testing Library (`render`, `screen`, `fireEvent`)
- 훅: `renderHook` + `act`
- E2E: Playwright

## 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 테스트 파일 | `*.spec.ts` (백엔드), `*.test.tsx` (프론트) | `user.service.spec.ts` |
| 테스트 케이스 ID | `TC-{도메인}-{번호}` | `TC-AUTH-01` |
| describe | 테스트 대상 클래스/함수명 | `describe('UserService')` |
| it | should + 예상 행동 | `it('should return tokens')` |

## 테스트 작성 체크리스트

- [ ] 단위 테스트 작성 (서비스, 유틸리티)
- [ ] P0 케이스 모두 커버
- [ ] 에러 케이스 테스트
- [ ] 경계값 테스트
- [ ] 수동 테스트 시나리오 문서화

## 검증

- 실행: `pnpm test` 또는 각 앱/패키지 테스트 명령

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-02-27 | 테스트철학/우선순위/구조/패턴/네이밍/체크리스트 추가 |
| 2026-02-22 | Codex Testing 정본 신설 |
