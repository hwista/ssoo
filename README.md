# 📚 Markdown Wiki System

Next.js 16.0 기반의 실시간 마크다운 문서 관리 시스템입니다. 파일 탐색기 스타일의 직관적인 인터페이스와 VS Code 스타일의 시각적 피드백을 제공합니다.

## 🎯 주요 기능

### 📁 파일 시스템 관리
- **리사이저블 사이드바**: 드래그로 조절 가능한 파일 트리
- **실시간 파일 탐색**: 파일/폴더 생성, 삭제, 이름 변경
- **컨텍스트 메뉴**: 우클릭으로 접근하는 파일 관리 기능
- **검색 기능**: 트리 내 실시간 파일 검색

### ✨ 시각적 피드백 시스템
- **NEW 뱃지**: 새로 생성된 파일/폴더 (🟢 녹색 텍스트 + 🔴 빨간 뱃지)
- **UPDATE 뱃지**: 수정된 파일/폴더 (🔵 파란색 텍스트 + 🟡 노란 뱃지)
- **자동 스크롤**: 생성/수정된 항목으로 자동 포커스
- **VS Code 스타일**: 볼드체, 확대 폰트, 색상 구분

### 📝 에디터 기능
- **블록 에디터 (Tiptap)**: Notion 스타일의 블록 기반 편집기
  - 슬래시(/) 명령어: 제목, 리스트, 코드블록, 테이블 등 빠른 삽입
  - 실시간 서식 툴바: 굵게, 기울임, 취소선, 하이라이트 등
  - 테이블, 체크리스트, 코드 블록(문법 강조) 지원
  - HTML ↔ 마크다운 자동 변환
- **마크다운 편집**: 실시간 편집 및 저장
- **미리보기**: GitHub Flavored Markdown 지원
- **내부 링크**: .md 파일 간 링크 네비게이션
- **고정 레이아웃**: 반응형 에디터 영역

### 📤 파일 업로드
- **마크다운 업로드**: .md, .markdown, .txt 파일 지원
- **드래그 앤 드롭**: 간편한 파일 업로드 UI
- **텍스트 청크 분할**: 검색용 청크 자동 생성
- **자동 벡터 인덱싱**: 업로드 시 자동으로 Vector DB에 인덱싱

### 🔍 AI 검색 (RAG)
- **Vector 검색**: LanceDB + Gemini Embedding 기반 유사도 검색
- **AI 답변 생성**: Gemini 1.5 Flash 모델 기반 RAG 답변
- **문서 인덱싱**: 전체 위키 문서 자동/수동 인덱싱
- **출처 표시**: 답변에 참고한 문서 출처 제공

### 🔔 알림 시스템
- **Context API 기반**: 안정적인 상태 관리
- **타입별 알림**: 성공, 오류, 정보, 경고
- **자동 닫기**: 설정 가능한 자동 해제 타이머
- **우아한 애니메이션**: 우상단 슬라이드 효과

### 🎨 사용자 경험
- **일관된 디자인**: 통일된 곡률(rounded-md)과 패딩
- **키보드 단축키**: Esc로 편집 모드 종료
- **인라인 편집**: 파일명 즉시 수정
- **드래그 앤 드롭**: 리사이저 핸들

## 🏗️ 기술 스택

### 프론트엔드
- **Next.js 16.0**: App Router, Server Components
- **React 18+**: Hooks, Context API, TypeScript
- **Tailwind CSS**: 유틸리티 퍼스트 스타일링
- **Fluent UI**: Microsoft 디자인 시스템 컴포넌트
- **Tiptap (ProseMirror)**: 블록 기반 리치 텍스트 에디터
- **React Markdown**: remark-gfm 플러그인
- **Turndown / Marked**: HTML ↔ 마크다운 변환

### 백엔드
- **Next.js API Routes**: RESTful 파일 시스템 API
- **Node.js fs**: 파일 시스템 직접 조작
- **SSE (Server-Sent Events)**: 실시간 파일 변경 감지

### 개발 도구
- **TypeScript**: 엄격한 타입 체크
- **ESLint**: 코드 품질 관리
- **Turbopack**: 빠른 개발 서버

## 📦 프로젝트 구조

```
markdown-wiki/
├── app/                          # Next.js App Router
│   ├── api/                      # API 엔드포인트
│   │   ├── file/route.ts         # 파일 CRUD 작업
│   │   ├── files/route.ts        # 파일 목록 조회
│   │   ├── upload/route.ts       # 마크다운 파일 업로드
│   │   └── watch/route.ts        # 실시간 파일 감시
│   ├── wiki/page.tsx             # 메인 위키 페이지
│   ├── layout.tsx                # 루트 레이아웃
│   └── globals.css               # 전역 스타일
├── components/                   # 재사용 가능한 컴포넌트
│   ├── ui/                       # 기본 UI 컴포넌트
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── input.tsx
│   ├── editor/                   # 블록 에디터 컴포넌트
│   │   ├── BlockEditor.tsx       # Tiptap 블록 에디터
│   │   ├── EditorToolbar.tsx     # 서식 툴바
│   │   ├── SlashCommand.tsx      # 슬래시 명령어 확장
│   │   └── editor.css            # 에디터 스타일
│   ├── TreeComponent.tsx         # 파일 트리 컴포넌트
│   ├── WikiEditor.tsx            # 위키 에디터 (블록/마크다운 전환)
│   ├── FileUpload.tsx            # 파일 업로드 컴포넌트
│   ├── CreateFileModal.tsx       # 파일 생성 모달
│   ├── MessageModal.tsx          # 메시지 모달
│   ├── Notification.tsx          # 개별 알림 컴포넌트
│   └── NotificationContainer.tsx # 알림 컨테이너
├── lib/                          # 유틸리티 라이브러리
│   └── markdownConverter.ts      # HTML ↔ 마크다운 변환
├── contexts/                     # React Context
│   └── NotificationContext.tsx   # 알림 상태 관리
├── hooks/                        # 커스텀 훅
│   └── useMessage.ts             # 메시지 모달 훅
├── docs/                         # 문서 루트 폴더
│   ├── wiki/                     # 위키 시스템 문서 저장소 (파일 관리 대상)
│   │   └── uploads/              # 업로드된 마크다운 파일
│   └── development/              # 개발 관련 문서
├── data/                         # 업로드 메타데이터 저장
└── public/                       # 정적 자산
```

## 🚀 설치 및 실행

### 개발 환경 요구사항
- Node.js 18.0 이상
- npm 또는 yarn

### 설치
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm start
```

### 브라우저 접속
```
http://localhost:3000/wiki
```

## 📖 사용법

### 파일/폴더 관리
1. **생성**: 좌측 "새로 만들기" 버튼 또는 트리 우클릭
2. **편집**: 파일 선택 후 "편집" 버튼
3. **이름 변경**: 파일/폴더 우클릭 → "이름 변경"
4. **삭제**: 파일 선택 후 "삭제" 버튼 또는 우클릭

### 시각적 표시
- 🟢 **NEW**: 새로 생성된 항목
- 🔵 **UPDATE**: 수정된 항목
- 🔄 **초기화**: 모든 표시 지우기

### 키보드 단축키
- `Esc`: 편집 모드 종료
- `Enter`: 인라인 편집 확정
- `Esc`: 인라인 편집 취소

## 🔧 API 엔드포인트

### 파일 작업 (`/api/file`)
```typescript
POST /api/file
{
  action: 'read' | 'write' | 'delete' | 'rename',
  path: string,
  content?: string,    // write 시 필요
  newPath?: string     // rename 시 필요
}
```

### 파일 목록 (`/api/files`)
```typescript
GET /api/files
Response: FileNode[]

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
}
```

### 실시간 감시 (`/api/watch`)
```typescript
GET /api/watch
Response: Server-Sent Events 스트림
```

### Vector 검색 (`/api/search`)
```typescript
POST /api/search
{
  query: string,      // 검색 쿼리
  limit?: number      // 결과 개수 (기본값: 5)
}

GET /api/search       // 인덱스 상태 조회
```

### 문서 인덱싱 (`/api/index`)
```typescript
POST /api/index
{
  reindex?: boolean   // 전체 재인덱싱 여부
}

GET /api/index        // 인덱스 상태 및 문서 목록
```

### AI 답변 (`/api/ask`)
```typescript
POST /api/ask
{
  question: string,   // 질문
  limit?: number      // 참고 문서 개수 (기본값: 5)
}
```

## 🎨 디자인 시스템

### 색상 팔레트
- **성공**: 녹색 (`green-500`, `green-600`)
- **경고**: 노란색 (`yellow-500`)
- **오류**: 빨간색 (`red-500`)
- **정보**: 파란색 (`blue-500`, `blue-600`)
- **중성**: 회색 (`gray-200`, `gray-300`, `gray-500`)

### 컴포넌트 규칙
- **곡률**: 모든 요소 `rounded-md` 통일
- **패딩**: 주요 컨테이너 `p-6` 표준
- **간격**: 버튼 그룹 `gap-2`, 섹션 간 `mb-4`
- **타이포그래피**: 제목 `text-2xl font-bold`, 본문 `text-sm`

### 상태 표시
- **선택**: `bg-blue-100 text-blue-800`
- **호버**: `hover:bg-gray-100`
- **새 항목**: `text-green-600 font-bold text-base`
- **수정 항목**: `text-blue-600 font-bold text-base`

## 🔮 향후 계획

### Phase 1: 고도화 기능 (완료)
- [x] 블록 기반 에디터 (Tiptap)
- [x] 마크다운 파일 업로드
- [x] Vector 검색 엔진 (LanceDB + Gemini Embedding)
- [x] AI 검색 답변 생성 (RAG)
- [ ] 파일 내용 검색
- [ ] 마크다운 템플릿
- [ ] 태그 시스템

### Phase 2: 협업 기능
- [ ] 다중 사용자 지원
- [ ] 버전 관리 (Git 연동)
- [ ] 댓글 시스템
- [ ] 실시간 공동 편집

### Phase 3: 확장 기능
- [ ] 플러그인 시스템
- [ ] 테마 커스터마이징
- [ ] 모바일 앱
- [ ] REST API 확장

## 📄 관련 문서

- [개발 표준 가이드](./DEVELOPMENT_STANDARDS.md) - 코딩 규칙과 프로젝트 구조
- [API 문서](./docs/development/api.md) - REST API 명세와 사용 예제
- [컴포넌트 가이드](./docs/development/components.md) - UI 컴포넌트 상세 문서
- [디자인 시스템](./docs/development/design-system.md) - 색상, 타이포그래피, 레이아웃 가이드
- [배포 가이드](./docs/development/deployment.md) - 다양한 플랫폼 배포 방법

## 🤝 기여하기

1. 이 저장소를 포크합니다
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/AmazingFeature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성합니다

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다. 자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.

---

**Made with ❤️ and Next.js 16.0**
"# lswiki0906" 
