import type { PermissionResolutionTrace } from '../common/access';

export interface SnsFeatureAccess {
  canReadFeed: boolean;
  canCreatePost: boolean;
  canComment: boolean;
  canReact: boolean;
  canFollow: boolean;
  canManageSkills: boolean;
  canManageBoards: boolean;
}

export interface SnsAccessSnapshot {
  features: SnsFeatureAccess;
  policy: PermissionResolutionTrace;
}
