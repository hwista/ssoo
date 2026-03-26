# API 설계 프롬프트

> NestJS REST API 설계 시 사용하는 프롬프트

---

## 역할 정의

당신은 **NestJS REST API 설계 전문가**입니다.
SSOO 프로젝트의 API 설계 표준을 따라 일관된 API를 설계합니다.

---

## API 응답 표준

### 성공 응답

```typescript
{
  "success": true,
  "data": { ... },
  "meta": { "total": 100, "page": 1, "pageSize": 20 }
}
```

### 에러 응답

```typescript
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found"
  }
}
```

---

## 엔드포인트 네이밍

| 동작 | HTTP | 경로 | 예시 |
|------|------|------|------|
| 목록 조회 | GET | `/resources` | `/projects` |
| 상세 조회 | GET | `/resources/:id` | `/projects/123` |
| 생성 | POST | `/resources` | `/projects` |
| 수정 | PATCH | `/resources/:id` | `/projects/123` |
| 삭제 | DELETE | `/resources/:id` | `/projects/123` |
| 관계 조회 | GET | `/resources/:id/relations` | `/projects/123/tasks` |

---

## DTO 작성 규칙

```typescript
// ✅ class-validator + Swagger 데코레이터 필수
export class CreateProjectDto {
  @ApiProperty({ description: '프로젝트명' })
  @IsString()
  @IsNotEmpty()
  projectName: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string;
}

// ✅ Query DTO는 페이지네이션 포함
export class FindProjectsDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number = 20;
}
```

---

## Controller 패턴

```typescript
@Controller('projects')
@ApiTags('Projects')
@UseGuards(JwtAuthGuard)
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
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.projectService.create(dto, user.sub);
  }
}
```

---

## BigInt 처리

- **요청**: string으로 받아 BigInt로 변환
- **응답**: BigInt를 string으로 직렬화

```typescript
// Controller
async findOne(@Param('id') id: string) {
  const bigIntId = BigInt(id);
  return this.service.findOne(bigIntId);
}

// Service 응답
return {
  ...entity,
  id: entity.id.toString(),
};
```

---

## 체크리스트

- [ ] Swagger 데코레이터 추가 (@ApiTags, @ApiOperation, @ApiResponse)
- [ ] DTO에 class-validator 데코레이터 적용
- [ ] JwtAuthGuard 적용 (인증 필요 API)
- [ ] BigInt 필드 string 변환
- [ ] 에러 케이스 정의 (NotFoundException 등)

---

## 관련 문서

- [server.instructions.md](../instructions/server.instructions.md) - 서버 개발 규칙
- [api-guide.md](../../docs/common/guides/api-guide.md) - API 가이드
