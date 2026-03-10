/**
 * AI 모델 프로바이더 설정
 * Vercel AI SDK 기반 - 프로바이더 스위칭 가능한 구조
 *
 * 현재: Azure OpenAI (Entra ID + API Key 폴백)
 * 향후: Google Gemini, Anthropic Claude 등으로 교체 가능
 */

import { createAzure } from '@ai-sdk/azure';
import type { LanguageModel, EmbeddingModel } from 'ai';
import {
  ChainedTokenCredential,
  ClientSecretCredential,
  ManagedIdentityCredential,
  type AccessToken,
  type TokenCredential,
} from '@azure/identity';

/**
 * Azure OpenAI OAuth scope
 */
const AZURE_OPENAI_SCOPE = 'https://cognitiveservices.azure.com/.default';
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

let cachedToken: AccessToken | null = null;
let pendingTokenRequest: Promise<string | null> | null = null;

function getAzureResourceName(): string {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  if (!endpoint) {
    throw new Error(
      'Azure OpenAI 환경변수가 설정되지 않았습니다. AZURE_OPENAI_ENDPOINT를 확인하세요.'
    );
  }

  return extractResourceName(endpoint);
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
  const creds: TokenCredential[] = [];
  const managedIdentityClientId = process.env.AZURE_MANAGED_IDENTITY_CLIENT_ID?.trim();
  const useManagedIdentity = process.env.AZURE_USE_MANAGED_IDENTITY !== 'false';

  if (useManagedIdentity) {
    creds.push(
      managedIdentityClientId
        ? new ManagedIdentityCredential(managedIdentityClientId)
        : new ManagedIdentityCredential()
    );
  }

  const tenantId = process.env.AZURE_TENANT_ID?.trim();
  const clientId = process.env.AZURE_CLIENT_ID?.trim();
  const clientSecret = process.env.AZURE_CLIENT_SECRET?.trim();

  if (tenantId && clientId && clientSecret) {
    creds.push(new ClientSecretCredential(tenantId, clientId, clientSecret));
  }

  if (creds.length === 0) {
    return null;
  }

  return creds.length === 1 ? creds[0] : new ChainedTokenCredential(...creds);
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
        `Entra access token 발급에 실패했고 API Key도 설정되지 않았습니다. ${message}`
      );
    }
  }

  if (!apiKey) {
    throw new Error(
      'Azure OpenAI 인증 정보가 없습니다. ' +
      'Entra 설정(AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET) 또는 AZURE_OPENAI_API_KEY를 확인하세요.'
    );
  }

  if (looksLikeJwtToken(apiKey)) {
    throw new Error(
      'AZURE_OPENAI_API_KEY에 Entra Access Token(JWT)이 설정되어 있습니다. ' +
      'API Key에는 Azure OpenAI 리소스 키를 사용하거나 Entra 환경변수를 설정하세요.'
    );
  }

  // Entra 설정이 없거나 실패한 경우 API Key로 폴백
  return createAzure({
    apiKey,
    resourceName,
    useDeploymentBasedUrls: true,
    ...(apiVersion ? { apiVersion } : {}),
  });
}

/**
 * Azure 엔드포인트 URL에서 리소스 이름 추출
 * https://xxx.openai.azure.com/ → xxx
 */
function extractResourceName(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    return url.hostname.split('.')[0];
  } catch {
    return endpoint;
  }
}

/**
 * 채팅/생성용 언어 모델
 * - Ask(질문): RAG 기반 답변 생성
 * - Create(작성): 문서 요약/변환
 */
export async function getChatModel(): Promise<LanguageModel> {
  const azure = await getAzureProvider();
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';
  return azure.chat(deployment);
}

/**
 * 임베딩 모델
 * - Search(검색): 문서 임베딩 생성
 * - Ask(질문): 쿼리 임베딩 생성
 */
export async function getEmbeddingModel(): Promise<EmbeddingModel> {
  const deployment = getEmbeddingDeployment();
  if (!deployment) {
    throw new Error(
      'AZURE_OPENAI_EMBEDDING_DEPLOYMENT이 설정되지 않아 임베딩을 비활성화합니다. 키워드 검색 폴백을 사용합니다.'
    );
  }

  const azure = await getAzureProvider();
  return azure.embeddingModel(deployment);
}
