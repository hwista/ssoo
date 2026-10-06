-- Compat shim applied right before launch migration 20261001120000_crm_planning_organization.
-- 20260813110000 created this UNIQUE as a table constraint, which the launch migration drops with
-- DROP CONSTRAINT. A compat database got the same rule from `prisma db push` as a unique index with
-- the same name, so promote that index to the constraint first. No rows change.
DO $$
BEGIN
  IF NOT EXISTS (
       SELECT 1 FROM pg_constraint
        WHERE conname = 'crm_cost_plan_internal_item_monthly_d_target_year_item_code_key'
     )
     AND EXISTS (
       SELECT 1 FROM pg_indexes
        WHERE schemaname = 'crm'
          AND indexname = 'crm_cost_plan_internal_item_monthly_d_target_year_item_code_key'
     ) THEN
    ALTER TABLE crm.crm_cost_plan_internal_item_monthly_d
      ADD CONSTRAINT crm_cost_plan_internal_item_monthly_d_target_year_item_code_key
      UNIQUE USING INDEX crm_cost_plan_internal_item_monthly_d_target_year_item_code_key;
  END IF;
END $$;

-- The migration also drops three partial unique indexes before recreating them with new
-- definitions. They are not modeled in schema.prisma, so a compat database never had them.
-- Empty placeholders (WHERE false) let the migration replace them within the same transaction.
CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_business_plan_m_confirmed_year
  ON crm.crm_business_plan_m(base_year) WHERE false;
CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_report_confirmation_m_active_basis
  ON crm.crm_report_confirmation_m(target_year) WHERE false;
CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_cost_plan_accounting_handoff_m_active_basis
  ON crm.crm_cost_plan_accounting_handoff_m(target_year) WHERE false;
