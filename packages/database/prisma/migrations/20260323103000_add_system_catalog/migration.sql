CREATE TABLE "pms"."cm_system_catalog_m" (
    "system_catalog_id" BIGSERIAL NOT NULL,
    "catalog_code" VARCHAR(50) NOT NULL,
    "catalog_name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "parent_code" VARCHAR(50),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_system_catalog_m_pkey" PRIMARY KEY ("system_catalog_id")
);

CREATE TABLE "pms"."cm_system_catalog_h" (
    "system_catalog_id" BIGINT NOT NULL,
    "history_seq" INTEGER NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_by" BIGINT,
    "catalog_code" VARCHAR(50) NOT NULL,
    "catalog_name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "parent_code" VARCHAR(50),
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pk_cm_system_catalog_h" PRIMARY KEY ("system_catalog_id","history_seq")
);

CREATE UNIQUE INDEX "cm_system_catalog_m_catalog_code_key" ON "pms"."cm_system_catalog_m"("catalog_code");
CREATE INDEX "ix_cm_system_catalog_m_name" ON "pms"."cm_system_catalog_m"("catalog_name");
CREATE INDEX "ix_cm_system_catalog_m_parent" ON "pms"."cm_system_catalog_m"("parent_code");
CREATE INDEX "ix_cm_system_catalog_m_active" ON "pms"."cm_system_catalog_m"("is_active");
CREATE INDEX "ix_cm_system_catalog_h_event_at" ON "pms"."cm_system_catalog_h"("event_at");
CREATE INDEX "ix_cm_system_catalog_h_tx" ON "pms"."cm_system_catalog_h"("transaction_id");
