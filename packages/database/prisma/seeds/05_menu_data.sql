-- =========================================================
-- Seed: 05_menu_data.sql
-- PMS launch IA menu baseline
--
-- 원칙:
-- - 홈은 고정 탭(HOME_TAB)으로 항상 제공되므로 PMS 좌측 메뉴에는 중복 노출하지 않는다.
-- - PMS 좌측 메뉴는 프로젝트 실행/운영 업무 entry 만 노출한다.
-- - 요청/제안은 CRM handoff/read-only context 로 격하하고 1차 메뉴에서 제외한다.
-- - 시스템 관리자/기준정보 메뉴는 DMS 설정 shell 과 같은 우측 프로필 > 설정 경로로 이동 예정이므로 좌측 메뉴에서 제외한다.
-- =========================================================

begin;

-- ============================================
-- 일반 업무 메뉴 (is_admin_menu = false)
-- ============================================

-- 홈 / 대시보드: 고정 탭으로만 제공한다. 좌측 메뉴에는 중복 노출하지 않는다.
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('dashboard', '홈', 'Home', 'menu', '/home', 'LayoutDashboard', 0, 1, false, false, '고정 홈 탭에서 제공되는 전체 운영 요약과 역할별 운영 포커스', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  menu_name_en = EXCLUDED.menu_name_en,
  menu_type = EXCLUDED.menu_type,
  menu_path = EXCLUDED.menu_path,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  menu_level = EXCLUDED.menu_level,
  is_visible = EXCLUDED.is_visible,
  is_admin_menu = EXCLUDED.is_admin_menu,
  description = EXCLUDED.description,
  is_active = false,
  updated_at = CURRENT_TIMESTAMP;

-- 내 프로젝트: 실제 업무를 이어갈 프로젝트 entry
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('my-projects', '내 프로젝트', 'My Projects', 'menu', '/my-projects', 'FolderTree', 1, 1, true, false, '담당/고정/최근 프로젝트에서 업무를 이어가는 기본 공간', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  menu_name_en = EXCLUDED.menu_name_en,
  menu_type = EXCLUDED.menu_type,
  menu_path = EXCLUDED.menu_path,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  menu_level = EXCLUDED.menu_level,
  is_visible = EXCLUDED.is_visible,
  is_admin_menu = EXCLUDED.is_admin_menu,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- 조치 필요: 지금 처리/확인해야 하는 항목 queue
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('action-required', '조치 필요', 'Action Required', 'menu', '/action-required', 'Star', 2, 1, true, false, '프로젝트별로 흩어진 지금 처리하거나 확인해야 하는 항목', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  menu_name_en = EXCLUDED.menu_name_en,
  menu_type = EXCLUDED.menu_type,
  menu_path = EXCLUDED.menu_path,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  menu_level = EXCLUDED.menu_level,
  is_visible = EXCLUDED.is_visible,
  is_admin_menu = EXCLUDED.is_admin_menu,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- 종료/전환: closeout readiness queue
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('closeout', '종료/전환', 'Closeout', 'menu', '/closeout', 'ArrowRightLeft', 3, 1, true, false, '종료 가능 여부와 전환 병목을 확인하는 closeout queue', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  menu_name_en = EXCLUDED.menu_name_en,
  menu_type = EXCLUDED.menu_type,
  menu_path = EXCLUDED.menu_path,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  menu_level = EXCLUDED.menu_level,
  is_visible = EXCLUDED.is_visible,
  is_admin_menu = EXCLUDED.is_admin_menu,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- 전체 운영 현황: PMO/상위 관리자용 portfolio overview
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('operations-overview', '전체 운영 현황', 'Operations Overview', 'menu', '/operations', 'LayoutDashboard', 4, 1, true, false, '상위 관리자와 PMO가 프로젝트 병목, 부하, 종료 후보를 보는 운영 현황', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  menu_name_en = EXCLUDED.menu_name_en,
  menu_type = EXCLUDED.menu_type,
  menu_path = EXCLUDED.menu_path,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  menu_level = EXCLUDED.menu_level,
  is_visible = EXCLUDED.is_visible,
  is_admin_menu = EXCLUDED.is_admin_menu,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 숨김 메뉴: 프로그램 방식으로 열리는 상세/legacy route
-- ============================================

-- 프로젝트 상세 (목록/큐에서 클릭 시 오픈)
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('project.detail', '프로젝트 상세', 'Project Detail', 'menu', '/project/detail', 'FileText', 99, 1, false, false, '프로젝트 상세 조회 및 실행 활동', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  menu_path = EXCLUDED.menu_path,
  is_visible = false,
  is_admin_menu = false,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- 요청 등록은 CRM/PMS handoff 재정렬 전까지 직접 노출하지 않는다.
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('request.create', '요청 등록', 'Create Request', 'menu', '/request/create', 'Plus', 98, 1, false, false, 'legacy 요청 등록 route - CRM handoff 정렬 전까지 좌측 메뉴 비노출', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  menu_path = EXCLUDED.menu_path,
  is_visible = false,
  is_admin_menu = false,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- legacy/status/admin 메뉴 비활성화
-- ============================================
-- 상태 기반 요청/제안/수행/전환 메뉴는 업무 queue IA 로 대체한다.
-- 시스템 관리자 메뉴는 우측 프로필 > 설정 shell 로 이동할 예정이므로 PMS 좌측 메뉴에서 제외한다.
UPDATE pms.cm_menu_m
SET is_active = false,
    is_visible = false,
    updated_at = CURRENT_TIMESTAMP
WHERE menu_code IN (
  'request', 'request.list',
  'proposal', 'proposal.list',
  'execution', 'execution.list',
  'transition', 'transition.list',
  'admin', 'admin.user', 'admin.role', 'admin.menu', 'admin.code', 'admin.customer', 'admin.dept',
  'opportunity', 'contract', 'project', 'closing', 'handoff', 'operation',
  'project.list', 'request.customer', 'request.customer.list', 'request.customer.create'
);

commit;
