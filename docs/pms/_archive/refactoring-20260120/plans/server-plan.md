# Server 리팩터링 계획서

> 대상: `apps/server/`  
> 우선순위: P0-P1  
> 예상 소요: 30분

---

## 🎯 목표

1. DatabaseService에 Extension 적용
2. ProjectController 인증 가드 추가
3. 응답 형식 공용화 및 통일

---

## 📋 작업 목록

### SRV-01: DatabaseService Extension 적용 (P0)

**현재 상태:**
```typescript
// apps/server/src/database/database.service.ts
@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**문제:**
- `@ssoo/database`의 `commonColumnsExtension` 미사용
- `createdAt`, `updatedAt`, `deletedAt` 자동 처리 안됨

**수정 방안:**

```typescript
// apps/server/src/database/database.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createPrismaClient, ExtendedPrismaClient } from '@ssoo/database';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private _client: ExtendedPrismaClient;

  constructor() {
    this._client = createPrismaClient();
  }

  async onModuleInit() {
    await this._client.$connect();
  }

  async onModuleDestroy() {
    await this._client.$disconnect();
  }

  // Prisma 클라이언트 모델들을 직접 노출
  get user() { return this._client.user; }
  get project() { return this._client.project; }
  get menu() { return this._client.menu; }
  // ... 필요한 모델 추가
}
```

**대안 (더 간단):**
```typescript
// apps/server/src/database/database.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createPrismaClient } from '@ssoo/database';

// 확장된 클라이언트 타입
type ExtendedClient = ReturnType<typeof createPrismaClient>;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly client: ExtendedClient;

  constructor() {
    this.client = createPrismaClient();
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }

  // 기존 호환성을 위한 프록시 (선택적)
  get user() { return this.client.user; }
  get project() { return this.client.project; }
  get menu() { return this.client.menu; }
  get customer() { return this.client.customer; }
}
```

**영향 범위:**
- `project.service.ts` - `this.db.project` 호출 유지
- `user.service.ts` - `this.db.user` 호출 유지
- `auth.service.ts` - UserService 통해 접근
- `menu.service.ts` - `this.db.menu` 호출 유지

**주의:** 기존 `this.db.xxx` 패턴 유지해야 함 (Breaking Change 방지)

---

### SRV-02: ProjectController JwtAuthGuard 추가 (P0)

**현재 상태:**
```typescript
// apps/server/src/project/project.controller.ts
@Controller('projects')
export class ProjectController {
  // JwtAuthGuard 없음 - 인증 없이 접근 가능!
}
```

**비교 (user.controller.ts):**
```typescript
@Controller('users')
@UseGuards(JwtAuthGuard)  // ✅ 적용됨
export class UserController { ... }
```

**수정 내용:**
```typescript
// apps/server/src/project/project.controller.ts
import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectService } from './project.service';
// ...

@Controller('projects')
@UseGuards(JwtAuthGuard)  // ← 추가
export class ProjectController {
  // ... 기존 코드 유지
}
```

**영향 범위:**
- 프론트엔드 API 호출 시 JWT 토큰 필수
- 현재 web에서 이미 토큰 포함하여 호출하고 있으므로 문제 없음

---

### SRV-03: 응답 헬퍼 함수 공용화 (P1)

**현재 상태 (반복 패턴):**
```typescript
// project.controller.ts
return { success: true, data, meta: { page, limit, total } };
return { success: false, error: { code: 'NOT_FOUND', message: '...' } };

// user.controller.ts
return { success: true, data, message: '...' };

// auth.controller.ts
return { success: true, data: tokens, message: '로그인 성공' };
```

**새 파일 생성:**
```typescript
// apps/server/src/common/responses.ts

/**
 * API 응답 헬퍼 함수들
 */

/**
 * 성공 응답
 */
export function success<T>(data: T, message?: string) {
  return {
    success: true as const,
    data,
    ...(message && { message }),
  };
}

/**
 * 페이지네이션 성공 응답
 */
export function paginated<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
) {
  return {
    success: true as const,
    data,
    meta: { page, limit, total },
  };
}

/**
 * 에러 응답
 */
export function error(code: string, message: string) {
  return {
    success: false as const,
    error: { code, message },
  };
}

/**
 * Not Found 에러
 */
export function notFound(entity: string) {
  return error('NOT_FOUND', `${entity}을(를) 찾을 수 없습니다.`);
}
```

**Index 파일 업데이트:**
```typescript
// apps/server/src/common/index.ts
export * from './interceptors/request-context.interceptor';
export * from './responses';  // ← 추가
```

---

### SRV-04: 응답 형식 통일 (P1)

**SRV-03 완료 후 적용**

**project.controller.ts 수정:**
```typescript
import { success, paginated, notFound } from '../common';

@Get()
async findAll(@Query() params: PaginationParams) {
  const { data, total } = await this.projectService.findAll(params);
  return paginated(data, params.page || 1, params.limit || 10, total);
}

@Get(':id')
async findOne(@Param('id') id: string) {
  const project = await this.projectService.findOne(BigInt(id));
  if (!project) {
    return notFound('프로젝트');
  }
  return success(project);
}
```

**user.controller.ts 수정:**
```typescript
import { success, notFound } from '../common';

@Get('profile')
async getProfile(@CurrentUser() currentUser: TokenPayload) {
  const user = await this.userService.findById(BigInt(currentUser.userId));
  if (!user) {
    return notFound('사용자');
  }
  return success({
    id: user.id.toString(),
    // ... 기존 필드들
  }, '프로필 조회 성공');
}
```

**auth.controller.ts 수정:**
```typescript
import { success } from '../common';

@Post('login')
async login(@Body() loginDto: LoginDto) {
  const tokens = await this.authService.login(loginDto);
  return success(tokens, '로그인 성공');
}
```

---

## 📝 실행 절차

### Step 1: 준비

```bash
cd apps/server
pnpm exec tsc --noEmit

git add .
git commit -m "chore: checkpoint before server refactoring"
```

### Step 2: SRV-01 실행 (DatabaseService)

1. `database.service.ts` 수정
2. 타입 체크: `pnpm exec tsc --noEmit`
3. 빌드 확인: `pnpm run build`
4. 커밋

### Step 3: SRV-02 실행 (JwtAuthGuard)

1. `project.controller.ts`에 `@UseGuards(JwtAuthGuard)` 추가
2. 타입 체크 및 빌드 확인
3. 커밋

### Step 4: SRV-03 실행 (응답 헬퍼)

1. `common/responses.ts` 생성
2. `common/index.ts` 업데이트
3. 타입 체크 및 빌드 확인
4. 커밋

### Step 5: SRV-04 실행 (응답 통일)

1. 각 Controller 파일에 응답 헬퍼 적용
2. 타입 체크 및 빌드 확인
3. 커밋

---

## ⚠️ 주의사항

### SRV-01 (DatabaseService)

- 기존 `this.db.xxx` 패턴 **반드시 유지**
- Service 파일 수정 없이 DatabaseService만 변경
- Extension이 정상 작동하는지 확인

### SRV-02 (JwtAuthGuard)

- 프론트엔드에서 이미 토큰 포함 호출 중인지 확인
- 개발 환경에서 인증 테스트 필수

### SRV-03, SRV-04 (응답 통일)

- 프론트엔드 응답 처리 로직 영향 없는지 확인
- `success`, `data`, `meta`, `error` 구조 유지

---

## ✅ 완료 조건

### SRV-01 ✅ (2026-01-20)
- [x] DatabaseService에 createPrismaClient 사용
- [x] 기존 this.db.xxx 패턴 유지 (getter 패턴 적용)
- [x] 타입 체크 통과
- [x] 빌드 통과

> 커밋: `9d8024a`

### SRV-02 ✅ (2026-01-20)
- [x] ProjectController에 JwtAuthGuard 추가
- [x] 타입 체크 통과
- [x] 빌드 통과

> 커밋: `79b3e6b`

### SRV-03 ✅ (2026-01-20)
- [x] common/responses.ts 생성
- [x] common/index.ts 업데이트
- [x] 타입 체크 통과

> 커밋: `519a9ea`

### SRV-04 ✅ (2026-01-20)
- [x] project.controller.ts 응답 통일
- [x] user.controller.ts 응답 통일
- [x] auth.controller.ts 응답 통일
- [x] menu.controller.ts 응답 통일
- [x] 전체 빌드 통과

> 커밋: `7ee3c51`
