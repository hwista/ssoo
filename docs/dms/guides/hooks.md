# DMS 커스텀 훅 가이드

> 최종 업데이트: 2026-03-11

DMS 프로젝트에서 사용되는 커스텀 훅에 대한 가이드입니다.

---

## 훅 개요

| 훅 | 파일 | 용도 |
|----|------|------|
| `useOpenTabWithConfirm` | useOpenTabWithConfirm.ts | 탭 초과 시 확인 다이얼로그 |
| `useOpenDocumentTab` | useOpenDocumentTab.ts | 문서 탭 열기 |

---

## 1. useOpenTabWithConfirm

탭 개수 초과 시 확인 다이얼로그를 표시하는 훅입니다.

### 소스 위치

`src/hooks/useOpenTabWithConfirm.ts`

### 주요 기능

- 탭 열기 시 최대 개수 초과 확인
- 사용자 확인 후 가장 오래된 탭 자동 닫기
- 확인 다이얼로그 연동

### 인터페이스

```typescript
function useOpenTabWithConfirm(): (options: OpenTabOptions) => Promise<string>;

interface OpenTabOptions {
  title: string;
  path: string;
}
```

### 사용 예제

```typescript
import { useOpenTabWithConfirm } from '@/hooks';

function FileTree() {
  const openTabWithConfirm = useOpenTabWithConfirm();

  const handleFileClick = async (file: FileNode) => {
    const tabId = await openTabWithConfirm({
      title: file.name,
      path: file.path,
    });

    if (tabId) {
      console.log('탭 열림:', tabId);
    } else {
      console.log('탭 열기 취소됨');
    }
  };

  return (
    <ul>
      {files.map((file) => (
        <li key={file.path} onClick={() => handleFileClick(file)}>
          {file.name}
        </li>
      ))}
    </ul>
  );
}
```

### 동작 흐름

```
1. openTabWithConfirm 호출
   └─ 탭 개수 < maxTabs → 탭 열기 → tabId 반환
   └─ 탭 개수 >= maxTabs
      └─ 확인 다이얼로그 표시
         └─ 확인 → 가장 오래된 탭 닫기 → 새 탭 열기 → tabId 반환
      └─ 취소 → '' 반환
```

---

## 2. useOpenDocumentTab

문서 경로를 `/doc/...` 탭으로 여는 훅입니다.

### 소스 위치

`src/hooks/useOpenDocumentTab.ts`

### 사용 예제

```typescript
import { useOpenDocumentTab } from '@/hooks';

function FileTreeItem({ path }: { path: string }) {
  const openDocumentTab = useOpenDocumentTab();

  return (
    <button onClick={() => openDocumentTab({ path })}>
      {path}
    </button>
  );
}
```

---

## 훅 사용 가이드라인

### Do's ✅

- 컴포넌트 최상위에서 훅 호출
- 의존성 배열 정확히 지정
- 에러 처리 구현

### Don'ts ❌

- 조건문 안에서 훅 호출
- 반복문 안에서 훅 호출
- 콜백 함수 안에서 훅 호출

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-03-11 | `useEditor` 를 editor 도메인 내부 훅으로 이동하고 `useOpenDocumentTab` 설명 추가 |
| 2026-02-24 | Codex 품질 게이트 엄격 모드 적용에 맞춰 문서 메타 섹션 보강 |
