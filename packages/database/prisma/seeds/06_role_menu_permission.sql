-- ============================================
-- Seed: 06_role_menu_permission.sql
-- Role Menu Permission (역할별 메뉴 권한)
-- 비즈니스 프로세스: 요청 → 제안 → 계약 → 수행 → 종료 → 인계 → 운영
-- ============================================
-- access_type: full=전체, read=읽기전용, none=접근불가 (레코드 생성 안함)

begin;

-- ============================================
-- admin (시스템 관리자) - 모든 메뉴 full 접근
-- ============================================
INSERT INTO pms.cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'admin', menu_id, 'full', CURRENT_TIMESTAMP FROM pms.cm_menu_m WHERE is_active = true
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- ============================================
-- manager (매니저) - 관리자 메뉴 제외 전체 full
-- ============================================
INSERT INTO pms.cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'manager', menu_id, 'full', CURRENT_TIMESTAMP
FROM pms.cm_menu_m
WHERE is_active = true AND is_admin_menu = false
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- ============================================
-- user (일반 사용자) - 관리자 메뉴 제외 전체 read
-- ============================================
INSERT INTO pms.cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'user', menu_id, 'read', CURRENT_TIMESTAMP
FROM pms.cm_menu_m
WHERE is_active = true AND is_admin_menu = false
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- ============================================
-- viewer (조회 사용) - 대시보드 read
-- ============================================
INSERT INTO pms.cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'viewer', menu_id, 'read', CURRENT_TIMESTAMP
FROM pms.cm_menu_m
WHERE menu_code = 'dashboard'
ON CONFLICT (role_code, menu_id) DO NOTHING;

commit;
