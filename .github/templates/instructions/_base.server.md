# 백엔드 서버 개발 규칙 템플릿

> `[FRAMEWORK]` 서버 개발 규칙 템플릿
> 
> 이 파일을 복사하여 `.github/instructions/server.instructions.md`로 사용하세요.
> `[PLACEHOLDER]` 부분을 프로젝트에 맞게 수정하세요.

---

```yaml
---
applyTo: "[SERVER_PATH]/**"
---
```

# [FRAMEWORK] 서버 개발 규칙

> 이 규칙은 `[SERVER_PATH]/` 경로의 파일 작업 시 적용됩니다.

---

## 모듈 구조

> 프로젝트에 맞게 구조를 정의하세요.

```
src/
├── main.[EXT]                 # 엔트리 포인트
├── app.module.[EXT]           # 루트 모듈 (해당 시)
├── config/                    # 설정
├── database/                  # DB 연결
├── common/                    # 공용 유틸
└── modules/                   # 도메인 모듈
    ├── auth/
    ├── user/
    └── [domain]/
```

---

## Controller/Route 패턴

```[LANGUAGE]
// ✅ 표준: API 문서화 필수, 간결한 로직
// 프레임워크에 맞게 수정하세요

// NestJS 예시
@Controller('[endpoint]')
@ApiTags('[Tag]')
export class [Entity]Controller {
  constructor(private readonly service: [Entity]Service) {}

  @Get()
  @ApiOperation({ summary: '[설명]' })
  async findAll(@Query() query: Find[Entity]sDto) {
    return this.service.findAll(query);
  }
}

// Express 예시
router.get('/[endpoint]', async (req, res) => {
  const result = await service.findAll(req.query);
  res.json(result);
});

// FastAPI 예시
@router.get("/[endpoint]")
async def find_all(query: FindQuery):
    return await service.find_all(query)
```

---

## Service 패턴

```[LANGUAGE]
// ✅ 표준: DB 접근 로직, 비즈니스 로직 포함
// 프레임워크에 맞게 수정하세요

// 공통 패턴
class [Entity]Service {
  async findAll(query) {
    // 1. 쿼리 파라미터 처리
    // 2. DB 조회
    // 3. 결과 변환 후 반환
  }

  async findOne(id) {
    // 1. ID로 조회
    // 2. 없으면 예외 또는 null
    // 3. 결과 반환
  }

  async create(dto) {
    // 1. 유효성 검증 (DTO 레벨에서 처리됨)
    // 2. 생성
    // 3. 결과 반환
  }
}
```

---

## DTO 패턴

```[LANGUAGE]
// ✅ 표준: 요청/응답 분리, 유효성 검증

// Create DTO
class Create[Entity]Dto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  description?: string;
}

// Response DTO
class [Entity]ResponseDto {
  id: string;
  name: string;
  createdAt: Date;
}
```

---

## 에러 처리 패턴

```[LANGUAGE]
// ✅ 표준: 일관된 에러 응답

// 공통 에러 응답 형식
{
  "statusCode": 404,
  "message": "[Entity]를 찾을 수 없습니다",
  "error": "Not Found"
}

// 서비스에서 예외 발생
if (!entity) {
  throw new NotFoundException('[Entity]를 찾을 수 없습니다');
}
```

---

## API 문서화 필수

- 모든 엔드포인트는 **OpenAPI/Swagger** 문서화 필수
- 요청/응답 예시 포함
- 에러 케이스 명시

---

## 금지 사항

1. **Controller에 비즈니스 로직** - Service로 분리
2. **Service에 HTTP 의존성** - Request/Response 객체 직접 사용 금지
3. **any 타입 사용** - 구체적 타입 정의
4. **하드코딩된 설정값** - config/환경변수 사용
5. **N+1 쿼리** - 관계 조회 시 eager loading 또는 join 사용

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| [DATE] | 초기 버전 |
