# Config 템플릿

> 기술 스택별 프로젝트 설정 파일 템플릿

---

## 사용법

1. 프로젝트 기술 스택에 맞는 폴더 선택
2. 파일들을 프로젝트 루트로 복사
3. `[PLACEHOLDER]` 부분을 프로젝트에 맞게 수정

---

## 기술 스택별 템플릿

### TypeScript 모노레포 (pnpm + Turborepo)

```bash
cp -r .github/templates/config/typescript-monorepo/* ./
```

| 파일 | 설명 |
|------|------|
| `package.json` | 루트 패키지 설정 |
| `pnpm-workspace.yaml` | 워크스페이스 설정 |
| `tsconfig.base.json` | 공통 TypeScript 설정 |
| `turbo.json` | Turborepo 태스크 설정 |
| `.gitignore` | Git 무시 파일 |

### TypeScript 단일 레포 (npm)

```bash
cp -r .github/templates/config/typescript-npm/* ./
```

| 파일 | 설명 |
|------|------|
| `package.json` | 패키지 설정 |
| `tsconfig.json` | TypeScript 설정 |
| `.gitignore` | Git 무시 파일 |

### Python (Poetry)

```bash
cp -r .github/templates/config/python-poetry/* ./
```

| 파일 | 설명 |
|------|------|
| `pyproject.toml` | Poetry 프로젝트 설정 |
| `.gitignore` | Git 무시 파일 |

### .NET (Clean Architecture)

```bash
cp -r .github/templates/config/dotnet/* ./
```

| 파일 | 설명 |
|------|------|
| `Directory.Build.props` | 공통 빌드 설정 |
| `.gitignore` | Git 무시 파일 |
| `*.sln.template` | 솔루션 생성 가이드 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-05 | 기술 스택별 분리 (typescript-monorepo, typescript-npm, python-poetry, dotnet) |
