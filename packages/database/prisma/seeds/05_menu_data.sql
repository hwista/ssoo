-- =========================================================
-- Seed: 05_menu_data.sql
-- 초기 메뉴 데이터
-- 프로젝트 상태 기반 메뉴: 요청 → 제안 → 수행 → 전환
-- 관리자 메뉴는 is_admin_menu = true로 분리
-- =========================================================

begin;

-- 기존 데이터 정리 (개발 환경용)
-- DELETE FROM cm_role_menu_r;
-- DELETE FROM cm_user_menu_r;
-- DELETE FROM cm_user_favorite_r;
-- DELETE FROM cm_menu_m;

-- ============================================
-- 일반 사용자 메뉴 (is_admin_menu = false)
-- 1레벨: 대시보드, 요청, 제안, 수행, 전환
-- ============================================

-- 1. 대시보드 (메인 진입점) — path: /home (ContentArea 기준)
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('dashboard', '대시보드', 'Dashboard', 'menu', '/home', 'LayoutDashboard', 1, 1, true, false, '전체 현황, KPI, 알림', CURRENT_TIMESTAMP)
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
  updated_at = CURRENT_TIMESTAMP;

-- 2. 요청 (고객 요청 접수 및 검토)
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('request', '요청', 'Request', 'group', '/request', 'MessageSquare', 2, 1, true, false, '고객 요청 접수 및 검토', CURRENT_TIMESTAMP)
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
  updated_at = CURRENT_TIMESTAMP;

-- 3. 제안 (견적/제안서 작성 및 계약 협상)
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('proposal', '제안', 'Proposal', 'group', '/proposal', 'Lightbulb', 3, 1, true, false, '견적/제안서 작성 및 계약 협상', CURRENT_TIMESTAMP)
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
  updated_at = CURRENT_TIMESTAMP;

-- 4. 수행 (계약 체결 후 프로젝트 수행)
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('execution', '수행', 'Execution', 'group', '/execution', 'Rocket', 4, 1, true, false, '계약 체결 후 프로젝트 수행', CURRENT_TIMESTAMP)
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
  updated_at = CURRENT_TIMESTAMP;

-- 5. 전환 (프로젝트 완료 후 운영/유지보수 전환)
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('transition', '전환', 'Transition', 'group', '/transition', 'ArrowRightLeft', 5, 1, true, false, '프로젝트 완료 후 운영/유지보수 전환', CURRENT_TIMESTAMP)
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
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 관리자 메뉴 (is_admin_menu = true)
-- 일반 메뉴와 동일 레벨 (menu_level: 1)
-- ============================================

-- 관리자 그룹
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('admin', '관리자', 'Admin', 'group', '/admin', 'Shield', 1, 1, true, true, '시스템 관리 메뉴', CURRENT_TIMESTAMP)
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
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 2레벨 메뉴 (일반)
-- ============================================

-- 요청 > 요청 목록
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('request.list', '요청 목록', 'Request List', 'menu', '/request', 'List', 1, 2, 
        (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'request'), true, false, '요청 목록 조회', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'request'),
  is_admin_menu = false,
  updated_at = CURRENT_TIMESTAMP;

-- 제안 > 제안 목록
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('proposal.list', '제안 목록', 'Proposal List', 'menu', '/proposal', 'List', 1, 2, 
        (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'proposal'), true, false, '제안 목록 조회', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'proposal'),
  is_admin_menu = false,
  updated_at = CURRENT_TIMESTAMP;

-- 수행 > 프로젝트 목록
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('execution.list', '프로젝트 목록', 'Project List', 'menu', '/execution', 'List', 1, 2, 
        (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'execution'), true, false, '수행 프로젝트 목록 조회', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'execution'),
  is_admin_menu = false,
  updated_at = CURRENT_TIMESTAMP;

-- 전환 > 전환 목록
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('transition.list', '전환 목록', 'Transition List', 'menu', '/transition', 'List', 1, 2, 
        (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'transition'), true, false, '전환 목록 조회', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'transition'),
  is_admin_menu = false,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 2레벨 메뉴 (관리자)
-- ============================================

-- 관리자 > 사용자 관리
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('admin.user', '사용자 관리', 'User Management', 'menu', '/admin/user', 'Users', 1, 2, 
        (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'admin'), true, true, '사용자 계정 관리', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'admin'),
  is_admin_menu = true,
  updated_at = CURRENT_TIMESTAMP;

-- 관리자 > 역할 관리
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('admin.role', '역할 관리', 'Role Management', 'menu', '/admin/role', 'UserCog', 2, 2, 
        (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'admin'), true, true, '역할 및 권한 관리', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'admin'),
  is_admin_menu = true,
  updated_at = CURRENT_TIMESTAMP;

-- 관리자 > 메뉴 관리
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('admin.menu', '메뉴 관리', 'Menu Management', 'menu', '/admin/menu', 'Menu', 3, 2, 
        (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'admin'), true, true, '메뉴 구조 관리', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'admin'),
  is_admin_menu = true,
  updated_at = CURRENT_TIMESTAMP;

-- 관리자 > 코드 관리
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('admin.code', '코드 관리', 'Code Management', 'menu', '/admin/code', 'Code', 4, 2, 
        (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'admin'), true, true, '공통 코드 관리', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'admin'),
  is_admin_menu = true,
  updated_at = CURRENT_TIMESTAMP;

-- 관리자 > 고객사 관리
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('admin.customer', '고객사 관리', 'Customer Management', 'menu', '/admin/customer', 'Building2', 5, 2, 
        (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'admin'), true, true, '고객사/플랜트/시스템 기준정보', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'admin'),
  is_admin_menu = true,
  updated_at = CURRENT_TIMESTAMP;

-- 관리자 > 부서 관리
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('admin.dept', '부서 관리', 'Department Management', 'menu', '/admin/dept', 'Network', 6, 2, 
        (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'admin'), true, true, '부서 구조 관리', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'admin'),
  is_admin_menu = true,
  updated_at = CURRENT_TIMESTAMP;

-- 관리자 > 시스템 카탈로그
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('admin.systemCatalog', '시스템 카탈로그', 'System Catalog', 'menu', '/admin/system-catalog', 'Server', 7, 2,
        (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'admin'), true, true, '시스템 종류/계층 관리', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'admin'),
  is_admin_menu = true,
  updated_at = CURRENT_TIMESTAMP;

-- 관리자 > 사이트 관리
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('admin.site', '사이트 관리', 'Site Management', 'menu', '/admin/site', 'MapPin', 8, 2,
        (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'admin'), true, true, '고객별 사이트/플랜트 기준정보 관리', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'admin'),
  is_admin_menu = true,
  updated_at = CURRENT_TIMESTAMP;

-- 관리자 > 시스템 인스턴스 관리
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('admin.systemInstance', '시스템 인스턴스 관리', 'System Instance Management', 'menu', '/admin/system-instance', 'Server', 9, 2,
        (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'admin'), true, true, '고객/사이트별 시스템 인스턴스 기준정보 관리', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'admin'),
  is_admin_menu = true,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 2레벨 메뉴 (일반) — 숨겨진 메뉴 (프로그래밍 방식 오픈)
-- 사이드바에 표시하지 않지만 권한 체크용으로 필요
-- ============================================

-- 요청 > 요청 등록 (숨김)
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('request.create', '요청 등록', 'Create Request', 'menu', '/request/create', 'Plus', 2, 2,
        (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'request'), false, false, '새 요청 등록', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  menu_path = EXCLUDED.menu_path,
  parent_menu_id = (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'request'),
  is_visible = false,
  is_admin_menu = false,
  updated_at = CURRENT_TIMESTAMP;

-- 프로젝트 상세 (독립 메뉴, 숨김 — 목록에서 클릭 시 오픈)
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('project.detail', '프로젝트 상세', 'Project Detail', 'menu', '/project/detail', 'FileText', 99, 1, false, false, '프로젝트 상세 조회 (목록에서 클릭 시 오픈)', CURRENT_TIMESTAMP)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  menu_path = EXCLUDED.menu_path,
  is_visible = false,
  is_admin_menu = false,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 기존 불필요 메뉴 비활성화
-- (opportunity, contract, project, closing, handoff, operation 등)
-- ============================================
UPDATE pms.cm_menu_m SET is_active = false, updated_at = CURRENT_TIMESTAMP
WHERE menu_code IN ('opportunity', 'contract', 'project', 'closing', 'handoff', 'operation', 
                    'project.list', 'request.customer', 'request.customer.list', 'request.customer.create')
  AND is_active = true;

commit;
