-- Only accounts created by the trusted initial/demo seeds are bootstrapped.
-- Never update an existing pending/suspended enrollment or a revoked grant.
INSERT INTO common.cm_platform_enrollment_m (user_id,status_code,source_code,last_source,last_activity)
SELECT user_id, CASE WHEN is_active THEN 'active' ELSE 'suspended' END, 'bootstrap', 'SEED', 'onboarding.bootstrap'
FROM common.cm_user_m WHERE last_source = 'SEED'
AND email IN ('admin@company.com','pm.kim@company.com','dev.lee@company.com','am.park@company.com','sm.choi@company.com','dev.park@company.com','viewer.han@company.com','con.jung@company.com')
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO common.cm_service_grant_m (user_id,service_code,role_code,scope_key,source_code,last_source,last_activity)
SELECT u.user_id,s.code,u.role_code,'platform','bootstrap','SEED','onboarding.bootstrap'
FROM common.cm_user_m u JOIN common.cm_platform_enrollment_m e ON e.user_id = u.user_id AND e.source_code = 'bootstrap'
CROSS JOIN (VALUES ('crm'),('pms'),('dms'),('sns')) s(code)
ON CONFLICT (user_id,service_code,scope_key) DO NOTHING;
