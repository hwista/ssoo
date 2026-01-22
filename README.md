<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-3.0-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind" />
</p>

<h1 align="center">📚 Markdown Wiki System</h1>

<p align="center">
  <strong>Next.js 16.0 기반의 실시간 마크다운 문서 관리 시스템</strong><br/>
  파일 탐색기 스타일의 직관적인 인터페이스 • VS Code 스타일의 시각적 피드백 • AI 기반 검색
</p>

<p align="center">
  <a href="#-주요-기능">주요 기능</a> •
  <a href="#-기술-스택">기술 스택</a> •
  <a href="#-설치-및-실행">설치</a> •
  <a href="#-api-레퍼런스">API</a> •
  <a href="#-로드맵">로드맵</a>
</p>

---

## 📋 목차

- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [프로젝트 구조](#-프로젝트-구조)
- [설치 및 실행](#-설치-및-실행)
- [사용법](#-사용법)
- [API 레퍼런스](#-api-레퍼런스)
- [디자인 시스템](#-디자인-시스템)
- [로드맵](#-로드맵)
- [기여하기](#-기여하기)

---

## ✨ 주요 기능

### 📁 파일 시스템 관리

| 기능 | 설명 |
|------|------|
| 리사이저블 사이드바 | 드래그로 조절 가능한 파일 트리 |
| 실시간 파일 탐색 | 파일/폴더 생성, 삭제, 이름 변경 |
| 컨텍스트 메뉴 | 우클릭으로 접근하는 파일 관리 기능 |
| 검색 기능 | 트리 내 실시간 파일 검색 |

### 📝 블록 에디터 (Tiptap)

> Notion 스타일의 블록 기반 편집기

- **슬래시(/) 명령어**: 제목, 리스트, 코드블록, 테이블 등 빠른 삽입
- **실시간 서식 툴바**: 굵게, 기울임, 취소선, 하이라이트
- **테이블 & 체크리스트**: 구조화된 문서 작성
- **코드 블록**: 문법 강조 지원
- **HTML ↔ 마크다운**: 자동 변환

### 🔍 AI 검색 (RAG)

```
┌─────────────────────────────────────────────────────────────┐
│  📄 문서 업로드  →  🔢 Vector 임베딩  →  💾 LanceDB 저장   │
│                                                             │
│  🔍 질문 입력   →  🎯 유사도 검색    →  🤖 AI 답변 생성   │
└─────────────────────────────────────────────────────────────┘
```

- **Vector 검색**: LanceDB + Gemini Embedding 기반 유사도 검색
- **AI 답변 생성**: Gemini 1.5 Flash 모델 기반 RAG 답변
- **문서 인덱싱**: 전체 위키 문서 자동/수동 인덱싱
- **출처 표시**: 답변에 참고한 문서 출처 제공

### 📜 버전 관리

| 기능 | 설명 |
|------|------|
| 자동 버전 저장 | 파일 저장 시 자동으로 버전 히스토리 생성 |
| 변경 이력 조회 | 파일별 버전 목록 및 변경 요약 |
| 버전 복원 | 이전 버전으로 복원 가능 |
| 버전 비교 | 두 버전 간 diff 비교 |
| Git 연동 | add, commit, push, pull 지원 |

### 💬 협업 기능

- **댓글 시스템**: 문서별 댓글 및 답글 지원
- **사용자 관리**: 역할 기반 권한 (admin/editor/viewer)
- **활동 로그**: 사용자 활동 추적

### 🎨 시각적 피드백

| 상태 | 표시 |
|------|------|
| 🟢 NEW | 새로 생성된 항목 (녹색 텍스트 + 빨간 뱃지) |
| 🔵 UPDATE | 수정된 항목 (파란색 텍스트 + 노란 뱃지) |
| 🔄 초기화 | 모든 표시 지우기 |

---

## 🏗️ 기술 스택

<table>
<tr>
<td valign="top" width="50%">

### Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 16.0 | App Router, RSC |
| React | 18+ | UI 라이브러리 |
| TypeScript | 5.0 | 타입 안정성 |
| Tailwind CSS | 3.0 | 스타일링 |
| Tiptap | 2.0 | 블록 에디터 |
| Fluent UI | - | 디자인 시스템 |

</td>
<td valign="top" width="50%">

### Backend & AI
| 기술 | 용도 |
|------|------|
| Next.js API Routes | RESTful API |
| LanceDB | Vector DB |
| Gemini Embedding | 텍스트 임베딩 |
| Gemini 1.5 Flash | RAG 답변 생성 |
| Node.js fs | 파일 시스템 |
| SSE | 실시간 감지 |

</td>
</tr>
</table>

---

## 📦 프로젝트 구조

```
📁 lswiki0906/
├── 📂 app/                           # Next.js App Router
│   ├── 📂 api/                       # API 엔드포인트
│   │   ├── 📄 file/route.ts          # 파일 CRUD
│   │   ├── 📄 files/route.ts         # 파일 목록
│   │   ├── 📄 upload/route.ts        # 마크다운 업로드
│   │   ├── 📄 search/route.ts        # Vector 검색
│   │   ├── 📄 index/route.ts         # 문서 인덱싱
│   │   ├── 📄 ask/route.ts           # AI 답변 (RAG)
│   │   ├── 📄 versions/route.ts      # 버전 히스토리
│   │   ├── 📄 comments/route.ts      # 댓글
│   │   ├── 📄 users/route.ts         # 사용자 관리
│   │   ├── 📄 git/route.ts           # Git 연동
│   │   └── 📄 watch/route.ts         # 실시간 감시
│   ├── 📂 wiki/                      # 위키 페이지
│   └── 📄 layout.tsx                 # 루트 레이아웃
│
├── 📂 components/                    # 컴포넌트
│   ├── 📂 ui/                        # 기본 UI
│   ├── 📂 editor/                    # 블록 에디터
│   │   ├── 📄 BlockEditor.tsx        # Tiptap 에디터
│   │   ├── 📄 EditorToolbar.tsx      # 서식 툴바
│   │   └── 📄 SlashCommand.tsx       # 슬래시 명령어
│   ├── 📄 WikiApp.tsx                # 메인 앱
│   ├── 📄 TreeComponent.tsx          # 파일 트리
│   ├── 📄 AIChat.tsx                 # AI 채팅
│   ├── 📄 VersionHistory.tsx         # 버전 히스토리
│   └── 📄 Comments.tsx               # 댓글
│
├── 📂 lib/                           # 유틸리티
│   ├── 📄 embeddings.ts              # Gemini 임베딩
│   ├── 📄 vectorStore.ts             # LanceDB 래퍼
│   ├── 📄 versionHistory.ts          # 버전 관리
│   ├── 📄 comments.ts                # 댓글 관리
│   ├── 📄 users.ts                   # 사용자 관리
│   └── 📄 markdownConverter.ts       # MD 변환
│
├── 📂 contexts/                      # React Context
│   ├── 📄 NotificationContext.tsx    # 알림 상태
│   └── 📄 UserContext.tsx            # 사용자 상태
│
├── 📂 docs/wiki/                     # 위키 문서 저장소
├── 📂 data/                          # 메타데이터 저장
└── 📄 package.json
```

---

## 🚀 설치 및 실행

### 요구사항

- Node.js 18.0 이상
- npm 또는 yarn
- Gemini API Key (AI 검색 사용 시)

### 설치

```bash
# 저장소 클론
git clone https://github.com/choishiam0906/lswiki0906.git
cd lswiki0906

# 의존성 설치
npm install

# 환경 변수 설정 (AI 검색 사용 시)
echo "GEMINI_API_KEY=your_api_key" > .env.local
```

### 실행

```bash
# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm start
```

### 접속

```
http://localhost:3000/wiki
```

---

## 📖 사용법

### 파일/폴더 관리

| 작업 | 방법 |
|------|------|
| 생성 | 좌측 "새로 만들기" 버튼 또는 트리 우클릭 |
| 편집 | 파일 선택 후 "편집" 버튼 |
| 이름 변경 | 파일/폴더 우클릭 → "이름 변경" |
| 삭제 | 파일 선택 후 "삭제" 버튼 또는 우클릭 |

### 키보드 단축키

| 단축키 | 기능 |
|--------|------|
| `Esc` | 편집 모드 종료 |
| `Enter` | 인라인 편집 확정 |
| `/` | 슬래시 명령어 (에디터) |

### 슬래시 명령어 (블록 에디터)

```
/h1, /h2, /h3     → 제목 삽입
/bullet, /number  → 리스트 삽입
/code             → 코드 블록
/table            → 테이블
/quote            → 인용구
/todo             → 체크리스트
```

---

## 🔧 API 레퍼런스

### 파일 작업

<details>
<summary><code>POST /api/file</code> - 파일 CRUD</summary>

```typescript
{
  action: 'read' | 'write' | 'delete' | 'rename',
  path: string,
  content?: string,    // write 시 필요
  newPath?: string     // rename 시 필요
}
```
</details>

<details>
<summary><code>GET /api/files</code> - 파일 목록</summary>

```typescript
// Response
interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
}
```
</details>

### AI 검색

<details>
<summary><code>POST /api/search</code> - Vector 검색</summary>

```typescript
{
  query: string,      // 검색 쿼리
  limit?: number      // 결과 개수 (기본값: 5)
}
```
</details>

<details>
<summary><code>POST /api/ask</code> - AI 답변 생성</summary>

```typescript
{
  question: string,   // 질문
  limit?: number      // 참고 문서 개수 (기본값: 5)
}
```
</details>

<details>
<summary><code>POST /api/index</code> - 문서 인덱싱</summary>

```typescript
{
  reindex?: boolean   // 전체 재인덱싱 여부
}
```
</details>

### 버전 관리

<details>
<summary><code>GET /api/versions</code> - 버전 히스토리</summary>

```typescript
// 버전 목록
GET /api/versions?filePath=...

// 특정 버전 조회
GET /api/versions?filePath=...&versionId=...

// 버전 비교
GET /api/versions?filePath=...&versionId=...&compareWith=...
```
</details>

### 댓글

<details>
<summary><code>/api/comments</code> - 댓글 CRUD</summary>

```typescript
// 조회
GET /api/comments?filePath=...
GET /api/comments?filePath=...&asTree=true

// 생성
POST /api/comments
{
  filePath: string,
  author: string,
  content: string,
  parentId?: string   // 답글인 경우
}

// 수정
PUT /api/comments
{
  filePath: string,
  commentId: string,
  content: string
}

// 삭제
DELETE /api/comments?filePath=...&commentId=...
```
</details>

### 사용자 관리

<details>
<summary><code>/api/users</code> - 사용자 CRUD</summary>

```typescript
// 조회
GET /api/users                    // 전체 목록
GET /api/users?id=...             // 특정 사용자
GET /api/users?activity=true      // 활동 로그

// 생성/로그인
POST /api/users
{
  action?: 'login',
  username: string,
  displayName?: string,
  email?: string,
  role?: 'admin' | 'editor' | 'viewer'
}

// 수정
PUT /api/users
{ id: string, ...updates }

// 삭제
DELETE /api/users?id=...
```
</details>

### Git 연동

<details>
<summary><code>/api/git</code> - Git 작업</summary>

```typescript
// 상태 조회
GET /api/git?action=status        // 변경 파일
GET /api/git?action=log&limit=20  // 커밋 히스토리
GET /api/git?action=diff          // 변경 내용
GET /api/git?action=branch        // 브랜치 목록
GET /api/git?action=remote        // 리모트 설정

// 작업 실행
POST /api/git
{
  action: 'add' | 'commit' | 'push' | 'pull' | 'checkout' | 'init',
  message?: string,
  files?: string[],
  branch?: string
}
```
</details>

---

## 🎨 디자인 시스템

### 색상 팔레트

| 용도 | 색상 | Tailwind |
|------|------|----------|
| 성공 | 🟢 녹색 | `green-500`, `green-600` |
| 경고 | 🟡 노란색 | `yellow-500` |
| 오류 | 🔴 빨간색 | `red-500` |
| 정보 | 🔵 파란색 | `blue-500`, `blue-600` |
| 중성 | ⚪ 회색 | `gray-200` ~ `gray-500` |

### 컴포넌트 규칙

| 속성 | 값 |
|------|-----|
| 곡률 | `rounded-md` |
| 패딩 | `p-6` (컨테이너) |
| 간격 | `gap-2` (버튼), `mb-4` (섹션) |
| 제목 | `text-2xl font-bold` |
| 본문 | `text-sm` |

---

## 🔮 로드맵

### Phase 1: 고도화 기능 ✅

- [x] 블록 기반 에디터 (Tiptap)
- [x] 마크다운 파일 업로드
- [x] Vector 검색 엔진 (LanceDB + Gemini)
- [x] AI 답변 생성 (RAG)
- [ ] 파일 내용 검색
- [ ] 마크다운 템플릿
- [ ] 태그 시스템

### Phase 2: 협업 기능 ✅

- [x] 다중 사용자 지원 (로컬 세션)
- [x] 버전 관리 (Git 연동)
- [x] 버전 히스토리 (로컬)
- [x] 댓글 시스템
- [ ] 실시간 공동 편집

> ⚠️ **Git 마이그레이션 예정**
> 현재 Git 연동은 개인 GitHub 저장소를 사용하고 있습니다.
> 추후 **사내 Git 서버**(GitLab, Bitbucket 등)로 마이그레이션될 예정입니다.
> `/api/git` 엔드포인트의 remote URL 설정을 변경하여 쉽게 전환할 수 있습니다.

### Phase 3: 확장 기능

- [ ] 플러그인 시스템
- [ ] 테마 커스터마이징
- [ ] 모바일 앱
- [ ] REST API 확장

---

## 🤝 기여하기

1. 이 저장소를 **Fork** 합니다
2. 기능 브랜치를 생성합니다
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. 변경사항을 커밋합니다
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. 브랜치에 푸시합니다
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Pull Request**를 생성합니다

---

## 📄 관련 문서

| 문서 | 설명 |
|------|------|
| [개발 표준 가이드](./DEVELOPMENT_STANDARDS.md) | 코딩 규칙과 프로젝트 구조 |
| [API 문서](./docs/development/api.md) | REST API 명세와 사용 예제 |
| [컴포넌트 가이드](./docs/development/components.md) | UI 컴포넌트 상세 문서 |
| [디자인 시스템](./docs/development/design-system.md) | 색상, 타이포그래피, 레이아웃 |
| [배포 가이드](./docs/development/deployment.md) | 다양한 플랫폼 배포 방법 |

---

## 📝 라이선스

이 프로젝트는 **MIT 라이선스** 하에 있습니다.
자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.

---

<p align="center">
  <strong>Made with ❤️ and Next.js 16.0</strong>
</p>

<p align="center">
  <a href="https://github.com/choishiam0906/lswiki0906">
    <img src="https://img.shields.io/github/stars/choishiam0906/lswiki0906?style=social" alt="GitHub Stars" />
  </a>
</p>
