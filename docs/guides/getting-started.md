# DMS 개발 환경 설정 가이드

> DMS(도큐먼트 관리 시스템) 로컬 개발 환경 구성 방법

**마지막 업데이트**: 2026-02-04

---

## 📋 목차

1. [사전 요구사항](#사전-요구사항)
2. [설치 방법](#설치-방법)
3. [환경 변수 설정](#환경-변수-설정)
4. [문서 저장소 설정](#문서-저장소-설정)
5. [의존성 설치](#의존성-설치)
6. [개발 서버 실행](#개발-서버-실행)
7. [포트 설정](#포트-설정)
8. [개발 명령어](#개발-명령어)
9. [문제 해결](#문제-해결)
10. [다음 단계](#다음-단계)
11. [관련 문서 / 지원](#관련-문서--지원)
12. [Changelog](#changelog)

---

## ⚠️ DMS vs 모노레포

DMS는 **독립 프로젝트**로 설계되어 있습니다:

| 항목 | DMS | PMS (모노레포) |
|------|-----|---------------|
| **패키지 매니저** | npm | pnpm |
| **의존성** | 독립 | @ssoo/* 패키지 공유 |
| **백엔드** | Next.js API Routes (내장) | NestJS (별도 서버) |
| **데이터베이스** | LanceDB (Vector DB, 로컬) | PostgreSQL |
| **포트** | 3001 | 3000 (프론트), 4000 (백엔드) |

---

## 사전 요구사항

### 필수 설치

| 도구 | 버전 | 확인 명령어 | 설치 방법 |
|------|------|------------|----------|
| **Node.js** | v18.x 이상 (권장 v20.x) | `node --version` | [nodejs.org](https://nodejs.org/) |
| **npm** | v9.x 이상 | `npm --version` | Node.js에 포함 |
| **Git** | 최신 버전 | `git --version` | [git-scm.com](https://git-scm.com/) |

### 선택 (AI 기능 사용 시)

| 도구 | 용도 | 발급 방법 |
|------|------|----------|
| **Gemini API Key** | AI 검색, 답변 생성 | [Google AI Studio](https://aistudio.google.com/) |

### 권장 도구

- **VS Code** - 에디터
- **Postman** - API 테스트

---

## 설치 방법

### 방법 1: 모노레포에서 실행 (권장)

모노레포(`sooo`)를 이미 클론한 경우:

```bash
# 모노레포 루트로 이동
cd sooo

# 전체 의존성 설치는 [의존성 설치](#의존성-설치) 섹션 참조

# DMS 개발 서버 실행
pnpm dev:web-dms
```

### 방법 2: DMS 단독 실행

DMS 디렉토리에서 직접 실행:

```bash
# DMS 디렉토리로 이동
cd apps/web/dms

# 의존성 설치는 [의존성 설치](#의존성-설치) 섹션 참조

# 개발 서버 실행
npm run dev
```

### 방법 3: 독립 저장소에서 클론 (레거시)

DMS 원본 GitLab 저장소에서 클론:

```bash
# 저장소 클론
git clone http://10.125.31.72:8010/LSITC_WEB/LSWIKI.git
cd LSWIKI

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

---

## 환경 변수 설정

### 기본 설정 (선택)

DMS는 환경 변수 없이도 기본 동작합니다. AI 기능 사용 시에만 설정이 필요합니다.

### AI 기능 사용 시

`apps/web/dms/.env.local` 파일 생성:

```env
# Gemini API (AI 검색/답변 기능)
GEMINI_API_KEY=your_gemini_api_key

# 환경 설정 (선택)
NODE_ENV=development
```

**Gemini API Key 발급:**

1. [Google AI Studio](https://aistudio.google.com/) 접속
2. "Get API Key" 클릭
3. 새 프로젝트 생성 또는 기존 프로젝트 선택
4. API Key 복사하여 `.env.local`에 입력

---

## 문서 저장소 설정

### 기본 저장소

DMS는 위키 문서를 로컬 파일시스템에 저장합니다:

```
apps/web/dms/docs/wiki/     # 위키 콘텐츠 저장소
```

### 데이터 저장소

Vector DB 및 메타데이터:

```
apps/web/dms/data/          # LanceDB, 메타데이터
```

### 초기 데이터

DMS는 별도의 시드 데이터가 필요 없습니다. 앱 실행 시 자동으로 필요한 디렉토리가 생성됩니다.

---

## 의존성 설치

### 모노레포에서 설치 (권장)

```bash
# 모노레포 루트에서
cd sooo
pnpm install
```

### DMS 단독 설치

```bash
# DMS 디렉토리에서
cd apps/web/dms
npm install
```

---

## 개발 서버 실행

### 명령어

```bash
# 모노레포 루트에서
pnpm dev:web-dms

# 또는 DMS 디렉토리에서
cd apps/web/dms
npm run dev
```

### 접속

```
http://localhost:3001
```

서버가 정상 실행되면:
```
▲ Next.js 15.1.0
- Local:        http://localhost:3001
- Environments: .env.local
```

---

## 포트 설정

| 서비스 | 포트 | URL |
|--------|------|-----|
| **DMS 프론트엔드** | 3001 | http://localhost:3001 |
| **API Routes** | 3001 | http://localhost:3001/api/* |

---

## 개발 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 (포트 3001) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 실행 |

### 모노레포에서 실행

```bash
# 루트 디렉토리에서
pnpm dev:web-dms          # DMS 개발 서버
pnpm build:web-dms        # DMS 빌드
pnpm --filter web-dms dev # 필터 방식
```

---

## 문제 해결

### 1. 포트 충돌

**증상**: `Error: listen EADDRINUSE: address already in use :::3001`

**해결**:
```bash
# Linux / macOS / WSL
lsof -ti:3001 | xargs kill -9

# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force

# Windows (CMD)
for /f "tokens=5" %a in ('netstat -ano ^| findstr :3001') do taskkill /PID %a /F
```

### 2. LanceDB 오류

**증상**: `LanceDB initialization failed` 또는 Vector DB 관련 오류

**해결**:
```bash
# Linux / macOS / WSL
rm -rf apps/web/dms/data
npm run dev

# Windows (PowerShell)
Remove-Item -Recurse -Force apps/web/dms/data
npm run dev

# Windows (CMD)
rmdir /s /q apps\web\dms\data
npm run dev
```

### 3. Gemini API 오류

**증상**: AI 검색/답변이 작동하지 않음

**확인사항**:
1. `.env.local` 파일에 `GEMINI_API_KEY` 설정 확인
2. API Key가 유효한지 확인
3. API 할당량 초과 여부 확인

```bash
# API Key 테스트
curl -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY"
```

### 4. npm install 오류

**증상**: 의존성 설치 실패

**해결**:
```bash
# Linux / macOS / WSL
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Windows (PowerShell)
Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue
npm cache clean --force
npm install

# Windows (CMD)
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul
npm cache clean --force
npm install
```

### 5. TypeScript 오류

**해결**:
```bash
# Linux / macOS / WSL
rm -rf .next
npm run build

# Windows (PowerShell)
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build

# Windows (CMD)
rmdir /s /q .next 2>nul
npm run build
```

### 6. SSL 인증서 오류 (회사 네트워크/프록시 환경)

**증상**: `npm install` 시 `ECONNRESET`, `self-signed certificate` 오류

**해결 (명령어별 임시 적용)**:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm install
```

**해결 (영구 적용)** - `~/.bashrc` 또는 `~/.zshrc`에 추가:
```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

> ⚠️ 이 설정은 보안을 약화시키므로 개발 환경에서만 사용하세요.

---

## 다음 단계

개발 환경 설정이 완료되었습니다! 이제:

1. **위키 접속**: http://localhost:3001 접속

2. **문서 작성**: 좌측 트리에서 "새로 만들기"

3. **개발 문서 확인**:
   - [서비스 개요](./domain/service-overview.md)
   - [기술 스택](./architecture/tech-stack.md)
   - [컴포넌트 가이드](./guides/components.md)
   - [API 가이드](./guides/api.md)

4. **개발 시작**:
   - [로드맵](./planning/roadmap.md) 확인
   - [백로그](./planning/backlog.md) 확인

---

## 관련 문서 / 지원

### 관련 문서

- [DMS README](../../README.md) - 프로젝트 개요
- [AGENTS.md](./AGENTS.md) - 에이전트 학습 가이드
- [모노레포 통합 가이드](../../../../docs/dms/architecture/git-subtree-integration.md)
- [서비스 개요](./domain/service-overview.md)
- [기술 스택](./architecture/tech-stack.md)

### 지원

문제가 계속되면:
- GitHub Issues: https://github.com/hwista/sooo/issues
- 내부 문의: 개발팀

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-04 | SSL 인증서 오류 해결법 추가 (회사 네트워크 환경) |
| 2026-02-04 | OS별 CLI 명령어 구분, 문서 구조 표준화 |
| 2026-02-03 | DMS 개발 환경 설정 가이드 최초 작성 |
