CREATE TABLE "crm"."crm_contract_approval_m" (
  "contract_approval_id" BIGSERIAL PRIMARY KEY,
  "contract_id" BIGINT NOT NULL,
  "request_key" UUID NOT NULL,
  "requester_id" BIGINT NOT NULL,
  "requester_name" TEXT NOT NULL,
  "approver_id" BIGINT NOT NULL,
  "approver_name" TEXT NOT NULL,
  "document_id" BIGINT NOT NULL,
  "document_title" TEXT NOT NULL,
  "snapshot_jsonb" JSONB NOT NULL,
  "version_key" TEXT NOT NULL,
  "status_code" TEXT NOT NULL,
  "reason" TEXT,
  "decided_at" TIMESTAMPTZ(6),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "crm_contract_approval_m_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "crm"."crm_contract_m"("contract_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "crm"."crm_contract_approval_h" (
  "contract_approval_id" BIGINT NOT NULL,
  "history_seq" BIGINT NOT NULL,
  "event_type" CHAR(1) NOT NULL,
  "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "event_by" BIGINT,
  "contract_id" BIGINT NOT NULL,
  "request_key" UUID NOT NULL,
  "requester_id" BIGINT NOT NULL,
  "requester_name" TEXT NOT NULL,
  "approver_id" BIGINT NOT NULL,
  "approver_name" TEXT NOT NULL,
  "document_id" BIGINT NOT NULL,
  "document_title" TEXT NOT NULL,
  "snapshot_jsonb" JSONB NOT NULL,
  "version_key" TEXT NOT NULL,
  "status_code" TEXT NOT NULL,
  "reason" TEXT,
  "decided_at" TIMESTAMPTZ(6),
  "is_active" BOOLEAN NOT NULL,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_by" BIGINT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "last_source" TEXT,
  "last_activity" TEXT,
  "transaction_id" UUID,
  CONSTRAINT "pk_crm_contract_approval_h" PRIMARY KEY ("contract_approval_id", "history_seq")
);
CREATE UNIQUE INDEX "ux_crm_contract_approval_request" ON "crm"."crm_contract_approval_m" ("request_key");
CREATE INDEX "ix_crm_contract_approval_contract" ON "crm"."crm_contract_approval_m" ("contract_id", "contract_approval_id");
CREATE INDEX "ix_crm_contract_approval_inbox" ON "crm"."crm_contract_approval_m" ("approver_id", "status_code", "contract_approval_id");
CREATE INDEX "ix_crm_contract_approval_h_event_at" ON "crm"."crm_contract_approval_h" ("event_at");
CREATE UNIQUE INDEX "ux_crm_contract_approval_pending" ON "crm"."crm_contract_approval_m" ("contract_id") WHERE "status_code" = 'pending' AND "is_active";
ALTER TABLE "crm"."crm_contract_approval_m" ADD CONSTRAINT "ck_crm_contract_approval_actor" CHECK ("requester_id" <> "approver_id");
ALTER TABLE "crm"."crm_contract_approval_m" ADD CONSTRAINT "ck_crm_contract_approval_state" CHECK (
  ("status_code" = 'pending' AND "decided_at" IS NULL) OR
  ("status_code" IN ('approved', 'rejected', 'withdrawn') AND "decided_at" IS NOT NULL)
);
ALTER TABLE "crm"."crm_contract_approval_m" ADD CONSTRAINT "ck_crm_contract_approval_reason" CHECK ("status_code" <> 'rejected' OR length(btrim("reason")) > 0 AND "reason" IS NOT NULL);
