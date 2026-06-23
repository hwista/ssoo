// Common Types

// API
export type {
  ApiResponse,
  PaginationParams,
  IdParam,
} from './api';

// Auth
export type {
  LoginRequest,
  AuthTokens,
  AuthIdentity,
  ProfileSummary,
  AuthProfileDisplayProjection,
  AuthIdentityProfileProjection,
  SsooAppKey,
  AuthSessionStatus,
  AuthSessionBootstrap,
  AuthLogoutResult,
  AuthUser,
  AuthIdentityProviderKey,
  AuthRegistrationRequestStatus,
  AuthEmailDeliveryMode,
  AuthPublicActionLink,
  AuthPublicIdentityProvider,
  AuthPublicLoginConfig,
  AuthProviderSettings,
  UpdateAuthProviderSettingsRequest,
  AuthRegistrationRequestItem,
  AuthRegistrationRequestListResult,
  AuthAssignableRole,
  DecideAuthRegistrationRequest,
  RequestPasswordResetRequest,
  RequestPasswordResetResult,
  ConfirmPasswordResetRequest,
  ConfirmPasswordResetResult,
} from './auth';

// Access
export type {
  AccessInspectionObjectSnapshot,
  AccessInspectionResult,
  AccessInspectionSnapshot,
  AccessInspectionSubject,
  PermissionCatalogGroup,
  PermissionCatalogItem,
  PermissionCatalogOwner,
  PermissionCatalogResult,
  PermissionCatalogStatus,
  PermissionExceptionAxis,
  PermissionExceptionListResult,
  PermissionExceptionRecord,
  PermissionEffectType,
  PermissionResolutionTrace,
} from './access';

// Notification
export type {
  CommonNotificationAction,
  CommonNotificationActionType,
  CommonNotificationDomainEvent,
  CommonNotificationItem,
  CommonNotificationJsonValue,
  CommonNotificationArchiveResult,
  CommonNotificationListQuery,
  CommonNotificationListResult,
  CommonNotificationMarkAllReadResult,
  CommonNotificationReference,
  CommonNotificationSeverity,
  CommonNotificationSourceApp,
  CommonNotificationStreamEvent,
  CommonNotificationStreamEventType,
  CommonNotificationUnreadCountResult,
} from './notification';

// Search
export type {
  CommonSearchBadge,
  CommonSearchBlockedSourceReason,
  CommonSearchBlockedSourceSummary,
  CommonSearchCapabilities,
  CommonSearchEntityFacet,
  CommonSearchEntityType,
  CommonSearchFacets,
  CommonSearchPermissionState,
  CommonSearchRanker,
  CommonSearchRequest,
  CommonSearchResponse,
  CommonSearchResult,
  CommonSearchSourceApp,
  CommonSearchSourceFacet,
  CommonSearchTarget,
} from './search';

// AI / RAG
export type {
  AiAclPolicyCode,
  AiChunkSnapshot,
  AiConversationCreateRequest,
  AiConversationScopeCode,
  AiConversationSnapshot,
  AiConversationStatusCode,
  AiConversationUpdateRequest,
  AiIndexJobStatusCode,
  AiIndexJobTypeCode,
  AiIndexProjection,
  AiJsonValue,
  AiMessageAppendRequest,
  AiMessageRoleCode,
  AiMessageSnapshot,
  AiMessageStatusCode,
  AiObjectKey,
  AiObjectSensitivityCode,
  AiReferenceInput,
  AiReferenceKindCode,
  AiReferenceSnapshot,
  AiRetrievalCitation,
  AiRetrievalModeCode,
  AiRetrievalRequest,
  AiRetrievalResponse,
  AiRetrievalStatusCode,
  AiRunCompleteRequest,
  AiRunSnapshot,
  AiRunSourceInput,
  AiRunSourceKindCode,
  AiRunSourceSnapshot,
  AiRunStartRequest,
  AiRunStatusCode,
  AiRunTypeCode,
  AiSourceStatusCode,
} from './ai';

export type {
  AiIndexAccessScopeCode,
  AiIndexAclProjection,
  AiIndexAdapterSyncRequest,
  AiIndexAdapterSyncResult,
  AiIndexApplyResult,
  AiIndexChunkProjection,
  AiIndexEmbeddingSyncSnapshot,
  AiIndexEmbeddingProfile,
  AiIndexEntityType,
  AiIndexJobErrorKind,
  AiIndexJobRequest,
  AiIndexJobRunResult,
  AiIndexJobRunSummary,
  AiIndexJobSafetyInput,
  AiIndexJobSafetySnapshot,
  AiIndexJobSnapshot,
  AiIndexJobStatus,
  AiIndexJobType,
  AiIndexJsonObject,
  AiIndexJsonValue,
  AiIndexObjectProjection,
  AiIndexObjectRef,
  AiIndexObjectStatus,
  AiIndexSensitivityCode,
  AiIndexSourceApp,
  AiIndexSourceStatus,
} from './ai-index';

export type {
  AiRetrievalCitation as CommonAiRetrievalCitation,
  AiRetrievalContextItem,
  AiRetrievalRequest as CommonAiRetrievalRequest,
  AiRetrievalResponse as CommonAiRetrievalResponse,
  AiRetrievalResultItem,
} from './ai-retrieval';

// User
export type {
  UserRole,
  User,
  CreateUserDto,
  UpdateUserDto,
} from './user';
