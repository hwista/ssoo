# DMS 개발 가이드

> 최종 업데이트: 2026-02-24

DMS 개발 시 참고할 정본 가이드 인덱스입니다.

---

## 가이드 목록

| 문서 | 설명 |
|------|------|
| [getting-started.md](getting-started.md) | 개발 환경 설정/실행 |
| [api.md](api.md) | 운영 API + 계획 API |
| [components.md](components.md) | 컴포넌트 구조/패턴 |
| [hooks.md](hooks.md) | 커스텀 훅 가이드 |

---

## 빠른 참조

### 파일 API 사용

```ts
import { fileApi } from '@/lib/api';

const readResult = await fileApi.read('analysis/apps/App.md');
await fileApi.update('analysis/apps/App.md', '# Updated');
await fileApi.delete('analysis/apps/Old.md');
```

### 탭 열기

```ts
import { useTabStore } from '@/stores';

const { openTab } = useTabStore();
openTab({
  id: 'doc-analysis-app',
  title: 'App.md',
  path: '/doc/analysis/apps/App.md',
  icon: 'FileText',
  closable: true,
  activate: true,
});
```

### 로컬 실행

```bash
cd apps/web/dms
npm install
npm run dev
```

기본 포트: `http://localhost:3001`

---

## 정책 문서

- 저장소/수집/세컨드브레인 정책:
  - `docs/dms/planning/storage-and-second-brain-architecture.md`
- 서비스 개요:
  - `docs/dms/explanation/domain/service-overview.md`

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-24 | API 예시/경로를 현행 코드 기준으로 수정, 정책 문서 링크 추가 |
