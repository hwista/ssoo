-- ============================================
-- Role Menu Permission Seed Data (역할별 메뉴 권한)
-- 비즈니스 프로세스: 요청 → 제안 → 계약 → 실행 → 종료 → 이관 → 운영
-- ============================================
-- access_type: full=전체, read=읽기전용, none=접근불가(레코드 생성 안함)

-- ============================================
-- admin (시스템 관리자) - 모든 메뉴 full 접근
-- ============================================
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'admin', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE is_active = true
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- ============================================
-- sales (영업 담당자)
-- ============================================
-- 대시보드: full
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'sales', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code = 'dashboard'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 요청: full
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'sales', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'request%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 제안: full
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'sales', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'opportunity%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 계약: full
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'sales', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'contract%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 실행: read (프로젝트 진행상황 확인만)
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'sales', menu_id, 'read', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'project%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 종료: read
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'sales', menu_id, 'read', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'closing%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 이관, 운영: none (접근 불가)
-- 관리자: none (접근 불가)

-- ============================================
-- am (Account Manager)
-- ============================================
-- 대시보드: full
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'am', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code = 'dashboard'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 요청: full (AM 핵심 업무)
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'am', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'request%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 제안: full
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'am', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'opportunity%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 계약: full
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'am', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'contract%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 실행: full
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'am', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'project%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 종료: full
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'am', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'closing%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 이관: full
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'am', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'handoff%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 운영: full
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'am', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'operation%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- ============================================
-- pm (Project Manager)
-- ============================================
-- 대시보드: full
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'pm', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code = 'dashboard'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 요청: read
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'pm', menu_id, 'read', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'request%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 제안: read
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'pm', menu_id, 'read', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'opportunity%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 계약: read
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'pm', menu_id, 'read', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'contract%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 실행: full (PM 핵심 업무)
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'pm', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'project%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 종료: full
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'pm', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'closing%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 이관: full
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'pm', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'handoff%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 운영: read
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'pm', menu_id, 'read', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'operation%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- ============================================
-- sm (SM 담당자)
-- ============================================
-- 대시보드: full
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'sm', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code = 'dashboard'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 요청: read
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'sm', menu_id, 'read', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'request%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 제안, 계약: none (접근 불가)

-- 실행: read
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'sm', menu_id, 'read', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'project%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 종료: read
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'sm', menu_id, 'read', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'closing%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 이관: full (SM 핵심 - 인수 받음)
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'sm', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'handoff%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 운영: full (SM 핵심 업무)
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'sm', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'operation%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- ============================================
-- external (외부 사용자 - 고객사 담당자)
-- ============================================
-- 대시보드: full
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'external', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code = 'dashboard'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 요청, 제안, 계약: none (접근 불가)

-- 실행: full (본인 관련 프로젝트만 - 데이터 레벨 제어)
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'external', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'project%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 종료: read
INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'external', menu_id, 'read', CURRENT_TIMESTAMP FROM cm_menu_m WHERE menu_code LIKE 'closing%'
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- 이관, 운영, 관리자: none (접근 불가)
