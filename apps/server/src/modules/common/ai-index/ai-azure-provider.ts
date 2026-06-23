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
const DEFAULT_EMBEDDING_DIMENSION = 1536;

let cachedToken: AccessToken | null = null;
let pendingTokenRequest: Promise<string | null> | null = null;

export interface AiEmbeddingProviderStatus {
  profileCode: string;
  providerCode: 'azure-openai';
  ready: boolean;
  reasonCode?: string;
  reasonMessage?: string;
  deploymentName?: string;
  modelName?: string;
  dimension: number;
  apiVersion?: string;
  credentialMode?: 'api-key' | 'entra' | 'managed-identity';
}

export interface AiChatProviderStatus {
  providerCode: 'azure-openai';
  ready: boolean;
  reasonCode?: string;
  reasonMessage?: string;
  deploymentName?: string;
  modelName?: string;
  apiVersion?: string;
  credentialMode?: 'api-key' | 'entra' | 'managed-identity';
}

function pickString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function getApiVersion(): string | undefined {
  return pickString(process.env.OPENAI_API_VERSION);
}

function getEmbeddingDeployment(): string | undefined {
  return pickString(process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT);
}

function getChatDeployment(): string {
  return pickString(process.env.AZURE_OPENAI_CHAT_DEPLOYMENT)
    ?? pickString(process.env.AZURE_OPENAI_DEPLOYMENT)
    ?? 'gpt-4o-mini';
}

function getEmbeddingDimension(): number {
  const value = Number(process.env.AZURE_OPENAI_EMBEDDING_DIMENSION ?? '');
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_EMBEDDING_DIMENSION;
}

function looksLikeJwtToken(value: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function hasServicePrincipalCredential(): boolean {
  return Boolean(
    pickString(process.env.AZURE_TENANT_ID)
      && pickString(process.env.AZURE_CLIENT_ID)
      && pickString(process.env.AZURE_CLIENT_SECRET),
  );
}

function useManagedIdentity(): boolean {
  return process.env.AZURE_USE_MANAGED_IDENTITY !== 'false';
}

function getCredentialMode(apiKey?: string): AiEmbeddingProviderStatus['credentialMode'] | undefined {
  if (apiKey) return 'api-key';
  if (hasServicePrincipalCredential()) return 'entra';
  if (useManagedIdentity()) return 'managed-identity';
  return undefined;
}

function getAzureResourceName(): string {
  const endpoint = pickString(process.env.AZURE_OPENAI_ENDPOINT);
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

function getEntraCredential(): TokenCredential | null {
  const credentials: TokenCredential[] = [];
  const managedIdentityClientId = pickString(process.env.AZURE_MANAGED_IDENTITY_CLIENT_ID);

  if (useManagedIdentity()) {
    credentials.push(
      managedIdentityClientId
        ? new ManagedIdentityCredential(managedIdentityClientId)
        : new ManagedIdentityCredential(),
    );
  }

  const tenantId = pickString(process.env.AZURE_TENANT_ID);
  const clientId = pickString(process.env.AZURE_CLIENT_ID);
  const clientSecret = pickString(process.env.AZURE_CLIENT_SECRET);

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
  const apiKey = pickString(process.env.AZURE_OPENAI_API_KEY);

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
      'Azure OpenAI 인증 정보가 없습니다. '
      + 'Entra 설정(AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET) 또는 AZURE_OPENAI_API_KEY를 확인하세요.',
    );
  }

  if (looksLikeJwtToken(apiKey)) {
    throw new Error(
      'AZURE_OPENAI_API_KEY에 Entra Access Token(JWT)이 설정되어 있습니다. '
      + 'API Key에는 Azure OpenAI 리소스 키를 사용하거나 Entra 환경변수를 설정하세요.',
    );
  }

  return createAzure({
    apiKey,
    resourceName,
    useDeploymentBasedUrls: true,
    ...(apiVersion ? { apiVersion } : {}),
  });
}

export function getAzureEmbeddingProviderStatus(profileCode = 'default'): AiEmbeddingProviderStatus {
  const endpoint = pickString(process.env.AZURE_OPENAI_ENDPOINT);
  const deploymentName = getEmbeddingDeployment();
  const apiKey = pickString(process.env.AZURE_OPENAI_API_KEY);
  const apiVersion = getApiVersion();
  const dimension = getEmbeddingDimension();
  const base = {
    profileCode,
    providerCode: 'azure-openai' as const,
    deploymentName,
    modelName: deploymentName,
    dimension,
    apiVersion,
  };

  if (!endpoint) {
    return {
      ...base,
      ready: false,
      reasonCode: 'missing_endpoint',
      reasonMessage: 'AZURE_OPENAI_ENDPOINT is not configured.',
    };
  }

  if (!deploymentName) {
    return {
      ...base,
      ready: false,
      reasonCode: 'missing_embedding_deployment',
      reasonMessage: 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT is not configured.',
    };
  }

  if (apiKey && looksLikeJwtToken(apiKey)) {
    return {
      ...base,
      ready: false,
      reasonCode: 'invalid_api_key',
      reasonMessage: 'AZURE_OPENAI_API_KEY appears to contain an Entra JWT token.',
    };
  }

  const credentialMode = getCredentialMode(apiKey);
  if (!credentialMode) {
    return {
      ...base,
      ready: false,
      reasonCode: 'missing_credential',
      reasonMessage: 'Azure OpenAI credential is not configured.',
    };
  }

  return {
    ...base,
    ready: true,
    credentialMode,
  };
}

export function getAzureChatProviderStatus(): AiChatProviderStatus {
  const endpoint = pickString(process.env.AZURE_OPENAI_ENDPOINT);
  const deploymentName = getChatDeployment();
  const apiKey = pickString(process.env.AZURE_OPENAI_API_KEY);
  const apiVersion = getApiVersion();
  const base = {
    providerCode: 'azure-openai' as const,
    deploymentName,
    modelName: deploymentName,
    apiVersion,
  };

  if (!endpoint) {
    return {
      ...base,
      ready: false,
      reasonCode: 'missing_endpoint',
      reasonMessage: 'AZURE_OPENAI_ENDPOINT is not configured.',
    };
  }

  if (apiKey && looksLikeJwtToken(apiKey)) {
    return {
      ...base,
      ready: false,
      reasonCode: 'invalid_api_key',
      reasonMessage: 'AZURE_OPENAI_API_KEY appears to contain an Entra JWT token.',
    };
  }

  const credentialMode = getCredentialMode(apiKey);
  if (!credentialMode) {
    return {
      ...base,
      ready: false,
      reasonCode: 'missing_credential',
      reasonMessage: 'Azure OpenAI credential is not configured.',
    };
  }

  return {
    ...base,
    ready: true,
    credentialMode,
  };
}

export async function getAzureEmbeddingModel(): Promise<EmbeddingModel> {
  const status = getAzureEmbeddingProviderStatus();
  if (!status.ready) {
    throw new Error(status.reasonMessage ?? 'Azure OpenAI embedding provider is not configured.');
  }

  const deploymentName = status.deploymentName;
  if (!deploymentName) {
    throw new Error('AZURE_OPENAI_EMBEDDING_DEPLOYMENT is not configured.');
  }

  const azure = await getAzureProvider();
  return azure.embeddingModel(deploymentName);
}

export async function getAzureChatModel(): Promise<LanguageModel> {
  const status = getAzureChatProviderStatus();
  if (!status.ready) {
    throw new Error(status.reasonMessage ?? 'Azure OpenAI chat provider is not configured.');
  }

  const azure = await getAzureProvider();
  return azure.chat(status.deploymentName ?? 'gpt-4o-mini');
}
