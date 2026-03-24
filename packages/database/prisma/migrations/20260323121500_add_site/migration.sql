CREATE TABLE "pms"."cm_site_m" (
    "site_id" BIGSERIAL NOT NULL,
    "site_code" VARCHAR(50) NOT NULL,
    "site_name" VARCHAR(200) NOT NULL,
    "site_type" VARCHAR(50),
    "customer_id" BIGINT NOT NULL,
    "parent_code" VARCHAR(50),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "address" VARCHAR(500),
    "region" VARCHAR(100),
    "contact_person" VARCHAR(100),
    "contact_phone" VARCHAR(50),
    "description" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_site_m_pkey" PRIMARY KEY ("site_id")
);

CREATE TABLE "pms"."cm_site_h" (
    "site_id" BIGINT NOT NULL,
    "history_seq" INTEGER NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_by" BIGINT,
    "site_code" VARCHAR(50) NOT NULL,
    "site_name" VARCHAR(200) NOT NULL,
    "site_type" VARCHAR(50),
    "customer_id" BIGINT NOT NULL,
    "parent_code" VARCHAR(50),
    "sort_order" INTEGER NOT NULL,
    "address" VARCHAR(500),
    "region" VARCHAR(100),
    "contact_person" VARCHAR(100),
    "contact_phone" VARCHAR(50),
    "description" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pk_cm_site_h" PRIMARY KEY ("site_id","history_seq")
);

ALTER TABLE "pms"."pr_project_m" RENAME COLUMN "plant_id" TO "site_id";
ALTER TABLE "pms"."pr_project_h" RENAME COLUMN "plant_id" TO "site_id";

CREATE UNIQUE INDEX "cm_site_m_site_code_key" ON "pms"."cm_site_m"("site_code");
CREATE INDEX "ix_cm_site_m_name" ON "pms"."cm_site_m"("site_name");
CREATE INDEX "ix_cm_site_m_customer" ON "pms"."cm_site_m"("customer_id");
CREATE INDEX "ix_cm_site_m_parent" ON "pms"."cm_site_m"("parent_code");
CREATE INDEX "ix_cm_site_m_active" ON "pms"."cm_site_m"("is_active");
CREATE INDEX "ix_cm_site_h_event_at" ON "pms"."cm_site_h"("event_at");
CREATE INDEX "ix_cm_site_h_tx" ON "pms"."cm_site_h"("transaction_id");
