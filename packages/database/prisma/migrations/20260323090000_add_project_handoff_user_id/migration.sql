ALTER TABLE "pms"."pr_project_m"
ADD COLUMN "handoff_user_id" BIGINT;

ALTER TABLE "pms"."pr_project_h"
ADD COLUMN "handoff_user_id" BIGINT;
