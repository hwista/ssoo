-- =========================================================
-- apply_all_seeds.sql
-- 모든 시드 파일을 순서대로 실행하는 마스터 스크립트
-- 
-- 각 시드 파일은 명시적 스키마(common/pms)를 사용합니다.
-- 
-- 스키마 분류:
--   - common: cm_user_m (사용자)
--   - pms: cm_code_m, cm_menu_m, cm_*_r (코드, 메뉴, 권한 관련)
-- =========================================================
-- 
-- 사용법 (psql):
--   psql -U <user> -d <database> -f apply_all_seeds.sql
--
-- 또는 각 파일 개별 실행:
--   psql -U <user> -d <database> -f 00_user_code.sql
--   psql -U <user> -d <database> -f 01_project_status_code.sql
--   ...
--
-- =========================================================

\echo '=========================================='
\echo 'Starting Seed Data Application'
\echo 'Schema: common (user), pms (code, menu, permission)'
\echo '=========================================='

-- 00: 사용자 타입 코드
\echo 'Applying 00_user_code.sql...'
\i 00_user_code.sql

-- 01: 프로젝트 상태 코드
\echo 'Applying 01_project_status_code.sql...'
\i 01_project_status_code.sql

-- 02: 프로젝트 산출물 상태
\echo 'Applying 02_project_deliverable_status.sql...'
\i 02_project_deliverable_status.sql

-- 03: 프로젝트 종료 조건
\echo 'Applying 03_project_close_condition.sql...'
\i 03_project_close_condition.sql

-- 04: 프로젝트 이관 유형
\echo 'Applying 04_project_handoff_type.sql...'
\i 04_project_handoff_type.sql

-- 08: 단위 코드
\echo 'Applying 08_unit_code.sql...'
\i 08_unit_code.sql

-- 05: 메뉴 데이터
\echo 'Applying 05_menu_data.sql...'
\i 05_menu_data.sql

-- 06: 역할별 메뉴 권한
\echo 'Applying 06_role_menu_permission.sql...'
\i 06_role_menu_permission.sql

-- 99: 초기 관리자 계정 (07번 전에 실행해야 함)
\echo 'Applying 99_user_initial_admin.sql...'
\i 99_user_initial_admin.sql

-- 07: 사용자별 메뉴 권한 (admin 사용자 생성 후 실행)
\echo 'Applying 07_user_menu_permission.sql...'
\i 07_user_menu_permission.sql

\echo '=========================================='
\echo 'Seed Data Application Complete!'
\echo '=========================================='
