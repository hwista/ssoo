# 개발 가이드 ㅎ

## 🛠️ 개발 환경 설정

### 필요한 도구들

- Node.js 18+
- npm 또는 yarn
- VS Code (권장)

### 설치 방법

```bash
# 저장소 클론
git clone [repository-url]

# 의존성 설치  
npm install

# 개발 서버 실행
npm run dev
```

## 📝 코딩 컨벤션

### TypeScript 사용

- 모든 새 파일은 TypeScript로 작성
- 타입 정의를 명확히 작성
- any 타입 사용 금지

### React 컴포넌트

```tsx
interface ComponentProps {
  title: string;
  onClick: () => void;
}

export function Component({ title, onClick }: ComponentProps) {
  return (
    <button onClick={onClick}>
      {title}
    </button>
  );
}
```

## 🔄 Git 워크플로우

1. feature 브랜치 생성
2. 작업 완료 후 PR 생성
3. 코드 리뷰 후 머지

---

[홈으로 돌아가기](../README.md)