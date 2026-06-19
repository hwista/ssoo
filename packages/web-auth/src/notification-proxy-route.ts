import { proxyCommonNotificationJson, type ProxyCommonNotificationJsonOptions } from './notification-proxy';

export interface NotificationProxyRouteContext {
  params: Promise<{ path?: string[] }>;
}

export interface CreateNotificationProxyRouteHandlersOptions extends ProxyCommonNotificationJsonOptions {
  proxySessionBackedStreamResponse: (request: Request, pathname: string) => Promise<Response>;
}

type NotificationProxyPathKind =
  | 'list'
  | 'unread-count'
  | 'events'
  | 'mark-read'
  | 'mark-unread'
  | 'read-all'
  | 'read-by-reference';

interface NotificationProxyPathResolution {
  kind: NotificationProxyPathKind;
  pathname: string;
}

function appendQueryString(request: Request, pathname: string): string {
  const query = new URL(request.url).searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function createUnsupportedNotificationProxyRouteResponse(): Response {
  return Response.json({ error: '지원하지 않는 알림 작업입니다.' }, { status: 404 });
}

function createInvalidNotificationIdResponse(): Response {
  return Response.json({ error: '올바르지 않은 알림 ID입니다.' }, { status: 400 });
}

function resolveGetPath(path: readonly string[] | undefined, request: Request): NotificationProxyPathResolution | null {
  const segments = path ?? [];
  if (segments.length === 0) {
    return {
      kind: 'list',
      pathname: appendQueryString(request, '/notifications'),
    };
  }

  if (segments.length !== 1) {
    return null;
  }

  if (segments[0] === 'unread-count') {
    return {
      kind: 'unread-count',
      pathname: appendQueryString(request, '/notifications/unread-count'),
    };
  }

  if (segments[0] === 'events') {
    return {
      kind: 'events',
      pathname: appendQueryString(request, '/notifications/events'),
    };
  }

  return null;
}

function resolvePutPath(path: readonly string[] | undefined, request: Request): NotificationProxyPathResolution | Response {
  const segments = path ?? [];
  if (segments.length === 1 && segments[0] === 'read-all') {
    return {
      kind: 'read-all',
      pathname: appendQueryString(request, '/notifications/read-all'),
    };
  }

  if (segments.length === 1 && segments[0] === 'read-by-reference') {
    return {
      kind: 'read-by-reference',
      pathname: '/notifications/read-by-reference',
    };
  }

  if (segments.length === 2 && (segments[1] === 'read' || segments[1] === 'unread')) {
    const notificationId = segments[0] ?? '';
    if (!/^\d+$/.test(notificationId)) {
      return createInvalidNotificationIdResponse();
    }

    return {
      kind: segments[1] === 'read' ? 'mark-read' : 'mark-unread',
      pathname: `/notifications/${encodeURIComponent(notificationId)}/${segments[1]}`,
    };
  }

  return createUnsupportedNotificationProxyRouteResponse();
}

function getFallbackMessage(kind: NotificationProxyPathKind): string {
  switch (kind) {
    case 'list':
      return '알림 목록 조회 중 오류가 발생했습니다.';
    case 'unread-count':
      return '미읽음 알림 수 조회 중 오류가 발생했습니다.';
    case 'mark-read':
      return '알림 읽음 처리 중 오류가 발생했습니다.';
    case 'mark-unread':
      return '알림 안읽음 처리 중 오류가 발생했습니다.';
    case 'read-all':
      return '알림 전체 읽음 처리 중 오류가 발생했습니다.';
    case 'read-by-reference':
      return '참조 대상 알림 읽음 처리 중 오류가 발생했습니다.';
    case 'events':
      return '알림 이벤트 스트림 연결 중 오류가 발생했습니다.';
    default:
      return '알림 요청 중 오류가 발생했습니다.';
  }
}

async function createPutInit(request: Request, kind: NotificationProxyPathKind): Promise<RequestInit> {
  if (kind !== 'read-by-reference') {
    return { method: 'PUT' };
  }

  const body = await request.text();
  return {
    method: 'PUT',
    body: body || undefined,
    headers: {
      'Content-Type': request.headers.get('content-type') || 'application/json',
    },
  };
}

export function createNotificationProxyRouteHandlers(options: CreateNotificationProxyRouteHandlersOptions) {
  return {
    async GET(request: Request, context: NotificationProxyRouteContext): Promise<Response> {
      const { path } = await context.params;
      const resolvedPath = resolveGetPath(path, request);
      if (!resolvedPath) {
        return createUnsupportedNotificationProxyRouteResponse();
      }

      if (resolvedPath.kind === 'events') {
        return options.proxySessionBackedStreamResponse(request, resolvedPath.pathname);
      }

      return proxyCommonNotificationJson(
        request,
        resolvedPath.pathname,
        getFallbackMessage(resolvedPath.kind),
        options,
      );
    },

    async PUT(request: Request, context: NotificationProxyRouteContext): Promise<Response> {
      const { path } = await context.params;
      const resolvedPath = resolvePutPath(path, request);
      if (resolvedPath instanceof Response) {
        return resolvedPath;
      }

      return proxyCommonNotificationJson(
        request,
        resolvedPath.pathname,
        getFallbackMessage(resolvedPath.kind),
        options,
        await createPutInit(request, resolvedPath.kind),
      );
    },
  };
}
