CREATE TABLE "pms"."cm_system_instance_m" (
    "system_instance_id" BIGSERIAL NOT NULL,
    "instance_code" VARCHAR(50) NOT NULL,
    "instance_name" VARCHAR(200) NOT NULL,
    "system_catalog_id" BIGINT NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "site_id" BIGINT NOT NULL,
    "parent_code" VARCHAR(50),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "operator_type" VARCHAR(50),
    "operator_user_id" BIGINT,
    "version" VARCHAR(50),
    "description" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_system_instance_m_pkey" PRIMARY KEY ("system_instance_id")
);

CREATE TABLE "pms"."cm_system_instance_h" (
    "system_instance_id" BIGINT NOT NULL,
    "history_seq" INTEGER NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_by" BIGINT,
    "instance_code" VARCHAR(50) NOT NULL,
    "instance_name" VARCHAR(200) NOT NULL,
    "system_catalog_id" BIGINT NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "site_id" BIGINT NOT NULL,
    "parent_code" VARCHAR(50),
    "sort_order" INTEGER NOT NULL,
    "operator_type" VARCHAR(50),
    "operator_user_id" BIGINT,
    "version" VARCHAR(50),
    "description" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_source" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "pk_cm_system_instance_h" PRIMARY KEY ("system_instance_id","history_seq")
);

CREATE UNIQUE INDEX "cm_system_instance_m_instance_code_key" ON "pms"."cm_system_instance_m"("instance_code");
CREATE INDEX "ix_cm_system_instance_m_name" ON "pms"."cm_system_instance_m"("instance_name");
CREATE INDEX "ix_cm_system_instance_m_customer" ON "pms"."cm_system_instance_m"("customer_id");
CREATE INDEX "ix_cm_system_instance_m_site" ON "pms"."cm_system_instance_m"("site_id");
CREATE INDEX "ix_cm_system_instance_m_catalog" ON "pms"."cm_system_instance_m"("system_catalog_id");
CREATE INDEX "ix_cm_system_instance_m_parent" ON "pms"."cm_system_instance_m"("parent_code");
CREATE INDEX "ix_cm_system_instance_m_operator_type" ON "pms"."cm_system_instance_m"("operator_type");
CREATE INDEX "ix_cm_system_instance_m_active" ON "pms"."cm_system_instance_m"("is_active");
CREATE INDEX "ix_cm_system_instance_h_event_at" ON "pms"."cm_system_instance_h"("event_at");
CREATE INDEX "ix_cm_system_instance_h_tx" ON "pms"."cm_system_instance_h"("transaction_id");
