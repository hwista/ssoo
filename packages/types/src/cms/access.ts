import type { PermissionResolutionTrace } from '../common/access';

export interface CmsFeatureAccess {
  canReadFeed: boolean;
  canCreatePost: boolean;
  canComment: boolean;
  canReact: boolean;
  canFollow: boolean;
  canManageSkills: boolean;
  canManageBoards: boolean;
}

export interface CmsAccessSnapshot {
  features: CmsFeatureAccess;
  policy: PermissionResolutionTrace;
}
