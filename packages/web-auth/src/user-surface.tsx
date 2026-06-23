'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Bookmark,
  Briefcase,
  Globe,
  Heart,
  Linkedin,
  Loader2,
  Mail,
  Pencil,
  RefreshCw,
  Save,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import type { ApiResponse } from '@ssoo/types/common';
import type { FeedItem, UpdateProfileDto, UserProfileSurface } from '@ssoo/types/sns';
import { applySharedAuthHeaders } from './storage';
import { restoreSharedAuthSession } from './session-bootstrap';
import { useCommonNotificationEventStream } from './notifications';
import {
  dispatchSsooUserSurfaceChanged,
  SSOO_USER_SURFACE_CHANGED_EVENT,
  type SsooUserSurfaceChangedDetail,
} from './user-surface-events';
import type { SsooUserSurfaceTabKind } from './user-surface-routing';
import {
  useSsooSettingsPageHeaderActions,
  useSsooSharedSurfacePageHeaderActions,
  type SsooSharedSurfacePageHeaderActions,
} from '@ssoo/web-shell';
import { Button, Input, Textarea } from '@ssoo/web-ui';

const DEFAULT_API_BASE_URL = 'http://localhost:4000/api';
const DEFAULT_EVENTS_PATH = '/api/notifications/events';
const PROFILE_FEED_LIMIT = 10;
const GET_REQUEST_DEDUPE_TTL_MS = 5000;
const REFRESH_DEBOUNCE_MS = 250;
const SNS_USER_SURFACE_DOMAIN_EVENTS = new Set([
  'user.profile.updated',
  'user.settings.updated',
  'sns.follow.changed',
  'sns.feed.changed',
]);

interface CachedGetRequest {
  expiresAt: number;
  promise: Promise<unknown>;
}

const getRequestCache = new Map<string, CachedGetRequest>();

interface FeedResult {
  items: FeedItem[];
  nextCursor?: string | null;
  hasMore?: boolean;
}

interface SsooUserSurfaceApi {
  getProfile: (userId?: string | null) => Promise<UserProfileSurface>;
  updateProfile: (data: UpdateProfileDto) => Promise<UserProfileSurface>;
  getProfileFeed: (userId: string) => Promise<FeedResult>;
  follow: (userId: string) => Promise<void>;
  unfollow: (userId: string) => Promise<void>;
  addReaction: (postId: string) => Promise<void>;
  removeReaction: (postId: string) => Promise<void>;
  addBookmark: (postId: string) => Promise<void>;
  removeBookmark: (postId: string) => Promise<void>;
}

interface ProfileFormState {
  displayName: string;
  avatarUrl: string;
  bio: string;
  coverImageUrl: string;
  linkedinUrl: string;
  websiteUrl: string;
}

export interface SsooUserSurfacePageProps {
  surface: SsooUserSurfaceTabKind;
  userId?: string | null;
  apiBaseUrl?: string;
  eventsPath?: string;
  onOpenProfile?: (userId: string) => void;
}

function normalizeApiBaseUrl(baseUrl?: string): string {
  const trimmed = baseUrl?.trim() || DEFAULT_API_BASE_URL;
  return trimmed.replace(/\/+$/, '');
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.message === 'string') {
    return record.message;
  }
  if (record.error && typeof record.error === 'object') {
    const nested = record.error as Record<string, unknown>;
    if (typeof nested.message === 'string') {
      return nested.message;
    }
  }
  if (typeof record.error === 'string') {
    return record.error;
  }
  return fallback;
}

function unwrapApiResponse<T>(payload: ApiResponse<T>, fallback: string): T {
  if (!payload.success || payload.data === undefined) {
    throw new Error(getErrorMessage(payload, fallback));
  }
  return payload.data;
}

async function performJsonRequest<T>(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
  } = {},
): Promise<T> {
  const baseHeaders = new Headers({ 'Content-Type': 'application/json' });
  const requestInit: RequestInit = {
    method: options.method ?? 'GET',
    headers: applySharedAuthHeaders(baseHeaders),
    credentials: 'include',
    cache: 'no-store',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  };

  let response = await fetch(url, requestInit);
  if (response.status === 401) {
    const restored = await restoreSharedAuthSession();
    if (restored.success) {
      response = await fetch(url, {
        ...requestInit,
        headers: applySharedAuthHeaders(baseHeaders, { forceAuthorization: true }),
      });
    }
  }

  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response.statusText || '요청 처리에 실패했습니다.'));
  }

  return payload as T;
}

async function requestJson<T>(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
  } = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const canDedupe = method === 'GET' && options.body === undefined;

  if (!canDedupe) {
    return performJsonRequest<T>(url, options);
  }

  const now = Date.now();
  const cached = getRequestCache.get(url);
  if (cached && cached.expiresAt > now) {
    return cached.promise as Promise<T>;
  }
  if (cached) {
    getRequestCache.delete(url);
  }

  const promise = performJsonRequest<T>(url, options).catch((error: unknown) => {
    const current = getRequestCache.get(url);
    if (current?.promise === promise) {
      getRequestCache.delete(url);
    }
    throw error;
  });
  getRequestCache.set(url, {
    expiresAt: now + GET_REQUEST_DEDUPE_TTL_MS,
    promise,
  });
  return promise;
}

function createSsooUserSurfaceApi(apiBaseUrl?: string): SsooUserSurfaceApi {
  const baseUrl = normalizeApiBaseUrl(apiBaseUrl);

  return {
    async getProfile(userId) {
      const path = userId && userId !== 'me'
        ? `/sns/profiles/${encodeURIComponent(userId)}`
        : '/sns/profiles/me';
      return unwrapApiResponse(
        await requestJson<ApiResponse<UserProfileSurface>>(`${baseUrl}${path}`),
        '프로필을 불러오지 못했습니다.',
      );
    },
    async updateProfile(data) {
      return unwrapApiResponse(
        await requestJson<ApiResponse<UserProfileSurface>>(`${baseUrl}/sns/profiles/me`, {
          method: 'PUT',
          body: data,
        }),
        '프로필을 저장하지 못했습니다.',
      );
    },
    async getProfileFeed(userId) {
      return unwrapApiResponse(
        await requestJson<ApiResponse<FeedResult>>(
          `${baseUrl}/sns/feed?authorUserId=${encodeURIComponent(userId)}&limit=${PROFILE_FEED_LIMIT}`,
        ),
        '프로필 피드를 불러오지 못했습니다.',
      );
    },
    async follow(userId) {
      await requestJson<ApiResponse<unknown>>(`${baseUrl}/sns/follows/${encodeURIComponent(userId)}`, {
        method: 'POST',
      });
    },
    async unfollow(userId) {
      await requestJson<ApiResponse<unknown>>(`${baseUrl}/sns/follows/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
    },
    async addReaction(postId) {
      await requestJson<ApiResponse<unknown>>(`${baseUrl}/sns/posts/${encodeURIComponent(postId)}/reactions`, {
        method: 'POST',
        body: {},
      });
    },
    async removeReaction(postId) {
      await requestJson<ApiResponse<unknown>>(`${baseUrl}/sns/posts/${encodeURIComponent(postId)}/reactions`, {
        method: 'DELETE',
      });
    },
    async addBookmark(postId) {
      await requestJson<ApiResponse<unknown>>(`${baseUrl}/sns/posts/${encodeURIComponent(postId)}/bookmark`, {
        method: 'POST',
      });
    },
    async removeBookmark(postId) {
      await requestJson<ApiResponse<unknown>>(`${baseUrl}/sns/posts/${encodeURIComponent(postId)}/bookmark`, {
        method: 'DELETE',
      });
    },
  };
}

function toProfileForm(profile: UserProfileSurface): ProfileFormState {
  return {
    displayName: profile.user.displayName ?? '',
    avatarUrl: profile.user.avatarUrl ?? '',
    bio: profile.bio ?? '',
    coverImageUrl: profile.coverImageUrl ?? '',
    linkedinUrl: profile.linkedinUrl ?? '',
    websiteUrl: profile.websiteUrl ?? '',
  };
}

function toProfilePayload(form: ProfileFormState): UpdateProfileDto {
  return {
    displayName: form.displayName,
    avatarUrl: form.avatarUrl,
    bio: form.bio,
    coverImageUrl: form.coverImageUrl,
    linkedinUrl: form.linkedinUrl,
    websiteUrl: form.websiteUrl,
  };
}

function getInitials(value: string): string {
  return value.trim().slice(0, 2) || '?';
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const past = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - past) / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function isRelevantLocalEvent(detail: SsooUserSurfaceChangedDetail | undefined, profile: UserProfileSurface | null): boolean {
  if (!detail) {
    return true;
  }

  if (!detail.userId || !profile) {
    return true;
  }

  return detail.userId === profile.user.id || detail.actorUserId === profile.user.id;
}

export function SsooUserSurfacePage({
  surface,
  userId,
  apiBaseUrl,
  eventsPath = DEFAULT_EVENTS_PATH,
  onOpenProfile,
}: SsooUserSurfacePageProps) {
  const api = useMemo(() => createSsooUserSurfaceApi(apiBaseUrl), [apiBaseUrl]);
  const targetUserId = surface === 'user-profile' ? userId : null;
  const [profile, setProfile] = useState<UserProfileSurface | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [isEditing, setIsEditing] = useState(surface === 'personal-settings');
  const [activePanel, setActivePanel] = useState<'posts' | 'about'>('posts');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profileRef = useRef<UserProfileSurface | null>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => undefined);
  const refreshInFlightRef = useRef(false);
  const refreshQueuedRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      refreshQueuedRef.current = true;
      return;
    }

    refreshInFlightRef.current = true;
    setError(null);
    setIsLoading((current) => current || !profileRef.current);

    try {
      const nextProfile = await api.getProfile(targetUserId);
      setProfile(nextProfile);
      setForm((current) => current ?? toProfileForm(nextProfile));
      if (surface !== 'personal-settings') {
        const feed = await api.getProfileFeed(nextProfile.user.id);
        setFeedItems(feed.items);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '유저 표면을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
      refreshInFlightRef.current = false;
      if (refreshQueuedRef.current) {
        refreshQueuedRef.current = false;
        if (refreshTimerRef.current !== null) {
          clearTimeout(refreshTimerRef.current);
        }
        refreshTimerRef.current = setTimeout(() => {
          refreshTimerRef.current = null;
          void refreshRef.current();
        }, REFRESH_DEBOUNCE_MS);
      }
    }
  }, [api, surface, targetUserId]);
  refreshRef.current = refresh;

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      void refreshRef.current();
    }, REFRESH_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    setProfile(null);
    setFeedItems([]);
    setForm(null);
    setIsEditing(surface === 'personal-settings');
    setIsLoading(true);
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    void refresh();
  }, [refresh, surface, targetUserId]);

  useEffect(() => {
    const handleFocus = () => {
      scheduleRefresh();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        scheduleRefresh();
      }
    };
    const handleLocalChange = (event: Event) => {
      const detail = event instanceof CustomEvent
        ? event.detail as SsooUserSurfaceChangedDetail | undefined
        : undefined;
      if (isRelevantLocalEvent(detail, profileRef.current)) {
        scheduleRefresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener(SSOO_USER_SURFACE_CHANGED_EVENT, handleLocalChange);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener(SSOO_USER_SURFACE_CHANGED_EVENT, handleLocalChange);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [scheduleRefresh]);

  useEffect(() => () => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
    }
  }, []);

  useCommonNotificationEventStream('sns', {
    eventsPath,
    onDomainEvent: (event) => {
      if (event.domainEvent && SNS_USER_SURFACE_DOMAIN_EVENTS.has(event.domainEvent.type)) {
        scheduleRefresh();
      }
    },
  });

  const saveProfile = useCallback(async () => {
    if (!form) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const nextProfile = await api.updateProfile(toProfilePayload(form));
      setProfile(nextProfile);
      setForm(toProfileForm(nextProfile));
      setIsEditing(surface === 'personal-settings');
      dispatchSsooUserSurfaceChanged({
        type: surface === 'personal-settings' ? 'user.settings.updated' : 'user.profile.updated',
        userId: nextProfile.user.id,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '프로필을 저장하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [api, form, surface]);

  const toggleFollow = useCallback(async () => {
    if (!profile) {
      return;
    }

    setIsMutating(true);
    setError(null);
    try {
      if (profile.followStats.isFollowing) {
        await api.unfollow(profile.user.id);
      } else {
        await api.follow(profile.user.id);
      }
      dispatchSsooUserSurfaceChanged({
        type: 'sns.follow.changed',
        userId: profile.user.id,
      });
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '팔로우 상태를 변경하지 못했습니다.');
    } finally {
      setIsMutating(false);
    }
  }, [api, profile, refresh]);

  const toggleReaction = useCallback(async (item: FeedItem) => {
    setIsMutating(true);
    setError(null);
    try {
      if (item.isLiked) {
        await api.removeReaction(item.post.id);
      } else {
        await api.addReaction(item.post.id);
      }
      dispatchSsooUserSurfaceChanged({
        type: 'sns.feed.changed',
        userId: item.author.id,
        postId: item.post.id,
      });
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '게시물 반응을 변경하지 못했습니다.');
    } finally {
      setIsMutating(false);
    }
  }, [api, refresh]);

  const toggleBookmark = useCallback(async (item: FeedItem) => {
    setIsMutating(true);
    setError(null);
    try {
      if (item.isBookmarked) {
        await api.removeBookmark(item.post.id);
      } else {
        await api.addBookmark(item.post.id);
      }
      dispatchSsooUserSurfaceChanged({
        type: 'sns.feed.changed',
        userId: item.author.id,
        postId: item.post.id,
      });
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '저장 상태를 변경하지 못했습니다.');
    } finally {
      setIsMutating(false);
    }
  }, [api, refresh]);

  const startProfileEditing = useCallback(() => {
    if (!profile) {
      return;
    }

    setForm(toProfileForm(profile));
    setIsEditing(true);
  }, [profile]);

  const cancelProfileEditing = useCallback(() => {
    if (!profile) {
      return;
    }

    setForm(toProfileForm(profile));
    setIsEditing(false);
  }, [profile]);

  const headerIconSlots = useMemo(() => ({
    edit: <Pencil className="h-4 w-4" />,
    save: <Save className="h-4 w-4" />,
    cancel: <X className="h-4 w-4" />,
    loading: <Loader2 className="h-4 w-4 animate-spin" />,
  }), []);

  const sharedHeaderActions = useMemo<SsooSharedSurfacePageHeaderActions>(() => {
    if (surface === 'personal-settings') {
      return {
        mode: 'editor',
        onSave: form ? saveProfile : undefined,
        saving: isSaving,
        saveDisabled: !form,
        iconSlots: headerIconSlots,
      };
    }

    if (!profile?.isOwnProfile) {
      return {};
    }

    if (isEditing) {
      return {
        mode: 'editor',
        onSave: form ? saveProfile : undefined,
        onCancel: cancelProfileEditing,
        saving: isMutating || isSaving,
        saveDisabled: !form,
        iconSlots: headerIconSlots,
      };
    }

    return {
      mode: 'viewer',
      onEdit: startProfileEditing,
      iconSlots: headerIconSlots,
    };
  }, [
    cancelProfileEditing,
    form,
    headerIconSlots,
    isEditing,
    isMutating,
    isSaving,
    profile?.isOwnProfile,
    saveProfile,
    startProfileEditing,
    surface,
  ]);
  useSsooSharedSurfacePageHeaderActions(sharedHeaderActions);
  useSsooSettingsPageHeaderActions(sharedHeaderActions);

  if (isLoading && !profile) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-ssoo-content-border bg-white text-body-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        유저 표면을 불러오는 중...
      </div>
    );
  }

  if (!profile || !form) {
    return (
      <div className="rounded-lg border border-ssoo-content-border bg-white p-8 text-center">
        <p className="text-body-sm text-muted-foreground">{error ?? '프로필을 찾을 수 없습니다.'}</p>
        <Button variant="plain" size="plain"
          type="button"
          className="mt-4 inline-flex h-control-h items-center rounded-md bg-ssoo-primary px-3 text-body-sm font-medium text-white"
          onClick={() => void refresh()}
        >
          <RefreshCw className="mr-1.5 h-4 w-4" />
          다시 시도
        </Button>
      </div>
    );
  }

  if (surface === 'personal-settings') {
    return (
      <UserSettingsSurface
        form={form}
        error={error}
        onChange={setForm}
      />
    );
  }

  return (
    <UserProfileSurfaceView
      profile={profile}
      form={form}
      feedItems={feedItems}
      isEditing={isEditing}
      isMutating={isMutating || isSaving}
      error={error}
      activePanel={activePanel}
      onPanelChange={setActivePanel}
      onChange={setForm}
      onToggleFollow={toggleFollow}
      onToggleReaction={toggleReaction}
      onToggleBookmark={toggleBookmark}
      onOpenProfile={onOpenProfile}
    />
  );
}

function UserSettingsSurface({
  form,
  error,
  onChange,
}: {
  form: ProfileFormState;
  error: string | null;
  onChange: (next: ProfileFormState) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <h2 className="text-heading-sm font-semibold text-ssoo-content-strong">프로필 기본 정보</h2>
      </div>

      {error ? <SurfaceError message={error} /> : null}

      <div className="rounded-lg border border-ssoo-content-border bg-white p-4">
        <div id="ssoo-user-settings-basic" className="scroll-mt-4" />
        <h2 className="text-body-md font-semibold text-ssoo-content-strong">기본 정보</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <TextField label="표시 이름" value={form.displayName} onChange={(value) => onChange({ ...form, displayName: value })} />
          <TextField label="아바타 이미지 URL" value={form.avatarUrl} onChange={(value) => onChange({ ...form, avatarUrl: value })} />
          <TextField label="커버 이미지 URL" value={form.coverImageUrl} onChange={(value) => onChange({ ...form, coverImageUrl: value })} />
          <TextField label="웹사이트 URL" value={form.websiteUrl} onChange={(value) => onChange({ ...form, websiteUrl: value })} />
          <TextField label="LinkedIn URL" value={form.linkedinUrl} onChange={(value) => onChange({ ...form, linkedinUrl: value })} />
        </div>
      </div>

      <div className="rounded-lg border border-ssoo-content-border bg-white p-4">
        <div id="ssoo-user-settings-profile-intro" className="scroll-mt-4" />
        <h2 className="text-body-md font-semibold text-ssoo-content-strong">프로필 소개</h2>
        <Textarea
          value={form.bio}
          onChange={(event) => onChange({ ...form, bio: event.target.value })}
          className="mt-3 min-h-28 w-full rounded-md border border-ssoo-content-border px-3 py-2 text-body-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-ssoo-primary"
        />
      </div>
    </div>
  );
}

function UserProfileSurfaceView({
  profile,
  form,
  feedItems,
  isEditing,
  isMutating,
  error,
  activePanel,
  onPanelChange,
  onChange,
  onToggleFollow,
  onToggleReaction,
  onToggleBookmark,
  onOpenProfile,
}: {
  profile: UserProfileSurface;
  form: ProfileFormState;
  feedItems: FeedItem[];
  isEditing: boolean;
  isMutating: boolean;
  error: string | null;
  activePanel: 'posts' | 'about';
  onPanelChange: (panel: 'posts' | 'about') => void;
  onChange: (next: ProfileFormState) => void;
  onToggleFollow: () => void;
  onToggleReaction: (item: FeedItem) => void;
  onToggleBookmark: (item: FeedItem) => void;
  onOpenProfile?: (userId: string) => void;
}) {
  const displayName = profile.user.displayName || profile.user.userName;

  return (
    <div className="space-y-4">
      {error ? <SurfaceError message={error} /> : null}

      <div className="overflow-hidden rounded-lg border border-ssoo-content-border bg-white">
        <div
          className={`h-36 bg-cover bg-center ${profile.coverImageUrl ? '' : 'bg-ssoo-primary'}`}
          style={profile.coverImageUrl ? { backgroundImage: `url(${profile.coverImageUrl})` } : undefined}
        />
        <div className="relative space-y-4 p-4 pt-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
              <div className="-mt-12 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-ssoo-primary text-2xl font-semibold text-white shadow-lg">
                {profile.user.avatarUrl ? (
                  <img src={profile.user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  getInitials(displayName)
                )}
              </div>
              <div className="min-w-0 pb-1">
                {isEditing ? (
                  <div className="space-y-2">
                    <TextInput value={form.displayName} placeholder={profile.user.userName} onChange={(value) => onChange({ ...form, displayName: value })} />
                    <TextInput value={form.avatarUrl} placeholder="아바타 이미지 URL" onChange={(value) => onChange({ ...form, avatarUrl: value })} />
                  </div>
                ) : (
                  <>
                    <h2 className="truncate text-heading-sm font-semibold text-ssoo-content-strong">{displayName}</h2>
                    <p className="text-body-sm text-muted-foreground">{profile.user.userName}</p>
                  </>
                )}
                {(profile.user.positionCode || profile.user.departmentCode) ? (
                  <p className="mt-1 flex items-center gap-1 text-body-sm text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5" />
                    {[profile.user.positionCode, profile.user.departmentCode].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
              </div>
            </div>

            {!profile.isOwnProfile ? (
              <div className="flex flex-wrap gap-2">
                <SurfaceButton
                  variant={profile.followStats.isFollowing ? 'outline' : 'default'}
                  disabled={isMutating}
                  onClick={onToggleFollow}
                >
                  {profile.followStats.isFollowing ? <UserMinus className="mr-1.5 h-4 w-4" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
                  {profile.followStats.isFollowing ? '팔로우 해제' : '팔로우'}
                </SurfaceButton>
              </div>
            ) : null}
          </div>

          {isEditing ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Textarea
                  value={form.bio}
                  onChange={(event) => onChange({ ...form, bio: event.target.value })}
                  placeholder="프로필 소개"
                  className="min-h-24 w-full rounded-md border border-ssoo-content-border px-3 py-2 text-body-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-ssoo-primary"
                />
              </div>
              <TextInput value={form.coverImageUrl} placeholder="커버 이미지 URL" onChange={(value) => onChange({ ...form, coverImageUrl: value })} />
              <TextInput value={form.linkedinUrl} placeholder="LinkedIn URL" onChange={(value) => onChange({ ...form, linkedinUrl: value })} />
              <TextInput value={form.websiteUrl} placeholder="웹사이트 URL" onChange={(value) => onChange({ ...form, websiteUrl: value })} />
            </div>
          ) : profile.bio ? (
            <p className="whitespace-pre-wrap text-body-sm text-ssoo-content">{profile.bio}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 border-t border-ssoo-content-border pt-3 text-body-sm text-muted-foreground">
            <span><strong className="text-ssoo-content-strong">{profile.followStats.followersCount}</strong> 팔로워</span>
            <span><strong className="text-ssoo-content-strong">{profile.followStats.followingCount}</strong> 팔로잉</span>
            {profile.user.email ? <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{profile.user.email}</span> : null}
            {profile.websiteUrl ? <ExternalLink href={profile.websiteUrl} icon={<Globe className="h-3.5 w-3.5" />}>웹사이트</ExternalLink> : null}
            {profile.linkedinUrl ? <ExternalLink href={profile.linkedinUrl} icon={<Linkedin className="h-3.5 w-3.5" />}>LinkedIn</ExternalLink> : null}
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-ssoo-content-border">
        <TabButton active={activePanel === 'posts'} onClick={() => onPanelChange('posts')}>게시물</TabButton>
        <TabButton active={activePanel === 'about'} onClick={() => onPanelChange('about')}>소개</TabButton>
      </div>

      {activePanel === 'posts' ? (
        <div className="space-y-3">
          {feedItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ssoo-content-border bg-white p-8 text-center text-body-sm text-muted-foreground">
              표시할 게시물이 없습니다.
            </div>
          ) : feedItems.map((item) => (
            <FeedCard
              key={item.post.id}
              item={item}
              isMutating={isMutating}
              onOpenProfile={onOpenProfile}
              onToggleReaction={onToggleReaction}
              onToggleBookmark={onToggleBookmark}
            />
          ))}
        </div>
      ) : (
        <AboutPanel profile={profile} />
      )}
    </div>
  );
}

function AboutPanel({ profile }: { profile: UserProfileSurface }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-ssoo-content-border bg-white p-4">
        <h2 className="text-body-md font-semibold text-ssoo-content-strong">스킬</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.skills.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">등록된 스킬이 없습니다.</p>
          ) : profile.skills.map((skill) => (
            <span key={skill.id} className="rounded-full border border-ssoo-content-border px-2.5 py-1 text-caption text-ssoo-content">
              {skill.skillName} · Lv.{skill.proficiencyLevel}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-ssoo-content-border bg-white p-4">
        <h2 className="text-body-md font-semibold text-ssoo-content-strong">경력/프로젝트</h2>
        <div className="mt-3 space-y-3">
          {profile.careers.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">등록된 경력이 없습니다.</p>
          ) : profile.careers.map((career) => (
            <div key={career.id} className="rounded-md border border-ssoo-content-border p-3">
              <p className="text-body-sm font-medium text-ssoo-content-strong">{career.projectName}</p>
              <p className="text-caption text-muted-foreground">{career.roleName}{career.companyName ? ` · ${career.companyName}` : ''}</p>
              {career.description ? <p className="mt-2 text-body-sm text-ssoo-content">{career.description}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeedCard({
  item,
  isMutating,
  onOpenProfile,
  onToggleReaction,
  onToggleBookmark,
}: {
  item: FeedItem;
  isMutating: boolean;
  onOpenProfile?: (userId: string) => void;
  onToggleReaction: (item: FeedItem) => void;
  onToggleBookmark: (item: FeedItem) => void;
}) {
  const authorName = item.author.displayName || item.author.userName;

  return (
    <article className="rounded-lg border border-ssoo-content-border bg-white p-4">
      <div className="flex items-start gap-3">
        <Button variant="plain" size="plain"
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ssoo-primary text-body-sm font-semibold text-white"
          onClick={() => onOpenProfile?.(item.author.id)}
        >
          {item.author.avatarUrl ? <img src={item.author.avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitials(authorName)}
        </Button>
        <div className="min-w-0 flex-1">
          <Button variant="plain" size="plain"
            type="button"
            className="max-w-full truncate text-left text-body-sm font-semibold text-ssoo-content-strong hover:text-ssoo-primary hover:underline"
            onClick={() => onOpenProfile?.(item.author.id)}
          >
            {authorName}
          </Button>
          <p className="text-caption text-muted-foreground">{getTimeAgo(item.post.createdAt)}</p>
        </div>
      </div>

      {item.post.title ? <h3 className="mt-3 text-body-md font-semibold text-ssoo-content-strong">{item.post.title}</h3> : null}
      <p className="mt-2 whitespace-pre-wrap text-body-sm text-ssoo-content">{item.post.content}</p>

      {item.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-ssoo-content-bg px-2 py-0.5 text-caption text-muted-foreground">#{tag}</span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-2 border-t border-ssoo-content-border pt-2">
        <Button variant="plain" size="plain"
          type="button"
          disabled={isMutating}
          className={`inline-flex h-control-h-sm items-center rounded-md px-2 text-caption transition-colors ${item.isLiked ? 'text-red-500' : 'text-muted-foreground hover:bg-ssoo-content-bg'}`}
          onClick={() => onToggleReaction(item)}
        >
          <Heart className={`mr-1 h-3.5 w-3.5 ${item.isLiked ? 'fill-current' : ''}`} />
          좋아요 {item.reactionCount}
        </Button>
        <Button variant="plain" size="plain"
          type="button"
          disabled={isMutating}
          className={`inline-flex h-control-h-sm items-center rounded-md px-2 text-caption transition-colors ${item.isBookmarked ? 'text-ssoo-primary' : 'text-muted-foreground hover:bg-ssoo-content-bg'}`}
          onClick={() => onToggleBookmark(item)}
        >
          <Bookmark className={`mr-1 h-3.5 w-3.5 ${item.isBookmarked ? 'fill-current' : ''}`} />
          저장
        </Button>
        {item.commentCount > 0 ? <span className="text-caption text-muted-foreground">댓글 {item.commentCount}</span> : null}
      </div>
    </article>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-caption font-medium text-muted-foreground">{label}</span>
      <TextInput value={value} onChange={onChange} />
    </label>
  );
}

function TextInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 h-control-h w-full rounded-md border border-ssoo-content-border px-3 text-body-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-ssoo-primary"
    />
  );
}

function SurfaceButton({
  children,
  variant = 'default',
  disabled,
  onClick,
}: {
  children: ReactNode;
  variant?: 'default' | 'outline';
  disabled?: boolean;
  onClick: () => void;
}) {
  const classes = variant === 'outline'
    ? 'border border-ssoo-content-border bg-white text-ssoo-content hover:bg-ssoo-content-bg'
    : 'bg-ssoo-primary text-white hover:bg-ssoo-primary-hover';

  return (
    <Button variant="plain" size="plain"
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-control-h items-center rounded-md px-3 text-body-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${classes}`}
    >
      {children}
    </Button>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button variant="plain" size="plain"
      type="button"
      className={`h-control-h px-3 text-body-sm font-medium transition-colors ${active ? 'border-b-2 border-ssoo-primary text-ssoo-primary' : 'text-muted-foreground hover:text-ssoo-content'}`}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function ExternalLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-ssoo-primary hover:underline">
      {icon}
      {children}
    </a>
  );
}

function SurfaceError({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-body-sm text-red-700">
      {message}
    </div>
  );
}
