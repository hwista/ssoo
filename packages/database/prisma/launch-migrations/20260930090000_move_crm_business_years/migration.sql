-- Move CRM operating years and their audit history out of shared PMS codes.
BEGIN;
LOCK TABLE pms.cm_code_m, pms.cm_code_h IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pms.cm_code_m WHERE code_group = 'biz_year' AND code_value !~ '^[0-9]{4}$')
 OR EXISTS (SELECT 1 FROM pms.cm_code_h WHERE code_group = 'biz_year' AND code_value !~ '^[0-9]{4}$') THEN
 RAISE EXCEPTION 'CRM business-year migration requires four-digit legacy years; no data was moved'; END IF;
END $$;
CREATE TABLE crm.crm_business_year_m (
 business_year_id BIGSERIAL PRIMARY KEY,
"year" INTEGER NOT NULL, "display_name" TEXT NOT NULL, "sort_order" INTEGER NOT NULL DEFAULT 0,
"description" TEXT, "is_active" BOOLEAN NOT NULL DEFAULT true, "memo" TEXT,
"created_by" BIGINT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_by" BIGINT, "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"last_source" TEXT, "last_activity" TEXT, "transaction_id" UUID);
CREATE UNIQUE INDEX ux_crm_business_year_m_year ON crm.crm_business_year_m(year);
ALTER TABLE crm.crm_business_year_m ADD CONSTRAINT ck_crm_business_year_range CHECK (year BETWEEN 2000 AND 2100);
CREATE TABLE crm.crm_business_year_h (
 business_year_id BIGINT NOT NULL, history_seq BIGINT NOT NULL, event_type CHAR(1) NOT NULL, event_at TIMESTAMP(3) NOT NULL, legacy_snapshot JSONB,
"year" INTEGER NOT NULL, "display_name" TEXT NOT NULL, "sort_order" INTEGER NOT NULL,
"description" TEXT, "is_active" BOOLEAN NOT NULL, "memo" TEXT,
"created_by" BIGINT, "created_at" TIMESTAMP(3) NOT NULL,
"updated_by" BIGINT, "updated_at" TIMESTAMP(3) NOT NULL,
"last_source" TEXT, "last_activity" TEXT, "transaction_id" UUID, CONSTRAINT pk_crm_business_year_h PRIMARY KEY (business_year_id, history_seq));
CREATE INDEX ix_crm_business_year_h_event_at ON crm.crm_business_year_h(event_at);
INSERT INTO crm.crm_business_year_m (business_year_id, year, display_name, sort_order, description, is_active, memo, created_by, created_at, updated_by, updated_at, last_source, last_activity, transaction_id)
SELECT code_id, code_value::integer, display_name_ko, sort_order, description, is_active, memo, created_by, created_at, updated_by, updated_at, last_source, last_activity, transaction_id FROM pms.cm_code_m WHERE code_group = 'biz_year';
-- Capture every legacy master including metadata not exposed by the CRM API,
-- even on an installation whose legacy history trigger was not installed.
INSERT INTO pms.cm_code_h (code_id, history_seq, event_type, event_at, code_group, code_value, parent_code, display_name_ko, display_name_en, description, sort_order, is_active, memo, created_by, created_at, updated_by, updated_at, last_source, last_activity, transaction_id)
SELECT m.code_id, COALESCE((SELECT MAX(h.history_seq) FROM pms.cm_code_h h WHERE h.code_id=m.code_id),0)+1,
 'U', CURRENT_TIMESTAMP, m.code_group, m.code_value, m.parent_code, m.display_name_ko, m.display_name_en, m.description, m.sort_order, m.is_active, m.memo, m.created_by, m.created_at, m.updated_by, m.updated_at, m.last_source, m.last_activity, m.transaction_id
FROM pms.cm_code_m m WHERE m.code_group='biz_year';
-- The old delete trigger can append its final event before the entire history is moved.
DELETE FROM pms.cm_code_m WHERE code_group = 'biz_year';
INSERT INTO crm.crm_business_year_h (business_year_id, history_seq, event_type, event_at, legacy_snapshot, year, display_name, sort_order, description, is_active, memo, created_by, created_at, updated_by, updated_at, last_source, last_activity, transaction_id)
SELECT code_id, history_seq, event_type, event_at, to_jsonb(h), code_value::integer, display_name_ko, sort_order, description, is_active, memo, created_by, created_at, updated_by, updated_at, last_source, last_activity, transaction_id FROM pms.cm_code_h h WHERE code_group = 'biz_year';
DELETE FROM pms.cm_code_h WHERE code_group = 'biz_year';
SELECT setval(pg_get_serial_sequence('crm.crm_business_year_m','business_year_id'),
 GREATEST(COALESCE((SELECT MAX(business_year_id) FROM crm.crm_business_year_m),0), COALESCE((SELECT MAX(business_year_id) FROM crm.crm_business_year_h),0),1),
 EXISTS(SELECT 1 FROM crm.crm_business_year_m) OR EXISTS(SELECT 1 FROM crm.crm_business_year_h));
-- Reject attempts by old clients/seeds to recreate CRM-owned years in generic codes.
ALTER TABLE pms.cm_code_m ADD CONSTRAINT ck_cm_code_no_crm_business_year CHECK (code_group <> 'biz_year');
CREATE OR REPLACE FUNCTION crm.fn_crm_business_year_h_record() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_row crm.crm_business_year_m%ROWTYPE; v_seq BIGINT;
BEGIN
 IF TG_OP = 'DELETE' THEN v_row := OLD; ELSE v_row := NEW; END IF;
 SELECT COALESCE(MAX(history_seq), 0) + 1 INTO v_seq FROM crm.crm_business_year_h WHERE business_year_id = v_row.business_year_id;
 INSERT INTO crm.crm_business_year_h (business_year_id, history_seq, event_type, event_at, year, display_name, sort_order, description, is_active, memo, created_by, created_at, updated_by, updated_at, last_source, last_activity, transaction_id)
 VALUES (v_row.business_year_id, v_seq, CASE TG_OP WHEN 'INSERT' THEN 'C' WHEN 'UPDATE' THEN 'U' ELSE 'D' END, NOW(), v_row.year, v_row.display_name, v_row.sort_order, v_row.description, v_row.is_active, v_row.memo, v_row.created_by, v_row.created_at, v_row.updated_by, v_row.updated_at, v_row.last_source, v_row.last_activity, v_row.transaction_id);
 IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;
DROP TRIGGER IF EXISTS trg_crm_business_year_m_h_record ON crm.crm_business_year_m;
CREATE TRIGGER trg_crm_business_year_m_h_record AFTER INSERT OR UPDATE OR DELETE ON crm.crm_business_year_m
FOR EACH ROW EXECUTE FUNCTION crm.fn_crm_business_year_h_record();

INSERT INTO common.cm_permission_m (permission_code, permission_name, domain_code, permission_axis, description, sort_order, is_active, updated_at)
VALUES ('crm.business-year.read', 'CRM 사업연도 조회', 'crm', 'action', 'CRM 사업연도 목록 조회', 274, true, CURRENT_TIMESTAMP),
       ('crm.business-year.manage', 'CRM 사업연도 관리', 'crm', 'action', 'CRM 사업연도 등록·활성화·비활성화·삭제', 275, true, CURRENT_TIMESTAMP)
ON CONFLICT (permission_code) DO NOTHING;
INSERT INTO common.cm_role_permission_r (role_id, permission_id, is_active, updated_at)
SELECT r.role_id, p.permission_id, true, CURRENT_TIMESTAMP
FROM common.cm_role_m r CROSS JOIN common.cm_permission_m p
WHERE (p.permission_code = 'crm.business-year.read' AND r.role_code IN ('admin','manager','user','viewer'))
   OR (p.permission_code = 'crm.business-year.manage' AND r.role_code = 'admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;
COMMIT;
