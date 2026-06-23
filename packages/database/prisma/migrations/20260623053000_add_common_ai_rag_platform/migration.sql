-- Common AI/RAG platform data plane.
-- Domain tables stay in their own schemas; common.cm_ai_* stores normalized AI projections.

CREATE SCHEMA IF NOT EXISTS "common";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "common"."cm_ai_source_m" (
  "ai_source_id" BIGSERIAL PRIMARY KEY,
  "source_app_code" VARCHAR(30) NOT NULL,
  "source_name" VARCHAR(160) NOT NULL,
  "source_kind_code" VARCHAR(40) NOT NULL DEFAULT 'domain',
  "adapter_code" VARCHAR(120),
  "embedding_profile_code" VARCHAR(120),
  "source_status_code" VARCHAR(40) NOT NULL DEFAULT 'active',
  "indexing_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "keyword_search_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "metadata_search_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "semantic_search_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "vector_search_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "rag_context_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "metadata_jsonb" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_cm_ai_source_m_source_app"
  ON "common"."cm_ai_source_m" ("source_app_code");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_source_m_status_active"
  ON "common"."cm_ai_source_m" ("source_status_code", "is_active");

CREATE TABLE IF NOT EXISTS "common"."cm_ai_source_h" (
  "ai_source_id" BIGINT NOT NULL,
  "history_seq" BIGINT NOT NULL,
  "event_type" CHAR(1) NOT NULL,
  "event_at" TIMESTAMPTZ(6) NOT NULL,
  "source_app_code" VARCHAR(30) NOT NULL,
  "source_name" VARCHAR(160) NOT NULL,
  "source_kind_code" VARCHAR(40) NOT NULL,
  "adapter_code" VARCHAR(120),
  "embedding_profile_code" VARCHAR(120),
  "source_status_code" VARCHAR(40) NOT NULL,
  "indexing_enabled" BOOLEAN NOT NULL,
  "keyword_search_enabled" BOOLEAN NOT NULL,
  "metadata_search_enabled" BOOLEAN NOT NULL,
  "semantic_search_enabled" BOOLEAN NOT NULL,
  "vector_search_enabled" BOOLEAN NOT NULL,
  "rag_context_enabled" BOOLEAN NOT NULL,
  "metadata_jsonb" JSONB,
  "is_active" BOOLEAN NOT NULL,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "pk_cm_ai_source_h" PRIMARY KEY ("ai_source_id", "history_seq")
);

CREATE INDEX IF NOT EXISTS "ix_cm_ai_source_h_event_at"
  ON "common"."cm_ai_source_h" ("event_at");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_source_h_tx"
  ON "common"."cm_ai_source_h" ("transaction_id");

CREATE TABLE IF NOT EXISTS "common"."cm_ai_object_m" (
  "ai_object_id" BIGSERIAL PRIMARY KEY,
  "ai_source_id" BIGINT NOT NULL,
  "source_app_code" VARCHAR(30) NOT NULL,
  "entity_type_code" VARCHAR(80) NOT NULL,
  "entity_id" VARCHAR(200) NOT NULL,
  "source_version" VARCHAR(160),
  "title" VARCHAR(500) NOT NULL,
  "body_text" TEXT,
  "summary_text" TEXT,
  "target_path" VARCHAR(1000),
  "target_external_href" VARCHAR(1000),
  "sensitivity_code" VARCHAR(40) NOT NULL DEFAULT 'internal',
  "acl_policy_code" VARCHAR(40) NOT NULL DEFAULT 'acl',
  "search_eligible" BOOLEAN NOT NULL DEFAULT TRUE,
  "context_eligible" BOOLEAN NOT NULL DEFAULT FALSE,
  "content_hash" VARCHAR(128),
  "indexed_at" TIMESTAMPTZ(6),
  "metadata_jsonb" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "fk_cm_ai_object_m_source"
    FOREIGN KEY ("ai_source_id")
    REFERENCES "common"."cm_ai_source_m" ("ai_source_id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_cm_ai_object_m_entity"
  ON "common"."cm_ai_object_m" ("source_app_code", "entity_type_code", "entity_id");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_object_m_source_updated"
  ON "common"."cm_ai_object_m" ("ai_source_id", "updated_at");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_object_m_app_entity_type"
  ON "common"."cm_ai_object_m" ("source_app_code", "entity_type_code");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_object_m_sensitivity_context"
  ON "common"."cm_ai_object_m" ("sensitivity_code", "context_eligible");

CREATE TABLE IF NOT EXISTS "common"."cm_ai_object_h" (
  "ai_object_id" BIGINT NOT NULL,
  "history_seq" BIGINT NOT NULL,
  "event_type" CHAR(1) NOT NULL,
  "event_at" TIMESTAMPTZ(6) NOT NULL,
  "ai_source_id" BIGINT NOT NULL,
  "source_app_code" VARCHAR(30) NOT NULL,
  "entity_type_code" VARCHAR(80) NOT NULL,
  "entity_id" VARCHAR(200) NOT NULL,
  "source_version" VARCHAR(160),
  "title" VARCHAR(500) NOT NULL,
  "body_text" TEXT,
  "summary_text" TEXT,
  "target_path" VARCHAR(1000),
  "target_external_href" VARCHAR(1000),
  "sensitivity_code" VARCHAR(40) NOT NULL,
  "acl_policy_code" VARCHAR(40) NOT NULL,
  "search_eligible" BOOLEAN NOT NULL,
  "context_eligible" BOOLEAN NOT NULL,
  "content_hash" VARCHAR(128),
  "indexed_at" TIMESTAMPTZ(6),
  "metadata_jsonb" JSONB,
  "is_active" BOOLEAN NOT NULL,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "pk_cm_ai_object_h" PRIMARY KEY ("ai_object_id", "history_seq")
);

CREATE INDEX IF NOT EXISTS "ix_cm_ai_object_h_event_at"
  ON "common"."cm_ai_object_h" ("event_at");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_object_h_tx"
  ON "common"."cm_ai_object_h" ("transaction_id");

CREATE TABLE IF NOT EXISTS "common"."cm_ai_chunk_m" (
  "ai_chunk_id" BIGSERIAL PRIMARY KEY,
  "ai_object_id" BIGINT NOT NULL,
  "chunk_seq" INTEGER NOT NULL,
  "chunk_key" VARCHAR(160) NOT NULL,
  "chunk_text" TEXT NOT NULL,
  "token_count" INTEGER,
  "char_start" INTEGER,
  "char_end" INTEGER,
  "citation_label" VARCHAR(120),
  "content_hash" VARCHAR(128),
  "metadata_jsonb" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "fk_cm_ai_chunk_m_object"
    FOREIGN KEY ("ai_object_id")
    REFERENCES "common"."cm_ai_object_m" ("ai_object_id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_cm_ai_chunk_m_object_seq"
  ON "common"."cm_ai_chunk_m" ("ai_object_id", "chunk_seq");
CREATE UNIQUE INDEX IF NOT EXISTS "ux_cm_ai_chunk_m_object_key"
  ON "common"."cm_ai_chunk_m" ("ai_object_id", "chunk_key");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_chunk_m_object_active"
  ON "common"."cm_ai_chunk_m" ("ai_object_id", "is_active");

CREATE TABLE IF NOT EXISTS "common"."cm_ai_embedding_m" (
  "ai_embedding_id" BIGSERIAL PRIMARY KEY,
  "ai_chunk_id" BIGINT NOT NULL,
  "profile_code" VARCHAR(120) NOT NULL DEFAULT 'default',
  "provider_code" VARCHAR(80),
  "model_name" VARCHAR(160),
  "deployment_name" VARCHAR(160),
  "embedding_dimension" INTEGER NOT NULL,
  "embedding" vector(1536),
  "embedding_hash" VARCHAR(128),
  "metadata_jsonb" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "fk_cm_ai_embedding_m_chunk"
    FOREIGN KEY ("ai_chunk_id")
    REFERENCES "common"."cm_ai_chunk_m" ("ai_chunk_id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_cm_ai_embedding_m_chunk_profile"
  ON "common"."cm_ai_embedding_m" ("ai_chunk_id", "profile_code");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_embedding_m_profile_model"
  ON "common"."cm_ai_embedding_m" ("profile_code", "provider_code", "model_name");

DO $$
BEGIN
  BEGIN
    CREATE INDEX IF NOT EXISTS "ix_cm_ai_embedding_m_vector"
      ON "common"."cm_ai_embedding_m"
      USING ivfflat ("embedding" vector_cosine_ops)
      WITH (lists = 100);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping cm_ai_embedding_m vector index: %', SQLERRM;
  END;
END $$;

CREATE TABLE IF NOT EXISTS "common"."cm_ai_acl_snapshot_m" (
  "ai_acl_snapshot_id" BIGSERIAL PRIMARY KEY,
  "ai_object_id" BIGINT NOT NULL,
  "access_scope_code" VARCHAR(40) NOT NULL DEFAULT 'acl',
  "policy_hash" VARCHAR(128),
  "sensitivity_code" VARCHAR(40) NOT NULL DEFAULT 'internal',
  "search_eligible" BOOLEAN NOT NULL DEFAULT TRUE,
  "context_eligible" BOOLEAN NOT NULL DEFAULT FALSE,
  "acl_snapshot_jsonb" JSONB NOT NULL,
  "metadata_jsonb" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "fk_cm_ai_acl_snapshot_m_object"
    FOREIGN KEY ("ai_object_id")
    REFERENCES "common"."cm_ai_object_m" ("ai_object_id")
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ix_cm_ai_acl_snapshot_m_object_active"
  ON "common"."cm_ai_acl_snapshot_m" ("ai_object_id", "is_active");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_acl_snapshot_m_scope"
  ON "common"."cm_ai_acl_snapshot_m" ("access_scope_code", "sensitivity_code");

CREATE TABLE IF NOT EXISTS "common"."cm_ai_index_job_m" (
  "ai_index_job_id" BIGSERIAL PRIMARY KEY,
  "ai_source_id" BIGINT,
  "ai_object_id" BIGINT,
  "source_app_code" VARCHAR(30) NOT NULL,
  "entity_type_code" VARCHAR(80) NOT NULL,
  "entity_id" VARCHAR(200) NOT NULL,
  "job_type_code" VARCHAR(40) NOT NULL DEFAULT 'upsert',
  "job_status_code" VARCHAR(40) NOT NULL DEFAULT 'pending',
  "priority_no" INTEGER NOT NULL DEFAULT 100,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "source_version" VARCHAR(160),
  "requested_by" BIGINT,
  "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "started_at" TIMESTAMPTZ(6),
  "finished_at" TIMESTAMPTZ(6),
  "next_retry_at" TIMESTAMPTZ(6),
  "last_error_message" VARCHAR(1000),
  "payload_jsonb" JSONB,
  "metadata_jsonb" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "fk_cm_ai_index_job_m_source"
    FOREIGN KEY ("ai_source_id")
    REFERENCES "common"."cm_ai_source_m" ("ai_source_id")
    ON DELETE SET NULL,
  CONSTRAINT "fk_cm_ai_index_job_m_object"
    FOREIGN KEY ("ai_object_id")
    REFERENCES "common"."cm_ai_object_m" ("ai_object_id")
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ix_cm_ai_index_job_m_status_priority"
  ON "common"."cm_ai_index_job_m" ("job_status_code", "priority_no", "requested_at");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_index_job_m_entity"
  ON "common"."cm_ai_index_job_m" ("source_app_code", "entity_type_code", "entity_id");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_index_job_m_source_status"
  ON "common"."cm_ai_index_job_m" ("ai_source_id", "job_status_code");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_index_job_m_object"
  ON "common"."cm_ai_index_job_m" ("ai_object_id");

CREATE TABLE IF NOT EXISTS "common"."cm_ai_index_state_m" (
  "ai_index_state_id" BIGSERIAL PRIMARY KEY,
  "ai_source_id" BIGINT NOT NULL,
  "ai_object_id" BIGINT NOT NULL,
  "profile_code" VARCHAR(120) NOT NULL DEFAULT 'default',
  "index_status_code" VARCHAR(40) NOT NULL DEFAULT 'pending',
  "chunk_count" INTEGER NOT NULL DEFAULT 0,
  "indexed_chunk_count" INTEGER NOT NULL DEFAULT 0,
  "last_indexed_source_version" VARCHAR(160),
  "last_requested_at" TIMESTAMPTZ(6),
  "last_indexed_at" TIMESTAMPTZ(6),
  "last_failed_at" TIMESTAMPTZ(6),
  "last_error_message" VARCHAR(1000),
  "metadata_jsonb" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "fk_cm_ai_index_state_m_source"
    FOREIGN KEY ("ai_source_id")
    REFERENCES "common"."cm_ai_source_m" ("ai_source_id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_cm_ai_index_state_m_object"
    FOREIGN KEY ("ai_object_id")
    REFERENCES "common"."cm_ai_object_m" ("ai_object_id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_cm_ai_index_state_m_object_profile"
  ON "common"."cm_ai_index_state_m" ("ai_object_id", "profile_code");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_index_state_m_source_status"
  ON "common"."cm_ai_index_state_m" ("ai_source_id", "index_status_code");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_index_state_m_last_indexed_at"
  ON "common"."cm_ai_index_state_m" ("last_indexed_at");

CREATE TABLE IF NOT EXISTS "common"."cm_ai_index_state_h" (
  "ai_index_state_id" BIGINT NOT NULL,
  "history_seq" BIGINT NOT NULL,
  "event_type" CHAR(1) NOT NULL,
  "event_at" TIMESTAMPTZ(6) NOT NULL,
  "ai_source_id" BIGINT NOT NULL,
  "ai_object_id" BIGINT NOT NULL,
  "profile_code" VARCHAR(120) NOT NULL,
  "index_status_code" VARCHAR(40) NOT NULL,
  "chunk_count" INTEGER NOT NULL,
  "indexed_chunk_count" INTEGER NOT NULL,
  "last_indexed_source_version" VARCHAR(160),
  "last_requested_at" TIMESTAMPTZ(6),
  "last_indexed_at" TIMESTAMPTZ(6),
  "last_failed_at" TIMESTAMPTZ(6),
  "last_error_message" VARCHAR(1000),
  "metadata_jsonb" JSONB,
  "is_active" BOOLEAN NOT NULL,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "pk_cm_ai_index_state_h" PRIMARY KEY ("ai_index_state_id", "history_seq")
);

CREATE INDEX IF NOT EXISTS "ix_cm_ai_index_state_h_event_at"
  ON "common"."cm_ai_index_state_h" ("event_at");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_index_state_h_tx"
  ON "common"."cm_ai_index_state_h" ("transaction_id");

CREATE TABLE IF NOT EXISTS "common"."cm_ai_retrieval_log_m" (
  "ai_retrieval_log_id" BIGSERIAL PRIMARY KEY,
  "request_id" VARCHAR(120),
  "conversation_id" BIGINT,
  "source_app_code" VARCHAR(30),
  "query_text" TEXT NOT NULL,
  "retrieval_mode_code" VARCHAR(40) NOT NULL DEFAULT 'hybrid',
  "result_count" INTEGER NOT NULL DEFAULT 0,
  "context_count" INTEGER NOT NULL DEFAULT 0,
  "blocked_count" INTEGER NOT NULL DEFAULT 0,
  "status_code" VARCHAR(40) NOT NULL DEFAULT 'succeeded',
  "latency_ms" INTEGER,
  "user_id" BIGINT,
  "metadata_jsonb" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "ix_cm_ai_retrieval_log_m_source_created"
  ON "common"."cm_ai_retrieval_log_m" ("source_app_code", "created_at");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_retrieval_log_m_user_created"
  ON "common"."cm_ai_retrieval_log_m" ("user_id", "created_at");

CREATE TABLE IF NOT EXISTS "common"."cm_ai_retrieval_log_item_m" (
  "ai_retrieval_log_item_id" BIGSERIAL PRIMARY KEY,
  "ai_retrieval_log_id" BIGINT NOT NULL,
  "ai_object_id" BIGINT,
  "ai_chunk_id" BIGINT,
  "rank_no" INTEGER NOT NULL,
  "score" DOUBLE PRECISION,
  "similarity" DOUBLE PRECISION,
  "included_in_context" BOOLEAN NOT NULL DEFAULT FALSE,
  "permission_state_code" VARCHAR(40) NOT NULL DEFAULT 'unknown',
  "citation_id" VARCHAR(120),
  "metadata_jsonb" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_cm_ai_retrieval_log_item_m_log"
    FOREIGN KEY ("ai_retrieval_log_id")
    REFERENCES "common"."cm_ai_retrieval_log_m" ("ai_retrieval_log_id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_cm_ai_retrieval_log_item_m_object"
    FOREIGN KEY ("ai_object_id")
    REFERENCES "common"."cm_ai_object_m" ("ai_object_id")
    ON DELETE SET NULL,
  CONSTRAINT "fk_cm_ai_retrieval_log_item_m_chunk"
    FOREIGN KEY ("ai_chunk_id")
    REFERENCES "common"."cm_ai_chunk_m" ("ai_chunk_id")
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ix_cm_ai_retrieval_log_item_m_log_rank"
  ON "common"."cm_ai_retrieval_log_item_m" ("ai_retrieval_log_id", "rank_no");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_retrieval_log_item_m_object"
  ON "common"."cm_ai_retrieval_log_item_m" ("ai_object_id");

CREATE TABLE IF NOT EXISTS "common"."cm_ai_conversation_m" (
  "ai_conversation_id" BIGSERIAL PRIMARY KEY,
  "owner_user_id" BIGINT,
  "source_app_code" VARCHAR(30),
  "conversation_scope_code" VARCHAR(40) NOT NULL DEFAULT 'private',
  "conversation_status_code" VARCHAR(40) NOT NULL DEFAULT 'active',
  "title" VARCHAR(300),
  "summary" TEXT,
  "last_message_at" TIMESTAMPTZ(6),
  "metadata_jsonb" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID
);

CREATE INDEX IF NOT EXISTS "ix_cm_ai_conversation_m_owner_updated"
  ON "common"."cm_ai_conversation_m" ("owner_user_id", "updated_at");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_conversation_m_source_status"
  ON "common"."cm_ai_conversation_m" ("source_app_code", "conversation_status_code");

CREATE TABLE IF NOT EXISTS "common"."cm_ai_message_m" (
  "ai_message_id" BIGSERIAL PRIMARY KEY,
  "ai_conversation_id" BIGINT NOT NULL,
  "parent_message_id" BIGINT,
  "message_seq" INTEGER NOT NULL,
  "role_code" VARCHAR(40) NOT NULL,
  "message_status_code" VARCHAR(40) NOT NULL DEFAULT 'completed',
  "content_text" TEXT,
  "content_jsonb" JSONB,
  "token_count" INTEGER,
  "metadata_jsonb" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "fk_cm_ai_message_m_conversation"
    FOREIGN KEY ("ai_conversation_id")
    REFERENCES "common"."cm_ai_conversation_m" ("ai_conversation_id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_cm_ai_message_m_conversation_seq"
  ON "common"."cm_ai_message_m" ("ai_conversation_id", "message_seq");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_message_m_conversation_created"
  ON "common"."cm_ai_message_m" ("ai_conversation_id", "created_at");

CREATE TABLE IF NOT EXISTS "common"."cm_ai_reference_m" (
  "ai_reference_id" BIGSERIAL PRIMARY KEY,
  "ai_conversation_id" BIGINT NOT NULL,
  "ai_message_id" BIGINT,
  "ai_object_id" BIGINT,
  "ai_chunk_id" BIGINT,
  "source_app_code" VARCHAR(30),
  "entity_type_code" VARCHAR(80),
  "entity_id" VARCHAR(200),
  "reference_kind_code" VARCHAR(40) NOT NULL DEFAULT 'manual',
  "citation_id" VARCHAR(120),
  "citation_label" VARCHAR(120),
  "target_jsonb" JSONB,
  "metadata_jsonb" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_cm_ai_reference_m_conversation"
    FOREIGN KEY ("ai_conversation_id")
    REFERENCES "common"."cm_ai_conversation_m" ("ai_conversation_id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_cm_ai_reference_m_message"
    FOREIGN KEY ("ai_message_id")
    REFERENCES "common"."cm_ai_message_m" ("ai_message_id")
    ON DELETE SET NULL,
  CONSTRAINT "fk_cm_ai_reference_m_object"
    FOREIGN KEY ("ai_object_id")
    REFERENCES "common"."cm_ai_object_m" ("ai_object_id")
    ON DELETE SET NULL,
  CONSTRAINT "fk_cm_ai_reference_m_chunk"
    FOREIGN KEY ("ai_chunk_id")
    REFERENCES "common"."cm_ai_chunk_m" ("ai_chunk_id")
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ix_cm_ai_reference_m_conversation_created"
  ON "common"."cm_ai_reference_m" ("ai_conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_reference_m_object"
  ON "common"."cm_ai_reference_m" ("ai_object_id");

CREATE TABLE IF NOT EXISTS "common"."cm_ai_run_m" (
  "ai_run_id" BIGSERIAL PRIMARY KEY,
  "ai_conversation_id" BIGINT NOT NULL,
  "request_message_id" BIGINT,
  "response_message_id" BIGINT,
  "user_id" BIGINT,
  "run_type_code" VARCHAR(40) NOT NULL DEFAULT 'chat',
  "run_status_code" VARCHAR(40) NOT NULL DEFAULT 'pending',
  "provider_code" VARCHAR(80),
  "model_name" VARCHAR(160),
  "deployment_name" VARCHAR(160),
  "started_at" TIMESTAMPTZ(6),
  "finished_at" TIMESTAMPTZ(6),
  "latency_ms" INTEGER,
  "input_token_count" INTEGER,
  "output_token_count" INTEGER,
  "total_token_count" INTEGER,
  "last_error_message" VARCHAR(1000),
  "request_jsonb" JSONB,
  "response_jsonb" JSONB,
  "metadata_jsonb" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "memo" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "fk_cm_ai_run_m_conversation"
    FOREIGN KEY ("ai_conversation_id")
    REFERENCES "common"."cm_ai_conversation_m" ("ai_conversation_id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_cm_ai_run_m_request_message"
    FOREIGN KEY ("request_message_id")
    REFERENCES "common"."cm_ai_message_m" ("ai_message_id")
    ON DELETE SET NULL,
  CONSTRAINT "fk_cm_ai_run_m_response_message"
    FOREIGN KEY ("response_message_id")
    REFERENCES "common"."cm_ai_message_m" ("ai_message_id")
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ix_cm_ai_run_m_conversation_created"
  ON "common"."cm_ai_run_m" ("ai_conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_run_m_status_created"
  ON "common"."cm_ai_run_m" ("run_status_code", "created_at");

CREATE TABLE IF NOT EXISTS "common"."cm_ai_run_source_r" (
  "ai_run_source_id" BIGSERIAL PRIMARY KEY,
  "ai_run_id" BIGINT NOT NULL,
  "ai_retrieval_log_id" BIGINT,
  "ai_reference_id" BIGINT,
  "ai_object_id" BIGINT,
  "ai_chunk_id" BIGINT,
  "source_kind_code" VARCHAR(40) NOT NULL DEFAULT 'manual',
  "rank_no" INTEGER,
  "included_in_prompt" BOOLEAN NOT NULL DEFAULT FALSE,
  "citation_id" VARCHAR(120),
  "metadata_jsonb" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_cm_ai_run_source_r_run"
    FOREIGN KEY ("ai_run_id")
    REFERENCES "common"."cm_ai_run_m" ("ai_run_id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_cm_ai_run_source_r_reference"
    FOREIGN KEY ("ai_reference_id")
    REFERENCES "common"."cm_ai_reference_m" ("ai_reference_id")
    ON DELETE SET NULL,
  CONSTRAINT "fk_cm_ai_run_source_r_object"
    FOREIGN KEY ("ai_object_id")
    REFERENCES "common"."cm_ai_object_m" ("ai_object_id")
    ON DELETE SET NULL,
  CONSTRAINT "fk_cm_ai_run_source_r_chunk"
    FOREIGN KEY ("ai_chunk_id")
    REFERENCES "common"."cm_ai_chunk_m" ("ai_chunk_id")
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ix_cm_ai_run_source_r_run_rank"
  ON "common"."cm_ai_run_source_r" ("ai_run_id", "rank_no");
CREATE INDEX IF NOT EXISTS "ix_cm_ai_run_source_r_object"
  ON "common"."cm_ai_run_source_r" ("ai_object_id");
