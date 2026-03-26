-- =========================================================
-- 시스템 초기 관리자 계정 생성
-- 주의: 실행 전 password_hash를 실제 bcrypt 해시값으로 교체 필요!
-- =========================================================

begin;

-- 초기 관리자 계정
-- password_hash 예시는 'admin123!' 의 bcrypt 해시 (실제 배포 시 변경 필수)
-- 생성 방법: node -e "console.log(require('bcrypt').hashSync('your_password', 12))"

insert into cm_user_m (
    -- System Access Control
    is_system_user,
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
    last_activity
)
values (
    -- System Access Control
    true,                   -- is_system_user: 시스템 사용 가능
    'internal',             -- user_type_code: 내부 직원
    
    -- Authentication
    'admin',                -- login_id
    '$2b$12$PLACEHOLDER_HASH_REPLACE_WITH_REAL_BCRYPT_HASH',  -- password_hash (반드시 교체!)
    
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
    'user_initial_admin.sql'
)
on conflict (email) do nothing;  -- 이미 존재하면 skip

commit;

-- =========================================================
-- 확인 쿼리
-- =========================================================
-- select user_id, login_id, user_name, email, role_code, user_status_code 
-- from cm_user_m 
-- where login_id = 'admin';
