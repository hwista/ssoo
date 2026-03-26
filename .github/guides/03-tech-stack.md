# 03. 기술 스택 선정 가이드

> 프로젝트 요구사항에 맞는 기술 스택을 체계적으로 선정하는 방법

---

## 개요

### 핵심 원칙

1. **요구사항 기반** - 기술이 아닌 문제에서 시작
2. **팀 역량 고려** - 학습 비용 vs 장기 이득
3. **증거 기반** - 추측이 아닌 검증된 정보로 결정
4. **점진적 결정** - 큰 결정부터 작은 결정으로

### 결정 순서

```
1. 플랫폼 유형    →  웹/모바일/데스크톱/API
2. 아키텍처      →  모놀리스/마이크로서비스
3. 프론트엔드    →  프레임워크, 상태관리
4. 백엔드        →  프레임워크, 패턴
5. 데이터베이스  →  RDBMS/NoSQL, ORM
6. 인프라        →  클라우드, 배포
```

---

## 1단계: 플랫폼 유형

### 체크리스트

| 질문 | 선택지 |
|------|--------|
| 주 사용 환경은? | 웹 브라우저 / 모바일 앱 / 데스크톱 / CLI |
| 오프라인 필요? | 필수 / 선택 / 불필요 |
| 실시간 기능? | 필수 (채팅, 알림) / 불필요 |
| SEO 필요? | 필수 / 불필요 |

### 권장 매핑

| 요구사항 | 권장 플랫폼 |
|----------|------------|
| 일반 웹앱 + SEO | SSR 웹 (Next.js, Nuxt) |
| 대시보드/관리자 | SPA (React, Vue) |
| 모바일 우선 | React Native, Flutter |
| 데스크톱 앱 | Electron, Tauri, .NET WPF |
| CLI 도구 | Node.js, Python, Go |

---

## 2단계: 아키텍처

### 모놀리스 vs 마이크로서비스

| 기준 | 모놀리스 | 마이크로서비스 |
|------|----------|----------------|
| 팀 규모 | 1-10명 | 10명+ |
| 개발 속도 | 빠름 | 느림 |
| 운영 복잡도 | 낮음 | 높음 |
| 독립 배포 필요 | X | O |
| 권장 시점 | MVP, 초기 | 스케일업 후 |

### 모노레포 vs 멀티레포

| 기준 | 모노레포 | 멀티레포 |
|------|----------|----------|
| 코드 공유 | 쉬움 | 어려움 |
| 독립성 | 낮음 | 높음 |
| CI/CD 복잡도 | 높음 | 낮음 |
| 권장 | 동일 팀/스택 | 독립 팀/다른 스택 |

### 백엔드 패턴

| 패턴 | 설명 | 권장 시점 |
|------|------|----------|
| **모듈러 모놀리스** | 도메인별 모듈 분리, 단일 배포 | MVP~중규모 |
| **레이어드** | Controller-Service-Repository | 간단한 CRUD |
| **클린 아키텍처** | 의존성 역전, 도메인 중심 | 복잡한 비즈니스 로직 |
| **마이크로서비스** | 서비스별 독립 배포 | 대규모, 팀 분리 |

---

## 3단계: 프론트엔드

### 프레임워크 선정

| 프레임워크 | 강점 | 약점 | 권장 |
|------------|------|------|------|
| **Next.js** | SSR/SSG, React 생태계 | 복잡한 설정 | 대부분의 웹앱 |
| **Nuxt.js** | Vue 생태계, 직관적 | 생태계 크기 | Vue 선호 팀 |
| **SvelteKit** | 성능, 간결함 | 생태계 작음 | 성능 중시 |
| **React SPA** | 유연성 | SEO 어려움 | 관리자/대시보드 |

### 상태 관리

| 라이브러리 | 복잡도 | 권장 |
|------------|--------|------|
| **React Context** | 낮음 | 간단한 전역 상태 |
| **Zustand** | 낮음 | 대부분의 경우 |
| **TanStack Query** | 중간 | 서버 상태 (API) |
| **Redux Toolkit** | 높음 | 복잡한 클라이언트 상태 |

### UI 라이브러리

| 라이브러리 | 특징 | 권장 |
|------------|------|------|
| **shadcn/ui** | Headless + Tailwind | 커스텀 디자인 |
| **Radix UI** | Headless primitives | 접근성 중시 |
| **MUI** | 완성형 컴포넌트 | 빠른 개발 |
| **Ant Design** | 엔터프라이즈 | 관리자 시스템 |

---

## 4단계: 백엔드

### Node.js 계열

| 프레임워크 | 강점 | 약점 | 권장 |
|------------|------|------|------|
| **NestJS** | 구조화, 모듈 시스템 | 학습 곡선 | 중대규모 |
| **Express** | 간단, 유연 | 구조 없음 | 소규모/프로토타입 |
| **Fastify** | 성능 | 생태계 | 고성능 API |

### 다른 언어

| 프레임워크 | 언어 | 강점 | 권장 |
|------------|------|------|------|
| **ASP.NET Core** | C# | 엔터프라이즈, 성능 | .NET 팀, 레거시 통합 |
| **Django** | Python | 빠른 개발, Admin | 데이터/ML 연동 |
| **FastAPI** | Python | 성능, 타입 | Python API |
| **Spring Boot** | Java/Kotlin | 엔터프라이즈 | 대규모, Java 팀 |
| **Go (Gin/Echo)** | Go | 성능, 동시성 | 고성능 마이크로서비스 |

### API 스타일

| 스타일 | 강점 | 약점 | 권장 |
|--------|------|------|------|
| **REST** | 단순, 범용 | 오버/언더 페칭 | 대부분 |
| **GraphQL** | 유연한 쿼리 | 복잡도 | 복잡한 데이터 관계 |
| **gRPC** | 성능 | 브라우저 지원 | 서비스 간 통신 |

---

## 5단계: 데이터베이스

### RDBMS vs NoSQL

| 기준 | RDBMS | NoSQL |
|------|-------|-------|
| 데이터 구조 | 정형, 관계형 | 비정형, 유연 |
| 트랜잭션 | ACID 보장 | 제한적 |
| 스케일링 | 수직 | 수평 |
| 권장 | 금융, ERP, 관계 복잡 | 로그, 캐시, 문서 |

### RDBMS 선택

| DB | 강점 | 권장 |
|----|------|------|
| **PostgreSQL** | 확장성, JSON 지원 | 대부분 |
| **MySQL** | 성능, 안정성 | 읽기 중심 |
| **SQLite** | 임베디드, 간단 | 로컬, 테스트 |
| **SQL Server** | .NET 통합 | Windows/.NET |

### ORM/쿼리 빌더

| 도구 | 언어 | 특징 |
|------|------|------|
| **Prisma** | TypeScript | 타입 안전, 마이그레이션 |
| **TypeORM** | TypeScript | Active Record/Data Mapper |
| **Drizzle** | TypeScript | 경량, SQL-like |
| **Entity Framework** | C# | .NET 표준 |
| **SQLAlchemy** | Python | 유연성 |

---

## 6단계: 인프라

### 배포 플랫폼

| 플랫폼 | 특징 | 권장 |
|--------|------|------|
| **Vercel** | Next.js 최적화 | Next.js 프론트 |
| **Railway** | 간편한 백엔드 | Node.js/DB |
| **AWS** | 풀스택 | 엔터프라이즈 |
| **GCP** | K8s, AI/ML | 컨테이너, ML |
| **Azure** | .NET 통합 | MS 스택 |

### 추가 서비스

| 용도 | 권장 서비스 |
|------|------------|
| 캐시 | Redis (Upstash, Railway) |
| 메시지 큐 | RabbitMQ, AWS SQS, Kafka |
| 검색 | Elasticsearch, Algolia |
| 파일 저장소 | S3, Cloudflare R2 |
| 모니터링 | Sentry, Datadog |

---

## 스택 프리셋

### Preset A: TypeScript 풀스택 (권장)

```
프론트엔드: Next.js 15 (App Router) + Tailwind + shadcn/ui
백엔드:     NestJS 10 (모듈러 모놀리스)
DB:         PostgreSQL + Prisma
배포:       Vercel (프론트) + Railway (백엔드/DB)
구조:       모노레포 (pnpm + Turborepo)
```

**템플릿**: 
- [typescript-web.md](../templates/copilot-instructions/typescript-web.md)
- [typescript-monorepo.md](../templates/folder-structure/typescript-monorepo.md)

**적합**: 대부분의 웹 서비스, MVP~중규모

### Preset B: Python 데이터 중심

```
프론트엔드: React + Vite 또는 Next.js
백엔드:     FastAPI
DB:         PostgreSQL + SQLAlchemy
배포:       Vercel + Railway 또는 AWS
```

**템플릿**: 
- [python.md](../templates/copilot-instructions/python.md)
- [python-fastapi.md](../templates/folder-structure/python-fastapi.md)

**적합**: ML/AI 연동, 데이터 분석

### Preset C: .NET 엔터프라이즈

```
프론트엔드: React/Blazor
백엔드:     ASP.NET Core (Clean Architecture)
DB:         SQL Server + Entity Framework
배포:       Azure
```

**템플릿**: 
- [dotnet.md](../templates/copilot-instructions/dotnet.md)
- [dotnet-clean.md](../templates/folder-structure/dotnet-clean.md)

**적합**: 레거시 통합, 대기업 환경

### Preset D: 고성능 마이크로서비스

```
프론트엔드: Next.js 또는 React
백엔드:     Go (Gin) 또는 Node.js (Fastify)
DB:         PostgreSQL + Redis
통신:       gRPC (서비스 간), REST (클라이언트)
배포:       Kubernetes (AWS EKS / GCP GKE)
```

**적합**: 대규모 트래픽, 독립 서비스

---

## 의사결정 템플릿

AI와 대화할 때 사용하는 템플릿:

```markdown
@architect

## 기술 스택 선정 요청

### 서비스 개요
- 이름: [프로젝트명]
- 목적: [한 문장]
- MVP 기능: [핵심 3개]

### 제약 조건
| 항목 | 값 |
|------|-----|
| 팀 규모 | [N명] |
| 익숙한 언어 | [TypeScript/Python/.NET/...] |
| 마감일 | [YYYY-MM-DD] |
| 예산 | [클라우드 월 비용] |
| 특수 요구 | [있다면] |

### 예상 규모
| 항목 | 예상치 |
|------|--------|
| DAU | [명] |
| 데이터 크기 | [GB/TB] |
| API 호출 | [/일] |

### 질문
1. 어떤 프리셋을 권장하나요?
2. 해당 프리셋에서 변경이 필요한 부분은?
3. 고려해야 할 리스크는?
```

---

## 검증 체크리스트

스택 선정 후 확인:

```markdown
## 기술 스택 검증

### 팀 역량
- [ ] 팀원 중 해당 스택 경험자 있음
- [ ] 학습 비용 대비 장기 이득 검토됨
- [ ] 채용 시장에서 인력 확보 가능

### 기술적 적합성
- [ ] 요구사항 충족 가능 (성능, 기능)
- [ ] 확장성 요구사항 충족
- [ ] 보안 요구사항 충족

### 생태계
- [ ] 활발한 커뮤니티/유지보수
- [ ] 필요한 라이브러리 존재
- [ ] 문서/레퍼런스 충분

### 운영
- [ ] 배포 환경 확정
- [ ] 모니터링/로깅 방안 수립
- [ ] 비용 추정 완료
```

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-05 | 초기 버전 - 기술 스택 선정 가이드 |

