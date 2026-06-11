-- ============================================
-- Seed: 06_role_menu_permission.sql
-- Role Menu Permission (역할별 메뉴 권한)
-- PMS launch IA: 업무 메뉴는 역할별로 노출하고, 고정 홈 탭/시스템 설정/Admin 항목은 좌측 메뉴에서 제외한다.
-- ============================================
-- access_type: full=전체, read=읽기전용, none=접근불가 (레코드 생성 안함)

begin;

-- 재실행 시 비활성 메뉴와 권한 기준 변경이 snapshot 에 남지 않도록 정리
DELETE FROM pms.cm_role_menu_r
WHERE menu_id IN (
  SELECT menu_id FROM pms.cm_menu_m WHERE is_active = false
);

-- ============================================
-- admin (시스템 관리자) - 활성 메뉴 full 접근
-- ============================================
INSERT INTO pms.cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'admin', menu_id, 'full', CURRENT_TIMESTAMP
FROM pms.cm_menu_m
WHERE is_active = true
ON CONFLICT (role_code, menu_id) DO UPDATE SET
  access_type = EXCLUDED.access_type,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- manager (매니저/PMO) - PMS 업무 메뉴 full 접근
-- ============================================
INSERT INTO pms.cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'manager', menu_id, 'full', CURRENT_TIMESTAMP
FROM pms.cm_menu_m
WHERE is_active = true AND is_admin_menu = false
ON CONFLICT (role_code, menu_id) DO UPDATE SET
  access_type = EXCLUDED.access_type,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- user (일반 사용자) - 개인 업무 메뉴 read 접근, 전체 운영 현황 제외
-- ============================================
INSERT INTO pms.cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'user', menu_id, 'read', CURRENT_TIMESTAMP
FROM pms.cm_menu_m
WHERE is_active = true
  AND is_admin_menu = false
  AND menu_code <> 'operations-overview'
ON CONFLICT (role_code, menu_id) DO UPDATE SET
  access_type = EXCLUDED.access_type,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- 전체 운영 현황은 상위 관리자/PMO용 surface 이므로 일반 사용자 grant 를 제거한다.
DELETE FROM pms.cm_role_menu_r
WHERE role_code = 'user'
  AND menu_id IN (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'operations-overview');

-- ============================================
-- viewer (조회 사용자) - 고정 홈 탭은 메뉴 권한에 의존하지 않으므로 좌측 메뉴 grant 를 만들지 않는다.
-- ============================================
DELETE FROM pms.cm_role_menu_r
WHERE menu_id IN (SELECT menu_id FROM pms.cm_menu_m WHERE menu_code = 'dashboard');

commit;
