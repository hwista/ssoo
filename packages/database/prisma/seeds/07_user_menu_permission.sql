-- ============================================
-- Seed: 07_user_menu_permission.sql
-- User Menu Permission (사용자별 메뉴 권한)
-- ============================================
-- Role 테이블이 정의되기 전까지 사용자별 직접 권한 부여
-- 
-- access_type: full=전체, read=읽기전용
-- override_type: grant=권한부여, revoke=권한박탈 (역할 권한 오버라이드용)
-- 
-- 현재: Role 미정의 상태이므로 사용자에게 직접 권한 부여
-- 추후: Role 정의 후 cm_role_menu_r 사용, cm_user_menu_r는 예외 처리용으로 전환
--
-- 주의: 99_user_initial_admin.sql 실행 이후에 실행되어야 합니다.

begin;

-- ============================================
-- admin 사용자 - 모든 메뉴 full 접근
-- (user_id를 login_id로 조회하여 동적으로 처리)
-- ============================================
INSERT INTO pms.cm_user_menu_r (user_id, menu_id, access_type, override_type, updated_at)
SELECT u.user_id, m.menu_id, 'full', 'grant', CURRENT_TIMESTAMP 
FROM pms.cm_menu_m m
CROSS JOIN common.cm_user_m u
WHERE m.is_active = true AND u.login_id = 'admin'
ON CONFLICT (user_id, menu_id) DO NOTHING;

-- ============================================
-- 추가 사용자 권한은 여기에 추가
-- ============================================
-- 예시: PM 사용자(user_id=2)가 생성되면
-- INSERT INTO pms.cm_user_menu_r (user_id, menu_id, access_type, override_type, updated_at)
-- SELECT 2, menu_id, 'full', 'grant', CURRENT_TIMESTAMP 
-- FROM pms.cm_menu_m WHERE menu_code IN ('dashboard', 'execution', 'execution.list', 'transition')
-- ON CONFLICT (user_id, menu_id) DO NOTHING;
--
-- INSERT INTO pms.cm_user_menu_r (user_id, menu_id, access_type, override_type, updated_at)
-- SELECT 2, menu_id, 'read', 'grant', CURRENT_TIMESTAMP 
-- FROM pms.cm_menu_m WHERE menu_code IN ('request', 'proposal', 'execution', 'transition')
-- ON CONFLICT (user_id, menu_id) DO NOTHING;

commit;
