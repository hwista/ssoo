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

    -- Common
    is_active,
    memo,
    created_by,
    last_source,
    last_activity,
    updated_at
)
values (
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

    -- Common
    true,                   -- is_active
    '시스템 초기 관리자 계정. 배포 후 비밀번호 변경 필수.',
    null,                   -- created_by: 시스템 생성
    'SEED',                 -- last_source
    'user_initial_admin.sql',
    CURRENT_TIMESTAMP       -- updated_at
)
on conflict (email) do nothing;  -- 이미 존재하면 skip

insert into common.cm_user_auth_m (
    user_id,
    login_id,
    password_hash,
    account_status_code,
    created_at,
    updated_at,
    last_source,
    last_activity
)
select
    u.user_id,
    'admin',
    '$2b$12$p2cetWagNdcD1D6bfdyhEOU7idn.M37R7GYIF7h3MhLGGnd9bUHWW',
    'active',
    current_timestamp,
    current_timestamp,
    'SEED',
    'user_initial_admin.sql'
from common.cm_user_m u
where u.email = 'admin@company.com'
on conflict (user_id) do update
set
    login_id = excluded.login_id,
    password_hash = excluded.password_hash,
    account_status_code = excluded.account_status_code,
    updated_at = excluded.updated_at,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity;

commit;
