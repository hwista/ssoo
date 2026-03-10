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
} from './aiApi';

export { assistantSessionApi } from './assistantSessionApi';
export type { AssistantSessionPayload } from './assistantSessionApi';

export { gitApi } from './gitApi';
export type { GitFileStatus, GitChangeEntry, GitLogEntry } from './gitApi';

export { settingsApi } from './settingsApi';
export type { GitConfigClient, DmsConfigClient, DeepPartialClient, SettingsResponse } from './settingsApi';

export { storageApi, ingestApi } from './storageApi';
export type { StorageReferenceClient, StorageOpenResultClient, IngestJobClient } from './storageApi';

export { templateApi } from './templateApi';
