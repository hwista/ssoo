-- Draft contracts preserve absent dates; confirmation validates the period.
ALTER TABLE crm.crm_contract_m ALTER COLUMN contract_start_date DROP NOT NULL, ALTER COLUMN contract_end_date DROP NOT NULL;
ALTER TABLE crm.crm_contract_h ALTER COLUMN contract_start_date DROP NOT NULL, ALTER COLUMN contract_end_date DROP NOT NULL;
