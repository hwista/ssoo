# TypeScript 웹 스택 - copilot-instructions 확장

> 기술 스택: TypeScript, Node.js, React/Next.js, NestJS
> 
> `_base.md`의 플레이스홀더를 이 내용으로 대체하세요.

---

## 기술 스택 섹션

```markdown
## 🛠️ 기술 스택

### 백엔드
- NestJS 10.x, TypeScript 5.x
- PostgreSQL 15+ (또는 MySQL 8+)
- Prisma 6.x (ORM, 마이그레이션)
- JWT 인증, bcrypt
- class-validator, class-transformer
- Swagger/OpenAPI (@nestjs/swagger)

### 프론트엔드
- Next.js 15.x (App Router), React 19.x, TypeScript 5.x
- Tailwind CSS 3.x, shadcn/ui (Radix primitives)
- Zustand 5.x (상태 관리), TanStack Query 5.x (서버 상태)
- TanStack Table 8.x (테이블), React Hook Form + Zod (폼/검증)

### 공통
- TypeScript 5.x
- pnpm (패키지 매니저)
- Turborepo (모노레포 빌드)
- ESLint + Prettier
```

---

## 네이밍 규칙 섹션

```markdown
## 📏 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `ProjectCard.tsx` |
| 훅 | use 접두사 + camelCase | `useAuth.ts` |
| 유틸 | camelCase | `formatDate.ts` |
| 타입/인터페이스 | PascalCase | `User`, `ProjectDto` |
| 상수 | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| NestJS 클래스 | PascalCase + 접미사 | `UserService`, `AuthController` |
| DTO | PascalCase + Dto | `CreateUserDto`, `UpdateProjectDto` |
| DB 테이블 | snake_case | `user_profile`, `project_member` |
| API 엔드포인트 | kebab-case | `/api/user-profile` |
```

---

## 폴더 구조 섹션 (모노레포)

```markdown
## 📁 폴더 구조

\`\`\`
[project]/
├── .github/
│   ├── copilot-instructions.md
│   ├── instructions/
│   │   ├── server.instructions.md
│   │   ├── web.instructions.md
│   │   ├── database.instructions.md
│   │   └── types.instructions.md
│   ├── prompts/
│   │   ├── core/
│   │   └── [project]/
│   └── agents/
├── apps/
│   ├── server/                   # NestJS 백엔드
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/          # 공용 유틸, 인터셉터
│   │   │   ├── config/          # 환경 설정
│   │   │   └── modules/         # 도메인 모듈
│   │   │       ├── common/      # auth, user, health
│   │   │       └── [domain]/    # 비즈니스 도메인
│   │   └── test/
│   └── web/
│       └── [app-name]/           # Next.js 앱
│           ├── src/
│           │   ├── app/         # App Router
│           │   ├── components/
│           │   │   ├── ui/      # 기본 UI (shadcn)
│           │   │   ├── common/  # 공용 컴포넌트
│           │   │   └── pages/   # 페이지별 컴포넌트
│           │   ├── hooks/
│           │   ├── lib/
│           │   ├── stores/
│           │   └── types/
│           └── public/
├── packages/
│   ├── database/                 # Prisma 스키마
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── src/
│   └── types/                    # 공유 타입
│       └── src/
├── docs/
│   ├── README.md
│   ├── common/                   # 공통 문서
│   └── [domain]/                 # 도메인별 문서
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
\`\`\`
```

---

## 레이어 의존성

```markdown
## 📊 레이어 아키텍처

### 프론트엔드 의존성 방향

\`\`\`
pages → templates → common → ui
  ↓
hooks → lib/api → stores
\`\`\`

- 상위 → 하위만 참조 가능
- 역방향 참조 금지 (ui → pages ❌)
- 순환 참조 금지

### 백엔드 모듈 구조

\`\`\`
modules/
├── common/           # 공용 모듈 (auth, user, health)
└── [domain]/         # 비즈니스 도메인 모듈
    ├── [entity]/
    │   ├── [entity].controller.ts
    │   ├── [entity].service.ts
    │   ├── [entity].module.ts
    │   └── dto/
    └── [domain].module.ts
\`\`\`

### 패키지 경계

\`\`\`
apps/server ──→ packages/database
     ↓                 ↓
apps/web/[app] ──→ packages/types
\`\`\`

- apps → packages 방향만 허용
- 역방향 참조 절대 금지
```

---

## NestJS 특화 규칙

```markdown
## NestJS 규칙

### 컨트롤러
- Swagger 데코레이터 필수 (@ApiTags, @ApiOperation, @ApiResponse)
- 응답 포맷 통일 (success, paginated, error 헬퍼)
- 예외는 NestJS 내장 예외 사용

### 서비스
- 비즈니스 로직만 담당
- Prisma 트랜잭션은 서비스에서 관리
- 불필요한 BaseService 금지

### DTO
- class-validator 데코레이터 필수
- Swagger 문서화 (@ApiProperty)
- Request/Response DTO 분리

### 예시

\`\`\`typescript
// ✅ 권장
@Controller('users')
@ApiTags('Users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @ApiOperation({ summary: '사용자 조회' })
  @ApiResponse({ status: 200, description: '성공', type: UserResponseDto })
  async findOne(@Param('id') id: string) {
    const user = await this.userService.findOne(id);
    return success(user);
  }
}
\`\`\`
```

---

## Next.js 특화 규칙

```markdown
## Next.js 규칙

### App Router
- 페이지 컴포넌트는 `page.tsx`에만
- 레이아웃은 `layout.tsx`에만
- 로딩 UI는 `loading.tsx`
- 에러 처리는 `error.tsx`

### 컴포넌트 구조
- Server Component 우선 (기본)
- Client Component는 필요할 때만 ('use client')
- 상태 관리 필요시 Client Component

### 데이터 페칭
- 서버 컴포넌트: fetch 또는 Prisma 직접
- 클라이언트: TanStack Query
- API 호출은 lib/api로 중앙화

### 예시

\`\`\`typescript
// ✅ Server Component (기본)
export default async function ProjectPage({ params }: Props) {
  const project = await getProject(params.id);
  return <ProjectDetail project={project} />;
}

// ✅ Client Component (상호작용 필요시)
'use client';

export function ProjectForm() {
  const { mutate } = useCreateProject();
  // ...
}
\`\`\`
```

---

## Prisma 특화 규칙

```markdown
## Prisma 규칙

### 스키마
- 모델명: PascalCase (User, Project)
- 필드명: camelCase (createdAt, userId)
- 관계: 명시적 @relation 사용

### 마이그레이션
- 의미있는 마이그레이션 이름 사용
- 프로덕션 마이그레이션은 신중하게

### 클라이언트
- 싱글톤 패턴 사용 (global 캐시)
- Extension으로 공통 로직 추가

### 예시

\`\`\`prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  projects  Project[]
  
  @@map("user")
}
\`\`\`
```

---

## 이 템플릿 사용법

1. `_base.md`를 프로젝트 `.github/copilot-instructions.md`로 복사
2. 이 파일의 섹션들을 해당 위치에 붙여넣기
3. `[PROJECT_NAME]`, `[PLACEHOLDER]` 등 프로젝트에 맞게 수정
4. 불필요한 섹션 제거 (예: NestJS 미사용 시 해당 섹션 제거)

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-05 | 초기 버전 - TypeScript 웹 스택 템플릿 |

