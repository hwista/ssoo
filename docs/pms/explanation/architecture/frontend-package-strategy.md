# 프론트엔드 패키지 전략

> 최종 업데이트: 2026-02-02  
> 상태: 계획됨 (DMS 개발 시 검토)

---

## 개요

PMS와 DMS 프론트엔드 간 **공용 패키지 분리 전략**을 정의합니다.

### 현재 상황

- **PMS**: `apps/web/pms` - 활성 개발 중
- **DMS**: `apps/web/dms` - 별도 조직에서 개발 예정 (곧 런칭)
- **공용 패키지**: `packages/types`, `packages/database` 존재

### 운영 방침 (2026-01-23 결정)

```
┌─────────────────────────────────────────────────────────────┐
│  당분간 PMS와 DMS는 독립적으로 개발                          │
│  - 결합도를 낮춰 별도 조직 개발 지원                         │
│  - 공용화 필요 시 양쪽 모두 수정하는 방식으로 진행            │
│  - 추후 안정화 후 공용 패키지로 통합                         │
└─────────────────────────────────────────────────────────────┘
```

**이유:**
1. DMS는 별도 개발 조직이 있어 결합도 높은 개발 시 문제 소지
2. 런칭 일정이 임박하여 안정성 우선
3. 충분한 사용 패턴 파악 후 통합이 더 효율적

---

## 분리 대상 항목 (향후)

DMS 개발 진행 후 **공용화 검토 대상**:

### ✅ 확정 (동일 적용)

| 항목 | 현재 위치 | 예정 패키지 | 비고 |
|------|----------|------------|------|
| 디자인 토큰 (Tailwind) | `web/pms/tailwind.config.ts` | `@ssoo/config` | 디자인 시스템 동일 |
| CSS 변수 | `web/pms/globals.css` | `@ssoo/config` | shadcn/ui 호환 |
| cn() 유틸리티 | `web/pms/lib/utils` | `@ssoo/ui` | 모든 컴포넌트 필수 |
| shadcn/ui 기본 컴포넌트 | `web/pms/components/ui` | `@ssoo/ui` | button, input 등 |
| API 응답 타입 | `web/pms/lib/api/types.ts` | `@ssoo/types` | 이미 일부 존재 |
| Axios 클라이언트 | `web/pms/lib/api/client.ts` | `@ssoo/api-client` | 인터셉터 포함 |
| 인증 API/Store | `web/pms/lib/api/auth.ts` | `@ssoo/api-client` | 동일 백엔드 사용 |

### ⏳ 검토 필요 (DMS 개발 후 결정)

| 항목 | 현재 위치 | 검토 사유 |
|------|----------|----------|
| DataTable | `components/common/DataTable` | PMS=데이터 중심, DMS=파일 중심 |
| PageHeader | `components/common/PageHeader` | 레이아웃 차이 가능 |
| Pagination | `components/common/Pagination` | 사용 패턴 다를 수 있음 |
| FormComponents | `components/common/FormComponents` | 도메인 특화 가능 |
| Layout 컴포넌트 | `components/layout/*` | 구조 다를 수 있음 |

### ❌ 분리 불필요

| 항목 | 이유 |
|------|------|
| 도메인 API (`lib/api/endpoints/*`) | PMS/DMS 완전히 다름 |
| 도메인 Store | 각 시스템 전용 |
| 페이지 컴포넌트 | 시스템별 고유 |

---

## 예정 패키지 구조

통합 시 아래 구조로 진행:

```
packages/
├── types/          # ✅ 존재 - 공용 타입
├── database/       # ✅ 존재 - Prisma
├── config/         # 🔮 예정 - Tailwind preset, CSS 변수
├── ui/             # 🔮 예정 - shadcn/ui 컴포넌트
└── api-client/     # 🔮 예정 - Axios, 인증
```

---

## 이원화 관리 가이드

### 동기화가 필요한 항목

PMS에서 아래 항목 수정 시 **DMS에도 동일 적용**:

1. **디자인 토큰** (색상, 타이포그래피, 간격)
   - `tailwind.config.ts`
   - `globals.css` CSS 변수

2. **shadcn/ui 컴포넌트 수정**
   - `components/ui/*`

3. **인증 로직 변경**
   - `lib/api/client.ts` 인터셉터
   - `lib/api/auth.ts` API
   - `stores/auth.store.ts`

### 동기화 체크리스트

```markdown
## PR 체크리스트 (프론트엔드)

- [ ] 디자인 토큰 변경 시 DMS에도 적용했나요?
- [ ] shadcn/ui 컴포넌트 수정 시 DMS에도 적용했나요?
- [ ] 인증 로직 변경 시 DMS에도 적용했나요?
```

---

## 통합 시점 기준

아래 조건 충족 시 공용 패키지 분리 진행:

1. ✅ DMS 1차 런칭 완료
2. ✅ PMS/DMS 양쪽에서 안정적 운영 (최소 1개월)
3. ✅ 공용화 대상 컴포넌트 사용 패턴 파악 완료
4. ✅ 별도 조직 간 협의 완료

---

## 관련 문서

- [modular-monolith.md](./modular-monolith.md) - 백엔드 모듈 구조
- [tech-stack.md](./tech-stack.md) - 기술 스택
- [../../../packages/types/README.md](../../../packages/types/README.md) - 타입 패키지

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-23 | 프론트엔드 패키지 전략 문서 최초 작성 |
| 2026-01-23 | 당분간 독립 개발 후 통합 방침 결정 |
