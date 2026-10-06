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
