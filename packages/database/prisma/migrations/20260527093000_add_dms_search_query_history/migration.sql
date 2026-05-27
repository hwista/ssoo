-- DMS AI search history / popular keyword source table.
-- The application keeps an idempotent runtime fallback, but this migration is the formal launch artifact.

CREATE SCHEMA IF NOT EXISTS "dms";

CREATE TABLE IF NOT EXISTS "dms"."dm_search_query_m" (
  "search_query_id" BIGSERIAL NOT NULL,
  "user_id" BIGINT NOT NULL,
  "query" TEXT NOT NULL,
  "normalized_query" TEXT NOT NULL,
  "search_count" INTEGER NOT NULL DEFAULT 1,
  "last_result_count" INTEGER NOT NULL DEFAULT 0,
  "first_searched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_searched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

  CONSTRAINT "dm_search_query_m_pkey" PRIMARY KEY ("search_query_id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_dm_search_query_m_user'
      AND conrelid = '"dms"."dm_search_query_m"'::regclass
  ) THEN
    ALTER TABLE "dms"."dm_search_query_m"
      ADD CONSTRAINT "fk_dm_search_query_m_user"
      FOREIGN KEY ("user_id")
      REFERENCES "common"."cm_user_m"("user_id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ux_dm_search_query_m_user_normalized"
  ON "dms"."dm_search_query_m" ("user_id", "normalized_query");

CREATE INDEX IF NOT EXISTS "ix_dm_search_query_m_user_last"
  ON "dms"."dm_search_query_m" ("user_id", "last_searched_at" DESC);

CREATE INDEX IF NOT EXISTS "ix_dm_search_query_m_popular"
  ON "dms"."dm_search_query_m" ("normalized_query", "search_count" DESC, "last_searched_at" DESC);
