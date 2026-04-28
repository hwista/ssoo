-- =========================================================
-- DMS Configuration Foundation
-- dm_config_m: 시스템 설정 시드
--
-- 운영 환경 설정 가이드:
--   1. git.bootstrapRemoteUrl: GitLab 문서 전용 레포 URL을 설정하면
--      서버 시작 시 해당 레포를 docDir에 clone합니다.
--      예) "http://gitlab.company.com/docs/dms-documents.git"
--      환경변수: DMS_GIT_BOOTSTRAP_REMOTE_URL (DB 설정보다 우선)
--
--   2. git.bootstrapBranch: clone 시 사용할 브랜치 (빈 문자열이면 기본 브랜치)
--      예) "main" 또는 "development"
--      환경변수: DMS_GIT_BOOTSTRAP_BRANCH (DB 설정보다 우선)
--
--   3. git.repositoryPath: 문서 루트 경로.
--      Docker 환경에서는 DMS_MARKDOWN_ROOT 환경변수가 우선 적용됩니다.
--      compose.yaml 기본값: /var/lib/ssoo/dms/documents
--
--   4. 이 시드는 ON CONFLICT DO NOTHING이므로 이미 설정이 있으면
--      덮어쓰지 않습니다. 기존 설정 변경은 DMS 설정 UI를 사용하세요.
--
--   5. 실시간 동기화 흐름:
--      파일 편집 → 4초 debounce → auto git commit → auto push (remote 설정 시)
--      collaboration.service.ts의 publishJob이 자동으로 처리합니다.
-- =========================================================

INSERT INTO dms.dm_config_m (scope_code, owner_ref, config_data, is_active, created_at, updated_at)
VALUES (
  'system',
  '_system_',
  '{
    "git": {
      "repositoryPath": "../../../.runtime/dms/documents",
      "bootstrapRemoteUrl": "",
      "bootstrapBranch": "",
      "autoInit": true
    },
    "storage": {
      "defaultProvider": "sharepoint",
      "local": { "enabled": true, "basePath": "../../../.runtime/dms/storage/local" },
      "sharepoint": { "enabled": true, "basePath": "/sites/dms/shared-documents", "webBaseUrl": "https://sharepoint.local" },
      "nas": { "enabled": true, "basePath": "/mnt/nas/dms", "webBaseUrl": "file:///mnt/nas/dms" }
    },
    "ingest": { "queuePath": "../../../.runtime/dms/ingest", "autoPublish": false, "maxConcurrentJobs": 2 },
    "templates": {},
    "extraction": { "maxTextLength": 12000, "maxImages": 5, "maxImageSizeMb": 1, "pdfMaxRenderPages": 3, "pdfRenderScale": 1.0 },
    "uploads": { "attachmentMaxSizeMb": 20, "imageMaxSizeMb": 10 },
    "search": { "maxResults": 100, "semanticThreshold": 0.5, "chunkSize": 1000, "chunkOverlap": 200, "summaryConcurrency": 3 },
    "docAssist": { "maxCurrentContentChars": 6000, "maxTemplateChars": 1500, "maxSummaryFileCount": 2, "maxSummaryFileChars": 2000, "maxImagesPerRequest": 5 },
    "m365": {
      "sharepoint": { "tenantDomain": "", "sitePath": "/sites/dms", "defaultLibrary": "shared-documents" },
      "teams": { "enabled": false, "ingestEnabled": false, "defaultTeam": "", "defaultChannel": "", "defaultDropPath": "" },
      "auth": { "mode": "anonymous-first", "allowedTenantIds": [], "allowedDomains": [], "identityMapping": "mail" }
    }
  }'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (scope_code, owner_ref) DO NOTHING;
