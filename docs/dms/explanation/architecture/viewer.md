# Viewer 컴포넌트 아키텍처

DMS 문서 뷰어의 설계 및 컴포넌트 구조를 설명합니다.

## 개요

Viewer 컴포넌트는 DMS의 문서 읽기 기능을 제공합니다. 마크다운 문서를 HTML로 렌더링하고, 라인 번호 표시 및 상단 툴바를 제공합니다.

## 컴포넌트 구조

```
viewer/
├── Viewer.tsx       # 메인 뷰어 (Toolbar + Content 조합)
├── Toolbar.tsx      # 상단 툴바 (편집 버튼, 파일 정보)
├── Content.tsx      # 본문 영역 (HTML 렌더링)
├── LineNumbers.tsx  # 라인 번호 표시
└── index.ts         # 컴포넌트 export
```

## 컴포넌트 관계

```
Viewer.tsx
├── Toolbar.tsx      (편집 버튼, 파일 메타데이터)
└── Content.tsx      (본문 렌더링)
    └── LineNumbers.tsx  (라인 번호)
```

## 주요 컴포넌트

### Viewer

메인 진입점 컴포넌트. Editor와 동일한 슬롯 구조를 따릅니다.

**책임:**
- 마크다운 → HTML 변환
- 뷰잉 상태 관리
- 편집 모드 전환

**Props:**
```typescript
interface ViewerProps {
  className?: string;  // 추가 스타일
}
```

### Toolbar

상단 고정 툴바. 파일 정보 및 액션을 제공합니다.

**책임:**
- 편집 버튼 (Editor 전환)
- 파일 메타데이터 표시

### Content

본문 렌더링 영역.

**책임:**
- HTML 콘텐츠 렌더링
- 라인 번호 표시 (옵션)

### LineNumbers

코드 블록 및 본문의 라인 번호를 표시합니다.

## 설계 결정

### Editor와 동일한 슬롯 구조

`Toolbar + Content` 패턴을 공유하여 UI 일관성을 유지합니다.

### 마크다운 렌더링

서버 사이드 또는 클라이언트 사이드에서 마크다운을 HTML로 변환합니다.

## 관련 문서

- [editor.md](./editor.md) - Editor 컴포넌트 아키텍처

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2025-02-06 | 초기 문서 작성 |
