# Server 패키지 명세서

> 📅 기준일: 2026-02-02  
> 📦 패키지명: `server` v0.0.1

---

## 1. 개요

| 항목 | 값 |
|------|-----|
| **프로젝트명** | server |
| **경로** | `apps/server/` |
| **용도** | REST API 백엔드 서버 |
| **포트** | 4000 |
| **API 문서** | http://localhost:4000/api/docs (Swagger) |

---

## 2. 코어 프레임워크

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@nestjs/core` | ^10.4.0 | NestJS 코어 |
| `@nestjs/common` | ^10.4.0 | NestJS 공통 모듈 |
| `@nestjs/platform-express` | ^10.4.0 | Express 어댑터 |
| `@nestjs/config` | ^3.3.0 | 환경 설정 관리 |
| `typescript` | ^5.7.0 | 타입 시스템 |
| `reflect-metadata` | ^0.2.0 | 데코레이터 메타데이터 |
| `rxjs` | ^7.8.0 | 리액티브 프로그래밍 |

---

## 3. 인증 & 보안

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@nestjs/jwt` | ^10.2.0 | JWT 토큰 처리 |
| `@nestjs/passport` | ^10.0.0 | Passport 통합 |
| `passport` | ^0.7.0 | 인증 미들웨어 |
| `passport-jwt` | ^4.0.0 | JWT 전략 |
| `bcryptjs` | ^3.0.3 | 비밀번호 해싱 |
| `helmet` | ^8.0.0 | 보안 헤더 |
| `@nestjs/throttler` | ^6.5.0 | Rate Limiting |

---

## 4. API 문서화

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@nestjs/swagger` | ^8.1.0 | Swagger/OpenAPI 생성 |
| `swagger-ui-express` | ^5.0.0 | Swagger UI 제공 |

---

## 5. 유효성 검사 & 변환

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `class-validator` | ^0.14.0 | DTO 유효성 검사 |
| `class-transformer` | ^0.5.0 | 객체 변환 |
| `joi` | ^18.0.2 | 환경 변수 유효성 검사 |

---

## 6. WebSocket

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@nestjs/websockets` | ^10.4.0 | WebSocket 모듈 |
| `@nestjs/platform-socket.io` | ^10.4.0 | Socket.IO 어댑터 |
| `socket.io` | ^4.8.0 | 실시간 통신 |

---

## 7. 로깅

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `nestjs-pino` | ^4.1.0 | Pino 로거 통합 |
| `pino-http` | ^10.0.0 | HTTP 요청 로깅 |
| `pino-pretty` | ^13.0.0 (dev) | 로그 포맷팅 |

---

## 8. 헬스체크

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@nestjs/terminus` | ^10.2.0 | Health Check 엔드포인트 |

---

## 9. 유틸리티

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `dayjs` | ^1.11.0 | 날짜/시간 처리 |
| `uuid` | ^11.0.0 | UUID 생성 |

---

## 10. 내부 패키지

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@ssoo/database` | workspace:* | Prisma 클라이언트 |
| `@ssoo/types` | workspace:* | 공유 타입 정의 |

---

## 11. 개발 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@nestjs/cli` | ^10.4.0 | NestJS CLI |
| `@nestjs/schematics` | ^10.1.0 | 코드 생성기 |
| `eslint` | ^9.0.0 | 코드 린팅 |
| `@typescript-eslint/eslint-plugin` | ^8.0.0 | TS ESLint 플러그인 |
| `@typescript-eslint/parser` | ^8.0.0 | TS ESLint 파서 |
| `ts-node` | ^10.9.2 | TypeScript 런타임 |
| `typedoc` | ^0.28.16 | API 문서 생성 |
| `@redocly/cli` | ^2.14.9 | OpenAPI 문서 도구 |
| `rimraf` | ^6.0.0 | 디렉토리 삭제 유틸 |

---

## 12. 스크립트

```json
{
  "dev": "nest start --watch",
  "build": "nest build",
  "start": "nest start",
  "start:prod": "node dist/main",
  "lint": "eslint \"{src,test}/**/*.ts\" --fix",
  "clean": "rimraf dist",
  "docs:typedoc": "pnpm run docs:typedoc:common && pnpm run docs:typedoc:pms",
  "docs:typedoc:common": "typedoc --options typedoc.common.json",
  "docs:typedoc:pms": "typedoc --options typedoc.pms.json",
  "docs:openapi": "ts-node --project tsconfig.json scripts/generate-openapi.ts"
}
```

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-01-27 | 초기 작성 - 현행 패키지 기준 |

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

