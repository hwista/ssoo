# SSOO 메뉴 구조

> 최종 업데이트: 2026-02-02

---

## 프로젝트 상태 4단계 구조

> 비즈니스 프로세스 흐름: **요청 → 제안 → 실행 → 전환**

| 단계 | 영문 | status_code | 설명 |
|------|------|-------------|------|
| 요청 | Request | `request` | 고객 요청 접수, AM 관리 |
| 제안 | Proposal | `proposal` | 제안/견적/협상 |
| 실행 | Execution | `execution` | 계약 후 프로젝트 실행, PM 중심 |
| 전환 | Transition | `transition` | 프로젝트 완료, SI→SM 전환, 이관 |

**stage_code (각 상태 공통):**
- `waiting` - 대기
- `in_progress` - 진행중
- `done` - 완료

---

## 1레벨 메뉴 구조

| 메뉴 | 영문 | 아이콘 | 커버 업무 | 비고 |
|------|------|--------|----------|------|
| 대시보드 | Dashboard | LayoutDashboard | 전체 현황, KPI, 알림 | 메인 진입점 |
| 요청 | Request | MessageSquare | 고객 요청 접수/관리, AM 관리 | AM 통한 고객사 요청 |
| 제안 | Proposal | Lightbulb | 제안서, 견적, 협상 | Sales 중심 |
| 실행 | Execution | Rocket | 프로젝트 목록/상세, 진행관리, 산출물, WBS, 이슈, 리스크 | PM 중심, 핵심 업무 |
| 전환 | Transition | ArrowRightLeft | 종료조건 검증, 이관 준비, 운영 전환 | SI → SM 전환 |

---

## 관리자 메뉴 구조 (1레벨 평탄화)

> `is_admin_menu = true` 설정, `is_admin = true` 사용자만 접근 가능

| 메뉴 | 영문 | 아이콘 | 비고 |
|------|------|--------|------|
| 사용자 관리 | Users | User | 계정 관리 |
| 역할 관리 | Roles | Shield | 권한 체계 |
| 메뉴 관리 | Menus | Menu | 메뉴 구성 |
| 코드 관리 | Codes | Code | 공통 코드 |
| 고객사 관리 | Customers | Building | 기준 정보 |
| 부서 관리 | Departments | Briefcase | 조직 관리 |

---

## 사이드바 UI 구조

```
┌─────────────────────────────┐
│  ⭐ 즐겨찾기                 │  ← Section 1
├─────────────────────────────┤
│  📄 현재 열린 페이지         │  ← Section 2
├─────────────────────────────┤
│  📁 전체메뉴                 │  ← Section 3 (is_admin_menu = false)
│    ├── 대시보드              │
│    ├── 요청                  │
│    ├── 제안                  │
│    ├── 실행                  │
│    └── 전환                  │
├─────────────────────────────┤
│  🔒 관리자                   │  ← Section 4 (is_admin_menu = true)
│    ├── 사용자 관리           │     (is_admin=true 사용자만 표시)
│    ├── 역할 관리             │
│    ├── 메뉴 관리             │
│    ├── 코드 관리             │
│    ├── 고객사 관리           │
│    └── 부서 관리             │
└─────────────────────────────┘
```

**API 응답 구조:** `GET /api/menus/my`
```typescript
{
  generalMenus: MenuItem[],  // is_admin_menu = false
  adminMenus: MenuItem[],    // is_admin_menu = true (관리자만)
  favorites: FavoriteMenu[]  // 즐겨찾기
}
```

---

## 요청(Request) 메뉴 상세 구조

```
요청 (request)
├── 요청 목록 (request/list)    ← /request 경로
└── 요청 등록 (request/create)  ← /request/create 경로
```

### 요청 등록 시 pr_project_m 상태

| 컬럼 | 값 | 설명 |
|------|-----|------|
| `status_code` | `request` | 요청 단계 |
| `stage_code` | `waiting` | 대기 상태 (검토 전) |
| `done_result_code` | NULL | 아직 완료 전 |

### 흐름 요약

1. **요청 등록** → request + waiting
2. **검토 시작** → request + in_progress
3. **제안 단계 전환** → proposal + waiting
4. **계약/수주 확정** → execution + waiting
5. **프로젝트 완료** → transition + waiting → done

---

## 권한-메뉴 매트릭스 (1레벨 기준)

| 메뉴 | admin | manager | user | viewer |
|------|-------|---------|------|--------|
| 대시보드 | ✅ | ✅ | ✅ | ✅ |
| 요청 | ✅ | ✅ | 👁️ | 👁️ |
| 제안 | ✅ | ✅ | ✅ | 👁️ | ❌ | ❌ |
| 실행 | ✅ | 👁️ | ✅ | ✅ | 👁️ | ✅ |
| 전환 | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| 관리자 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

> ✅ 전체 접근, 👁️ 읽기 전용, ❌ 숨김

---

## 권한 관리 테이블

| 테이블 | 용도 | 현재 상태 |
|--------|------|----------|
| `cm_menu_m` | 메뉴 마스터 | ✅ 활성 |
| `cm_role_menu_r` | 역할별 메뉴 권한 | 🔲 Role 정의 후 활성화 |
| `cm_user_menu_r` | 사용자별 메뉴 권한 | ✅ 현재 사용 중 |
| `cm_user_favorite_r` | 즐겨찾기 | ✅ 활성 |
| `cm_dept_menu_r` | 부서별 메뉴 권한 | 🔲 확장 설계만 완료 |

---

## 권한 계산 로직

### 현재 (Role 미정의)

```
현재 권한 = 사용자 직접 권한 (cm_user_menu_r WHERE override_type = 'grant')
```

### 추후 (Role 정의 후, UNION 방식)

```
최종 권한 = 역할 권한 (cm_role_menu_r)
           ∪ 사용자 개별 권한 (cm_user_menu_r WHERE override_type = 'grant')
           - 사용자 권한 박탈 (cm_user_menu_r WHERE override_type = 'revoke')
```

---

## 관련 문서

- [../../common/reference/db/schema.dbml](../../common/reference/db/schema.dbml) - 데이터베이스 스키마 (cm_menu, cm_role_menu, cm_user_menu)
- [database-guide.md](../../common/guides/database-guide.md) - 데이터베이스 가이드 (공용)
- [../architecture/tech-decisions.md](../explanation/architecture/tech-decisions.md) - 권한 관리 방식 결정

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

