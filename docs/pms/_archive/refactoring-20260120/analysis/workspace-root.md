# Phase 1.1: 워크스페이스 루트 분석

> 분석일: 2026-01-20  
> 상태: 진행 중

---

## 📋 분석 대상 파일

| 파일 | 역할 | 분석 상태 |
|------|------|:--------:|
| `package.json` | 루트 패키지 정의 | ✅ |
| `pnpm-workspace.yaml` | 워크스페이스 정의 | ✅ |
| `turbo.json` | Turborepo 설정 | ✅ |
| `tsconfig.base.json` | 공통 TypeScript 설정 | ✅ |
| `.env` / `.env.example` | 환경 변수 | 🔲 |
| `.gitignore` | Git 무시 파일 | 🔲 |
| `.nvmrc` | Node 버전 | 🔲 |
| `README.md` | 프로젝트 설명 | 🔲 |

---

## 1. package.json 분석

### 현재 내용

```json
{
  "name": "hwista-ssoo",
  "version": "0.0.1",
  "private": true,
  "packageManager": "pnpm@10.28.0",
  "description": "SSOO - SI/SM 조직의 Opportunity-Project-System 통합 업무 허브",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "clean": "turbo clean && rimraf node_modules",
    "dev:server": "turbo dev --filter=server",
    "dev:web-pms": "turbo dev --filter=web-pms",
    "build:server": "turbo build --filter=server",
    "build:web-pms": "turbo build --filter=web-pms"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.7.0",
    "rimraf": "^6.0.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### 분석 결과

| 항목 | 상태 | 의견 |
|------|:----:|------|
| name | ✅ | 적절 |
| version | ✅ | 개발 초기 버전 |
| private | ✅ | 모노레포 필수 |
| packageManager | ✅ | pnpm 10.28.0 고정 |
| scripts | ⚠️ | database 관련 스크립트 없음 |
| devDependencies | ✅ | 최소한의 공통 의존성 |
| engines | ✅ | Node 20+ 명시 |

### 개선 제안

```diff
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "clean": "turbo clean && rimraf node_modules",
    "dev:server": "turbo dev --filter=server",
    "dev:web-pms": "turbo dev --filter=web-pms",
    "build:server": "turbo build --filter=server",
-   "build:web-pms": "turbo build --filter=web-pms"
+   "build:web-pms": "turbo build --filter=web-pms",
+   "db:generate": "turbo db:generate --filter=@ssoo/database",
+   "db:push": "turbo db:push --filter=@ssoo/database",
+   "db:studio": "turbo db:studio --filter=@ssoo/database"
  }
```

### 위험도: 🟢 낮음
- 추가만 있고 기존 기능에 영향 없음

---

## 2. pnpm-workspace.yaml 분석

### 현재 내용

```yaml
packages:
  - apps/*
  - packages/*

onlyBuiltDependencies:
  - '@nestjs/core'
  - '@prisma/client'
  - '@prisma/engines'
  - '@scarf/scarf'
  - bcrypt
  - core-js
  - inferno
  - prisma
  - sharp
  - unrs-resolver
```

### 분석 결과

| 항목 | 상태 | 의견 |
|------|:----:|------|
| packages 정의 | ✅ | apps/*, packages/* 표준 구조 |
| onlyBuiltDependencies | ✅ | 네이티브 모듈 빌드 최적화 |

### 개선 제안
- 없음. 현재 상태 적절

### 위험도: 🟢 없음

---

## 3. turbo.json 분석

### 현재 내용

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### 분석 결과

| 항목 | 상태 | 의견 |
|------|:----:|------|
| build task | ✅ | 의존성 순서 빌드, 출력 캐싱 |
| dev task | ✅ | 캐시 없음, persistent |
| lint task | ⚠️ | build 의존 - lint만 할 때 build 먼저 실행됨 |
| clean task | ✅ | 캐시 없음 |

### 개선 제안

```diff
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
-     "dependsOn": ["^build"]
+     "dependsOn": []
    },
    "clean": {
      "cache": false
-   }
+   },
+   "db:generate": {
+     "cache": false
+   },
+   "db:push": {
+     "cache": false
+   },
+   "db:studio": {
+     "cache": false,
+     "persistent": true
+   }
  }
```

### 위험도: 🟡 중간
- lint dependsOn 변경 시 동작 변경 가능
- 충분한 테스트 필요

---

## 4. tsconfig.base.json 분석

### 현재 내용

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

### 분석 결과

| 항목 | 상태 | 의견 |
|------|:----:|------|
| target | ✅ | ES2022 - Node 20+ 호환 |
| module/moduleResolution | ✅ | NodeNext - 현대적 설정 |
| strict | ✅ | 엄격 모드 |
| 추가 strict 옵션 | ✅ | noUncheckedIndexedAccess, noImplicitOverride |

### 개선 제안
- 없음. 현재 상태 매우 적절

### 위험도: 🟢 없음

---

## 5. 디렉터리 구조 분석

### 현재 구조

```
hwista-ssoo/
├── .env                    # 환경 변수 (gitignore)
├── .env.example            # 환경 변수 예시
├── .git/                   # Git
├── .gitignore              # Git 무시 파일
├── .nvmrc                  # Node 버전
├── .turbo/                 # Turbo 캐시
├── .vscode/                # VS Code 설정
├── README.md               # 프로젝트 설명
├── apps/                   # 애플리케이션
│   ├── server/             # NestJS 백엔드
│   └── web/                # Next.js 프론트엔드
├── docs/                   # 문서
├── node_modules/           # 의존성 (gitignore)
├── package.json            # 루트 패키지
├── packages/               # 공유 패키지
│   ├── database/           # @ssoo/database
│   └── types/              # @ssoo/types
├── pnpm-lock.yaml          # 잠금 파일
├── pnpm-workspace.yaml     # 워크스페이스 정의
├── tsconfig.base.json      # 공통 TS 설정
└── turbo.json              # Turborepo 설정
```

### 분석 결과

| 항목 | 상태 | 의견 |
|------|:----:|------|
| 전체 구조 | ✅ | Turborepo 모노레포 표준 준수 |
| apps/ 구조 | ✅ | server, web 분리 |
| packages/ 구조 | ✅ | database, types 공유 패키지 |
| docs/ 위치 | ✅ | 루트에 문서 폴더 |

### 개선 제안

현재 구조는 Turborepo 모노레포의 표준 패턴을 잘 따르고 있음.

**고려 가능한 사항** (필수 아님):
- `packages/ui/` - 공유 UI 컴포넌트 (현재 web 내부에 있음)
- `packages/config/` - 공유 설정 (eslint, prettier 등)

### 위험도: 🟢 없음

---

## 📊 분석 요약

### 현재 상태 평가

| 영역 | 점수 | 비고 |
|------|:----:|------|
| 모노레포 구조 | 9/10 | 표준 준수 |
| 패키지 설정 | 8/10 | DB 스크립트 추가 권장 |
| TypeScript 설정 | 10/10 | 우수 |
| Turbo 설정 | 7/10 | lint 의존성 검토 필요 |
| **종합** | **8.5/10** | 양호 |

### 발견된 이슈

| # | 우선순위 | 내용 | 영향도 |
|---|:--------:|------|:------:|
| 1 | 낮음 | 루트 package.json에 DB 스크립트 없음 | 편의성 |
| 2 | 중간 | turbo.json lint dependsOn 재검토 | 빌드 속도 |

### 권장 조치

1. **즉시 조치 불필요** - 현재 구조 안정적
2. **Phase 2에서 검토** - 개선 사항은 계획 수립 시 포함 여부 결정

---

## ✅ 분석 완료 체크

- [x] package.json 분석
- [x] pnpm-workspace.yaml 분석
- [x] turbo.json 분석
- [x] tsconfig.base.json 분석
- [x] 디렉터리 구조 분석
- [ ] .env / .env.example 분석
- [ ] .gitignore 분석
- [ ] README.md 분석

---

## 📎 다음 단계

→ [Phase 1.2: packages/database 분석](packages-database.md)
