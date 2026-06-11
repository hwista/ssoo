import { proxyCommonNotificationJson } from '@ssoo/web-auth';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

export function proxyNotificationJson<T>(
  request: Request,
  pathname: string,
  fallbackMessage: string,
  init?: RequestInit,
): Promise<Response> {
  return proxyCommonNotificationJson<T>(
    request,
    pathname,
    fallbackMessage,
    {
      createBackendUrl: createServerApiUrl,
      createBackendInit: createServerApiProxyInit,
    },
    init,
  );
}
