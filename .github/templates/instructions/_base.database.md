# 데이터베이스 패키지 개발 규칙 템플릿

> 데이터베이스/ORM 개발 규칙 템플릿
> 
> 이 파일을 복사하여 `.github/instructions/database.instructions.md`로 사용하세요.
> `[PLACEHOLDER]` 부분을 프로젝트에 맞게 수정하세요.

---

```yaml
---
applyTo: "[DATABASE_PATH]/**"
---
```

# Database 패키지 개발 규칙

> 이 규칙은 `[DATABASE_PATH]/` 경로의 파일 작업 시 적용됩니다.

---

## 패키지 개요

| 항목 | 값 |
|------|-----|
| 패키지명 | `[PACKAGE_NAME]` |
| 용도 | ORM 및 DB 스키마 관리 |
| DBMS | [PostgreSQL/MySQL/SQLite] |
| ORM | [Prisma/TypeORM/Drizzle/Sequelize] |

---

## 스키마 구조

> 프로젝트에 맞게 스키마 구조를 정의하세요.

```
[DATABASE_PATH]/
├── prisma/                    # Prisma 사용 시
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── index.ts               # Export
│   └── client.ts              # DB 클라이언트
└── scripts/
    ├── migrate.ts
    └── seed.ts
```

---

## 테이블 네이밍 규칙

> 프로젝트 컨벤션에 맞게 수정하세요.

| 유형 | 패턴 | 예시 |
|------|------|------|
| 마스터 | `{도메인}_m` 또는 `{도메인}s` | `user_m`, `users` |
| 상세 | `{도메인}_d` 또는 `{도메인}_details` | `order_d`, `order_details` |
| 관계 | `{테이블1}_{테이블2}` | `user_role`, `project_member` |
| 히스토리 | `{원본}_h` 또는 `{원본}_history` | `order_h`, `order_history` |

---

## 컬럼 네이밍 규칙

| 유형 | 패턴 | 예시 |
|------|------|------|
| PK | `id` 또는 `{테이블}_id` | `id`, `user_id` |
| FK | `{참조테이블}_id` | `created_by_id`, `project_id` |
| 불리언 | `is_{상태}` | `is_active`, `is_deleted` |
| 날짜 | `{동작}_at` | `created_at`, `updated_at` |
| 일반 | snake_case | `display_name`, `sort_order` |

---

## 모델 정의 패턴

```[LANGUAGE]
// ✅ Prisma 예시
model User {
  id        BigInt   @id @default(autoincrement())
  email     String   @unique
  name      String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  posts     Post[]
  profile   Profile?

  @@map("users")
}

// ✅ TypeORM 예시
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: bigint;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

---

## 마이그레이션 규칙

### 네이밍
```
YYYYMMDDHHMMSS_description.sql
예: 20260205120000_add_user_table.sql
```

### 필수 사항
- [ ] 마이그레이션은 **롤백 가능**해야 함
- [ ] 데이터 손실 가능성 있으면 **주석으로 경고**
- [ ] 대용량 테이블 변경은 **성능 영향 명시**

### 금지 사항
- ❌ 기존 마이그레이션 파일 수정
- ❌ 프로덕션 데이터 직접 조작
- ❌ 스키마와 데이터 마이그레이션 혼합

---

## 시드 데이터 규칙

```[LANGUAGE]
// ✅ 환경별 시드 분리
async function seedDevelopment() {
  // 개발용 테스트 데이터
}

async function seedProduction() {
  // 필수 마스터 데이터만
}

// 멱등성 보장 (여러 번 실행해도 동일 결과)
async function upsertUser(data: UserData) {
  return prisma.user.upsert({
    where: { email: data.email },
    update: data,
    create: data,
  });
}
```

---

## 쿼리 패턴

```[LANGUAGE]
// ✅ 페이지네이션
async function findAll(page: number, pageSize: number) {
  return prisma.entity.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: 'desc' },
  });
}

// ✅ N+1 방지 - include/join 사용
async function findWithRelations(id: bigint) {
  return prisma.entity.findUnique({
    where: { id },
    include: {
      relation1: true,
      relation2: { select: { id: true, name: true } },
    },
  });
}

// ✅ 트랜잭션
async function createWithRelations(data: CreateDto) {
  return prisma.$transaction(async (tx) => {
    const parent = await tx.parent.create({ data: data.parent });
    const children = await tx.child.createMany({
      data: data.children.map(c => ({ ...c, parentId: parent.id })),
    });
    return { parent, children };
  });
}
```

---

## BigInt/ID 처리 (해당 시)

### DB 레벨
- PK/FK는 BigInt 유지

### API 레벨
- 요청: string으로 받아 BigInt 변환
- 응답: BigInt를 string으로 직렬화

```[LANGUAGE]
// 변환 유틸리티
function toBigInt(value: string): bigint {
  return BigInt(value);
}

function toString(value: bigint): string {
  return value.toString();
}
```

---

## 금지 사항

1. **Raw SQL 남용** - ORM 쿼리 빌더 우선 사용
2. **마이그레이션 파일 수정** - 새 마이그레이션 생성
3. **인덱스 없는 FK** - 외래키에는 반드시 인덱스
4. **N+1 쿼리** - include/join 으로 해결
5. **하드코딩된 연결 정보** - 환경변수 사용

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| [DATE] | 초기 버전 |
