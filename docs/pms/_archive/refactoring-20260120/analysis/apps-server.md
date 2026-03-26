# Phase 1.4: apps/server 분석

> 분석일: 2026-01-21  
> 상태: 완료

---

## 📋 분석 대상

| 파일/폴더 | 역할 | 분석 상태 |
|-----------|------|:--------:|
| `package.json` | 패키지 정의 | ✅ |
| `tsconfig.json` | TS 설정 | ✅ |
| `src/main.ts` | 엔트리 포인트 | ✅ |
| `src/app.module.ts` | 루트 모듈 | ✅ |
| `src/auth/` | 인증 모듈 | ✅ |
| `src/user/` | 사용자 모듈 | ✅ |
| `src/menu/` | 메뉴 모듈 | ✅ |
| `src/project/` | 프로젝트 모듈 | ✅ |
| `src/database/` | DB 연결 모듈 | ✅ |
| `src/health/` | 헬스체크 | ✅ |
| `src/common/` | 공통 유틸 | ✅ |

---

## 1. 전체 구조 분석

### 디렉터리 구조

```
apps/server/src/
├── main.ts                    # 엔트리 포인트
├── app.module.ts              # 루트 모듈
│
├── auth/                      # 인증 모듈
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/
│   │   ├── login.dto.ts
│   │   └── refresh-token.dto.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── public.decorator.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   ├── interfaces/
│   │   └── auth.interface.ts
│   └── strategies/
│       └── jwt.strategy.ts
│
├── user/                      # 사용자 모듈
│   ├── user.module.ts
│   ├── user.controller.ts
│   └── user.service.ts
│
├── menu/                      # 메뉴 모듈
│   ├── menu.module.ts
│   ├── menu.controller.ts
│   └── menu.service.ts
│
├── project/                   # 프로젝트 모듈
│   ├── project.module.ts
│   ├── project.controller.ts
│   └── project.service.ts
│
├── database/                  # DB 연결 모듈
│   ├── database.module.ts
│   └── database.service.ts
│
├── health/                    # 헬스체크
│   └── health.controller.ts
│
└── common/                    # 공통 유틸
    ├── index.ts
    └── interceptors/
        └── request-context.interceptor.ts
```

### 모듈 의존성 그래프

```
AppModule
    │
    ├── ConfigModule (전역)
    ├── DatabaseModule ─────────┐
    ├── AuthModule              │
    │   └── uses UserModule ────┤─── @ssoo/database
    ├── UserModule ─────────────┤
    ├── MenuModule ─────────────┤
    └── ProjectModule ──────────┘
```

---

## 2. 핵심 모듈 분석

### 2.1 main.ts

```typescript
const app = await NestFactory.create(AppModule);

// CORS 설정
app.enableCors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
});

// API 프리픽스
app.setGlobalPrefix('api');

// Validation Pipe
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

| 항목 | 상태 | 의견 |
|------|:----:|------|
| CORS | ✅ | 환경 변수 기반 |
| API Prefix | ✅ | `/api` 전역 설정 |
| Validation | ✅ | class-validator 연동 |
| Port | ✅ | 환경 변수 기반 (기본 4000) |

---

### 2.2 app.module.ts

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UserModule,
    MenuModule,
    ProjectModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
  ],
})
export class AppModule {}
```

| 항목 | 상태 | 의견 |
|------|:----:|------|
| ConfigModule | ✅ | 전역, .env 로드 |
| RequestContextInterceptor | ✅ | 히스토리 관리용 컨텍스트 |
| 모듈 구성 | ✅ | 적절한 분리 |

---

### 2.3 auth 모듈

#### 구조

| 파일 | 역할 |
|------|------|
| `auth.service.ts` | 로그인, 토큰 갱신, 로그아웃 |
| `auth.controller.ts` | `/api/auth/*` 엔드포인트 |
| `jwt.strategy.ts` | JWT 검증 전략 |
| `jwt-auth.guard.ts` | 인증 가드 |
| `current-user.decorator.ts` | 현재 사용자 데코레이터 |
| `auth.interface.ts` | TokenPayload, AuthTokens 타입 |

#### API 엔드포인트

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|:----:|------|
| POST | `/api/auth/login` | ✅ | 로그인 |
| POST | `/api/auth/refresh` | ✅ | 토큰 갱신 |
| POST | `/api/auth/logout` | ✅ | 로그아웃 |
| POST | `/api/auth/me` | ✅ | 현재 사용자 |

#### 분석 결과

| 항목 | 상태 | 의견 |
|------|:----:|------|
| bcrypt 암호화 | ✅ | bcryptjs 사용 |
| 계정 잠금 | ✅ | 5회 실패 시 30분 잠금 |
| Refresh Token | ✅ | DB 저장 + 해시 비교 |
| JWT 직렬화 | ✅ | BigInt → string 변환 |

---

### 2.4 database 모듈

```typescript
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly _client: ExtendedPrismaClient;

  constructor() {
    this._client = createPrismaClient();
  }

  async onModuleInit() {
    await this._client.$connect();
  }

  async onModuleDestroy() {
    await this._client.$disconnect();
  }
}
```

| 항목 | 상태 | 의견 |
|------|:----:|------|
| PrismaClient 확장 | ✅ | createPrismaClient로 Extension 적용 |
| 라이프사이클 | ✅ | 연결/해제 관리 |

---

### 2.5 menu 모듈

#### API 엔드포인트

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|:----:|------|
| GET | `/api/menus/my` | ✅ | 사용자 메뉴 트리 |

#### 분석 결과

| 항목 | 상태 | 의견 |
|------|:----:|------|
| Raw SQL | ✅ | 복잡한 JOIN을 위해 사용 |
| 트리 변환 | ✅ | buildMenuTree 구현 |
| 권한 체크 | ✅ | cm_user_menu_r 테이블 사용 |

---

### 2.6 project 모듈

#### API 엔드포인트

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|:----:|------|
| GET | `/api/projects` | ✅ | 목록 조회 |
| GET | `/api/projects/:id` | ✅ | 단건 조회 |
| POST | `/api/projects` | ✅ | 생성 |
| PUT | `/api/projects/:id` | ✅ | 수정 |
| DELETE | `/api/projects/:id` | ✅ | 삭제 |

#### 분석 결과

| 항목 | 상태 | 의견 |
|------|:----:|------|
| CRUD | ✅ | 기본 구현 |
| 페이지네이션 | ✅ | PaginationParams 사용 |
| 인증 | ✅ | JwtAuthGuard + RolesGuard 적용 |
| @ssoo/types 사용 | ✅ | DTO 타입 공유 |

---

### 2.7 common/interceptors

```typescript
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const requestContext: RequestContext = {
      userId: user?.userId ? BigInt(user.userId) : undefined,
      source: 'API',
      transactionId: uuidv4(),
    };
    
    return runWithContext(requestContext, () => next.handle());
  }
}
```

| 항목 | 상태 | 의견 |
|------|:----:|------|
| RequestContext 연동 | ✅ | @ssoo/database 연동 |
| transactionId 생성 | ✅ | 요청별 UUID |
| userId 전달 | ✅ | JWT에서 추출 |

---

## 3. 패키지 의존성 분석

### @ssoo/database 사용

```typescript
// database.service.ts
import { createPrismaClient } from '@ssoo/database';  // ✅ 사용

// request-context.interceptor.ts
import { runWithContext, RequestContext } from '@ssoo/database';  // ✅ 사용
```

### @ssoo/types 사용

```typescript
// project.service.ts, project.controller.ts
import type { CreateProjectDto, UpdateProjectDto, PaginationParams } from '@ssoo/types';

// health.controller.ts
import type { ApiResponse } from '@ssoo/types';
```

---

## 4. 발견된 이슈

### 4.1 심각도 높음 🔴

| # | 내용 | 위치 | 영향 |
|---|------|------|------|
| - | 없음 | - | - |

### 4.2 심각도 중간 🟡

| # | 내용 | 위치 | 영향 |
|---|------|------|------|
| - | 없음 | - | - |

### 4.3 심각도 낮음 🟢

| # | 내용 | 위치 | 영향 |
|---|------|------|------|
| 4 | DTO 클래스 검증 데코레이터 확인 필요 | auth/dto/*.ts | 유효성 검사 |

---

## 5. 전체 구조 다이어그램

```
apps/server/
├── package.json             ✅ NestJS 10.x + JWT
├── tsconfig.json            ✅ CommonJS (NestJS 호환)
│
└── src/
    ├── main.ts              ✅ CORS, Validation 설정
    ├── app.module.ts        ✅ 모듈 구성 적절
    │
    ├── auth/                ✅ JWT 인증 완비
    │   ├── *.module/controller/service.ts
    │   ├── dto/             ✅ 요청 DTO
    │   ├── decorators/      ✅ @CurrentUser, @Public
    │   ├── guards/          ✅ JwtAuthGuard
    │   ├── interfaces/      ✅ 타입 정의
    │   └── strategies/      ✅ JWT Strategy
    │
    ├── user/                ✅ 기본 구현
    ├── menu/                ✅ 메뉴 트리 조회
    ├── project/             ✅ 인증 적용
    │
    ├── database/            ✅ Extension 적용
    │   └── database.service.ts
    │
    ├── health/              ✅ 헬스체크
    └── common/
        └── interceptors/    ✅ RequestContext 연동
```

---

## 📊 분석 요약

### 현재 상태 평가

| 영역 | 점수 | 비고 |
|------|:----:|------|
| 전체 구조 | 9/10 | NestJS 표준 준수 |
| 인증 모듈 | 9/10 | JWT + Refresh 완비 |
| DB 연동 | 8/10 | Extension 적용 |
| API 보안 | 8/10 | 주요 API 인증 적용 |
| 타입 공유 | 9/10 | @ssoo/types 잘 활용 |
| **종합** | **8.5/10** | 양호 |

### 권장 조치

1. **Phase 2에서 검토 필요**
   - 추가 권한 정책/감사 로그 확장 여부

---

## ✅ 분석 완료 체크

- [x] main.ts
- [x] app.module.ts
- [x] auth 모듈 전체
- [x] user 모듈
- [x] menu 모듈
- [x] project 모듈
- [x] database 모듈
- [x] health 모듈
- [x] common 모듈
- [x] 패키지 의존성

---

## 📎 다음 단계

→ [Phase 1.5: apps/web-pms 분석](apps-web.md)

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-21 | 인증/프로젝트/DB 분석 내용 최신화 |
