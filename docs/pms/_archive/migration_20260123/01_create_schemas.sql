-- =========================================================
-- Phase 2-B: PostgreSQL 스키마 분리
-- Step 1: 스키마 생성 및 권한 부여
-- =========================================================
-- 실행 전: appuser로 접속 또는 superuser 권한 필요
-- =========================================================

-- 1. 스키마 생성
CREATE SCHEMA IF NOT EXISTS common;
CREATE SCHEMA IF NOT EXISTS pms;
CREATE SCHEMA IF NOT EXISTS dms;

-- 2. appuser 권한 부여
GRANT ALL ON SCHEMA common TO appuser;
GRANT ALL ON SCHEMA pms TO appuser;
GRANT ALL ON SCHEMA dms TO appuser;

-- 3. 기본 권한 설정 (향후 생성되는 객체에도 적용)
ALTER DEFAULT PRIVILEGES IN SCHEMA common GRANT ALL ON TABLES TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA common GRANT ALL ON SEQUENCES TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA common GRANT ALL ON FUNCTIONS TO appuser;

ALTER DEFAULT PRIVILEGES IN SCHEMA pms GRANT ALL ON TABLES TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA pms GRANT ALL ON SEQUENCES TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA pms GRANT ALL ON FUNCTIONS TO appuser;

ALTER DEFAULT PRIVILEGES IN SCHEMA dms GRANT ALL ON TABLES TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA dms GRANT ALL ON SEQUENCES TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA dms GRANT ALL ON FUNCTIONS TO appuser;

-- 4. search_path 설정 (appuser가 스키마를 쉽게 접근하도록)
ALTER ROLE appuser SET search_path TO common, pms, dms, public;

-- 확인
SELECT nspname FROM pg_namespace WHERE nspname IN ('common', 'pms', 'dms');
