# 유틸리티 함수 (Utilities)

> 최종 업데이트: 2026-02-02

DMS에서 사용하는 유틸리티 함수를 정의합니다.

---

## 유틸리티 구조

```
src/lib/utils/
├── index.ts              # 통합 export
├── constants.ts          # 상수 정의
├── apiClient.ts          # API 클라이언트
├── fileUtils.ts          # 파일 처리
├── pathUtils.ts          # 경로 처리
└── errorUtils.ts         # 에러 처리 & 로깅
```

---

## 스타일 유틸리티

### `cn()` - Tailwind 클래스 병합

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**사용 예:**
```tsx
<div className={cn(
  'flex items-center',
  isActive && 'bg-blue-500',
  className
)} />
```

---

## 파일 유틸리티 (`fileUtils.ts`)

### 파일 타입 검사

```typescript
// 마크다운 파일 검사
isMarkdownFile('readme.md')  // true
isMarkdownFile('image.png')  // false

// 텍스트 파일 검사
isTextFile('config.json')    // true

// 이미지 파일 검사
isImageFile('photo.jpg')     // true
```

### 확장자 처리

```typescript
// 확장자 추출
getFileExtension('file.md')           // '.md'
getFileExtension('file.test.ts')      // '.ts'

// 확장자 제거
removeFileExtension('readme.md')      // 'readme'

// 확장자 보장
ensureFileExtension('readme', '.md')  // 'readme.md'
ensureFileExtension('readme.md', '.md')// 'readme.md'
```

### 파일명 정규화

```typescript
normalizeMarkdownFileName('README.MD')  // 'readme.md'
```

---

## 경로 유틸리티 (`pathUtils.ts`)

### 경로 정규화

```typescript
// 크로스 플랫폼 경로 정규화
normalizePath('folder\\file.md')  // 'folder/file.md'
normalizePath('folder/file.md')   // 'folder/file.md'
```

### 경로 검증

```typescript
// 유효성 검사
isValidPath('docs/readme.md')   // true
isValidPath('../secret')        // false (상위 디렉토리 참조)
isValidPath('/etc/passwd')      // false (루트 경로)
```

### 경로 조작

```typescript
// 경로 결합
joinPath('docs', 'readme.md')           // 'docs/readme.md'

// 부모 경로 추출
getParentPath('docs/guides/api.md')     // 'docs/guides'

// 파일명 추출
getFileName('docs/readme.md')           // 'readme.md'

// 디렉토리 여부
isDirectory('docs/')                    // true
isDirectory('readme.md')                // false
```

### 트리 경로 처리

```typescript
// 부모 경로 배열
getParentPaths('docs/guides/api.md')
// ['docs', 'docs/guides']

// 깊이 계산
getPathDepth('docs/guides/api.md')  // 2
```

---

## API 클라이언트 (`apiClient.ts`)

### 파일 API

```typescript
import { fileApi } from '@/lib/utils/apiClient';

// 파일 읽기
const response = await fileApi.read('docs/readme.md');
// { success: true, data: { content: '...', metadata: {...} } }

// 파일 생성
await fileApi.create({ path: 'docs/new.md', content: '# New' });

// 파일 수정
await fileApi.update('docs/readme.md', { content: '# Updated' });

// 파일 삭제
await fileApi.delete('docs/old.md');
```

### 에러 처리

```typescript
const response = await fileApi.read('not-exist.md');

if (!response.success) {
  const errorMsg = getErrorMessage(response);
  console.error(errorMsg);  // '파일을 찾을 수 없습니다'
}
```

---

## 에러 유틸리티 (`errorUtils.ts`)

### Logger

```typescript
import { logger } from '@/lib/utils/errorUtils';

logger.debug('디버그 메시지', { data });
logger.info('정보 메시지');
logger.warn('경고 메시지');
logger.error('에러 메시지', error);
```

**환경별 동작:**
- Development: 모든 로그 출력
- Production: warn, error만 출력

### safeAsync

Promise 에러를 안전하게 처리:

```typescript
import { safeAsync } from '@/lib/utils/errorUtils';

await safeAsync(async () => {
  const data = await fetchData();
  processData(data);
});
// 에러 발생 시 자동 로깅, throw 방지
```

### PerformanceTimer

성능 측정 유틸리티:

```typescript
import { PerformanceTimer } from '@/lib/utils/errorUtils';

const timer = new PerformanceTimer('파일 로드');

// ... 작업 수행

timer.end({ success: true, fileCount: 10 });
// [Performance] 파일 로드 - 123ms {success: true, fileCount: 10}
```

---

## 상수 정의 (`constants.ts`)

### 파일 확장자

```typescript
export const FILE_EXTENSIONS = {
  MARKDOWN: ['.md', '.mdx', '.markdown'],
  TEXT: ['.txt', '.json', '.yaml', '.yml', '.xml', '.csv'],
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
};
```

### MIME 타입

```typescript
export const MIME_TYPES = {
  MARKDOWN: 'text/markdown',
  JSON: 'application/json',
  TEXT: 'text/plain',
};
```

### 경로 구분자

```typescript
export const PATH_SEPARATORS = {
  UNIX: '/',
  WINDOWS: '\\',
};
```

---

## PMS 대응표

| PMS 유틸리티 | DMS 유틸리티 | 설명 |
|-------------|-------------|------|
| `cn()` | `cn()` | 동일 |
| `apiClient` (서버) | `fileApi` (로컬) | API 구조 상이 |
| - | `pathUtils` | DMS 전용 |
| - | `fileUtils` | DMS 전용 |
| `logger` | `logger` | 동일 패턴 |

---

## 관련 문서

- [api.md](../guides/api.md) - API 엔드포인트 상세
- [frontend-standards.md](frontend-standards.md) - 코딩 표준
