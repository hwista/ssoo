# SSOO Web PMS

> Next.js 기반 프론트엔드 웹 애플리케이션

---

## 📋 개요

`apps/web/pms`은 SSOO 서비스의 **프론트엔드 웹 애플리케이션**입니다. Next.js 15 App Router를 사용하여 모던한 React 기반 UI를 제공합니다.

### 기술 스택 선정 이유

| 기술 | 선정 이유 |
|------|----------|
| **Next.js 15** | App Router, SSR/SSG, 최신 React 기능 |
| **React 19** | 최신 React, Server Components |
| **DevExtreme** | 엔터프라이즈급 데이터 그리드, 차트, 폼 컴포넌트 |
| **Tailwind CSS** | 유틸리티 CSS, 빠른 스타일링, DevExtreme과 충돌 없음 |
| **TanStack Query** | 서버 상태 관리, 캐싱, 자동 리페칭 |
| **Zustand** | 경량 클라이언트 상태 관리 |
| **React Hook Form + Zod** | 폼 관리 + 스키마 기반 유효성 검증 |

---

## 📁 구조

```
apps/web/pms/
├── src/
│   ├── app/                    # App Router
│   │   ├── layout.tsx          # 루트 레이아웃
│   │   ├── not-found.tsx       # 404 페이지
│   │   ├── providers.tsx       # 클라이언트 프로바이더
│   │   ├── globals.css         # 전역 스타일 (Tailwind + DevExtreme)
│   │   ├── (auth)/             # 인증 라우트 그룹
│   │   │   └── login/
│   │   └── (main)/             # 메인 라우트 그룹
│   │       ├── dashboard/
│   │       └── ...
│   │
│   ├── stores/                 # Zustand 상태 관리
│   │   ├── index.ts
│   │   ├── auth.store.ts       # 인증 상태
│   │   ├── confirm.store.ts    # 확인 다이얼로그
│   │   ├── layout.store.ts     # 레이아웃 상태
│   │   ├── menu.store.ts       # 메뉴 상태
│   │   ├── sidebar.store.ts    # 사이드바 상태
│   │   └── tab.store.ts        # 탭 상태
│   │
│   └── lib/                    # 유틸리티
│       ├── index.ts
│       ├── toast.ts            # 토스트 유틸
│       ├── api/                # API 클라이언트
│       ├── utils/              # 유틸 함수
│       └── validations/        # Zod 스키마
│
├── public/                     # 정적 파일
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
└── postcss.config.mjs
```

---

## 🔐 인증 시스템

### 구현된 페이지

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/login` | `src/app/login/page.tsx` | 로그인 폼 |
| `/dashboard` | `src/app/dashboard/page.tsx` | 로그인 후 메인 |

### 상태 관리 (Zustand)

```typescript
// src/stores/auth.store.ts
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
}
```

### API 클라이언트

| 클라이언트 | 용도 |
|------------|------|
| `publicClient` | 인증 불필요 (로그인, 토큰 갱신) |
| `apiClient` | 토큰 자동 첨부 + 401 시 자동 갱신 |

### 로컬 스토리지

```json
// Key: "ssoo-auth"
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { ... },
  "isAuthenticated": true
}
```

---

## 🎨 UI 구성

### 스타일링 전략

```
┌─────────────────────────────────────────────────┐
│                  DevExtreme                      │
│  (데이터 그리드, 차트, 폼, 피벗, 스케줄러)        │
├─────────────────────────────────────────────────┤
│               Tailwind CSS                       │
│  (레이아웃, 간격, 색상, 반응형, 유틸리티)         │
└─────────────────────────────────────────────────┘
```

- **DevExtreme**: 복잡한 데이터 컴포넌트 (그리드, 차트, 폼)
- **Tailwind CSS**: 레이아웃, 간격, 기본 스타일링
- **충돌 방지**: DevExtreme 테마(dx.light.css) + Tailwind 유틸리티 조합

### globals.css 구조

```css
/* Tailwind */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* DevExtreme 테마 */
@import 'devextreme/dist/css/dx.light.css';

/* SSOO 커스텀 스타일 */
:root { ... }
```

---

## 🔧 포함된 기능 (의존성)

### 프레임워크
| 패키지 | 용도 |
|--------|------|
| `next` | Next.js 15 프레임워크 |
| `react` / `react-dom` | React 19 |
| `@ssoo/types` | 공통 타입 정의 |

### UI 컴포넌트
| 패키지 | 용도 |
|--------|------|
| `devextreme` | DevExtreme 코어 |
| `devextreme-react` | DevExtreme React 컴포넌트 |
| `lucide-react` | 아이콘 라이브러리 |

### 스타일링
| 패키지 | 용도 |
|--------|------|
| `tailwindcss` | 유틸리티 CSS |
| `postcss` | CSS 후처리 |
| `autoprefixer` | 브라우저 프리픽스 |
| `clsx` | 조건부 className |
| `tailwind-merge` | Tailwind 클래스 병합 |

### 상태 관리 & 데이터 페칭
| 패키지 | 용도 |
|--------|------|
| `@tanstack/react-query` | 서버 상태 관리 |
| `zustand` | 클라이언트 상태 관리 |
| `axios` | HTTP 클라이언트 |

### 폼 & 유효성 검증
| 패키지 | 용도 |
|--------|------|
| `react-hook-form` | 폼 상태 관리 |
| `zod` | 스키마 기반 유효성 검증 |
| `@hookform/resolvers` | react-hook-form + zod 연동 |

### 유틸리티
| 패키지 | 용도 |
|--------|------|
| `dayjs` | 날짜 처리 |
| `numeral` | 숫자 포맷팅 |
| `sonner` | 토스트 알림 |

### 실시간 통신 (예정)
| 패키지 | 용도 |
|--------|------|
| `socket.io-client` | WebSocket 클라이언트 |

---

## 🛠 개발 명령어

```powershell
# 개발 서버 실행 (일반 환경)
pnpm dev:web-pms

# 개발 서버 실행 (보안 환경)
node ./node_modules/next/dist/bin/next dev --port 3000

# 프로덕션 빌드
pnpm build:web-pms

# 프로덕션 실행
pnpm start
```

---

## 📌 페이지 추가 가이드

App Router 기반 페이지 추가:

```
src/app/
├── page.tsx                    # / (메인)
├── projects/
│   ├── page.tsx                # /projects (목록)
│   └── [id]/
│       └── page.tsx            # /projects/:id (상세)
├── customers/
│   └── page.tsx                # /customers
└── layout.tsx                  # 공통 레이아웃
```

### 새 페이지 예시

```tsx
// src/app/projects/page.tsx
import { DataGrid, Column } from 'devextreme-react/data-grid';

export default function ProjectsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">프로젝트 목록</h1>
      <DataGrid dataSource={...}>
        <Column dataField="name" caption="프로젝트명" />
        <Column dataField="statusCode" caption="상태" />
      </DataGrid>
    </div>
  );
}
```

---

## 🔗 API 연동

### 서버 상태 확인 (Server Component)

```tsx
// src/app/page.tsx
async function getHealth() {
  const res = await fetch('http://localhost:4000/api/health', {
    cache: 'no-store',
  });
  return res.json();
}

export default async function Home() {
  const health = await getHealth();
  // ...
}
```

### 클라이언트 데이터 페칭 (TanStack Query)

```tsx
'use client';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

function ProjectList() {
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => axios.get('/api/projects').then(res => res.data),
  });
  // ...
}
```
