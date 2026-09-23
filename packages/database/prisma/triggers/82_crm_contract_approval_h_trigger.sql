-- Immutable request snapshot and decision history for internal CRM approval.
CREATE OR REPLACE FUNCTION "crm"."fn_crm_contract_approval_h_record"() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_row "crm"."crm_contract_approval_m"%ROWTYPE;
  v_event_type CHAR(1);
  v_history_seq BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN v_row := OLD; v_event_type := 'D';
  ELSIF TG_OP = 'INSERT' THEN v_row := NEW; v_event_type := 'C';
  ELSE v_row := NEW; v_event_type := 'U'; END IF;
  SELECT COALESCE(MAX(history_seq), 0) + 1 INTO v_history_seq FROM "crm"."crm_contract_approval_h" WHERE contract_approval_id = v_row.contract_approval_id;
  INSERT INTO "crm"."crm_contract_approval_h" (contract_approval_id, contract_id, request_key, requester_id, requester_name, approver_id, approver_name, document_id, document_title, snapshot_jsonb, version_key, status_code, reason, decided_at, is_active, created_by, created_at, updated_by, updated_at, last_source, last_activity, transaction_id, history_seq, event_type, event_at, event_by)
  VALUES (v_row.contract_approval_id, v_row.contract_id, v_row.request_key, v_row.requester_id, v_row.requester_name, v_row.approver_id, v_row.approver_name, v_row.document_id, v_row.document_title, v_row.snapshot_jsonb, v_row.version_key, v_row.status_code, v_row.reason, v_row.decided_at, v_row.is_active, v_row.created_by, v_row.created_at, v_row.updated_by, v_row.updated_at, v_row.last_source, v_row.last_activity, v_row.transaction_id, v_history_seq, v_event_type, NOW(), v_row.updated_by);
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
DROP TRIGGER IF EXISTS "trg_crm_contract_approval_m_h_record" ON "crm"."crm_contract_approval_m";
CREATE TRIGGER "trg_crm_contract_approval_m_h_record" AFTER INSERT OR UPDATE OR DELETE ON "crm"."crm_contract_approval_m" FOR EACH ROW EXECUTE FUNCTION "crm"."fn_crm_contract_approval_h_record"();
