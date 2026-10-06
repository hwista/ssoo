-- Protected baseline migrations created history primary keys as pk_<table>, while the
-- Prisma schema and the launch baseline use PostgreSQL's default <table>_pkey name.
-- Prisma db push cannot rename them (it combines RENAME CONSTRAINT with other ALTER TABLE
-- actions, which PostgreSQL rejects), so align the names after the protected migrations.
-- Models that explicitly map their primary key to pk_<table> keep that name.
DO $$
DECLARE
  target RECORD;
BEGIN
  FOR target IN
    SELECT n.nspname AS schema_name,
           c.relname AS table_name,
           con.conname AS constraint_name
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE con.contype = 'p'
       AND n.nspname IN ('common', 'crm', 'dms', 'pms', 'sns')
       AND con.conname = 'pk_' || c.relname
       AND c.relname NOT IN (
         'crm_contract_approval_h',
         'dm_user_document_activity_h',
         'pr_user_settings_h'
       )
       AND to_regclass(format('%I.%I', n.nspname, c.relname || '_pkey')) IS NULL
     ORDER BY n.nspname, c.relname
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I RENAME CONSTRAINT %I TO %I',
      target.schema_name,
      target.table_name,
      target.constraint_name,
      target.table_name || '_pkey'
    );
    RAISE NOTICE 'renamed primary key %.% to %', target.schema_name, target.constraint_name, target.table_name || '_pkey';
  END LOOP;
END $$;
