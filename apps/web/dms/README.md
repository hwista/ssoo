# SSOO Web DMS (Markdown Wiki)

> Next.js 기반 마크다운 문서 관리 시스템

---

## 📋 개요

`apps/web/dms`는 SSOO 서비스의 **도큐먼트 관리 시스템(DMS)** 입니다. 마크다운 기반 위키 시스템으로, 팀 내 기술 문서 및 지식을 체계적으로 관리합니다.

### 기술 스택 선정 이유

| 기술 | 선정 이유 |
|------|----------|
| **Next.js 15** | App Router, API Routes, SSR |
| **React 19** | 최신 React, Server Components |
| **CodeMirror 6** | 블록 편집 런타임, selection/command 제어 |
| **Tailwind CSS** | 유틸리티 CSS, 빠른 스타일링 |
| **PostgreSQL + pgvector** | 검색/세션/문서 데이터 저장 |
| **Azure OpenAI + AI SDK** | 문서 보조 작성, 검색, 답변 생성 |

---

## 📁 구조

```
apps/web/dms/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── api/                    # API Routes
│   │   │   ├── file/               # 단일 파일 CRUD
│   │   │   └── files/              # 파일 트리 조회
│   │   └── page.tsx                # 메인 페이지
│   │
│   ├── components/                 # React 컴포넌트
│   │   ├── common/                 # 공통 (ConfirmDialog, StateDisplay)
│   │   ├── layout/                 # 레이아웃 (AppLayout, Header, Sidebar)
│   │   ├── pages/                  # 페이지별 (home, markdown, wiki)
│   │   ├── templates/              # 템플릿 (DocPageTemplate)
│   │   └── ui/                     # 기본 UI (Button, Card, Dialog)
│   │
│   ├── hooks/                      # 앱 범용 훅
│   │   └── useOpenTabWithConfirm.ts # 탭 열기 확인
│   │
│   ├── stores/                     # Zustand 상태 관리
│   ├── lib/                        # 유틸리티
│   ├── types/                      # TypeScript 타입
│   └── middleware.ts               # 주소창 루트 고정 라우팅 정책
│
├── docs/                           # 개발 문서 (정본)
│   ├── development/                # 개발 가이드
│   └── wiki/                       # 위키 콘텐츠
└── package.json
```

---

## ✨ 주요 기능

### 문서 관리

| 기능 | 설명 |
|------|------|
| 파일 트리 | 계층적 폴더/파일 구조, 검색 |
| 파일 CRUD | 생성, 수정, 삭제, 이름 변경 |
| 탭 관리 | 다중 문서 탭 열기/닫기 |

### 마크다운 에디터

| 기능 | 설명 |
|------|------|
| 실시간 미리보기 | 마크다운 편집 중 미리보기 |
| 자동 저장 | 주기적 자동 저장 |
| Undo/Redo | 실행 취소/다시 실행 |

---

## 🔧 포함된 기능 (의존성)

### 프레임워크

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `next` | 15.1.0 | Next.js 프레임워크 |
| `react` | 19.2.0 | React |
| `typescript` | ^5 | 타입 안정성 |

### 에디터

| 패키지 | 용도 |
|--------|------|
| `codemirror` | 블록 에디터 런타임 |
| `@codemirror/lang-markdown` | 마크다운 언어 지원 |
| `lowlight` | 코드 구문 강조 |

### UI 컴포넌트

| 패키지 | 용도 |
|--------|------|
| `@radix-ui/*` | low-level UI primitives |
| `lucide-react` | 아이콘 |
| `tailwindcss` | 유틸리티 CSS |

### AI & 검색

| 패키지 | 용도 |
|--------|------|
| `ai` | Vercel AI SDK (프로바이더 추상화) |
| `@ai-sdk/azure` | Azure OpenAI 프로바이더 |
| `pg` | PostgreSQL + pgvector 연결 |

---

## 🛠 개발 명령어

```powershell
# 개발 서버 실행
pnpm dev:web-dms

# 또는 직접 실행
cd apps/web/dms && npm run dev

# 프로덕션 빌드
pnpm build:web-dms
```

### 접속

```
http://localhost:3001
```

---

## 📖 사용법

### 파일/폴더 관리

| 작업 | 방법 |
|------|------|
| 생성 | "새로 만들기" 버튼 또는 우클릭 |
| 편집 | 파일 선택 후 에디터에서 수정 |
| 이름 변경 | 우클릭 → "이름 변경" |
| 삭제 | 우클릭 → "삭제" |

### 키보드 단축키

| 단축키 | 기능 |
|--------|------|
| `Esc` | 편집 모드 종료 |
| `Enter` | 인라인 편집 확정 |
| `/` | 슬래시 명령어 (에디터) |
| `Ctrl+S` | 저장 |

### 슬래시 명령어

```
/h1, /h2, /h3     → 제목
/bullet, /number  → 리스트
/code             → 코드 블록
/table            → 테이블
/todo             → 체크리스트
```

---

## 🔗 API 개요

DMS는 App Router 기반 API 엔드포인트를 제공합니다.

| 카테고리 | 엔드포인트 | 설명 |
|----------|-----------|------|
| 파일 | `/api/file`, `/api/files` | 파일 CRUD, 트리 조회 |
| 검색 | `/api/search`, `/api/ask` | Vector 검색, AI 답변 |
| 문서 보조 | `/api/doc-assist`, `/api/templates` | AI 작성, 템플릿 |
| 설정/세션 | `/api/settings`, `/api/chat-sessions` | 설정, AI 세션 |

> 📚 상세 API 문서: [docs/dms/guides/api.md](../../docs/dms/guides/api.md)

---

## 📚 개발 문서

| 문서 | 설명 |
|------|------|
| [서비스 개요](./docs/development/domain/service-overview.md) | 아키텍처, 데이터 흐름 |
| [기술 스택](./docs/development/architecture/tech-stack.md) | 기술 스택 상세 |
| [디자인 시스템](./docs/development/design/design-system.md) | 색상, 타이포그래피, 스타일 |
| [Hooks 가이드](./docs/development/guides/hooks.md) | 9개 커스텀 훅 |
| [Components 가이드](./docs/development/guides/components.md) | 35개 컴포넌트 |
| [API 가이드](./docs/development/guides/api.md) | 19개 API 엔드포인트 |
| [로드맵](./docs/development/planning/roadmap.md) | 개발 로드맵 |

---

## 🔮 로드맵

| Phase | 상태 | 내용 |
|-------|------|------|
| Phase 1-4 | ✅ 완료 | 에디터, AI 검색, 협업, 플러그인 |
| Phase 5 | 🔄 진행중 | PWA, 외부 스토리지 연동 |
| Phase 6 | 🔜 예정 | 모노레포 통합, PMS 연동 |

> 📚 상세 로드맵: [docs/development/planning/roadmap.md](./docs/development/planning/roadmap.md)

---

## 🔗 관련 링크

- **GitLab**: `http://10.125.31.72:8010/LSITC_WEB/LSWIKI.git`
- **모노레포 문서**: `docs/dms/README.md`
