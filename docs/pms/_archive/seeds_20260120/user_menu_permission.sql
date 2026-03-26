-- ============================================
-- User Menu Permission Seed Data (사용자별 메뉴 권한)
-- ============================================
-- Role 테이블이 정의되기 전까지 사용자별 직접 권한 부여
-- 
-- access_type: full=전체, read=읽기전용
-- override_type: grant=권한부여, revoke=권한박탈 (역할 권한 오버라이드용)
-- 
-- 현재: Role 미정의 상태이므로 사용자에게 직접 권한 부여
-- 추후: Role 정의 후 cm_role_menu_r 활용, cm_user_menu_r는 예외 처리용으로 전환

-- ============================================
-- admin 사용자 (user_id=1) - 모든 메뉴 full 접근
-- ============================================
INSERT INTO cm_user_menu_r (user_id, menu_id, access_type, override_type, updated_at)
SELECT 1, menu_id, 'full', 'grant', CURRENT_TIMESTAMP 
FROM cm_menu_m WHERE is_active = true
ON CONFLICT (user_id, menu_id) DO NOTHING;

-- ============================================
-- 추가 사용자 권한은 여기에 추가
-- ============================================
-- 예시: PM 사용자 (user_id=2)가 생성되면
-- INSERT INTO cm_user_menu_r (user_id, menu_id, access_type, override_type, updated_at)
-- SELECT 2, menu_id, 'full', 'grant', CURRENT_TIMESTAMP 
-- FROM cm_menu_m WHERE menu_code IN ('dashboard', 'project', 'project.list', 'closing', 'handoff')
-- ON CONFLICT (user_id, menu_id) DO NOTHING;
--
-- INSERT INTO cm_user_menu_r (user_id, menu_id, access_type, override_type, updated_at)
-- SELECT 2, menu_id, 'read', 'grant', CURRENT_TIMESTAMP 
-- FROM cm_menu_m WHERE menu_code IN ('request', 'opportunity', 'contract', 'operation')
-- ON CONFLICT (user_id, menu_id) DO NOTHING;
