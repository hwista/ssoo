-- =========================================================
-- Phase 2-B: PostgreSQL 스키마 분리
-- Step 2: 테이블 마이그레이션 (public -> common/pms)
-- =========================================================
-- 주의: 이 스크립트는 기존 데이터를 이동합니다.
-- 실행 전 백업을 권장합니다.
-- =========================================================

-- =========================================================
-- COMMON 스키마로 이동할 테이블 (cm_ 접두사)
-- =========================================================

-- Master Tables
ALTER TABLE IF EXISTS public.cm_code_m SET SCHEMA common;
ALTER TABLE IF EXISTS public.cm_menu_m SET SCHEMA common;
ALTER TABLE IF EXISTS public.cm_user_m SET SCHEMA common;
ALTER TABLE IF EXISTS public.cm_role_menu_r SET SCHEMA common;
ALTER TABLE IF EXISTS public.cm_user_menu_r SET SCHEMA common;
ALTER TABLE IF EXISTS public.cm_user_favorite_r SET SCHEMA common;

-- History Tables
ALTER TABLE IF EXISTS public.cm_code_h SET SCHEMA common;
ALTER TABLE IF EXISTS public.cm_menu_h SET SCHEMA common;
ALTER TABLE IF EXISTS public.cm_user_h SET SCHEMA common;
ALTER TABLE IF EXISTS public.cm_role_menu_h SET SCHEMA common;
ALTER TABLE IF EXISTS public.cm_user_menu_h SET SCHEMA common;

-- =========================================================
-- PMS 스키마로 이동할 테이블 (pr_ 접두사)
-- =========================================================

-- Master Tables
ALTER TABLE IF EXISTS public.pr_project_m SET SCHEMA pms;
ALTER TABLE IF EXISTS public.pr_project_status_m SET SCHEMA pms;
ALTER TABLE IF EXISTS public.pr_deliverable_m SET SCHEMA pms;
ALTER TABLE IF EXISTS public.pr_deliverable_group_m SET SCHEMA pms;
ALTER TABLE IF EXISTS public.pr_deliverable_group_item_r_m SET SCHEMA pms;
ALTER TABLE IF EXISTS public.pr_close_condition_group_m SET SCHEMA pms;
ALTER TABLE IF EXISTS public.pr_close_condition_group_item_r_m SET SCHEMA pms;
ALTER TABLE IF EXISTS public.pr_project_deliverable_r_m SET SCHEMA pms;
ALTER TABLE IF EXISTS public.pr_project_close_condition_r_m SET SCHEMA pms;

-- History Tables
ALTER TABLE IF EXISTS public.pr_project_h SET SCHEMA pms;
ALTER TABLE IF EXISTS public.pr_project_status_h SET SCHEMA pms;
ALTER TABLE IF EXISTS public.pr_deliverable_h SET SCHEMA pms;
ALTER TABLE IF EXISTS public.pr_deliverable_group_h SET SCHEMA pms;
ALTER TABLE IF EXISTS public.pr_deliverable_group_item_r_h SET SCHEMA pms;
ALTER TABLE IF EXISTS public.pr_close_condition_group_h SET SCHEMA pms;
ALTER TABLE IF EXISTS public.pr_close_condition_group_item_r_h SET SCHEMA pms;
ALTER TABLE IF EXISTS public.pr_project_deliverable_r_h SET SCHEMA pms;
ALTER TABLE IF EXISTS public.pr_project_close_condition_r_h SET SCHEMA pms;

-- =========================================================
-- Prisma 마이그레이션 테이블도 이동 (선택사항 - public 유지 권장)
-- =========================================================
-- _prisma_migrations 테이블은 public에 유지

-- =========================================================
-- 시퀀스 이동 (테이블과 함께 자동 이동되지만 명시적으로 확인)
-- =========================================================
-- BigSerial ID 컬럼의 시퀀스는 테이블과 함께 이동됨

-- =========================================================
-- 확인 쿼리
-- =========================================================
SELECT 
  schemaname, 
  tablename 
FROM pg_tables 
WHERE schemaname IN ('common', 'pms', 'dms')
ORDER BY schemaname, tablename;
