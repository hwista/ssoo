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
- **실시간 공동 편집**: 다중 사용자 동시 편집 지원

### 🔔 알림 시스템

> 이메일 및 Microsoft Teams로 알림 전송

| 채널 | 설명 |
|------|------|
| 🔔 앱 내 알림 | 실시간 알림 센터 |
| 📧 이메일 | SMTP 기반 이메일 발송 |
| 💬 Teams | Webhook 기반 Teams 알림 |

**알림 이벤트:**
- 문서 변경 / 댓글 / 멘션 / 협업 초대 / 권한 변경

### 🔎 파일 내용 검색

- **텍스트 검색**: 전체 위키 문서에서 키워드 검색
- **대소문자 구분**: 옵션으로 대소문자 구분 검색
- **결과 하이라이트**: 검색어가 포함된 라인 하이라이트
- **파일별 그룹화**: 검색 결과를 파일별로 정리

### 📋 마크다운 템플릿

> 10가지 기본 템플릿으로 빠른 문서 작성

| 카테고리 | 템플릿 |
|----------|--------|
| 📄 문서 | 빈 문서, 기본 문서, FAQ |
| 📋 회의 | 회의록, 데일리 스탠드업 |
| 📊 프로젝트 | 프로젝트 계획서, 릴리즈 노트 |
| 🔧 기술 | API 문서, 트러블슈팅, 코드 리뷰 체크리스트 |

### 🏷️ 태그 시스템

- **태그 생성/관리**: 10가지 색상 팔레트
- **파일-태그 매핑**: 파일에 여러 태그 부착
- **태그별 필터링**: 특정 태그가 적용된 파일 조회
- **통계**: 태그별 파일 수 확인

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
📁 LSWIKI/
├── 📂 app/                           # Next.js App Router
│   ├── 📂 api/                       # API 엔드포인트
│   │   ├── 📄 file/route.ts          # 파일 CRUD
│   │   ├── 📄 files/route.ts         # 파일 목록
│   │   ├── 📄 upload/route.ts        # 마크다운 업로드
│   │   ├── 📄 search/route.ts        # Vector 검색
│   │   ├── 📄 text-search/route.ts   # 텍스트 검색
│   │   ├── 📄 index/route.ts         # 문서 인덱싱
│   │   ├── 📄 ask/route.ts           # AI 답변 (RAG)
│   │   ├── 📄 versions/route.ts      # 버전 히스토리
│   │   ├── 📄 comments/route.ts      # 댓글
│   │   ├── 📄 users/route.ts         # 사용자 관리
│   │   ├── 📄 git/route.ts           # Git 연동
│   │   ├── 📄 templates/route.ts     # 마크다운 템플릿
│   │   ├── 📄 tags/route.ts          # 태그 시스템
│   │   ├── 📄 notifications/route.ts # 알림 시스템
│   │   ├── 📄 collaborate/route.ts   # 실시간 협업
│   │   ├── 📄 plugins/route.ts       # 플러그인
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
│   ├── 📄 TextSearch.tsx             # 텍스트 검색
│   ├── 📄 TemplateSelector.tsx       # 템플릿 선택
│   ├── 📄 TagManager.tsx             # 태그 관리
│   ├── 📄 VersionHistory.tsx         # 버전 히스토리
│   ├── 📄 Comments.tsx               # 댓글
│   ├── 📄 NotificationCenter.tsx     # 알림 센터
│   ├── 📄 NotificationSettings.tsx   # 알림 설정
│   ├── 📄 PluginManager.tsx          # 플러그인 관리
│   ├── 📄 CollaborationIndicator.tsx # 협업 표시기
│   └── 📄 ThemeToggle.tsx            # 테마 토글
│
├── 📂 lib/                           # 유틸리티
│   ├── 📄 embeddings.ts              # Gemini 임베딩
│   ├── 📄 vectorStore.ts             # LanceDB 래퍼
│   ├── 📄 versionHistory.ts          # 버전 관리
│   ├── 📄 comments.ts                # 댓글 관리
│   ├── 📄 users.ts                   # 사용자 관리
│   ├── 📄 templates.ts               # 템플릿 정의
│   ├── 📄 tags.ts                    # 태그 관리
│   ├── 📄 plugins.ts                 # 플러그인 시스템
│   ├── 📄 collaboration.ts           # 실시간 협업
│   ├── 📄 markdownConverter.ts       # MD 변환
│   └── 📂 notifications/             # 알림 시스템
│       ├── 📄 types.ts               # 알림 타입 정의
│       ├── 📄 email.ts               # 이메일 발송
│       ├── 📄 teams.ts               # Teams 연동
│       └── 📄 manager.ts             # 알림 관리자
│
├── 📂 contexts/                      # React Context
│   ├── 📄 NotificationContext.tsx    # UI 알림 상태
│   ├── 📄 UserContext.tsx            # 사용자 상태
│   └── 📄 ThemeContext.tsx           # 테마 상태
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
git clone http://10.125.31.72:8010/LSITC_WEB/LSWIKI.git
cd LSWIKI

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

### 텍스트 검색

<details>
<summary><code>GET /api/text-search</code> - 파일 내용 검색</summary>

```typescript
GET /api/text-search?q=검색어&caseSensitive=false&limit=20

// Response
{
  success: true,
  query: string,
  results: [{
    filePath: string,
    fileName: string,
    matches: [{
      line: number,
      content: string,
      highlight: string    // **검색어** 형식으로 하이라이트
    }],
    totalMatches: number
  }],
  totalFiles: number,
  totalMatches: number
}
```
</details>

### 템플릿

<details>
<summary><code>/api/templates</code> - 마크다운 템플릿</summary>

```typescript
// 전체 템플릿 목록 (카테고리별)
GET /api/templates

// 특정 템플릿 조회
GET /api/templates?id=meeting-notes

// 카테고리별 조회
GET /api/templates?category=meeting

// 템플릿 적용 (변수 치환)
POST /api/templates
{
  templateId: string,
  variables?: Record<string, string>
}
```
</details>

### 태그

<details>
<summary><code>/api/tags</code> - 태그 시스템</summary>

```typescript
// 전체 태그 목록
GET /api/tags

// 파일의 태그 조회
GET /api/tags?filePath=...

// 태그별 파일 목록
GET /api/tags?tagId=...

// 태그 통계
GET /api/tags?stats=true

// 태그 생성
POST /api/tags
{ name: string, color: string, description?: string }

// 파일에 태그 추가
POST /api/tags
{ action: 'addToFile', filePath: string, tagId: string }

// 파일 태그 설정 (복수)
POST /api/tags
{ action: 'setFileTags', filePath: string, tagIds: string[] }

// 태그 수정
PUT /api/tags
{ id: string, name?: string, color?: string, description?: string }

// 태그 삭제
DELETE /api/tags?id=...

// 파일에서 태그 제거
DELETE /api/tags?filePath=...&tagId=...
```
</details>

### 플러그인

<details>
<summary><code>/api/plugins</code> - 플러그인 관리</summary>

```typescript
// 전체 플러그인 목록
GET /api/plugins

// 특정 플러그인 조회
GET /api/plugins?id=word-count

// 훅 실행
POST /api/plugins
{
  action: 'executeHook',
  hook: 'onContentChange',
  context: { content: string, filePath?: string }
}

// 플러그인 활성화/비활성화
POST /api/plugins
{ action: 'setEnabled', pluginId: string, enabled: boolean }

// 플러그인 순서 변경
POST /api/plugins
{ action: 'setOrder', pluginId: string, order: number }
```

**기본 제공 플러그인:**
| ID | 이름 | 설명 |
|----|------|------|
| word-count | 단어 수 카운터 | 단어/문자/줄 수 표시 |
| reading-time | 읽기 시간 | 예상 읽기 시간 계산 |
| toc | 목차 추출 | 헤딩 기반 목차 생성 |
| link-extractor | 링크 추출 | 문서 내 링크 목록 |
| code-stats | 코드 통계 | 코드 블록 통계 |
</details>

### 알림 시스템

<details>
<summary><code>/api/notifications</code> - 알림 관리</summary>

```typescript
// 알림 목록 조회
GET /api/notifications?userId=...&limit=50&unreadOnly=false

// 통계 조회
GET /api/notifications?userId=...&action=stats

// 설정 조회
GET /api/notifications?userId=...&action=preferences

// 알림 생성
POST /api/notifications
{
  action: 'create',
  type: 'document_changed' | 'comment_added' | 'mention' | ...,
  title: string,
  message: string,
  recipientId: string,
  channels?: ['in_app', 'email', 'teams']
}

// 읽음 처리
POST /api/notifications
{ action: 'markAsRead', notificationId: string }

// 모든 알림 읽음
POST /api/notifications
{ action: 'markAllAsRead', userId: string }

// 설정 업데이트
POST /api/notifications
{
  action: 'updatePreferences',
  userId: string,
  preferences: {
    channels: { in_app: boolean, email: boolean, teams: boolean },
    email?: { address: string, digestFrequency: 'instant' | 'daily' },
    teams?: { webhookUrl: string }
  }
}

// 테스트 이메일 전송
POST /api/notifications
{ action: 'testEmail', email: string }

// 테스트 Teams 메시지 전송
POST /api/notifications
{ action: 'testTeams', webhookUrl?: string }
```

**알림 유형:**
| 유형 | 설명 |
|------|------|
| document_changed | 문서 변경됨 |
| comment_added | 새 댓글 |
| comment_reply | 댓글 답글 |
| mention | 멘션됨 |
| collaboration_invite | 협업 초대 |
| permission_changed | 권한 변경 |
| system | 시스템 알림 |

**환경 변수 설정:**
```bash
# 이메일 (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM_ADDRESS=noreply@example.com
SMTP_FROM_NAME=LSWiki

# Microsoft Teams
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...
```
</details>

### 실시간 협업

<details>
<summary><code>/api/collaborate</code> - 공동 편집</summary>

```typescript
// 세션 상태 조회
GET /api/collaborate?filePath=...

// 활성 세션 목록
GET /api/collaborate?listActive=true

// 세션 참가
POST /api/collaborate
{ action: 'join', filePath, userId, userName, content }

// 세션 나가기
POST /api/collaborate
{ action: 'leave', filePath, userId }

// 커서 업데이트
POST /api/collaborate
{ action: 'updateCursor', filePath, userId, position, selection? }

// 편집 작업
POST /api/collaborate
{ action: 'operation', filePath, userId, type, position, content?, length? }

// 콘텐츠 동기화
POST /api/collaborate
{ action: 'sync', filePath, userId, content }
```
</details>

---

## 🎨 디자인 시스템

### 테마

| 모드 | 설명 |
|------|------|
| Light | 밝은 테마 (기본값) |
| Dark | 어두운 테마 |
| System | 시스템 설정 따름 |

```typescript
// 테마 사용법
import { useTheme } from '@/contexts/ThemeContext';

const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
```

### 색상 팔레트
DELETE /api/tags?id=...

// 파일에서 태그 제거
DELETE /api/tags?filePath=...&tagId=...
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

### Phase 2: 협업 기능 ✅

- [x] 다중 사용자 지원 (로컬 세션)
- [x] 버전 관리 (Git 연동)
- [x] 버전 히스토리 (로컬)
- [x] 댓글 시스템

> ✅ **사내 GitLab 사용 중**
> 현재 Git 연동은 사내 GitLab 서버를 사용하고 있습니다.
> - **저장소**: `http://10.125.31.72:8010/LSITC_WEB/LSWIKI.git`
> - `/api/git` 엔드포인트를 통해 add, commit, push, pull 등의 작업을 수행할 수 있습니다.

### Phase 3: 확장 기능 ✅

- [x] 파일 내용 검색 (텍스트 검색)
- [x] 마크다운 템플릿 (10종)
- [x] 태그 시스템

### Phase 4: 고급 기능 ✅

- [x] 테마 커스터마이징 (다크/라이트/시스템)
- [x] 플러그인 시스템 (5개 기본 플러그인)
- [x] 실시간 공동 편집 (협업 세션)

### Phase 5: 확장 및 통합 (진행중)

- [x] 알림 시스템 (이메일/Microsoft Teams)
- [ ] 모바일 앱 (PWA)
- [ ] 권한 관리 고도화 (RBAC)
- [ ] 외부 스토리지 연동 (S3, Azure Blob)

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
  <a href="http://10.125.31.72:8010/LSITC_WEB/LSWIKI">
    <img src="https://img.shields.io/badge/GitLab-LSWIKI-orange?style=for-the-badge&logo=gitlab" alt="GitLab" />
  </a>
</p>
