-- =========================================================
-- Seed: 99_user_initial_admin.sql
-- 시스템 초기 관리자 계정 생성
-- 주의: 실행 전 password_hash를 실제 bcrypt 해시값으로 교체 필요!
-- =========================================================

begin;

-- 초기 관리자 계정
-- 비밀번호 규칙: 8자 이상, 대소문자/숫자/특수문자 각 1개 이상 포함
-- 기본 비밀번호: admin123! (개발 환경용, 운영 환경에서는 반드시 변경!)
-- 해시 생성: cd apps/server && node -e "console.log(require('bcryptjs').hashSync('admin123!', 12))"

insert into common.cm_user_m (
    -- System Access Control
    is_system_user,
    is_admin,
    user_type_code,
    
    -- Authentication
    login_id,
    password_hash,
    
    -- Profile
    user_name,
    display_name,
    email,
    
    -- Organization
    department_code,
    position_code,
    employee_number,
    
    -- Role & Permission
    role_code,
    
    -- Status
    user_status_code,
    
    -- Common
    is_active,
    memo,
    created_by,
    last_source,
    last_activity,
    updated_at
)
values (
    -- System Access Control
    true,                   -- is_system_user: 시스템 사용 가능
    true,                   -- is_admin: 관리자 (관리자 메뉴 접근 가능)
    'internal',             -- user_type_code: 내부 직원
    
    -- Authentication
    'admin',                -- login_id
    '$2b$12$p2cetWagNdcD1D6bfdyhEOU7idn.M37R7GYIF7h3MhLGGnd9bUHWW',  -- admin123!
    
    -- Profile
    '시스템관리자',          -- user_name
    'Admin',                -- display_name
    'admin@company.com',    -- email (실제 이메일로 변경)
    
    -- Organization
    'ADMIN',                -- department_code
    'DIRECTOR',             -- position_code
    'ADMIN001',             -- employee_number
    
    -- Role & Permission
    'admin',                -- role_code: 관리자
    
    -- Status
    'active',               -- user_status_code: 활성
    
    -- Common
    true,                   -- is_active
    '시스템 초기 관리자 계정. 배포 후 비밀번호 변경 필수.',
    null,                   -- created_by: 시스템 생성
    'SEED',                 -- last_source
    'user_initial_admin.sql',
    CURRENT_TIMESTAMP       -- updated_at
)
on conflict (email) do nothing;  -- 이미 존재하면 skip

commit;
