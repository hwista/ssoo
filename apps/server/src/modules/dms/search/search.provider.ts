import { createAzure } from '@ai-sdk/azure';
import type { EmbeddingModel, LanguageModel } from 'ai';
import {
  ChainedTokenCredential,
  ClientSecretCredential,
  ManagedIdentityCredential,
  type AccessToken,
  type TokenCredential,
} from '@azure/identity';

const AZURE_OPENAI_SCOPE = 'https://cognitiveservices.azure.com/.default';
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

let cachedToken: AccessToken | null = null;
let pendingTokenRequest: Promise<string | null> | null = null;

function getAzureResourceName(): string {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  if (!endpoint) {
    throw new Error(
      'Azure OpenAI 환경변수가 설정되지 않았습니다. AZURE_OPENAI_ENDPOINT를 확인하세요.',
    );
  }

  try {
    const url = new URL(endpoint);
    return url.hostname.split('.')[0];
  } catch {
    return endpoint;
  }
}

function getApiVersion(): string | undefined {
  const version = process.env.OPENAI_API_VERSION?.trim();
  return version ? version : undefined;
}

function getEmbeddingDeployment(): string | null {
  const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT?.trim();
  return deployment ? deployment : null;
}

function looksLikeJwtToken(value: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function getEntraCredential(): TokenCredential | null {
  const credentials: TokenCredential[] = [];
  const managedIdentityClientId = process.env.AZURE_MANAGED_IDENTITY_CLIENT_ID?.trim();
  const useManagedIdentity = process.env.AZURE_USE_MANAGED_IDENTITY !== 'false';

  if (useManagedIdentity) {
    credentials.push(
      managedIdentityClientId
        ? new ManagedIdentityCredential(managedIdentityClientId)
        : new ManagedIdentityCredential(),
    );
  }

  const tenantId = process.env.AZURE_TENANT_ID?.trim();
  const clientId = process.env.AZURE_CLIENT_ID?.trim();
  const clientSecret = process.env.AZURE_CLIENT_SECRET?.trim();

  if (tenantId && clientId && clientSecret) {
    credentials.push(new ClientSecretCredential(tenantId, clientId, clientSecret));
  }

  if (credentials.length === 0) {
    return null;
  }

  return credentials.length === 1
    ? credentials[0]
    : new ChainedTokenCredential(...credentials);
}

function isTokenValid(token: AccessToken | null): token is AccessToken {
  if (!token) return false;
  return token.expiresOnTimestamp - Date.now() > TOKEN_REFRESH_BUFFER_MS;
}

async function getEntraAccessToken(): Promise<string | null> {
  if (isTokenValid(cachedToken)) {
    return cachedToken.token;
  }

  if (pendingTokenRequest) {
    return pendingTokenRequest;
  }

  const credential = getEntraCredential();
  if (!credential) {
    return null;
  }

  pendingTokenRequest = (async () => {
    try {
      const token = await credential.getToken(AZURE_OPENAI_SCOPE);
      if (!token?.token) {
        throw new Error('Entra access token을 발급받지 못했습니다.');
      }
      cachedToken = token;
      return token.token;
    } finally {
      pendingTokenRequest = null;
    }
  })();

  return pendingTokenRequest;
}

async function getAzureProvider() {
  const resourceName = getAzureResourceName();
  const apiVersion = getApiVersion();
  const apiKey = process.env.AZURE_OPENAI_API_KEY?.trim();

  try {
    const entraToken = await getEntraAccessToken();
    if (entraToken) {
      return createAzure({
        apiKey: 'entra-token',
        resourceName,
        useDeploymentBasedUrls: true,
        ...(apiVersion ? { apiVersion } : {}),
        headers: {
          Authorization: `Bearer ${entraToken}`,
        },
      });
    }
  } catch (error) {
    if (!apiKey) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Entra access token 발급에 실패했고 API Key도 설정되지 않았습니다. ${message}`,
      );
    }
  }

  if (!apiKey) {
    throw new Error(
      'Azure OpenAI 인증 정보가 없습니다. ' +
      'Entra 설정(AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET) 또는 AZURE_OPENAI_API_KEY를 확인하세요.',
    );
  }

  if (looksLikeJwtToken(apiKey)) {
    throw new Error(
      'AZURE_OPENAI_API_KEY에 Entra Access Token(JWT)이 설정되어 있습니다. ' +
      'API Key에는 Azure OpenAI 리소스 키를 사용하거나 Entra 환경변수를 설정하세요.',
    );
  }

  return createAzure({
    apiKey,
    resourceName,
    useDeploymentBasedUrls: true,
    ...(apiVersion ? { apiVersion } : {}),
  });
}

export async function getEmbeddingModel(): Promise<EmbeddingModel> {
  const deployment = getEmbeddingDeployment();
  if (!deployment) {
    throw new Error(
      'AZURE_OPENAI_EMBEDDING_DEPLOYMENT이 설정되지 않아 임베딩을 비활성화합니다. 키워드 검색 폴백을 사용합니다.',
    );
  }

  const azure = await getAzureProvider();
  return azure.embeddingModel(deployment);
}

export async function getChatModel(): Promise<LanguageModel> {
  const azure = await getAzureProvider();
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';
  return azure.chat(deployment);
}
