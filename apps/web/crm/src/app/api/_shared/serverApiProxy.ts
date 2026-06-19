import { createServerApiProxyHelpers } from '@ssoo/web-auth';

const DEFAULT_SERVER_API_URL = 'http://localhost:4000/api';

const {
  getServerApiBaseUrl,
  createServerApiUrl,
  buildServerApiProxyHeaders,
  createServerApiProxyInit,
  proxySessionBackedStreamResponse,
} = createServerApiProxyHelpers({
  resolveServerApiBaseUrl: () => (
    process.env.CRM_SERVER_API_URL?.trim()
    || process.env.SERVER_API_URL?.trim()
    || process.env.NEXT_PUBLIC_API_URL?.trim()
    || DEFAULT_SERVER_API_URL
  ),
  defaultHeaders: {
    'X-SSOO-App': 'crm',
  },
});

export {
  getServerApiBaseUrl,
  createServerApiUrl,
  buildServerApiProxyHeaders,
  createServerApiProxyInit,
  proxySessionBackedStreamResponse,
};
