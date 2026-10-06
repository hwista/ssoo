-- CreateTable
CREATE TABLE "common"."cm_platform_enrollment_m" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "status_code" TEXT NOT NULL DEFAULT 'pending',
    "source_code" TEXT NOT NULL DEFAULT 'signup',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_platform_enrollment_m_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."cm_platform_enrollment_h" (
    "id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" BIGINT NOT NULL,
    "status_code" TEXT NOT NULL DEFAULT 'pending',
    "source_code" TEXT NOT NULL DEFAULT 'signup',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_platform_enrollment_h_pkey" PRIMARY KEY ("id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_onboarding_request_m" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "kind" TEXT NOT NULL,
    "status_code" TEXT NOT NULL DEFAULT 'pending',
    "org_id" BIGINT,
    "parent_org_id" BIGINT,
    "organization_name" TEXT,
    "service_code" TEXT,
    "message" TEXT NOT NULL,
    "decided_by" BIGINT,
    "decided_at" TIMESTAMP(3),
    "decision_message" TEXT,
    "resolved_org_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_onboarding_request_m_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."cm_onboarding_request_h" (
    "id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" BIGINT NOT NULL,
    "kind" TEXT NOT NULL,
    "status_code" TEXT NOT NULL DEFAULT 'pending',
    "org_id" BIGINT,
    "parent_org_id" BIGINT,
    "organization_name" TEXT,
    "service_code" TEXT,
    "message" TEXT NOT NULL,
    "decided_by" BIGINT,
    "decided_at" TIMESTAMP(3),
    "decision_message" TEXT,
    "resolved_org_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_onboarding_request_h_pkey" PRIMARY KEY ("id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_service_grant_m" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "org_id" BIGINT,
    "service_code" TEXT NOT NULL,
    "role_code" TEXT NOT NULL DEFAULT 'user',
    "scope_key" TEXT NOT NULL,
    "source_code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_service_grant_m_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."cm_service_grant_h" (
    "id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" BIGINT NOT NULL,
    "org_id" BIGINT,
    "service_code" TEXT NOT NULL,
    "role_code" TEXT NOT NULL DEFAULT 'user',
    "scope_key" TEXT NOT NULL,
    "source_code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_service_grant_h_pkey" PRIMARY KEY ("id","history_seq")
);

-- CreateTable
CREATE TABLE "common"."cm_approval_authority_m" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "org_id" BIGINT,
    "authority_kind" TEXT NOT NULL,
    "service_code" TEXT NOT NULL DEFAULT '',
    "scope_key" TEXT NOT NULL,
    "max_role_code" TEXT NOT NULL DEFAULT 'user',
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_approval_authority_m_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."cm_approval_authority_h" (
    "id" BIGINT NOT NULL,
    "history_seq" BIGINT NOT NULL,
    "event_type" CHAR(1) NOT NULL,
    "event_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" BIGINT NOT NULL,
    "org_id" BIGINT,
    "authority_kind" TEXT NOT NULL,
    "service_code" TEXT NOT NULL DEFAULT '',
    "scope_key" TEXT NOT NULL,
    "max_role_code" TEXT NOT NULL DEFAULT 'user',
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_source" TEXT,
    "last_activity" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "cm_approval_authority_h_pkey" PRIMARY KEY ("id","history_seq")
);

-- CreateIndex
CREATE UNIQUE INDEX "cm_platform_enrollment_m_user_id_key" ON "common"."cm_platform_enrollment_m"("user_id");

-- CreateIndex
CREATE INDEX "cm_onboarding_request_m_status_code_kind_idx" ON "common"."cm_onboarding_request_m"("status_code", "kind");

-- CreateIndex
CREATE INDEX "cm_onboarding_request_m_user_id_created_at_idx" ON "common"."cm_onboarding_request_m"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "cm_service_grant_m_user_id_service_code_scope_key_key" ON "common"."cm_service_grant_m"("user_id", "service_code", "scope_key");

-- CreateIndex
CREATE UNIQUE INDEX "cm_approval_authority_m_user_id_authority_kind_service_code_key" ON "common"."cm_approval_authority_m"("user_id", "authority_kind", "service_code", "scope_key");

-- AddForeignKey
ALTER TABLE "common"."cm_platform_enrollment_m" ADD CONSTRAINT "cm_platform_enrollment_m_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_onboarding_request_m" ADD CONSTRAINT "cm_onboarding_request_m_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_onboarding_request_m" ADD CONSTRAINT "cm_onboarding_request_m_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "common"."cm_organization_m"("org_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_onboarding_request_m" ADD CONSTRAINT "cm_onboarding_request_m_parent_org_id_fkey" FOREIGN KEY ("parent_org_id") REFERENCES "common"."cm_organization_m"("org_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_service_grant_m" ADD CONSTRAINT "cm_service_grant_m_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_service_grant_m" ADD CONSTRAINT "cm_service_grant_m_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "common"."cm_organization_m"("org_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_approval_authority_m" ADD CONSTRAINT "cm_approval_authority_m_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "common"."cm_user_m"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."cm_approval_authority_m" ADD CONSTRAINT "cm_approval_authority_m_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "common"."cm_organization_m"("org_id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Closed-platform admission is separate from the existing action/object policy.
-- Compatibility grants retain the pre-migration permission resolver; they do not
-- grant new permissions. Only users present in this migration receive them.
ALTER TABLE common.cm_platform_enrollment_m ADD CONSTRAINT ck_platform_enrollment_status
  CHECK (status_code IN ('pending','active','suspended'));
ALTER TABLE common.cm_onboarding_request_m ADD CONSTRAINT ck_onboarding_request_shape CHECK (
  status_code IN ('pending','approved','rejected','cancelled') AND
  ((kind = 'membership' AND org_id IS NOT NULL AND service_code IS NULL AND organization_name IS NULL AND parent_org_id IS NULL) OR
   (kind = 'service' AND org_id IS NOT NULL AND service_code IS NOT NULL AND service_code IN ('crm','pms','dms','sns') AND organization_name IS NULL AND parent_org_id IS NULL) OR
   (kind = 'organization' AND org_id IS NULL AND service_code IS NULL AND organization_name IS NOT NULL AND length(trim(organization_name)) > 0))
);
ALTER TABLE common.cm_service_grant_m ADD CONSTRAINT ck_service_grant_scope CHECK (
  service_code IN ('crm','pms','dms','sns') AND
  ((source_code IN ('migration','bootstrap') AND org_id IS NULL AND scope_key = 'platform') OR
   (source_code = 'approval' AND org_id IS NOT NULL AND scope_key = org_id::text AND role_code IN ('viewer','user','manager')))
);
ALTER TABLE common.cm_approval_authority_m ADD CONSTRAINT ck_approval_authority_scope CHECK (
  max_role_code IN ('viewer','user','manager') AND scope_key = COALESCE(org_id::text, 'platform') AND
  ((authority_kind = 'organization' AND org_id IS NOT NULL AND service_code = '') OR
   (authority_kind = 'service' AND service_code IN ('crm','pms','dms','sns')))
);
CREATE UNIQUE INDEX ux_onboarding_pending_scope ON common.cm_onboarding_request_m
  (user_id, kind, COALESCE(org_id, 0), COALESCE(parent_org_id, 0), COALESCE(service_code,''), lower(trim(COALESCE(organization_name,''))))
  WHERE status_code = 'pending';

INSERT INTO common.cm_platform_enrollment_m (user_id,status_code,source_code,memo,last_source,last_activity)
SELECT user_id, CASE WHEN is_active THEN 'active' ELSE 'suspended' END, 'migration',
  'Existing account at common-onboarding migration; original action and object policy retained.',
  'common-onboarding-migration','onboarding.migrate'
FROM common.cm_user_m;
INSERT INTO common.cm_service_grant_m (user_id,service_code,role_code,scope_key,source_code,memo,last_source,last_activity)
SELECT u.user_id, s.code, u.role_code, 'platform', 'migration',
  'Compatibility admission only; existing permissions still required.',
  'common-onboarding-migration','onboarding.migrate'
FROM common.cm_user_m u CROSS JOIN (VALUES ('crm'),('pms'),('dms'),('sns')) s(code);
-- Trigger installation follows migrations: explicitly record migration evidence.
INSERT INTO common.cm_platform_enrollment_h
 SELECT m.id, 1, 'C', CURRENT_TIMESTAMP, m.user_id,m.status_code,m.source_code,m.is_active,m.memo,
 m.created_by,m.created_at,m.updated_by,m.updated_at,m.last_source,m.last_activity,m.transaction_id
 FROM common.cm_platform_enrollment_m m;
INSERT INTO common.cm_service_grant_h
 SELECT m.id, 1, 'C', CURRENT_TIMESTAMP, m.user_id,m.org_id,m.service_code,m.role_code,m.scope_key,m.source_code,m.expires_at,m.is_active,m.memo,
 m.created_by,m.created_at,m.updated_by,m.updated_at,m.last_source,m.last_activity,m.transaction_id
 FROM common.cm_service_grant_m m;
