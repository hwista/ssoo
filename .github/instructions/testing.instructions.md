---
applyTo: "apps/**/tests/**,**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx"
---

# 테스트 작성 규칙

> 이 규칙은 테스트 파일 작업 시 적용됩니다.

---

## 테스트 철학

1. **코드 작성 후 테스트 필수** - 기능 구현 후 반드시 테스트 작성
2. **Jest 미도입이라도 테스트 코드 작성** - 추후 Jest 도입 대비
3. **수동 테스트 시나리오 문서화** - 자동화 전까지 수동 검증 가이드

---

## 테스트 우선순위

| 등급 | 설명 | 자동화 우선 |
|------|------|------------|
| **P0** | 핵심 기능 (로그인, 권한) | 🔴 필수 |
| **P1** | 주요 기능 (CRUD) | 🟠 권장 |
| **P2** | 보조 기능 | 🟡 선택 |
| **P3** | 엣지 케이스 | ⚪ 여유 시 |

---

## 테스트 파일 구조

```
tests/
├── unit/                  # 단위 테스트
│   ├── services/          # 서비스 테스트
│   ├── utils/             # 유틸리티 테스트
│   └── hooks/             # 훅 테스트
├── integration/           # 통합 테스트
│   └── api/               # API 엔드포인트 테스트
└── e2e/                   # E2E 테스트 (Playwright)
    └── flows/             # 사용자 플로우 테스트
```

---

## 테스트 케이스 형식

```typescript
/**
 * 테스트 케이스 ID: TC-{도메인}-{번호}
 * 우선순위: P0/P1/P2/P3
 * 
 * @description 테스트 설명
 * @precondition 전제조건
 * @input 입력 값
 * @expected 예상 결과
 */
describe('UserService', () => {
  describe('login', () => {
    // TC-AUTH-01: 정상 로그인
    it('should return tokens when credentials are valid', async () => {
      // Arrange
      const input = { loginId: 'admin', password: 'admin123!' };
      
      // Act
      const result = await userService.login(input);
      
      // Assert
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    // TC-AUTH-02: 잘못된 비밀번호
    it('should throw UnauthorizedException when password is wrong', async () => {
      // Arrange
      const input = { loginId: 'admin', password: 'wrong' };
      
      // Act & Assert
      await expect(userService.login(input)).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

---

## 백엔드 테스트 (NestJS + Jest)

### 설정

```typescript
// jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
```

### 서비스 테스트 패턴

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '@/database/prisma.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            cmUserM: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  // 테스트 케이스...
});
```

### API 테스트 패턴 (Supertest)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/auth/login (POST)', () => {
    it('should return 200 and tokens', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ loginId: 'admin', password: 'admin123!' })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
        });
    });
  });
});
```

---

## 프론트엔드 테스트

### 컴포넌트 테스트 (React Testing Library)

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

### 훅 테스트 (renderHook)

```typescript
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '@/stores';

describe('useAuthStore', () => {
  it('should set user', () => {
    const { result } = renderHook(() => useAuthStore());
    
    act(() => {
      result.current.setUser({ id: '1', name: 'Test' });
    });
    
    expect(result.current.user).toEqual({ id: '1', name: 'Test' });
  });
});
```

---

## E2E 테스트 (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="loginId"]', 'admin');
    await page.fill('[name="password"]', 'admin123!');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/');
    await expect(page.locator('.user-name')).toContainText('관리자');
  });
});
```

---

## 수동 테스트 문서 형식

Jest 미도입 시 수동 테스트 문서 형식:

```markdown
### TC-AUTH-01: 정상 로그인

| 항목 | 내용 |
|------|------|
| **우선순위** | P0 |
| **전제조건** | 활성 사용자 존재 |
| **입력** | loginId: admin, password: admin123! |
| **실행 단계** | 1. POST /api/auth/login 요청 |
| **예상 결과** | 200 OK, tokens 반환 |
| **검증 항목** | accessToken JWT 형식 |
| **자동화** | ✅ 가능 |
| **테스트 결과** | ✅ PASS / ❌ FAIL |
| **테스트 일자** | 2026-02-04 |
| **테스터** | 홍길동 |
```

---

## CI/CD 통합 (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Test

on:
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test
      - run: pnpm test:e2e
```

---

## 테스트 작성 체크리스트

코드 작성 후 확인:

- [ ] 단위 테스트 작성 (서비스, 유틸리티)
- [ ] P0 케이스 모두 커버
- [ ] 에러 케이스 테스트
- [ ] 경계값 테스트
- [ ] 수동 테스트 시나리오 문서화
- [ ] 테스트 실행 및 통과 확인

---

## 관련 문서

**테스트 케이스**:
- [테스트 문서 인덱스](../../docs/pms/tests/README.md) - 테스트 상태 추적, 자동화 계획
- [인증 테스트](../../docs/pms/tests/auth/) - 로그인, 로그아웃, 토큰 갱신
