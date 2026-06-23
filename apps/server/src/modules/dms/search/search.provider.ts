import type { EmbeddingModel, LanguageModel } from 'ai';
import {
  getAzureChatModel,
  getAzureEmbeddingModel,
} from '../../common/ai-index/ai-azure-provider.js';

export async function getEmbeddingModel(): Promise<EmbeddingModel> {
  return getAzureEmbeddingModel();
}

export async function getChatModel(): Promise<LanguageModel> {
  return getAzureChatModel();
}
