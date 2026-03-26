````mdc
# SSOO 기술 스택 (공용)

> 최종 업데이트: 2026-02-02

모노레포 전체에서 공유하는 기반 기술 스택입니다.

---

## 개요

SSOO는 **pnpm + Turborepo** 기반 모노레포 구조로 구성되어 있습니다.

---

## 프로젝트 구조

```
sooo/
├── apps/
│   ├── server/          # NestJS 백엔드 (공용)
│   └── web/
│       ├── pms/         # PMS Next.js 프론트엔드 (pnpm)
│       └── dms/         # DMS Next.js 프론트엔드 (npm, 독립)
├── packages/
│   ├── database/        # Prisma ORM (공용)
│   └── types/           # 공유 타입 (공용)
├── docs/                # 문서
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 백엔드 (apps/server)

> 상세: [server-package-spec.md](server-package-spec.md)

| 기술 | 버전 | 용도 |
|------|------|------|
| **NestJS** | 10.x | 백엔드 프레임워크 |
| **TypeScript** | 5.x | 언어 |
| **Prisma** | 6.x | ORM |
| **PostgreSQL** | 15+ | 데이터베이스 |
| **JWT** | - | 인증 |
| **bcrypt** | - | 비밀번호 해싱 |
| **class-validator** | - | DTO 유효성 검사 |
| **Swagger** | - | API 문서화 |

---

## 데이터베이스 (packages/database)

> 상세: [database-package-spec.md](database-package-spec.md)

| 기술 | 버전 | 용도 |
|------|------|------|
| **PostgreSQL** | 15+ | RDBMS |
| **Prisma** | 6.x | ORM, 마이그레이션 |

### 히스토리 관리
- **DB 트리거**: 마스터 테이블 변경 시 히스토리 테이블에 자동 기록
- **Prisma Extension**: 추가 로직 처리

---

## 공유 타입 (packages/types)

> 상세: [types-package-spec.md](types-package-spec.md)

| 기술 | 버전 | 용도 |
|------|------|------|
| **TypeScript** | 5.x | 타입 정의 |
| **TypeDoc** | 0.28.x | 타입 문서 생성 |

---

## 개발 도구

| 도구 | 용도 |
|------|------|
| **pnpm** | 패키지 매니저 (PMS, server, packages) |
| **npm** | 패키지 매니저 (DMS) |
| **Turborepo** | 모노레포 빌드 시스템 |
| **ESLint** | 코드 린팅 |
| **Prettier** | 코드 포맷팅 |
| **VS Code** | 에디터 |

---

## 서비스 URL (개발 환경)

| 서비스 | URL | 설명 |
|--------|-----|------|
| PMS Frontend | http://localhost:3000 | 프로젝트 관리 시스템 |
| DMS Frontend | http://localhost:3001 | 도큐먼트 관리 시스템 |
| Backend | http://localhost:4000 | NestJS API 서버 |
| API Docs | http://localhost:4000/api/docs | Swagger UI |

---

## 환경 변수

### 서버 (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/ssoo"
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
```

### 웹 PMS (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### 웹 DMS (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## 시스템별 기술 스택

각 시스템의 상세 기술 스택은 아래 문서를 참조하세요:

- [PMS 기술 스택](../../pms/explanation/architecture/tech-stack.md)
- [DMS 기술 스택](../../dms/explanation/architecture/tech-stack.md)

````

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

