# SSOO 기술 결정 사항

> 최종 업데이트: 2026-02-02

주요 설계 결정 사항과 그 이유를 기록합니다.

---

## 1. UI 라이브러리 선택

### 결정: TanStack Table + shadcn/ui

| 검토 옵션 | 결과 | 이유 |
|----------|------|------|
| DevExtreme | ❌ 제외 | 라이선스 필요 ($899.99/년/개발자) |
| TanStack Table + shadcn/ui | ✅ 채택 | 무료, MIT 라이선스, React 네이티브 |
| AG Grid | ❌ 제외 | 고급 기능은 유료 |

### 조합
- **기본 UI**: shadcn/ui (Radix UI + Tailwind CSS)
- **데이터 테이블**: TanStack Table
- **가상 스크롤**: TanStack Virtual
- **차트**: Recharts
- **엑셀**: xlsx

---

## 2. 라우팅 전략

### 결정: 하이브리드 라우팅 (URL 고정 + 동적 컴포넌트 로딩)

**문제점:**
- Next.js 파일 시스템 라우팅이 URL 구조를 그대로 노출
- `/request` 같은 경로가 주소창에 표시 → 보안 취약점

**해결:**
```
하이브리드 라우팅 = Next.js 라우팅 + 동적 컴포넌트 로딩
```

- URL은 항상 `http://localhost:3000/`로 고정
- 메뉴 클릭 시 `ContentArea`가 path 기반으로 lazy load
- 직접 URL 접근 시 404 → 리다이렉트

**장점:**
- 라우팅 구조 숨김
- 권한 기반 메뉴 DB 제어
- MDI 탭 시스템과 자연스러운 통합

---

## 3. 권한 관리 방식

### 결정: UNION 방식 (Role + User 권한 합집합)

```
최종 권한 = 역할 권한 (cm_role_menu_r)
           ∪ 사용자 개별 권한 (cm_user_menu_r WHERE override_type = 'grant')
           - 사용자 권한 박탈 (cm_user_menu_r WHERE override_type = 'revoke')
```

**현재 상태:**
- Role 테이블 미정의 → `cm_user_menu_r`로 사용자별 직접 권한 부여
- 추후 Role 정의 후 `cm_role_menu_r` 활성화

**장점:**
- 역할 기반 기본 권한 + 예외 처리 유연성
- 특정 사용자에게만 추가 권한 부여 가능
- `revoke`로 특정 메뉴 명시적 차단 가능

---

## 4. 관리자 페이지 분리

### 결정: 별도 새 창으로 분리

**이유:**
- 일반 업무 페이지와 관리자 페이지 컨텍스트 분리
- 토글 스위치 방식의 복잡성 회피
- 별도 관리자 전용 레이아웃 제공 가능

**구현:**
- 관리자 메뉴 클릭 시 새 창/탭으로 열기
- 기존 작업 페이지와 간섭 없음

---

## 5. 모바일 대응 전략

### 결정: 별도 모바일 전용 UI (반응형 X)

**이유:**
- SI/SM 업무 시스템은 데스크톱 중심
- 반응형 재배치보다 전용 UI가 UX 우수
- 모바일은 조회/승인 위주 간소화된 화면

**구현:**
- 해상도 기반 분기 → 모바일 진입점만 준비
- 모바일 UI는 추후 개발

---

## 6. 토큰 저장 위치

### 결정: localStorage (개발) → httpOnly Cookie (운영)

| 저장 위치 | XSS | CSRF | 현재 사용 |
|----------|-----|------|----------|
| localStorage | ❌ 취약 | ✅ 안전 | ✅ 개발용 |
| httpOnly Cookie | ✅ 안전 | ❌ 취약 | 운영용 (TODO) |

**현재:**
- 개발 편의성을 위해 localStorage 사용
- 운영 배포 전 httpOnly Cookie + CSRF 토큰 적용 예정

---

## 7. 히스토리 관리

### 결정: DB 트리거 + Prisma Extension 하이브리드

**DB 트리거:**
- 마스터 테이블 변경 시 히스토리 테이블에 자동 기록
- 모든 변경 경로(API, 직접 쿼리)에서 동작

**Prisma Extension:**
- 추가 로직 처리 (transaction_id 주입 등)
- Prisma 6.x `$extends()` 사용 (`$use()` deprecated)

---

## 8. Opportunity vs Project 엔티티

### 결정: 단일 Project 엔티티로 통합

**검토 옵션:**
1. Opportunity / Project 별도 테이블 → 중복, 전환 시 데이터 이동 필요
2. 단일 테이블 + status_code → ✅ 채택

**장점:**
- 데이터 모델 단순화
- 상태 전환 시 UPDATE만 하면 됨
- 히스토리 추적 용이

---

## 9. 단계별 상세 테이블 분리

### 결정: Project 공통 + 단계 특화 상세 테이블

**배경:**
- 단일 Project 엔티티 유지
- 단계별로 의미가 다른 필드가 증가

**결정 내용:**
- 공통 필드는 `pr_project_m` 유지
- 상태 공통 상세는 `pr_project_status_m` 유지
- 단계 특화 상세는 `pr_project_{stage}_d` 테이블로 분리

**장점:**
- 공통 모델 단순성 유지
- 단계별 확장 용이
- 조인으로 필요한 데이터만 조회 가능

---

## 10. 사용자 테이블 설계

### 결정: 단일 cm_user_m 테이블

내부 직원과 외부 이해관계자를 **하나의 테이블**에서 관리

**구분 방법:**
- `user_type_code`: internal / external
- `is_system_user`: 시스템 로그인 가능 여부

**장점:**
- 프로젝트 참여자 매핑 단순화
- 외부 사용자도 필요 시 시스템 접근 부여 가능
- 초대 플로우 통합 관리

---

## 관련 문서

- [tech-stack.md](tech-stack.md) - 기술 스택
- [frontend-standards.md](frontend-standards.md) - 프론트엔드 표준
- [page-routing.md](page-routing.md) - 페이지 라우팅 상세

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

