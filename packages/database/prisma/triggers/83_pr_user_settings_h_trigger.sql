CREATE OR REPLACE FUNCTION "pms"."fn_pr_user_settings_h_record"() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_row "pms"."pr_user_settings_m"%ROWTYPE; v_event_type CHAR(1); v_history_seq BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN v_row := OLD; v_event_type := 'D';
  ELSIF TG_OP = 'INSERT' THEN v_row := NEW; v_event_type := 'C';
  ELSE v_row := NEW; v_event_type := 'U'; END IF;
  SELECT COALESCE(MAX(history_seq), 0) + 1 INTO v_history_seq FROM "pms"."pr_user_settings_h" WHERE user_settings_id = v_row.user_settings_id;
  INSERT INTO "pms"."pr_user_settings_h" (user_settings_id, user_id, show_completed_tasks, default_project_view, notify_task_assignment, notify_issue_update, is_active, memo, created_by, created_at, updated_by, updated_at, last_source, last_activity, transaction_id, history_seq, event_type, event_at, event_by)
  VALUES (v_row.user_settings_id, v_row.user_id, v_row.show_completed_tasks, v_row.default_project_view, v_row.notify_task_assignment, v_row.notify_issue_update, v_row.is_active, v_row.memo, v_row.created_by, v_row.created_at, v_row.updated_by, v_row.updated_at, v_row.last_source, v_row.last_activity, v_row.transaction_id, v_history_seq, v_event_type, NOW(), v_row.updated_by);
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
DROP TRIGGER IF EXISTS "trg_pr_user_settings_m_h_record" ON "pms"."pr_user_settings_m";
CREATE TRIGGER "trg_pr_user_settings_m_h_record" AFTER INSERT OR UPDATE OR DELETE ON "pms"."pr_user_settings_m" FOR EACH ROW EXECUTE FUNCTION "pms"."fn_pr_user_settings_h_record"();
