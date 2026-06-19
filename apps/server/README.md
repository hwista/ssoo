# SSOO Server

> NestJS 기반 백엔드 API 서버

---

## 📋 개요

`apps/server`는 SSOO 서비스의 **REST API 백엔드**입니다. NestJS 프레임워크를 사용하여 엔터프라이즈급 구조와 확장성을 제공합니다.

### 기술 스택 선정 이유

| 기술 | 선정 이유 |
|------|----------|
| **NestJS** | 모듈 기반 아키텍처, DI 지원, 엔터프라이즈 표준 |
| **Prisma** | 타입 안전 ORM, 마이그레이션 관리, 뛰어난 DX |
| **Swagger** | API 문서 자동 생성, 테스트 UI 제공 |
| **Pino** | 고성능 JSON 로깅, 구조화된 로그 |
| **JWT** | Stateless 인증, 확장성 좋음 |
| **Socket.io** | 실시간 양방향 통신 (추후 활용) |

---

## 📁 구조

```
apps/server/
├── src/
│   ├── main.ts              # 엔트리포인트
│   ├── app.module.ts        # 루트 모듈
│   │
│   ├── common/              # 공통 유틸리티
│   ├── config/              # 환경 설정
│   ├── database/            # 데이터베이스 모듈
│   │   ├── database.module.ts
│   │   └── database.service.ts
│   │
│   └── modules/             # 기능 모듈
│       ├── common/          # 공통 모듈
│       │   ├── common.module.ts
│       │   ├── auth/        # 인증
│       │   ├── health/      # Health Check
│       │   └── user/        # 사용자
│       │
│       ├── pms/             # PMS 전용 모듈
│       │   ├── pms.module.ts
│       │   ├── menu/        # 메뉴
│       │   └── project/     # 프로젝트
│       │
│       └── dms/             # DMS 전용 모듈 (예약)
│
├── scripts/
│   └── seed-admin.ts        # 관리자 계정 생성 스크립트
│
├── dist/                    # 빌드 결과물
├── package.json
├── tsconfig.json
└── nest-cli.json
```

> **Note**: Prisma 스키마는 `packages/database/prisma/`에 위치합니다.

---

## 🔐 인증 시스템

### 구현된 기능

| 기능 | 엔드포인트 | 설명 |
|------|-----------|------|
| 로그인 | `POST /api/auth/login` | ID/PW 검증 후 JWT 발급 |
| 세션 복원 | `POST /api/auth/session` | HttpOnly shared session cookie로 새 Access Token 발급 |
| 로그아웃 | `POST /api/auth/logout` | Refresh Token 무효화 |
| 사용자 정보 | `POST /api/auth/me` | 현재 로그인 사용자 조회 |

### 보안 설정

| 설정 | 값 |
|------|-----|
| Access Token 만료 | 15분 |
| Refresh Token 만료 | 7일 |
| 비밀번호 해싱 | bcryptjs (salt: 12) |
| 계정 잠금 | 5회 실패 시 30분 |

### 테스트 계정 생성

```powershell
# 관리자 계정 생성
npx ts-node scripts/seed-admin.ts
# 또는
node -r ts-node/register scripts/seed-admin.ts

# 계정 정보
# ID: admin
# PW: admin123!
```

---

## 🚀 API 엔드포인트

### Health Check

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/health` | 서버 상태 확인 |

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-01-16T07:37:00.000Z",
    "service": "ssoo-server",
    "version": "0.0.1"
  }
}
```

### Project CRUD

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/projects` | 프로젝트 목록 조회 |
| GET | `/api/projects/:id` | 프로젝트 상세 조회 |
| POST | `/api/projects` | 프로젝트 생성 |
| PUT | `/api/projects/:id` | 프로젝트 수정 |
| DELETE | `/api/projects/:id` | 프로젝트 삭제 |

---

## 🔧 포함된 기능 (의존성)

### 핵심 프레임워크
| 패키지 | 용도 |
|--------|------|
| `@nestjs/core` | NestJS 코어 |
| `@nestjs/platform-express` | Express 어댑터 |
| `@ssoo/database` | Prisma 클라이언트 |
| `@ssoo/types` | 공통 타입 정의 |

### API 문서화
| 패키지 | 용도 |
|--------|------|
| `@nestjs/swagger` | Swagger 데코레이터 |
| `swagger-ui-express` | Swagger UI |

### 유효성 검증
| 패키지 | 용도 |
|--------|------|
| `class-validator` | DTO 유효성 검증 |
| `class-transformer` | 요청/응답 변환 |

### 인증 & 보안
| 패키지 | 용도 |
|--------|------|
| `@nestjs/jwt` | JWT 토큰 처리 |
| `@nestjs/passport` | 인증 전략 |
| `passport-jwt` | JWT 전략 |
| `bcryptjs` | 비밀번호 해싱 (pure JS) |
| `helmet` | HTTP 보안 헤더 |

> **참고**: `bcrypt` 대신 `bcryptjs`를 사용합니다. Windows 보안 환경에서 native 모듈 빌드 문제를 우회합니다.

### 로깅
| 패키지 | 용도 |
|--------|------|
| `nestjs-pino` | Pino 로거 통합 |
| `pino-http` | HTTP 요청 로깅 |

### 실시간 통신 (예정)
| 패키지 | 용도 |
|--------|------|
| `@nestjs/websockets` | WebSocket 지원 |
| `@nestjs/platform-socket.io` | Socket.io 어댑터 |
| `socket.io` | 실시간 통신 |

### 유틸리티
| 패키지 | 용도 |
|--------|------|
| `@nestjs/config` | 환경변수 관리 |
| `@nestjs/terminus` | Health Check |
| `dayjs` | 날짜 처리 |
| `uuid` | UUID 생성 |

---

## 🛠 개발 명령어

```powershell
# 개발 서버 실행 (일반 환경)
pnpm dev:server

# 개발 서버 실행 (보안 환경 - watch 모드)
node ./node_modules/@nestjs/cli/bin/nest.js start --watch

# 개발 서버 실행 (보안 환경 - 빌드 후 실행)
node ./node_modules/typescript/lib/tsc.js --project tsconfig.json
node dist/main.js

# 프로덕션 빌드
pnpm build:server

# 프로덕션 실행
node dist/main.js
```

---

## ⚙️ 환경변수

`.env` 파일에서 설정:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ssoo_dev?schema=public"

# Server
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

---

## 📌 모듈 추가 가이드

새로운 도메인 모듈 추가 시:

```powershell
# NestJS CLI 사용 (일반 환경)
nest generate module customer
nest generate controller customer
nest generate service customer

# 수동 생성 (보안 환경)
# 1. src/customer/ 폴더 생성
# 2. customer.module.ts, customer.controller.ts, customer.service.ts 생성
# 3. app.module.ts에 CustomerModule import
```
