---
applyTo: "apps/server/**"
---

# NestJS 서버 개발 규칙

> 이 규칙은 `apps/server/` 경로의 파일 작업 시 적용됩니다.

---

## 모듈 구조

```
src/
├── app.module.ts              # 루트 모듈
├── main.ts                    # 엔트리 포인트
├── config/                    # 설정 (Joi 검증)
├── database/                  # DatabaseModule (Prisma 연결)
├── common/                    # 공용 유틸 (decorators, guards, filters)
└── modules/
    ├── common/                # 공용 도메인 (auth, user, health)
    │   ├── auth/
    │   ├── user/
    │   └── health/
    └── pms/                   # PMS 도메인
        ├── project/
        ├── menu/
        └── pms.module.ts
```

---

## 모듈 패턴

```typescript
// ✅ 표준: 모듈은 명확한 imports/providers/exports
@Module({
  imports: [DatabaseModule],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
```

---

## Controller 패턴

```typescript
// ✅ 표준: Swagger 데코레이터 필수, 간결한 로직
@Controller('projects')
@ApiTags('Projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @ApiOperation({ summary: '프로젝트 목록 조회' })
  @ApiResponse({ status: 200, description: '성공' })
  async findAll(@Query() query: FindProjectsDto) {
    return this.projectService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '프로젝트 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.projectService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '프로젝트 생성' })
  async create(@Body() dto: CreateProjectDto) {
    return this.projectService.create(dto);
  }
}
```

---

## Service 패턴

```typescript
// ✅ 표준: PrismaService 주입, 비즈니스 로직만 포함
@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FindProjectsDto) {
    const { page = 1, pageSize = 20, ...filters } = query;
    
    return this.prisma.prProjectM.findMany({
      where: this.buildWhereClause(filters),
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.prProjectM.findUnique({
      where: { id: BigInt(id) },
    });
    
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    
    return project;
  }

  async create(dto: CreateProjectDto) {
    return this.prisma.prProjectM.create({
      data: {
        ...dto,
        createdBy: dto.userId,
      },
    });
  }
}
```

---

## DTO 패턴

```typescript
// ✅ 표준: class-validator + Swagger 데코레이터
import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ description: '프로젝트명' })
  @IsString()
  projectName: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '고객사 ID' })
  @IsString()
  @IsOptional()
  customerId?: string;
}

export class FindProjectsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number = 20;
}
```

---

## 인증/인가 패턴

```typescript
// ✅ JwtAuthGuard 사용
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  // ...
}

// ✅ 역할 기반 접근 제어
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  // ...
}

// ✅ 현재 사용자 가져오기
@Get('me')
async getMe(@CurrentUser() user: JwtPayload) {
  return this.userService.findOne(user.sub);
}
```

---

## API 응답 형식

```typescript
// ✅ 성공 응답
{
  "success": true,
  "data": { ... },
  "meta": { "total": 100, "page": 1, "pageSize": 20 }
}

// ✅ 에러 응답
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found"
  }
}
```

---

## BigInt 처리

```typescript
// ✅ API 응답 시 string 변환 필수
// Prisma BigInt → JSON string
const project = await this.prisma.prProjectM.findUnique({ ... });
return {
  ...project,
  id: project.id.toString(),
};
```

---

## 환경 변수 검증 (Joi)

```typescript
// config/config.validation.ts
// ✅ 필수 환경 변수는 Joi로 검증 (미설정 시 부팅 실패)
export const validationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  PORT: Joi.number().default(4000),
});
```

---

## 보안 규칙

### 인증 토큰

| 토큰 | 만료 시간 | 용도 |
|------|----------|------|
| Access Token | 15분 | API 요청 인증 |
| Refresh Token | 7일 | Access Token 갱신 |

### 비밀번호 정책

```typescript
// ✅ 최소 8자, 대소문자 + 숫자 + 특수문자 조합
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const passwordSchema = z.string()
  .min(8, '비밀번호는 8자 이상')
  .regex(passwordRegex, '대소문자, 숫자, 특수문자 포함 필수');
```

### Rate Limiting

```typescript
// app.module.ts
ThrottlerModule.forRoot([{
  ttl: 60000,  // 1분
  limit: 100,  // 100회
}])
```

### CORS 설정

```typescript
// main.ts
app.enableCors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
});
```

### CSRF 보호

```typescript
// POST/PUT/DELETE 요청 시 CSRF 토큰 검증
// SPA에서는 SameSite 쿠키 + CORS로 대체 가능
app.use(csurf({ cookie: { sameSite: 'strict', httpOnly: true } }));
```

### 보안 헤더 (Helmet)

```typescript
// main.ts - Helmet 적용 필수
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
```

### 로깅 및 모니터링

```typescript
// ✅ 보안 이벤트 로깅 필수
// - 로그인 시도 (성공/실패)
// - 비밀번호 변경
// - 권한 변경
// - 민감 데이터 접근

// ❌ 금지 - 민감정보 로깅
logger.log(`User password: ${password}`); // 절대 금지
logger.log(`JWT Token: ${token}`);         // 절대 금지
```

### 토큰 저장 권장사항

| 저장 위치 | 권장 | 설명 |
|----------|------|------|
| HttpOnly Cookie | ✅ | XSS 공격 방지 |
| LocalStorage | ⚠️ | XSS 취약, 비권장 |
| SessionStorage | ⚠️ | XSS 취약, 비권장 |
| 메모리 (Zustand) | ✅ | 새로고침 시 재인증 필요 |

### 보안 체크리스트

- ✅ bcrypt로 비밀번호 해싱 (salt 포함)
- ✅ JWT Guard로 API 보호
- ✅ @Exclude()로 민감정보 응답 제외
- ✅ class-validator로 입력 검증
- ✅ Prisma ORM으로 SQL Injection 방지
- ✅ Helmet으로 보안 헤더 설정
- ✅ CORS 화이트리스트 설정
- ✅ Rate Limiting 적용
- ✅ 보안 이벤트 로깅

---

## 히스토리 테이블 연동

새 마스터 테이블 추가 시 반드시 히스토리 추적 연동:

```typescript
// 1. Prisma 스키마에 히스토리 모델 정의 (packages/database/prisma/schema.prisma)
// 2. Prisma 클라이언트 Extension으로 자동 히스토리 기록 (권장)
// 또는 PostgreSQL 트리거로 자동 기록

// event_type 값
// C: Create (생성)
// U: Update (수정) 
// D: Delete (삭제)
```

---

## 금지 사항

1. **Controller에서 직접 Prisma 사용** - Service를 통해서만 접근
2. **any 타입 사용** - 구체적 타입 또는 unknown 사용
3. **BaseService 등 불필요한 추상화** - 직접 구현
4. **로직 없는 Service 래퍼** - Controller에서 직접 호출 가능하면 Service 불필요
5. **환경 변수 하드코딩** - ConfigService 사용
6. **비밀번호 평문 저장/전송** - 반드시 bcrypt 해싱
7. **토큰 만료 시간 하드코딩** - 환경 변수 사용

---

## 관련 문서

- [api-guide.md](../../docs/common/guides/api-guide.md) - API 응답 형식, 에러 코드 상세
- [auth-system.md](../../docs/common/architecture/auth-system.md) - 인증 흐름 다이어그램, 클라이언트 구현
- [security-standards.md](../../docs/common/architecture/security-standards.md) - 보안 체크리스트 상세
