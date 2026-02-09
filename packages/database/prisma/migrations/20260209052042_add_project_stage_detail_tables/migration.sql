-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "common";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "pms";

-- CreateTable
CREATE TABLE "pms"."cm_code_m" (
    "code_id" BIGSERIAL NOT NULL,
    "code_group" TEXT NOT NULL,
    "code_value" TEXT NOT NULL,
    "parent_code" TEXT,
    "display_name_ko" TEXT NOT NULL,
    "display_name_en" TEXT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_code_m_pkey" PRIMARY KEY ("code_id")
);

-- CreateTable
CREATE TABLE "pms"."cm_code_h" (
    "code_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "code_group" TEXT NOT NULL,
    "code_value" TEXT NOT NULL,
    "parent_code" TEXT,
    "display_name_ko" TEXT NOT NULL,
    "display_name_en" TEXT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_code_h_pkey" PRIMARY KEY ("code_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."cm_menu_m" (
    "menu_id" BIGSERIAL NOT NULL,
    "menu_code" TEXT NOT NULL,
    "menu_name" TEXT NOT NULL,
    "menu_name_en" TEXT,
    "menu_type" TEXT NOT NULL DEFAULT 'menu',
    "parent_menu_id" BIGINT,
    "menu_path" TEXT,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "menu_level" INTEGER NOT NULL DEFAULT 1,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_admin_menu" BOOLEAN NOT NULL DEFAULT false,
    "open_type" TEXT NOT NULL DEFAULT 'tab',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_menu_m_pkey" PRIMARY KEY ("menu_id")
);

-- CreateTable
CREATE TABLE "pms"."cm_menu_h" (
    "menu_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "menu_code" TEXT NOT NULL,
    "menu_name" TEXT NOT NULL,
    "menu_name_en" TEXT,
    "menu_type" TEXT NOT NULL,
    "parent_menu_id" BIGINT,
    "menu_path" TEXT,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL,
    "menu_level" INTEGER NOT NULL,
    "is_visible" BOOLEAN NOT NULL,
    "is_enabled" BOOLEAN NOT NULL,
    "is_admin_menu" BOOLEAN NOT NULL DEFAULT false,
    "open_type" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_menu_h_pkey" PRIMARY KEY ("menu_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."cm_role_menu_r" (
    "role_menu_id" BIGSERIAL NOT NULL,
    "role_code" TEXT NOT NULL,
    "menu_id" BIGINT NOT NULL,
    "access_type" TEXT NOT NULL DEFAULT 'full',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_role_menu_r_pkey" PRIMARY KEY ("role_menu_id")
);

-- CreateTable
CREATE TABLE "pms"."cm_role_menu_h" (
    "role_menu_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "role_code" TEXT NOT NULL,
    "menu_id" BIGINT NOT NULL,
    "access_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_role_menu_h_pkey" PRIMARY KEY ("role_menu_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."cm_user_menu_r" (
    "user_menu_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "menu_id" BIGINT NOT NULL,
    "access_type" TEXT NOT NULL DEFAULT 'full',
    "override_type" TEXT NOT NULL DEFAULT 'grant',
    "expires_at" TIMESTAMP(3),
    "granted_by" BIGINT,
    "granted_at" TIMESTAMP(3),
    "grant_reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_menu_r_pkey" PRIMARY KEY ("user_menu_id")
);

-- CreateTable
CREATE TABLE "pms"."cm_user_menu_h" (
    "user_menu_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "menu_id" BIGINT NOT NULL,
    "access_type" TEXT NOT NULL,
    "override_type" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "granted_by" BIGINT,
    "granted_at" TIMESTAMP(3),
    "grant_reason" TEXT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_menu_h_pkey" PRIMARY KEY ("user_menu_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."cm_user_favorite_r" (
    "user_favorite_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "menu_id" BIGINT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cm_user_favorite_r_pkey" PRIMARY KEY ("user_favorite_id")
);

-- CreateTable
CREATE TABLE "common"."cm_user_m" (
    "user_id" BIGSERIAL NOT NULL,
    "is_system_user" BOOLEAN NOT NULL DEFAULT false,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "user_type_code" TEXT NOT NULL DEFAULT 'internal',
    "login_id" TEXT,
    "password_hash" TEXT,
    "password_salt" TEXT,
    "user_name" TEXT NOT NULL,
    "display_name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "department_code" TEXT,
    "position_code" TEXT,
    "employee_number" TEXT,
    "company_name" TEXT,
    "customer_id" BIGINT,
    "role_code" TEXT NOT NULL DEFAULT 'viewer',
    "permission_codes" TEXT[],
    "user_status_code" TEXT NOT NULL DEFAULT 'registered',
    "last_login_at" TIMESTAMP(3),
    "login_fail_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "invited_at" TIMESTAMP(3),
    "invited_by" BIGINT,
    "invitation_token_hash" TEXT,
    "invitation_expires_at" TIMESTAMP(3),
    "refresh_token_hash" TEXT,
    "refresh_token_expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_m_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_m" (
    "project_id" BIGSERIAL NOT NULL,
    "project_name" TEXT NOT NULL,
    "status_code" TEXT NOT NULL,
    "stage_code" TEXT NOT NULL,
    "done_result_code" TEXT,
    "current_owner_user_id" BIGINT,
    "handoff_type_code" TEXT,
    "handoff_status_code" TEXT,
    "handoff_requested_at" TIMESTAMP(3),
    "handoff_confirmed_at" TIMESTAMP(3),
    "handoff_confirmed_by" BIGINT,
    "customer_id" BIGINT,
    "plant_id" BIGINT,
    "system_instance_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_m_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_status_m" (
    "project_id" BIGINT NOT NULL,
    "status_code" TEXT NOT NULL,
    "status_goal" TEXT NOT NULL,
    "status_owner_user_id" BIGINT,
    "expected_start_at" DATE,
    "expected_end_at" DATE,
    "actual_start_at" DATE,
    "actual_end_at" DATE,
    "close_condition_group_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_status_m_pkey" PRIMARY KEY ("project_id","status_code")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_request_d" (
    "project_id" BIGINT NOT NULL,
    "request_source_code" TEXT,
    "request_channel_code" TEXT,
    "request_summary" TEXT,
    "request_received_at" DATE,
    "request_priority_code" TEXT,
    "request_owner_user_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_request_d_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_proposal_d" (
    "project_id" BIGINT NOT NULL,
    "proposal_owner_user_id" BIGINT,
    "proposal_due_at" DATE,
    "proposal_submitted_at" DATE,
    "proposal_version" INTEGER,
    "estimate_amount" BIGINT,
    "estimate_unit_code" TEXT,
    "proposal_scope_summary" TEXT,
    "decision_deadline_at" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_proposal_d_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_execution_d" (
    "project_id" BIGINT NOT NULL,
    "contract_signed_at" DATE,
    "contract_amount" BIGINT,
    "contract_unit_code" TEXT,
    "billing_type_code" TEXT,
    "delivery_method_code" TEXT,
    "next_project_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_execution_d_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_transition_d" (
    "project_id" BIGINT NOT NULL,
    "operation_owner_user_id" BIGINT,
    "operation_reserved_at" DATE,
    "operation_start_at" DATE,
    "transition_due_at" DATE,
    "transition_summary" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_transition_d_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_deliverable_m" (
    "deliverable_id" BIGSERIAL NOT NULL,
    "deliverable_code" TEXT NOT NULL,
    "deliverable_name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_deliverable_m_pkey" PRIMARY KEY ("deliverable_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_deliverable_group_m" (
    "deliverable_group_id" BIGSERIAL NOT NULL,
    "group_code" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_deliverable_group_m_pkey" PRIMARY KEY ("deliverable_group_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_deliverable_group_item_r_m" (
    "group_code" TEXT NOT NULL,
    "deliverable_code" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_deliverable_group_item_r_m_pkey" PRIMARY KEY ("group_code","deliverable_code")
);

-- CreateTable
CREATE TABLE "pms"."pr_close_condition_group_m" (
    "close_condition_group_id" BIGSERIAL NOT NULL,
    "group_code" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_close_condition_group_m_pkey" PRIMARY KEY ("close_condition_group_id")
);

-- CreateTable
CREATE TABLE "pms"."pr_close_condition_group_item_r_m" (
    "group_code" TEXT NOT NULL,
    "condition_code" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_close_condition_group_item_r_m_pkey" PRIMARY KEY ("group_code","condition_code")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_deliverable_r_m" (
    "project_id" BIGINT NOT NULL,
    "status_code" TEXT NOT NULL,
    "deliverable_code" TEXT NOT NULL,
    "submission_status_code" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "submitted_by" BIGINT,
    "storage_object_key" TEXT,
    "original_file_name" TEXT,
    "mime_type" VARCHAR(100),
    "file_size_bytes" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_deliverable_r_m_pkey" PRIMARY KEY ("project_id","status_code","deliverable_code")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_close_condition_r_m" (
    "project_id" BIGINT NOT NULL,
    "status_code" TEXT NOT NULL,
    "condition_code" TEXT NOT NULL,
    "requires_deliverable" BOOLEAN NOT NULL DEFAULT false,
    "is_checked" BOOLEAN NOT NULL DEFAULT false,
    "checked_at" TIMESTAMP(3),
    "checked_by" BIGINT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_close_condition_r_m_pkey" PRIMARY KEY ("project_id","status_code","condition_code")
);

-- CreateTable
CREATE TABLE "common"."cm_user_h" (
    "user_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "is_system_user" BOOLEAN NOT NULL,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "user_type_code" TEXT NOT NULL,
    "login_id" TEXT,
    "password_hash" TEXT,
    "password_salt" TEXT,
    "user_name" TEXT NOT NULL,
    "display_name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "department_code" TEXT,
    "position_code" TEXT,
    "employee_number" TEXT,
    "company_name" TEXT,
    "customer_id" BIGINT,
    "role_code" TEXT NOT NULL,
    "permission_codes" TEXT[],
    "user_status_code" TEXT NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "login_fail_count" INTEGER NOT NULL,
    "locked_until" TIMESTAMP(3),
    "invited_at" TIMESTAMP(3),
    "invited_by" BIGINT,
    "invitation_token_hash" TEXT,
    "invitation_expires_at" TIMESTAMP(3),
    "refresh_token_hash" TEXT,
    "refresh_token_expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_user_h_pkey" PRIMARY KEY ("user_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_h" (
    "project_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "project_name" TEXT NOT NULL,
    "status_code" TEXT NOT NULL,
    "stage_code" TEXT NOT NULL,
    "done_result_code" TEXT,
    "current_owner_user_id" BIGINT,
    "handoff_type_code" TEXT,
    "handoff_status_code" TEXT,
    "handoff_requested_at" TIMESTAMP(3),
    "handoff_confirmed_at" TIMESTAMP(3),
    "handoff_confirmed_by" BIGINT,
    "customer_id" BIGINT,
    "plant_id" BIGINT,
    "system_instance_id" BIGINT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_h_pkey" PRIMARY KEY ("project_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_status_h" (
    "project_id" BIGINT NOT NULL,
    "status_code" TEXT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "status_goal" TEXT NOT NULL,
    "status_owner_user_id" BIGINT,
    "expected_start_at" DATE,
    "expected_end_at" DATE,
    "actual_start_at" DATE,
    "actual_end_at" DATE,
    "close_condition_group_code" TEXT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_status_h_pkey" PRIMARY KEY ("project_id","status_code","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_request_d_h" (
    "project_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "request_source_code" TEXT,
    "request_channel_code" TEXT,
    "request_summary" TEXT,
    "request_received_at" DATE,
    "request_priority_code" TEXT,
    "request_owner_user_id" BIGINT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_request_d_h_pkey" PRIMARY KEY ("project_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_proposal_d_h" (
    "project_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "proposal_owner_user_id" BIGINT,
    "proposal_due_at" DATE,
    "proposal_submitted_at" DATE,
    "proposal_version" INTEGER,
    "estimate_amount" BIGINT,
    "estimate_unit_code" TEXT,
    "proposal_scope_summary" TEXT,
    "decision_deadline_at" DATE,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_proposal_d_h_pkey" PRIMARY KEY ("project_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_execution_d_h" (
    "project_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "contract_signed_at" DATE,
    "contract_amount" BIGINT,
    "contract_unit_code" TEXT,
    "billing_type_code" TEXT,
    "delivery_method_code" TEXT,
    "next_project_id" BIGINT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_execution_d_h_pkey" PRIMARY KEY ("project_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_transition_d_h" (
    "project_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "operation_owner_user_id" BIGINT,
    "operation_reserved_at" DATE,
    "operation_start_at" DATE,
    "transition_due_at" DATE,
    "transition_summary" TEXT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_transition_d_h_pkey" PRIMARY KEY ("project_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_deliverable_h" (
    "deliverable_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "deliverable_code" TEXT NOT NULL,
    "deliverable_name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_deliverable_h_pkey" PRIMARY KEY ("deliverable_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_deliverable_group_h" (
    "deliverable_group_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "group_code" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_deliverable_group_h_pkey" PRIMARY KEY ("deliverable_group_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_deliverable_group_item_r_h" (
    "group_code" TEXT NOT NULL,
    "deliverable_code" TEXT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_deliverable_group_item_r_h_pkey" PRIMARY KEY ("group_code","deliverable_code","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_close_condition_group_h" (
    "close_condition_group_id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "group_code" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_close_condition_group_h_pkey" PRIMARY KEY ("close_condition_group_id","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_close_condition_group_item_r_h" (
    "group_code" TEXT NOT NULL,
    "condition_code" TEXT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_close_condition_group_item_r_h_pkey" PRIMARY KEY ("group_code","condition_code","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_deliverable_r_h" (
    "project_id" BIGINT NOT NULL,
    "status_code" TEXT NOT NULL,
    "deliverable_code" TEXT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "submission_status_code" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "submitted_by" BIGINT,
    "storage_object_key" TEXT,
    "original_file_name" TEXT,
    "mime_type" VARCHAR(100),
    "file_size_bytes" BIGINT,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_deliverable_r_h_pkey" PRIMARY KEY ("project_id","status_code","deliverable_code","history_seq")
);

-- CreateTable
CREATE TABLE "pms"."pr_project_close_condition_r_h" (
    "project_id" BIGINT NOT NULL,
    "status_code" TEXT NOT NULL,
    "condition_code" TEXT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL,
    "requires_deliverable" BOOLEAN NOT NULL,
    "is_checked" BOOLEAN NOT NULL,
    "checked_at" TIMESTAMP(3),
    "checked_by" BIGINT,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pr_project_close_condition_r_h_pkey" PRIMARY KEY ("project_id","status_code","condition_code","history_seq")
);

-- CreateIndex
CREATE INDEX "ix_cm_code_m_group" ON "pms"."cm_code_m"("code_group");

-- CreateIndex
CREATE INDEX "ix_cm_code_m_active" ON "pms"."cm_code_m"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "cm_code_m_code_group_code_value_key" ON "pms"."cm_code_m"("code_group", "code_value");

-- CreateIndex
CREATE INDEX "ix_cm_code_h_event_at" ON "pms"."cm_code_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_code_h_tx" ON "pms"."cm_code_h"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "cm_menu_m_menu_code_key" ON "pms"."cm_menu_m"("menu_code");

-- CreateIndex
CREATE INDEX "ix_cm_menu_m_parent" ON "pms"."cm_menu_m"("parent_menu_id");

-- CreateIndex
CREATE INDEX "ix_cm_menu_m_level_order" ON "pms"."cm_menu_m"("menu_level", "sort_order");

-- CreateIndex
CREATE INDEX "ix_cm_menu_m_active" ON "pms"."cm_menu_m"("is_active");

-- CreateIndex
CREATE INDEX "ix_cm_menu_h_event_at" ON "pms"."cm_menu_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_menu_h_tx" ON "pms"."cm_menu_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_role_menu_r_menu" ON "pms"."cm_role_menu_r"("menu_id");

-- CreateIndex
CREATE INDEX "ix_cm_role_menu_r_role" ON "pms"."cm_role_menu_r"("role_code");

-- CreateIndex
CREATE UNIQUE INDEX "cm_role_menu_r_role_code_menu_id_key" ON "pms"."cm_role_menu_r"("role_code", "menu_id");

-- CreateIndex
CREATE INDEX "ix_cm_role_menu_h_event_at" ON "pms"."cm_role_menu_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_role_menu_h_tx" ON "pms"."cm_role_menu_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_menu_r_user" ON "pms"."cm_user_menu_r"("user_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_menu_r_expires" ON "pms"."cm_user_menu_r"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "cm_user_menu_r_user_id_menu_id_key" ON "pms"."cm_user_menu_r"("user_id", "menu_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_menu_h_event_at" ON "pms"."cm_user_menu_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_user_menu_h_tx" ON "pms"."cm_user_menu_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_cm_user_favorite_r_user" ON "pms"."cm_user_favorite_r"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cm_user_favorite_r_user_id_menu_id_key" ON "pms"."cm_user_favorite_r"("user_id", "menu_id");

-- CreateIndex
CREATE UNIQUE INDEX "cm_user_m_login_id_key" ON "common"."cm_user_m"("login_id");

-- CreateIndex
CREATE UNIQUE INDEX "cm_user_m_email_key" ON "common"."cm_user_m"("email");

-- CreateIndex
CREATE INDEX "ix_pr_project_m_status_stage" ON "pms"."pr_project_m"("status_code", "stage_code");

-- CreateIndex
CREATE INDEX "ix_pr_project_m_owner" ON "pms"."pr_project_m"("current_owner_user_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_m_customer" ON "pms"."pr_project_m"("customer_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_m_system_instance" ON "pms"."pr_project_m"("system_instance_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_m_handoff" ON "pms"."pr_project_m"("handoff_status_code");

-- CreateIndex
CREATE INDEX "ix_pr_project_m_updated_at" ON "pms"."pr_project_m"("updated_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_status_m_owner" ON "pms"."pr_project_status_m"("status_owner_user_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_status_m_dates" ON "pms"."pr_project_status_m"("expected_start_at", "expected_end_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_status_m_updated_at" ON "pms"."pr_project_status_m"("updated_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_request_d_owner" ON "pms"."pr_project_request_d"("request_owner_user_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_proposal_d_owner" ON "pms"."pr_project_proposal_d"("proposal_owner_user_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_proposal_d_due" ON "pms"."pr_project_proposal_d"("proposal_due_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_execution_d_next_project" ON "pms"."pr_project_execution_d"("next_project_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_transition_d_owner" ON "pms"."pr_project_transition_d"("operation_owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pr_deliverable_m_deliverable_code_key" ON "pms"."pr_deliverable_m"("deliverable_code");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_m_active" ON "pms"."pr_deliverable_m"("is_active");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_m_sort" ON "pms"."pr_deliverable_m"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "pr_deliverable_group_m_group_code_key" ON "pms"."pr_deliverable_group_m"("group_code");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_group_m_active" ON "pms"."pr_deliverable_group_m"("is_active");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_group_m_sort" ON "pms"."pr_deliverable_group_m"("sort_order");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_group_item_r_m_active" ON "pms"."pr_deliverable_group_item_r_m"("is_active");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_group_item_r_m_deliverable" ON "pms"."pr_deliverable_group_item_r_m"("deliverable_code");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_group_item_r_m_sort" ON "pms"."pr_deliverable_group_item_r_m"("group_code", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "pr_close_condition_group_m_group_code_key" ON "pms"."pr_close_condition_group_m"("group_code");

-- CreateIndex
CREATE INDEX "ix_pr_close_condition_group_m_active" ON "pms"."pr_close_condition_group_m"("is_active");

-- CreateIndex
CREATE INDEX "ix_pr_close_condition_group_m_sort" ON "pms"."pr_close_condition_group_m"("sort_order");

-- CreateIndex
CREATE INDEX "ix_pr_close_condition_group_item_r_m_active" ON "pms"."pr_close_condition_group_item_r_m"("is_active");

-- CreateIndex
CREATE INDEX "ix_pr_close_condition_group_item_r_m_condition" ON "pms"."pr_close_condition_group_item_r_m"("condition_code");

-- CreateIndex
CREATE INDEX "ix_pr_close_condition_group_item_r_m_sort" ON "pms"."pr_close_condition_group_item_r_m"("group_code", "sort_order");

-- CreateIndex
CREATE INDEX "ix_pr_project_deliverable_r_m_status" ON "pms"."pr_project_deliverable_r_m"("project_id", "status_code", "submission_status_code");

-- CreateIndex
CREATE INDEX "ix_pr_project_deliverable_r_m_deliverable" ON "pms"."pr_project_deliverable_r_m"("deliverable_code");

-- CreateIndex
CREATE INDEX "ix_pr_project_deliverable_r_m_updated_at" ON "pms"."pr_project_deliverable_r_m"("updated_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_close_condition_r_m_checked" ON "pms"."pr_project_close_condition_r_m"("project_id", "status_code", "is_checked");

-- CreateIndex
CREATE INDEX "ix_pr_project_close_condition_r_m_condition" ON "pms"."pr_project_close_condition_r_m"("condition_code");

-- CreateIndex
CREATE INDEX "ix_pr_project_close_condition_r_m_updated_at" ON "pms"."pr_project_close_condition_r_m"("updated_at");

-- CreateIndex
CREATE INDEX "ix_cm_user_h_event_at" ON "common"."cm_user_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_cm_user_h_tx" ON "common"."cm_user_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_h_event_at" ON "pms"."pr_project_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_h_tx" ON "pms"."pr_project_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_status_h_event_at" ON "pms"."pr_project_status_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_status_h_tx" ON "pms"."pr_project_status_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_request_d_h_event_at" ON "pms"."pr_project_request_d_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_request_d_h_tx" ON "pms"."pr_project_request_d_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_proposal_d_h_event_at" ON "pms"."pr_project_proposal_d_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_proposal_d_h_tx" ON "pms"."pr_project_proposal_d_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_execution_d_h_event_at" ON "pms"."pr_project_execution_d_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_execution_d_h_tx" ON "pms"."pr_project_execution_d_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_transition_d_h_event_at" ON "pms"."pr_project_transition_d_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_transition_d_h_tx" ON "pms"."pr_project_transition_d_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_h_event_at" ON "pms"."pr_deliverable_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_h_tx" ON "pms"."pr_deliverable_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_group_h_event_at" ON "pms"."pr_deliverable_group_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_group_h_tx" ON "pms"."pr_deliverable_group_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_group_item_r_h_event_at" ON "pms"."pr_deliverable_group_item_r_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_deliverable_group_item_r_h_tx" ON "pms"."pr_deliverable_group_item_r_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_close_condition_group_h_event_at" ON "pms"."pr_close_condition_group_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_close_condition_group_h_tx" ON "pms"."pr_close_condition_group_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_close_condition_group_item_r_h_event_at" ON "pms"."pr_close_condition_group_item_r_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_close_condition_group_item_r_h_tx" ON "pms"."pr_close_condition_group_item_r_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_deliverable_r_h_event_at" ON "pms"."pr_project_deliverable_r_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_deliverable_r_h_tx" ON "pms"."pr_project_deliverable_r_h"("transaction_id");

-- CreateIndex
CREATE INDEX "ix_pr_project_close_condition_r_h_event_at" ON "pms"."pr_project_close_condition_r_h"("event_at");

-- CreateIndex
CREATE INDEX "ix_pr_project_close_condition_r_h_tx" ON "pms"."pr_project_close_condition_r_h"("transaction_id");

-- AddForeignKey
ALTER TABLE "pms"."cm_menu_m" ADD CONSTRAINT "cm_menu_m_parent_menu_id_fkey" FOREIGN KEY ("parent_menu_id") REFERENCES "pms"."cm_menu_m"("menu_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."cm_role_menu_r" ADD CONSTRAINT "cm_role_menu_r_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "pms"."cm_menu_m"("menu_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."cm_user_menu_r" ADD CONSTRAINT "cm_user_menu_r_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."cm_user_menu_r" ADD CONSTRAINT "cm_user_menu_r_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "pms"."cm_menu_m"("menu_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."cm_user_favorite_r" ADD CONSTRAINT "cm_user_favorite_r_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."cm_user_favorite_r" ADD CONSTRAINT "cm_user_favorite_r_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "pms"."cm_menu_m"("menu_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_user_m" ADD CONSTRAINT "cm_user_m_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "common"."cm_user_m"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_m" ADD CONSTRAINT "pr_project_m_current_owner_user_id_fkey" FOREIGN KEY ("current_owner_user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_status_m" ADD CONSTRAINT "pr_project_status_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_request_d" ADD CONSTRAINT "pr_project_request_d_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_proposal_d" ADD CONSTRAINT "pr_project_proposal_d_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_execution_d" ADD CONSTRAINT "pr_project_execution_d_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_transition_d" ADD CONSTRAINT "pr_project_transition_d_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_deliverable_group_item_r_m" ADD CONSTRAINT "pr_deliverable_group_item_r_m_group_code_fkey" FOREIGN KEY ("group_code") REFERENCES "pms"."pr_deliverable_group_m"("group_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_deliverable_group_item_r_m" ADD CONSTRAINT "pr_deliverable_group_item_r_m_deliverable_code_fkey" FOREIGN KEY ("deliverable_code") REFERENCES "pms"."pr_deliverable_m"("deliverable_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_close_condition_group_item_r_m" ADD CONSTRAINT "pr_close_condition_group_item_r_m_group_code_fkey" FOREIGN KEY ("group_code") REFERENCES "pms"."pr_close_condition_group_m"("group_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_deliverable_r_m" ADD CONSTRAINT "pr_project_deliverable_r_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_deliverable_r_m" ADD CONSTRAINT "pr_project_deliverable_r_m_deliverable_code_fkey" FOREIGN KEY ("deliverable_code") REFERENCES "pms"."pr_deliverable_m"("deliverable_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms"."pr_project_close_condition_r_m" ADD CONSTRAINT "pr_project_close_condition_r_m_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pms"."pr_project_m"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;
