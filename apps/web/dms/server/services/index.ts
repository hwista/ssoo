/**
 * 서비스 레이어 진입점
 */

// Config Service
export {
  configService,
  type DmsConfig,
  type GitConfig,
  type DeepPartial,
} from './config/ConfigService';

// File System Service
export {
  fileSystemService,
  type ServiceResult,
  type GetTreeOptions,
} from './fileSystem/FileSystemService';
export {
  fileCrudService,
  type FileStatMetadata,
  type FileData,
  type FileCrudResult,
} from './file/FileCrudService';
export {
  chatSessionService,
  type PersistedChatSession,
  type ChatSessionServiceResult,
} from './chatSession/ChatSessionService';

// Git Service
export {
  gitService,
  type GitChangeEntry,
  type GitLogEntry,
  type GitDiffResult,
  type GitFileStatus,
  type GitResult,
} from './git/GitService';

// Storage Service
export {
  storageAdapterService,
  type StorageReference,
  type StorageUploadRequest,
  type StorageOpenRequest,
  type StorageOpenResult,
} from './storage/StorageAdapterService';

// Ingest Queue Service
export {
  ingestQueueService,
  type IngestJob,
  type IngestJobStatus,
  type SubmitIngestRequest,
} from './ingest/IngestQueueService';
export {
  settingsService,
  type SettingsSnapshot,
  type SettingsServiceResult,
} from './settings/SettingsService';

export { templateService } from './template/TemplateService';
export { docAssistService } from './docAssist/DocAssistService';
export { documentMetadataService } from './documentMetadata/DocumentMetadataService';
export {
  contentService,
  type ContentResult,
  type ContentData,
  type ContentSaveOptions,
  type ContentLoadOptions,
} from './content/ContentService';
