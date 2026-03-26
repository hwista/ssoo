# TypeScript 모노레포 폴더 구조

> NestJS + Next.js 모노레포 (pnpm + Turborepo)

---

## 전체 구조

```
[project-name]/
├── .github/
│   ├── copilot-instructions.md
│   ├── README.md
│   ├── MIGRATION.md
│   ├── agents/
│   │   ├── common-workflow.md
│   │   ├── orchestrator.agent.md
│   │   ├── planner.agent.md
│   │   ├── architect.agent.md
│   │   ├── dba.agent.md
│   │   ├── developer.agent.md
│   │   ├── tester.agent.md
│   │   ├── reviewer.agent.md
│   │   └── security.agent.md
│   ├── prompts/
│   │   ├── core/
│   │   │   ├── project-init.prompt.md
│   │   │   ├── feature-dev.prompt.md
│   │   │   ├── review.prompt.md
│   │   │   └── refactor.prompt.md
│   │   └── [project]/
│   │       ├── api-design.prompt.md
│   │       ├── component-design.prompt.md
│   │       └── db-migration.prompt.md
│   ├── instructions/
│   │   ├── server.instructions.md
│   │   ├── web-[app].instructions.md
│   │   ├── database.instructions.md
│   │   └── types.instructions.md
│   ├── guides/
│   │   ├── 01-new-project.md
│   │   ├── 02-migration.md
│   │   └── 03-tech-stack.md
│   ├── templates/
│   │   ├── copilot-instructions/
│   │   └── folder-structure/
│   └── workflows/
│       └── ci.yml
│
├── apps/
│   ├── server/                        # NestJS 백엔드
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/
│   │   │   │   ├── index.ts
│   │   │   │   ├── responses.ts
│   │   │   │   ├── decorators/
│   │   │   │   ├── filters/
│   │   │   │   ├── guards/
│   │   │   │   └── interceptors/
│   │   │   ├── config/
│   │   │   │   ├── app.config.ts
│   │   │   │   ├── database.config.ts
│   │   │   │   └── jwt.config.ts
│   │   │   ├── database/
│   │   │   │   └── prisma.service.ts
│   │   │   └── modules/
│   │   │       ├── common/
│   │   │       │   ├── auth/
│   │   │       │   │   ├── auth.controller.ts
│   │   │       │   │   ├── auth.service.ts
│   │   │       │   │   ├── auth.module.ts
│   │   │       │   │   ├── dto/
│   │   │       │   │   └── guards/
│   │   │       │   ├── user/
│   │   │       │   │   ├── user.controller.ts
│   │   │       │   │   ├── user.service.ts
│   │   │       │   │   ├── user.module.ts
│   │   │       │   │   └── dto/
│   │   │       │   └── health/
│   │   │       └── [domain]/
│   │   │           ├── [entity]/
│   │   │           │   ├── [entity].controller.ts
│   │   │           │   ├── [entity].service.ts
│   │   │           │   ├── [entity].module.ts
│   │   │           │   └── dto/
│   │   │           └── [domain].module.ts
│   │   ├── test/
│   │   │   ├── app.e2e-spec.ts
│   │   │   └── jest-e2e.json
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── eslint.config.mjs
│   │
│   └── web/
│       └── [app-name]/                # Next.js 앱
│           ├── src/
│           │   ├── app/
│           │   │   ├── layout.tsx
│           │   │   ├── page.tsx
│           │   │   ├── (auth)/
│           │   │   │   ├── login/
│           │   │   │   └── register/
│           │   │   ├── (main)/
│           │   │   │   ├── layout.tsx
│           │   │   │   ├── dashboard/
│           │   │   │   └── [resource]/
│           │   │   └── api/
│           │   ├── components/
│           │   │   ├── index.ts
│           │   │   ├── ui/
│           │   │   │   ├── button.tsx
│           │   │   │   ├── input.tsx
│           │   │   │   └── ...
│           │   │   ├── common/
│           │   │   │   ├── Header.tsx
│           │   │   │   ├── Sidebar.tsx
│           │   │   │   └── ...
│           │   │   └── pages/
│           │   │       └── [page-name]/
│           │   ├── hooks/
│           │   │   ├── index.ts
│           │   │   ├── useAuth.ts
│           │   │   └── queries/
│           │   │       ├── index.ts
│           │   │       └── use[Entity].ts
│           │   ├── lib/
│           │   │   ├── index.ts
│           │   │   ├── api/
│           │   │   │   ├── index.ts
│           │   │   │   ├── client.ts
│           │   │   │   └── endpoints/
│           │   │   ├── utils/
│           │   │   │   ├── index.ts
│           │   │   │   ├── cn.ts
│           │   │   │   └── formatters.ts
│           │   │   └── validations/
│           │   │       ├── index.ts
│           │   │       └── [entity].schema.ts
│           │   ├── stores/
│           │   │   ├── auth.store.ts
│           │   │   └── [store].store.ts
│           │   ├── types/
│           │   │   └── index.ts
│           │   └── middleware.ts
│           ├── public/
│           ├── next.config.mjs
│           ├── package.json
│           ├── tsconfig.json
│           ├── tailwind.config.ts
│           ├── postcss.config.mjs
│           └── eslint.config.mjs
│
├── packages/
│   ├── database/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   ├── seed.ts
│   │   │   └── triggers/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── extensions/
│   │   ├── scripts/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── types/
│       ├── src/
│       │   ├── index.ts
│       │   ├── common/
│       │   │   ├── index.ts
│       │   │   ├── api.ts
│       │   │   └── user.ts
│       │   └── [domain]/
│       │       ├── index.ts
│       │       └── [entity].ts
│       ├── package.json
│       └── tsconfig.json
│
├── docs/
│   ├── README.md
│   ├── CHANGELOG.md
│   ├── getting-started.md
│   ├── common/
│   │   ├── README.md
│   │   ├── architecture/
│   │   │   ├── tech-stack.md
│   │   │   └── development-standards.md
│   │   ├── guides/
│   │   │   └── api-guide.md
│   │   └── reference/
│   │       ├── api/
│   │       └── db/
│   └── [domain]/
│       ├── README.md
│       ├── domain/
│       │   ├── concepts.md
│       │   ├── workflows/
│       │   └── actions/
│       ├── planning/
│       │   ├── backlog.md
│       │   ├── changelog.md
│       │   └── roadmap.md
│       └── tests/
│
├── scripts/
│   ├── check-patterns.js
│   └── docs-verify.js
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .gitignore
├── .prettierrc
└── README.md
```

---

## 루트 설정 파일

### package.json

```json
{
  "name": "[project-name]",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "clean": "turbo clean && rm -rf node_modules",
    "db:generate": "turbo db:generate",
    "db:push": "turbo db:push",
    "db:migrate": "turbo db:migrate"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.0.0",
    "prettier": "^3.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

### pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "apps/web/*"
  - "packages/*"
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "db:generate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    }
  }
}
```

### tsconfig.base.json

```json
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
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

---

## 사용법

1. 이 구조를 기반으로 폴더 생성
2. 각 `[placeholder]`를 프로젝트에 맞게 대체
3. 불필요한 폴더 제거 (예: 단일 앱이면 web/ 하위 구조 단순화)

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-05 | 초기 버전 - TypeScript 모노레포 구조 |

