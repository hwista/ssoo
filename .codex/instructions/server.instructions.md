---
applyTo: "apps/server/**"
---

# Codex Server Instructions

> 최종 업데이트: 2026-02-27
> 정본: `.github/instructions/server.instructions.md`

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
    └── pms/                   # PMS 도메인
        ├── project/
        ├── menu/
        └── pms.module.ts
```

## Controller 패턴

```typescript
// Swagger 데코레이터 필수, 간결한 로직
@Controller('projects')
@ApiTags('Projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @ApiOperation({ summary: '프로젝트 목록 조회' })
  async findAll(@Query() query: FindProjectsDto) {
    return this.projectService.findAll(query);
  }
}
```

## Service 패턴

```typescript
// PrismaService 주입, 비즈니스 로직만 포함
@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FindProjectsDto) {
    return this.prisma.prProjectM.findMany({ /* ... */ });
  }
}
```

## DTO 패턴

```typescript
// class-validator + Swagger 데코레이터
export class CreateProjectDto {
  @ApiProperty({ description: '프로젝트명' })
  @IsString()
  projectName: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string;
}
```

## 인증/인가 패턴

- `JwtAuthGuard` 사용, 역할 기반 접근 제어(`RolesGuard`)
- `@CurrentUser()` 데코레이터로 현재 사용자 주입
- Access Token 15분, Refresh Token 7일

## API 응답 형식

```typescript
// 성공: { success: true, data: { ... }, meta: { total, page, pageSize } }
// 에러: { success: false, error: { code: "NOT_FOUND", message: "..." } }
```

## BigInt 처리

- DB: BigInt 유지 (Prisma 스키마)
- API 응답: string으로 변환 (`entity.id.toString()`)
- 요청: string으로 받아 `BigInt(id)`로 변환

## 환경 변수 검증

```typescript
// config/config.validation.ts - Joi로 필수 환경 변수 검증
// DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET: required
// PORT: default 4000
```

## 보안 규칙

- bcrypt로 비밀번호 해싱, JWT Guard로 API 보호
- Helmet 보안 헤더, CORS 화이트리스트, Rate Limiting
- 민감정보 로깅 절대 금지 (비밀번호, 토큰)
- HttpOnly Cookie에 토큰 저장 권장

## 히스토리 테이블 연동

새 마스터 테이블 추가 시 히스토리 추적 연동 필수:
1. Prisma 모델 정의 → 2. 히스토리 모델 → 3. 트리거 SQL → 4. apply-triggers.ts 등록

## 금지 사항

1. **Controller에서 직접 Prisma 사용** - Service를 통해서만 접근
2. **any 타입 사용**
3. **BaseService 등 불필요한 추상화**
4. **로직 없는 Service 래퍼**
5. **환경 변수 하드코딩** - ConfigService 사용
6. **비밀번호 평문 저장/전송**
7. **토큰 만료 시간 하드코딩**

## 검증

- 빌드: `pnpm run build:server`

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-02-27 | 모듈구조/Controller/Service/DTO/Auth/API응답/BigInt/보안/히스토리/금지사항 추가 |
| 2026-02-22 | Codex Server 정본 신설 |
