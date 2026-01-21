# 프로젝트 구조

## 📁 디렉토리 구조

```
markdown-wiki/
├── app/                    # Next.js 앱 라우터
│   ├── api/               # API 라우트
│   │   ├── file/          # 개별 파일 API
│   │   └── files/         # 파일 목록 API
│   ├── wiki/              # 위키 메인 페이지
│   ├── globals.css        # 글로벌 스타일
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx           # 홈 페이지
├── components/            # React 컴포넌트
│   └── ui/               # UI 컴포넌트
├── docs/                 # 마크다운 문서들
├── lib/                  # 유틸리티 함수
└── public/               # 정적 파일
```

## 🧩 주요 컴포넌트

### WikiPage (`app/wiki/page.tsx`)
- 메인 위키 인터페이스
- 파일 트리 표시
- 문서 편집/보기 기능

### API 라우트

#### `/api/files`
- docs 디렉토리 구조를 JSON으로 반환
- 재귀적으로 폴더/파일 스캔

#### `/api/file`
- 개별 파일 읽기/쓰기/삭제
- POST: 파일 저장/생성
- DELETE: 파일 삭제

## 🎨 스타일링

- **Tailwind CSS**: 유틸리티 기반 CSS
- **shadcn/ui**: UI 컴포넌트 라이브러리
- **Material-UI**: TreeView 컴포넌트

## 📦 주요 라이브러리

- **react-markdown**: 마크다운 렌더링
- **remark-gfm**: GitHub Flavored Markdown
- **lucide-react**: 아이콘

---

[개발 가이드 보기](development-guide.md) | [홈으로 돌아가기](../README.md)