export {
  request,
  get,
  post,
  put,
  del,
  formatApiError,
  getErrorMessage,
} from './core';
export type { ApiResponse, ApiRequestOptions } from './core';

export { fileApi, filesApi, getFileWithHeaders } from './fileApi';
export type { FileAction, FileApiRequest } from './fileApi';

export { aiApi, docAssistApi } from './aiApi';
export type {
  AiSearchResultItem,
  AiSearchResponse,
  AiAskResponse,
  DocAssistSummaryFileClient,
  DocAssistComposeResponse,
  DocAssistRecommendResponse,
  DocAssistComposeCallbacks,
} from './aiApi';

export { assistantSessionApi } from './assistantSessionApi';
export type { AssistantSessionPayload } from './assistantSessionApi';

export { gitApi } from './gitApi';
export type { GitFileStatus, GitChangeEntry, GitLogEntry } from './gitApi';

export { settingsApi } from './settingsApi';
export type {
  DeepPartialClient,
  DmsPersonalSettingsClient,
  DmsSettingsConfigClient,
  DmsSystemConfigClient,
  SettingsAccessClient,
  SettingsResponse,
} from './settingsApi';

export { storageApi, ingestApi } from './storageApi';
export type { StorageReferenceClient, StorageOpenResultClient, IngestJobClient } from './storageApi';

export { templateApi } from './templateApi';

export { contentApi } from './contentApi';
export type { ContentData, ContentSaveResult, ContentDeleteResult } from './contentApi';
