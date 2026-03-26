# 테스트 작성 프롬프트

코드 작성 후 테스트 코드를 생성할 때 이 프롬프트를 따르세요.

---

## 테스트 생성 절차

### 1단계: 대상 코드 분석

```markdown
## 대상 코드 분석

| 항목 | 값 |
|------|-----|
| 파일 | `{파일 경로}` |
| 타입 | Service / Controller / Hook / Component / Utility |
| 주요 함수 | `{함수 목록}` |
| 의존성 | `{주입받는 서비스/모듈}` |
```

### 2단계: 테스트 케이스 도출

각 함수/메서드에 대해:

1. **정상 케이스** (Happy Path) - P0
2. **에러 케이스** (Error Path) - P0/P1
3. **경계값** (Boundary) - P1/P2
4. **엣지 케이스** (Edge) - P2/P3

### 3단계: 테스트 코드 작성

```typescript
describe('{테스트 대상}', () => {
  // Setup
  beforeEach(() => { /* 공통 설정 */ });

  describe('{메서드명}', () => {
    // TC-{도메인}-{번호}: {설명}
    it('should {예상 동작} when {조건}', async () => {
      // Arrange - 준비
      // Act - 실행
      // Assert - 검증
    });
  });
});
```

---

## 테스트 유형별 템플릿

### NestJS Service 테스트

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { {ServiceName} } from './{service-name}.service';
import { PrismaService } from '@/database/prisma.service';

describe('{ServiceName}', () => {
  let service: {ServiceName};
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    {modelName}: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {ServiceName},
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<{ServiceName}>({ServiceName});
    prisma = module.get(PrismaService);
    
    jest.clearAllMocks();
  });

  describe('{methodName}', () => {
    it('should return {expected} when {condition}', async () => {
      // Arrange
      mockPrisma.{modelName}.{method}.mockResolvedValue({mockData});

      // Act
      const result = await service.{methodName}({input});

      // Assert
      expect(result).toEqual({expected});
      expect(mockPrisma.{modelName}.{method}).toHaveBeenCalledWith({expectedArgs});
    });

    it('should throw {ErrorType} when {errorCondition}', async () => {
      // Arrange
      mockPrisma.{modelName}.{method}.mockResolvedValue(null);

      // Act & Assert
      await expect(service.{methodName}({input}))
        .rejects.toThrow({ErrorType});
    });
  });
});
```

### React 컴포넌트 테스트

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { {ComponentName} } from './{ComponentName}';

describe('{ComponentName}', () => {
  const defaultProps = {
    // 기본 props
  };

  const renderComponent = (props = {}) => {
    return render(<{ComponentName} {...defaultProps} {...props} />);
  };

  it('should render correctly', () => {
    renderComponent();
    expect(screen.getByRole('{role}')).toBeInTheDocument();
  });

  it('should call {handler} when {action}', async () => {
    const handler = jest.fn();
    renderComponent({ {handlerProp}: handler });

    await userEvent.click(screen.getByRole('button'));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should display error when {errorCondition}', async () => {
    renderComponent({ error: 'Error message' });
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });
});
```

### Zustand 스토어 테스트

```typescript
import { renderHook, act } from '@testing-library/react';
import { use{StoreName} } from './{store-name}.store';

describe('{StoreName}', () => {
  beforeEach(() => {
    // 스토어 초기화
    const { result } = renderHook(() => use{StoreName}());
    act(() => {
      result.current.reset?.();
    });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => use{StoreName}());
    
    expect(result.current.{stateField}).toBe({defaultValue});
  });

  it('should update state when {action} is called', () => {
    const { result } = renderHook(() => use{StoreName}());

    act(() => {
      result.current.{actionName}({input});
    });

    expect(result.current.{stateField}).toBe({expectedValue});
  });
});
```

### API E2E 테스트

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/database/prisma.service';

describe('{ControllerName} (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // 테스트 데이터 초기화
  });

  describe('GET /api/{resource}', () => {
    it('should return 200 and list', () => {
      return request(app.getHttpServer())
        .get('/api/{resource}')
        .set('Authorization', 'Bearer {token}')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('POST /api/{resource}', () => {
    it('should return 201 and created resource', () => {
      return request(app.getHttpServer())
        .post('/api/{resource}')
        .set('Authorization', 'Bearer {token}')
        .send({ /* request body */ })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
        });
    });

    it('should return 400 when validation fails', () => {
      return request(app.getHttpServer())
        .post('/api/{resource}')
        .set('Authorization', 'Bearer {token}')
        .send({ /* invalid body */ })
        .expect(400);
    });
  });
});
```

---

## 테스트 커버리지 목표

| 영역 | 목표 | 우선순위 |
|------|------|----------|
| 인증/인가 | 100% | P0 |
| 핵심 비즈니스 로직 | 80%+ | P0-P1 |
| API 엔드포인트 | 80%+ | P1 |
| 유틸리티 함수 | 90%+ | P1 |
| UI 컴포넌트 | 60%+ | P2 |

---

## 체크리스트

테스트 작성 완료 후 확인:

- [ ] 모든 P0 케이스 커버
- [ ] 에러 케이스 포함
- [ ] Mock 올바르게 설정
- [ ] 테스트 격리 (beforeEach에서 초기화)
- [ ] 테스트 실행 통과
- [ ] 테스트 파일 위치 올바름
