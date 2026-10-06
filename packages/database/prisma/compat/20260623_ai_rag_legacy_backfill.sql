-- Non-destructive compatibility bridge for local databases that still contain
-- pre-roadmap common.cm_ai_* WIP tables. Prisma db push cannot add required
-- columns to populated tables, so this patch adds and backfills those columns
-- before the canonical schema is applied.

CREATE SCHEMA IF NOT EXISTS "common";

DO $$
BEGIN
  IF to_regclass('common.cm_ai_source_m') IS NOT NULL
     AND EXISTS (
       SELECT 1
         FROM pg_trigger
        WHERE tgrelid = 'common.cm_ai_source_m'::regclass
          AND tgname = 'trg_cm_ai_source_h'
          AND NOT tgisinternal
     )
  THEN
    EXECUTE 'ALTER TABLE common.cm_ai_source_m DISABLE TRIGGER trg_cm_ai_source_h';
  END IF;

  IF to_regclass('common.cm_ai_object_m') IS NOT NULL
     AND EXISTS (
       SELECT 1
         FROM pg_trigger
        WHERE tgrelid = 'common.cm_ai_object_m'::regclass
          AND tgname = 'trg_cm_ai_object_h'
          AND NOT tgisinternal
     )
  THEN
    EXECUTE 'ALTER TABLE common.cm_ai_object_m DISABLE TRIGGER trg_cm_ai_object_h';
  END IF;

  IF to_regclass('common.cm_ai_index_state_m') IS NOT NULL
     AND EXISTS (
       SELECT 1
         FROM pg_trigger
        WHERE tgrelid = 'common.cm_ai_index_state_m'::regclass
          AND tgname = 'trg_cm_ai_index_state_h'
          AND NOT tgisinternal
     )
  THEN
    EXECUTE 'ALTER TABLE common.cm_ai_index_state_m DISABLE TRIGGER trg_cm_ai_index_state_h';
  END IF;
END $$;

DO $$
DECLARE
  legacy_source_id BIGINT;
BEGIN
  IF to_regclass('common.cm_ai_source_m') IS NOT NULL THEN
    ALTER TABLE common.cm_ai_source_m
      ADD COLUMN IF NOT EXISTS source_name VARCHAR(160),
      ADD COLUMN IF NOT EXISTS source_kind_code VARCHAR(40),
      ADD COLUMN IF NOT EXISTS adapter_code VARCHAR(120),
      ADD COLUMN IF NOT EXISTS embedding_profile_code VARCHAR(120),
      ADD COLUMN IF NOT EXISTS source_status_code VARCHAR(40),
      ADD COLUMN IF NOT EXISTS indexing_enabled BOOLEAN,
      ADD COLUMN IF NOT EXISTS keyword_search_enabled BOOLEAN,
      ADD COLUMN IF NOT EXISTS metadata_search_enabled BOOLEAN,
      ADD COLUMN IF NOT EXISTS semantic_search_enabled BOOLEAN,
      ADD COLUMN IF NOT EXISTS vector_search_enabled BOOLEAN,
      ADD COLUMN IF NOT EXISTS rag_context_enabled BOOLEAN,
      ADD COLUMN IF NOT EXISTS metadata_jsonb JSONB,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN,
      ADD COLUMN IF NOT EXISTS memo TEXT,
      ADD COLUMN IF NOT EXISTS created_by BIGINT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ(6),
      ADD COLUMN IF NOT EXISTS updated_by BIGINT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ(6),
      ADD COLUMN IF NOT EXISTS last_source TEXT,
      ADD COLUMN IF NOT EXISTS last_activity TEXT,
      ADD COLUMN IF NOT EXISTS transaction_id UUID;

    UPDATE common.cm_ai_source_m
       SET source_name = COALESCE(source_name, source_app_code, 'Legacy AI/RAG Source'),
           source_kind_code = COALESCE(source_kind_code, 'domain'),
           source_status_code = COALESCE(source_status_code, 'active'),
           indexing_enabled = COALESCE(indexing_enabled, TRUE),
           keyword_search_enabled = COALESCE(keyword_search_enabled, TRUE),
           metadata_search_enabled = COALESCE(metadata_search_enabled, TRUE),
           semantic_search_enabled = COALESCE(semantic_search_enabled, FALSE),
           vector_search_enabled = COALESCE(vector_search_enabled, FALSE),
           rag_context_enabled = COALESCE(rag_context_enabled, FALSE),
           is_active = COALESCE(is_active, TRUE),
           created_at = COALESCE(created_at, NOW()),
           updated_at = COALESCE(updated_at, NOW());

    ALTER TABLE common.cm_ai_source_m
      ALTER COLUMN source_name SET DEFAULT 'Legacy AI/RAG Source',
      ALTER COLUMN source_name SET NOT NULL,
      ALTER COLUMN source_kind_code SET DEFAULT 'domain',
      ALTER COLUMN source_kind_code SET NOT NULL,
      ALTER COLUMN source_status_code SET DEFAULT 'active',
      ALTER COLUMN source_status_code SET NOT NULL,
      ALTER COLUMN indexing_enabled SET DEFAULT TRUE,
      ALTER COLUMN indexing_enabled SET NOT NULL,
      ALTER COLUMN keyword_search_enabled SET DEFAULT TRUE,
      ALTER COLUMN keyword_search_enabled SET NOT NULL,
      ALTER COLUMN metadata_search_enabled SET DEFAULT TRUE,
      ALTER COLUMN metadata_search_enabled SET NOT NULL,
      ALTER COLUMN semantic_search_enabled SET DEFAULT FALSE,
      ALTER COLUMN semantic_search_enabled SET NOT NULL,
      ALTER COLUMN vector_search_enabled SET DEFAULT FALSE,
      ALTER COLUMN vector_search_enabled SET NOT NULL,
      ALTER COLUMN rag_context_enabled SET DEFAULT FALSE,
      ALTER COLUMN rag_context_enabled SET NOT NULL,
      ALTER COLUMN is_active SET DEFAULT TRUE,
      ALTER COLUMN is_active SET NOT NULL,
      ALTER COLUMN created_at SET DEFAULT NOW(),
      ALTER COLUMN created_at SET NOT NULL,
      ALTER COLUMN updated_at SET DEFAULT NOW(),
      ALTER COLUMN updated_at SET NOT NULL;

    INSERT INTO common.cm_ai_source_m (
      source_app_code,
      source_name,
      source_kind_code,
      adapter_code,
      embedding_profile_code,
      source_status_code,
      indexing_enabled,
      keyword_search_enabled,
      metadata_search_enabled,
      semantic_search_enabled,
      vector_search_enabled,
      rag_context_enabled,
      metadata_jsonb,
      is_active,
      memo,
      created_at,
      updated_at,
      last_source,
      last_activity
    )
    SELECT
      'legacy-ai-rag',
      'Legacy AI/RAG compatibility source',
      'legacy',
      'compat-backfill',
      'default',
      'active',
      FALSE,
      TRUE,
      TRUE,
      FALSE,
      FALSE,
      FALSE,
      '{"compat":"20260623_ai_rag_legacy_backfill"}'::jsonb,
      TRUE,
      'Created to preserve legacy cm_ai_index_state_* rows during db push.',
      NOW(),
      NOW(),
      'db-init',
      'ai-rag-legacy-backfill'
    WHERE NOT EXISTS (
      SELECT 1
      FROM common.cm_ai_source_m
      WHERE source_app_code = 'legacy-ai-rag'
    );

    SELECT ai_source_id
      INTO legacy_source_id
      FROM common.cm_ai_source_m
     WHERE source_app_code = 'legacy-ai-rag'
     LIMIT 1;
  END IF;

  IF to_regclass('common.cm_ai_object_m') IS NOT NULL THEN
    ALTER TABLE common.cm_ai_object_m
      ADD COLUMN IF NOT EXISTS ai_source_id BIGINT,
      ADD COLUMN IF NOT EXISTS sensitivity_code VARCHAR(40),
      ADD COLUMN IF NOT EXISTS acl_policy_code VARCHAR(40),
      ADD COLUMN IF NOT EXISTS search_eligible BOOLEAN,
      ADD COLUMN IF NOT EXISTS context_eligible BOOLEAN;

    UPDATE common.cm_ai_object_m
       SET sensitivity_code = COALESCE(sensitivity_code, 'internal'),
           acl_policy_code = COALESCE(acl_policy_code, 'acl'),
           search_eligible = COALESCE(search_eligible, TRUE),
           context_eligible = COALESCE(context_eligible, FALSE);

    IF to_regclass('common.cm_ai_source_m') IS NOT NULL
       AND EXISTS (
         SELECT 1
           FROM information_schema.columns
          WHERE table_schema = 'common'
            AND table_name = 'cm_ai_object_m'
            AND column_name = 'source_app_code'
       )
    THEN
      UPDATE common.cm_ai_object_m AS obj
         SET ai_source_id = source.ai_source_id
        FROM common.cm_ai_source_m AS source
       WHERE obj.source_app_code = source.source_app_code
         AND obj.ai_source_id IS NULL;
    END IF;

    IF legacy_source_id IS NOT NULL THEN
      UPDATE common.cm_ai_object_m
         SET ai_source_id = legacy_source_id
       WHERE ai_source_id IS NULL;
    END IF;

    ALTER TABLE common.cm_ai_object_m
      ALTER COLUMN sensitivity_code SET DEFAULT 'internal',
      ALTER COLUMN sensitivity_code SET NOT NULL,
      ALTER COLUMN acl_policy_code SET DEFAULT 'acl',
      ALTER COLUMN acl_policy_code SET NOT NULL,
      ALTER COLUMN search_eligible SET DEFAULT TRUE,
      ALTER COLUMN search_eligible SET NOT NULL,
      ALTER COLUMN context_eligible SET DEFAULT FALSE,
      ALTER COLUMN context_eligible SET NOT NULL,
      ALTER COLUMN ai_source_id SET NOT NULL;
  END IF;

  IF to_regclass('common.cm_ai_source_h') IS NOT NULL THEN
    ALTER TABLE common.cm_ai_source_h
      ADD COLUMN IF NOT EXISTS source_status_code VARCHAR(40);

    UPDATE common.cm_ai_source_h
       SET source_status_code = 'active'
     WHERE source_status_code IS NULL;

    ALTER TABLE common.cm_ai_source_h
      ALTER COLUMN source_status_code SET DEFAULT 'active',
      ALTER COLUMN source_status_code SET NOT NULL;
  END IF;

  IF to_regclass('common.cm_ai_object_h') IS NOT NULL THEN
    ALTER TABLE common.cm_ai_object_h
      ADD COLUMN IF NOT EXISTS acl_policy_code VARCHAR(40),
      ADD COLUMN IF NOT EXISTS search_eligible BOOLEAN,
      ADD COLUMN IF NOT EXISTS context_eligible BOOLEAN;

    UPDATE common.cm_ai_object_h
       SET acl_policy_code = COALESCE(acl_policy_code, 'acl'),
           search_eligible = COALESCE(search_eligible, TRUE),
           context_eligible = COALESCE(context_eligible, FALSE);

    ALTER TABLE common.cm_ai_object_h
      ALTER COLUMN acl_policy_code SET DEFAULT 'acl',
      ALTER COLUMN acl_policy_code SET NOT NULL,
      ALTER COLUMN search_eligible SET DEFAULT TRUE,
      ALTER COLUMN search_eligible SET NOT NULL,
      ALTER COLUMN context_eligible SET DEFAULT FALSE,
      ALTER COLUMN context_eligible SET NOT NULL;
  END IF;

  IF to_regclass('common.cm_ai_acl_snapshot_m') IS NOT NULL THEN
    ALTER TABLE common.cm_ai_acl_snapshot_m
      ADD COLUMN IF NOT EXISTS acl_snapshot_jsonb JSONB;

    UPDATE common.cm_ai_acl_snapshot_m
       SET acl_snapshot_jsonb = COALESCE(acl_snapshot_jsonb, '{}'::jsonb);

    ALTER TABLE common.cm_ai_acl_snapshot_m
      ALTER COLUMN acl_snapshot_jsonb SET DEFAULT '{}'::jsonb,
      ALTER COLUMN acl_snapshot_jsonb SET NOT NULL;
  END IF;

  IF to_regclass('common.cm_ai_index_state_m') IS NOT NULL THEN
    ALTER TABLE common.cm_ai_index_state_m
      ADD COLUMN IF NOT EXISTS ai_source_id BIGINT,
      ADD COLUMN IF NOT EXISTS profile_code VARCHAR(120);

    UPDATE common.cm_ai_index_state_m
       SET profile_code = COALESCE(profile_code, 'default');

    IF to_regclass('common.cm_ai_object_m') IS NOT NULL
       AND EXISTS (
         SELECT 1
           FROM information_schema.columns
          WHERE table_schema = 'common'
            AND table_name = 'cm_ai_object_m'
            AND column_name = 'ai_source_id'
       )
    THEN
      UPDATE common.cm_ai_index_state_m AS state
         SET ai_source_id = obj.ai_source_id
        FROM common.cm_ai_object_m AS obj
       WHERE state.ai_object_id = obj.ai_object_id
         AND state.ai_source_id IS NULL;
    END IF;

    IF legacy_source_id IS NOT NULL THEN
      UPDATE common.cm_ai_index_state_m
         SET ai_source_id = legacy_source_id
       WHERE ai_source_id IS NULL;
    END IF;

    ALTER TABLE common.cm_ai_index_state_m
      ALTER COLUMN profile_code SET DEFAULT 'default',
      ALTER COLUMN profile_code SET NOT NULL,
      ALTER COLUMN ai_source_id SET NOT NULL;
  END IF;

  IF to_regclass('common.cm_ai_index_state_h') IS NOT NULL THEN
    ALTER TABLE common.cm_ai_index_state_h
      ADD COLUMN IF NOT EXISTS ai_source_id BIGINT,
      ADD COLUMN IF NOT EXISTS profile_code VARCHAR(120);

    UPDATE common.cm_ai_index_state_h
       SET profile_code = COALESCE(profile_code, 'default');

    IF to_regclass('common.cm_ai_object_m') IS NOT NULL
       AND EXISTS (
         SELECT 1
           FROM information_schema.columns
          WHERE table_schema = 'common'
            AND table_name = 'cm_ai_object_m'
            AND column_name = 'ai_source_id'
       )
    THEN
      UPDATE common.cm_ai_index_state_h AS state
         SET ai_source_id = obj.ai_source_id
        FROM common.cm_ai_object_m AS obj
       WHERE state.ai_object_id = obj.ai_object_id
         AND state.ai_source_id IS NULL;
    END IF;

    IF legacy_source_id IS NOT NULL THEN
      UPDATE common.cm_ai_index_state_h
         SET ai_source_id = legacy_source_id
       WHERE ai_source_id IS NULL;
    END IF;

    ALTER TABLE common.cm_ai_index_state_h
      ALTER COLUMN profile_code SET DEFAULT 'default',
      ALTER COLUMN profile_code SET NOT NULL,
      ALTER COLUMN ai_source_id SET NOT NULL;
  END IF;
END $$;

-- Align legacy WIP cm_ai_* tables with the canonical runtime surface used by
-- apps/server/src/modules/common/ai-index. This preserves legacy columns and
-- adds the current column names instead of relying on a destructive db push.
DO $$
DECLARE
  legacy_source_id BIGINT;
BEGIN
  SELECT ai_source_id
    INTO legacy_source_id
    FROM common.cm_ai_source_m
   WHERE source_app_code = 'legacy-ai-rag'
   LIMIT 1;

  IF to_regclass('common.cm_ai_source_m') IS NOT NULL THEN
    ALTER TABLE common.cm_ai_source_m
      ADD COLUMN IF NOT EXISTS metadata_jsonb JSONB;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_source_m'
         AND column_name = 'metadata_json'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_source_m SET metadata_jsonb = COALESCE(metadata_jsonb, metadata_json)';
    END IF;

    UPDATE common.cm_ai_source_m
       SET created_at = COALESCE(created_at, NOW()),
           updated_at = COALESCE(updated_at, created_at, NOW());

    ALTER TABLE common.cm_ai_source_m
      ALTER COLUMN created_at SET DEFAULT NOW(),
      ALTER COLUMN updated_at SET DEFAULT NOW();
  END IF;

  IF to_regclass('common.cm_ai_source_h') IS NOT NULL THEN
    ALTER TABLE common.cm_ai_source_h
      ADD COLUMN IF NOT EXISTS metadata_jsonb JSONB;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_source_h'
         AND column_name = 'metadata_json'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_source_h SET metadata_jsonb = COALESCE(metadata_jsonb, metadata_json)';
    END IF;
  END IF;

  IF to_regclass('common.cm_ai_object_m') IS NOT NULL THEN
    ALTER TABLE common.cm_ai_object_m
      ADD COLUMN IF NOT EXISTS body_text TEXT,
      ADD COLUMN IF NOT EXISTS summary_text TEXT,
      ADD COLUMN IF NOT EXISTS indexed_at TIMESTAMPTZ(6),
      ADD COLUMN IF NOT EXISTS metadata_jsonb JSONB;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_object_m'
         AND column_name = 'summary'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_object_m SET summary_text = COALESCE(summary_text, summary), body_text = COALESCE(body_text, summary, title)';
    ELSE
      UPDATE common.cm_ai_object_m
         SET body_text = COALESCE(body_text, title);
    END IF;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_object_m'
         AND column_name = 'last_indexed_at'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_object_m SET indexed_at = COALESCE(indexed_at, last_indexed_at)';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_object_m'
         AND column_name = 'metadata_json'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_object_m SET metadata_jsonb = COALESCE(metadata_jsonb, metadata_json)';
    END IF;

    UPDATE common.cm_ai_object_m
       SET created_at = COALESCE(created_at, NOW()),
           updated_at = COALESCE(updated_at, created_at, NOW());

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_object_m'
         AND column_name = 'index_status_code'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_object_m SET index_status_code = COALESCE(index_status_code, ''pending'')';
      EXECUTE 'ALTER TABLE common.cm_ai_object_m ALTER COLUMN index_status_code SET DEFAULT ''pending''';
    END IF;

    ALTER TABLE common.cm_ai_object_m
      ALTER COLUMN created_at SET DEFAULT NOW(),
      ALTER COLUMN updated_at SET DEFAULT NOW();

    CREATE INDEX IF NOT EXISTS ix_cm_ai_object_m_source_updated
      ON common.cm_ai_object_m (ai_source_id, updated_at);
    CREATE INDEX IF NOT EXISTS ix_cm_ai_object_m_app_entity_type
      ON common.cm_ai_object_m (source_app_code, entity_type_code);
    CREATE INDEX IF NOT EXISTS ix_cm_ai_object_m_sensitivity_context
      ON common.cm_ai_object_m (sensitivity_code, context_eligible);
  END IF;

  IF to_regclass('common.cm_ai_object_h') IS NOT NULL THEN
    ALTER TABLE common.cm_ai_object_h
      ADD COLUMN IF NOT EXISTS body_text TEXT,
      ADD COLUMN IF NOT EXISTS summary_text TEXT,
      ADD COLUMN IF NOT EXISTS indexed_at TIMESTAMPTZ(6),
      ADD COLUMN IF NOT EXISTS metadata_jsonb JSONB;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_object_h'
         AND column_name = 'summary'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_object_h SET summary_text = COALESCE(summary_text, summary), body_text = COALESCE(body_text, summary, title)';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_object_h'
         AND column_name = 'last_indexed_at'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_object_h SET indexed_at = COALESCE(indexed_at, last_indexed_at)';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_object_h'
         AND column_name = 'metadata_json'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_object_h SET metadata_jsonb = COALESCE(metadata_jsonb, metadata_json)';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_object_h'
         AND column_name = 'index_status_code'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_object_h SET index_status_code = COALESCE(index_status_code, ''pending'')';
      EXECUTE 'ALTER TABLE common.cm_ai_object_h ALTER COLUMN index_status_code SET DEFAULT ''pending''';
    END IF;
  END IF;

  IF to_regclass('common.cm_ai_acl_snapshot_m') IS NOT NULL THEN
    ALTER TABLE common.cm_ai_acl_snapshot_m
      ADD COLUMN IF NOT EXISTS metadata_jsonb JSONB;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_acl_snapshot_m'
         AND column_name = 'metadata_json'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_acl_snapshot_m SET metadata_jsonb = COALESCE(metadata_jsonb, metadata_json)';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_acl_snapshot_m'
         AND column_name = 'snapshot_json'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_acl_snapshot_m SET acl_snapshot_jsonb = COALESCE(acl_snapshot_jsonb, snapshot_json)';
      EXECUTE 'ALTER TABLE common.cm_ai_acl_snapshot_m ALTER COLUMN snapshot_json SET DEFAULT ''{}''::jsonb';
    END IF;

    UPDATE common.cm_ai_acl_snapshot_m
       SET acl_snapshot_jsonb = COALESCE(acl_snapshot_jsonb, '{}'::jsonb),
           created_at = COALESCE(created_at, NOW()),
           updated_at = COALESCE(updated_at, created_at, NOW());

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_acl_snapshot_m'
         AND column_name = 'policy_hash'
    ) THEN
      EXECUTE 'ALTER TABLE common.cm_ai_acl_snapshot_m ALTER COLUMN policy_hash DROP NOT NULL';
    END IF;

    ALTER TABLE common.cm_ai_acl_snapshot_m
      ALTER COLUMN created_at SET DEFAULT NOW(),
      ALTER COLUMN updated_at SET DEFAULT NOW();

    CREATE INDEX IF NOT EXISTS ix_cm_ai_acl_snapshot_m_object_active
      ON common.cm_ai_acl_snapshot_m (ai_object_id, is_active);
    CREATE INDEX IF NOT EXISTS ix_cm_ai_acl_snapshot_m_scope
      ON common.cm_ai_acl_snapshot_m (access_scope_code, sensitivity_code);
  END IF;

  IF to_regclass('common.cm_ai_chunk_m') IS NOT NULL THEN
    ALTER TABLE common.cm_ai_chunk_m
      ADD COLUMN IF NOT EXISTS content_hash VARCHAR(128),
      ADD COLUMN IF NOT EXISTS metadata_jsonb JSONB;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_chunk_m'
         AND column_name = 'chunk_hash'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_chunk_m SET content_hash = COALESCE(content_hash, chunk_hash)';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_chunk_m'
         AND column_name = 'metadata_json'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_chunk_m SET metadata_jsonb = COALESCE(metadata_jsonb, metadata_json)';
    END IF;

    UPDATE common.cm_ai_chunk_m
       SET created_at = COALESCE(created_at, NOW()),
           updated_at = COALESCE(updated_at, created_at, NOW());

    ALTER TABLE common.cm_ai_chunk_m
      ALTER COLUMN created_at SET DEFAULT NOW(),
      ALTER COLUMN updated_at SET DEFAULT NOW();

    CREATE INDEX IF NOT EXISTS ix_cm_ai_chunk_m_object_active
      ON common.cm_ai_chunk_m (ai_object_id, is_active);
  END IF;

  IF to_regclass('common.cm_ai_embedding_m') IS NOT NULL THEN
    ALTER TABLE common.cm_ai_embedding_m
      ADD COLUMN IF NOT EXISTS profile_code VARCHAR(120),
      ADD COLUMN IF NOT EXISTS metadata_jsonb JSONB;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_embedding_m'
         AND column_name = 'embedding_profile_code'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_embedding_m SET profile_code = COALESCE(profile_code, embedding_profile_code, ''default'')';
    ELSE
      UPDATE common.cm_ai_embedding_m
         SET profile_code = COALESCE(profile_code, 'default');
    END IF;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_embedding_m'
         AND column_name = 'metadata_json'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_embedding_m SET metadata_jsonb = COALESCE(metadata_jsonb, metadata_json)';
    END IF;

    UPDATE common.cm_ai_embedding_m
       SET created_at = COALESCE(created_at, NOW()),
           updated_at = COALESCE(updated_at, created_at, NOW());

    ALTER TABLE common.cm_ai_embedding_m
      ALTER COLUMN profile_code SET DEFAULT 'default',
      ALTER COLUMN profile_code SET NOT NULL,
      ALTER COLUMN created_at SET DEFAULT NOW(),
      ALTER COLUMN updated_at SET DEFAULT NOW();

    CREATE UNIQUE INDEX IF NOT EXISTS ux_cm_ai_embedding_m_chunk_profile_code
      ON common.cm_ai_embedding_m (ai_chunk_id, profile_code);
  END IF;

  IF to_regclass('common.cm_ai_index_job_m') IS NOT NULL THEN
    ALTER TABLE common.cm_ai_index_job_m
      ADD COLUMN IF NOT EXISTS ai_source_id BIGINT,
      ADD COLUMN IF NOT EXISTS priority_no INTEGER,
      ADD COLUMN IF NOT EXISTS source_version VARCHAR(160),
      ADD COLUMN IF NOT EXISTS requested_by BIGINT,
      ADD COLUMN IF NOT EXISTS payload_jsonb JSONB,
      ADD COLUMN IF NOT EXISTS metadata_jsonb JSONB;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_index_job_m'
         AND column_name = 'priority'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_index_job_m SET priority_no = COALESCE(priority_no, priority, 100)';
    ELSE
      UPDATE common.cm_ai_index_job_m
         SET priority_no = COALESCE(priority_no, 100);
    END IF;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_index_job_m'
         AND column_name = 'payload_json'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_index_job_m SET payload_jsonb = COALESCE(payload_jsonb, payload_json)';
    END IF;

    IF to_regclass('common.cm_ai_source_m') IS NOT NULL THEN
      UPDATE common.cm_ai_index_job_m AS job
         SET ai_source_id = source.ai_source_id
        FROM common.cm_ai_source_m AS source
       WHERE job.source_app_code = source.source_app_code
         AND job.ai_source_id IS NULL;
    END IF;

    UPDATE common.cm_ai_index_job_m
       SET ai_source_id = COALESCE(ai_source_id, legacy_source_id),
           priority_no = COALESCE(priority_no, 100),
           attempt_count = COALESCE(attempt_count, 0),
           max_attempts = COALESCE(max_attempts, 3),
           requested_at = COALESCE(requested_at, NOW()),
           created_at = COALESCE(created_at, NOW()),
           updated_at = COALESCE(updated_at, created_at, NOW());

    ALTER TABLE common.cm_ai_index_job_m
      ALTER COLUMN priority_no SET DEFAULT 100,
      ALTER COLUMN priority_no SET NOT NULL,
      ALTER COLUMN attempt_count SET DEFAULT 0,
      ALTER COLUMN attempt_count SET NOT NULL,
      ALTER COLUMN max_attempts SET DEFAULT 3,
      ALTER COLUMN max_attempts SET NOT NULL,
      ALTER COLUMN requested_at SET DEFAULT NOW(),
      ALTER COLUMN requested_at SET NOT NULL,
      ALTER COLUMN created_at SET DEFAULT NOW(),
      ALTER COLUMN updated_at SET DEFAULT NOW();

    CREATE INDEX IF NOT EXISTS ix_cm_ai_index_job_m_status_priority_no
      ON common.cm_ai_index_job_m (job_status_code, priority_no, requested_at);
    CREATE INDEX IF NOT EXISTS ix_cm_ai_index_job_m_source_status
      ON common.cm_ai_index_job_m (ai_source_id, job_status_code);
  END IF;

  IF to_regclass('common.cm_ai_index_state_m') IS NOT NULL THEN
    ALTER TABLE common.cm_ai_index_state_m
      ADD COLUMN IF NOT EXISTS last_indexed_source_version VARCHAR(160),
      ADD COLUMN IF NOT EXISTS metadata_jsonb JSONB;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_index_state_m'
         AND column_name = 'metadata_json'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_index_state_m SET metadata_jsonb = COALESCE(metadata_jsonb, metadata_json)';
    END IF;

    UPDATE common.cm_ai_index_state_m
       SET created_at = COALESCE(created_at, NOW()),
           updated_at = COALESCE(updated_at, created_at, NOW());

    ALTER TABLE common.cm_ai_index_state_m
      ALTER COLUMN created_at SET DEFAULT NOW(),
      ALTER COLUMN updated_at SET DEFAULT NOW();

    CREATE UNIQUE INDEX IF NOT EXISTS ux_cm_ai_index_state_m_object_profile
      ON common.cm_ai_index_state_m (ai_object_id, profile_code);
    CREATE INDEX IF NOT EXISTS ix_cm_ai_index_state_m_source_status
      ON common.cm_ai_index_state_m (ai_source_id, index_status_code);
    CREATE INDEX IF NOT EXISTS ix_cm_ai_index_state_m_last_indexed_at
      ON common.cm_ai_index_state_m (last_indexed_at);
  END IF;

  IF to_regclass('common.cm_ai_index_state_h') IS NOT NULL THEN
    ALTER TABLE common.cm_ai_index_state_h
      ADD COLUMN IF NOT EXISTS last_indexed_source_version VARCHAR(160),
      ADD COLUMN IF NOT EXISTS metadata_jsonb JSONB;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_index_state_h'
         AND column_name = 'metadata_json'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_index_state_h SET metadata_jsonb = COALESCE(metadata_jsonb, metadata_json)';
    END IF;
  END IF;

  IF to_regclass('common.cm_ai_retrieval_log_m') IS NOT NULL THEN
    ALTER TABLE common.cm_ai_retrieval_log_m
      ADD COLUMN IF NOT EXISTS retrieval_mode_code VARCHAR(40),
      ADD COLUMN IF NOT EXISTS context_count INTEGER,
      ADD COLUMN IF NOT EXISTS blocked_count INTEGER,
      ADD COLUMN IF NOT EXISTS status_code VARCHAR(40),
      ADD COLUMN IF NOT EXISTS metadata_jsonb JSONB;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_retrieval_log_m'
         AND column_name = 'metadata_json'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_retrieval_log_m SET metadata_jsonb = COALESCE(metadata_jsonb, metadata_json)';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_retrieval_log_m'
         AND column_name = 'blocked_result_count'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_retrieval_log_m SET blocked_count = COALESCE(blocked_count, blocked_result_count, 0)';
    ELSE
      UPDATE common.cm_ai_retrieval_log_m
         SET blocked_count = COALESCE(blocked_count, 0);
    END IF;

    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'common'
         AND table_name = 'cm_ai_retrieval_log_m'
         AND column_name = 'ranker_code'
    ) THEN
      EXECUTE 'UPDATE common.cm_ai_retrieval_log_m SET retrieval_mode_code = COALESCE(retrieval_mode_code, ranker_code)';
    END IF;

    UPDATE common.cm_ai_retrieval_log_m
       SET retrieval_mode_code = COALESCE(retrieval_mode_code, 'hybrid'),
           context_count = COALESCE(context_count, result_count, 0),
           status_code = COALESCE(status_code, 'succeeded'),
           result_count = COALESCE(result_count, 0),
           created_at = COALESCE(created_at, NOW());

    ALTER TABLE common.cm_ai_retrieval_log_m
      ALTER COLUMN retrieval_mode_code SET DEFAULT 'hybrid',
      ALTER COLUMN retrieval_mode_code SET NOT NULL,
      ALTER COLUMN result_count SET DEFAULT 0,
      ALTER COLUMN result_count SET NOT NULL,
      ALTER COLUMN context_count SET DEFAULT 0,
      ALTER COLUMN context_count SET NOT NULL,
      ALTER COLUMN blocked_count SET DEFAULT 0,
      ALTER COLUMN blocked_count SET NOT NULL,
      ALTER COLUMN status_code SET DEFAULT 'succeeded',
      ALTER COLUMN status_code SET NOT NULL,
      ALTER COLUMN created_at SET DEFAULT NOW();

    CREATE INDEX IF NOT EXISTS ix_cm_ai_retrieval_log_m_source_created
      ON common.cm_ai_retrieval_log_m (source_app_code, created_at);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS common.cm_ai_retrieval_log_item_m (
  ai_retrieval_log_item_id BIGSERIAL PRIMARY KEY,
  ai_retrieval_log_id BIGINT NOT NULL,
  ai_object_id BIGINT,
  ai_chunk_id BIGINT,
  rank_no INTEGER NOT NULL,
  score DOUBLE PRECISION,
  similarity DOUBLE PRECISION,
  included_in_context BOOLEAN NOT NULL DEFAULT FALSE,
  permission_state_code VARCHAR(40) NOT NULL DEFAULT 'unknown',
  citation_id VARCHAR(120),
  metadata_jsonb JSONB,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_cm_ai_retrieval_log_item_m_log
    FOREIGN KEY (ai_retrieval_log_id)
    REFERENCES common.cm_ai_retrieval_log_m (ai_retrieval_log_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cm_ai_retrieval_log_item_m_object
    FOREIGN KEY (ai_object_id)
    REFERENCES common.cm_ai_object_m (ai_object_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cm_ai_retrieval_log_item_m_chunk
    FOREIGN KEY (ai_chunk_id)
    REFERENCES common.cm_ai_chunk_m (ai_chunk_id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_cm_ai_retrieval_log_item_m_log_rank
  ON common.cm_ai_retrieval_log_item_m (ai_retrieval_log_id, rank_no);
CREATE INDEX IF NOT EXISTS ix_cm_ai_retrieval_log_item_m_object
  ON common.cm_ai_retrieval_log_item_m (ai_object_id);

CREATE TABLE IF NOT EXISTS common.cm_ai_conversation_m (
  ai_conversation_id BIGSERIAL PRIMARY KEY,
  owner_user_id BIGINT,
  source_app_code VARCHAR(30),
  conversation_scope_code VARCHAR(40) NOT NULL DEFAULT 'private',
  conversation_status_code VARCHAR(40) NOT NULL DEFAULT 'active',
  title VARCHAR(300),
  summary TEXT,
  last_message_at TIMESTAMPTZ(6),
  metadata_jsonb JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  memo TEXT,
  created_by BIGINT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_by BIGINT,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  last_source TEXT,
  last_activity TEXT,
  transaction_id UUID
);

CREATE INDEX IF NOT EXISTS ix_cm_ai_conversation_m_owner_updated
  ON common.cm_ai_conversation_m (owner_user_id, updated_at);
CREATE INDEX IF NOT EXISTS ix_cm_ai_conversation_m_source_status
  ON common.cm_ai_conversation_m (source_app_code, conversation_status_code);

CREATE TABLE IF NOT EXISTS common.cm_ai_message_m (
  ai_message_id BIGSERIAL PRIMARY KEY,
  ai_conversation_id BIGINT NOT NULL,
  parent_message_id BIGINT,
  message_seq INTEGER NOT NULL,
  role_code VARCHAR(40) NOT NULL,
  message_status_code VARCHAR(40) NOT NULL DEFAULT 'completed',
  content_text TEXT,
  content_jsonb JSONB,
  token_count INTEGER,
  metadata_jsonb JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  memo TEXT,
  created_by BIGINT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_by BIGINT,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  last_source TEXT,
  last_activity TEXT,
  transaction_id UUID,
  CONSTRAINT fk_cm_ai_message_m_conversation
    FOREIGN KEY (ai_conversation_id)
    REFERENCES common.cm_ai_conversation_m (ai_conversation_id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_cm_ai_message_m_conversation_seq
  ON common.cm_ai_message_m (ai_conversation_id, message_seq);
CREATE INDEX IF NOT EXISTS ix_cm_ai_message_m_conversation_created
  ON common.cm_ai_message_m (ai_conversation_id, created_at);

CREATE TABLE IF NOT EXISTS common.cm_ai_reference_m (
  ai_reference_id BIGSERIAL PRIMARY KEY,
  ai_conversation_id BIGINT NOT NULL,
  ai_message_id BIGINT,
  ai_object_id BIGINT,
  ai_chunk_id BIGINT,
  source_app_code VARCHAR(30),
  entity_type_code VARCHAR(80),
  entity_id VARCHAR(200),
  reference_kind_code VARCHAR(40) NOT NULL DEFAULT 'manual',
  citation_id VARCHAR(120),
  citation_label VARCHAR(120),
  target_jsonb JSONB,
  metadata_jsonb JSONB,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_cm_ai_reference_m_conversation
    FOREIGN KEY (ai_conversation_id)
    REFERENCES common.cm_ai_conversation_m (ai_conversation_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cm_ai_reference_m_message
    FOREIGN KEY (ai_message_id)
    REFERENCES common.cm_ai_message_m (ai_message_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cm_ai_reference_m_object
    FOREIGN KEY (ai_object_id)
    REFERENCES common.cm_ai_object_m (ai_object_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cm_ai_reference_m_chunk
    FOREIGN KEY (ai_chunk_id)
    REFERENCES common.cm_ai_chunk_m (ai_chunk_id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_cm_ai_reference_m_conversation_created
  ON common.cm_ai_reference_m (ai_conversation_id, created_at);
CREATE INDEX IF NOT EXISTS ix_cm_ai_reference_m_object
  ON common.cm_ai_reference_m (ai_object_id);

CREATE TABLE IF NOT EXISTS common.cm_ai_run_m (
  ai_run_id BIGSERIAL PRIMARY KEY,
  ai_conversation_id BIGINT NOT NULL,
  request_message_id BIGINT,
  response_message_id BIGINT,
  user_id BIGINT,
  run_type_code VARCHAR(40) NOT NULL DEFAULT 'chat',
  run_status_code VARCHAR(40) NOT NULL DEFAULT 'pending',
  provider_code VARCHAR(80),
  model_name VARCHAR(160),
  deployment_name VARCHAR(160),
  started_at TIMESTAMPTZ(6),
  finished_at TIMESTAMPTZ(6),
  latency_ms INTEGER,
  input_token_count INTEGER,
  output_token_count INTEGER,
  total_token_count INTEGER,
  last_error_message VARCHAR(1000),
  request_jsonb JSONB,
  response_jsonb JSONB,
  metadata_jsonb JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  memo TEXT,
  created_by BIGINT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_by BIGINT,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  last_source TEXT,
  last_activity TEXT,
  transaction_id UUID,
  CONSTRAINT fk_cm_ai_run_m_conversation
    FOREIGN KEY (ai_conversation_id)
    REFERENCES common.cm_ai_conversation_m (ai_conversation_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cm_ai_run_m_request_message
    FOREIGN KEY (request_message_id)
    REFERENCES common.cm_ai_message_m (ai_message_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cm_ai_run_m_response_message
    FOREIGN KEY (response_message_id)
    REFERENCES common.cm_ai_message_m (ai_message_id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_cm_ai_run_m_conversation_created
  ON common.cm_ai_run_m (ai_conversation_id, created_at);
CREATE INDEX IF NOT EXISTS ix_cm_ai_run_m_status_created
  ON common.cm_ai_run_m (run_status_code, created_at);

CREATE TABLE IF NOT EXISTS common.cm_ai_run_source_r (
  ai_run_source_id BIGSERIAL PRIMARY KEY,
  ai_run_id BIGINT NOT NULL,
  ai_retrieval_log_id BIGINT,
  ai_reference_id BIGINT,
  ai_object_id BIGINT,
  ai_chunk_id BIGINT,
  source_kind_code VARCHAR(40) NOT NULL DEFAULT 'manual',
  rank_no INTEGER,
  included_in_prompt BOOLEAN NOT NULL DEFAULT FALSE,
  citation_id VARCHAR(120),
  metadata_jsonb JSONB,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_cm_ai_run_source_r_run
    FOREIGN KEY (ai_run_id)
    REFERENCES common.cm_ai_run_m (ai_run_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cm_ai_run_source_r_reference
    FOREIGN KEY (ai_reference_id)
    REFERENCES common.cm_ai_reference_m (ai_reference_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cm_ai_run_source_r_object
    FOREIGN KEY (ai_object_id)
    REFERENCES common.cm_ai_object_m (ai_object_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cm_ai_run_source_r_chunk
    FOREIGN KEY (ai_chunk_id)
    REFERENCES common.cm_ai_chunk_m (ai_chunk_id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_cm_ai_run_source_r_run_rank
  ON common.cm_ai_run_source_r (ai_run_id, rank_no);
CREATE INDEX IF NOT EXISTS ix_cm_ai_run_source_r_object
  ON common.cm_ai_run_source_r (ai_object_id);

DO $$
BEGIN
  IF to_regclass('common.cm_ai_source_m') IS NOT NULL
     AND EXISTS (
       SELECT 1
         FROM pg_trigger
        WHERE tgrelid = 'common.cm_ai_source_m'::regclass
          AND tgname = 'trg_cm_ai_source_h'
          AND NOT tgisinternal
     )
  THEN
    EXECUTE 'ALTER TABLE common.cm_ai_source_m ENABLE TRIGGER trg_cm_ai_source_h';
  END IF;

  IF to_regclass('common.cm_ai_object_m') IS NOT NULL
     AND EXISTS (
       SELECT 1
         FROM pg_trigger
        WHERE tgrelid = 'common.cm_ai_object_m'::regclass
          AND tgname = 'trg_cm_ai_object_h'
          AND NOT tgisinternal
     )
  THEN
    EXECUTE 'ALTER TABLE common.cm_ai_object_m ENABLE TRIGGER trg_cm_ai_object_h';
  END IF;

  IF to_regclass('common.cm_ai_index_state_m') IS NOT NULL
     AND EXISTS (
       SELECT 1
         FROM pg_trigger
        WHERE tgrelid = 'common.cm_ai_index_state_m'::regclass
          AND tgname = 'trg_cm_ai_index_state_h'
          AND NOT tgisinternal
     )
  THEN
    EXECUTE 'ALTER TABLE common.cm_ai_index_state_m ENABLE TRIGGER trg_cm_ai_index_state_h';
  END IF;
END $$;
