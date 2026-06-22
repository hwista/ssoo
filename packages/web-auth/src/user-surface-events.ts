export const SSOO_USER_SURFACE_CHANGED_EVENT = 'ssoo-user-surface-changed';

export type SsooUserSurfaceEventType =
  | 'user.profile.updated'
  | 'user.settings.updated'
  | 'sns.follow.changed'
  | 'sns.feed.changed';

export interface SsooUserSurfaceChangedDetail {
  type: SsooUserSurfaceEventType;
  userId?: string;
  actorUserId?: string;
  postId?: string;
}

export function dispatchSsooUserSurfaceChanged(detail: SsooUserSurfaceChangedDetail): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<SsooUserSurfaceChangedDetail>(
    SSOO_USER_SURFACE_CHANGED_EVENT,
    { detail },
  ));
}
