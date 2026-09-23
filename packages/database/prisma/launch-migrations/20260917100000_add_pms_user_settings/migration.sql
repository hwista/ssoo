CREATE TABLE "pms"."pr_user_settings_m" (
  "user_settings_id" BIGSERIAL PRIMARY KEY,
  "user_id" BIGINT NOT NULL,
  "show_completed_tasks" BOOLEAN NOT NULL DEFAULT true,
  "default_project_view" VARCHAR(20) NOT NULL DEFAULT 'board',
  "notify_task_assignment" BOOLEAN NOT NULL DEFAULT true,
  "notify_issue_update" BOOLEAN NOT NULL DEFAULT true,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID
);
CREATE TABLE "pms"."pr_user_settings_h" (
  "user_settings_id" BIGINT NOT NULL,
  "user_id" BIGINT NOT NULL,
  "show_completed_tasks" BOOLEAN NOT NULL DEFAULT true,
  "default_project_view" VARCHAR(20) NOT NULL DEFAULT 'board',
  "notify_task_assignment" BOOLEAN NOT NULL DEFAULT true,
  "notify_issue_update" BOOLEAN NOT NULL DEFAULT true,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  "history_seq" BIGINT NOT NULL,
  "event_type" CHAR(1) NOT NULL,
  "event_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "event_by" BIGINT,
  CONSTRAINT "pk_pr_user_settings_h" PRIMARY KEY ("user_settings_id", "history_seq")
);
CREATE UNIQUE INDEX "ux_pr_user_settings_user" ON "pms"."pr_user_settings_m" ("user_id");
ALTER TABLE "pms"."pr_user_settings_m" ADD CONSTRAINT "ck_pr_user_settings_view" CHECK ("default_project_view" IN ('board', 'list', 'timeline'));
