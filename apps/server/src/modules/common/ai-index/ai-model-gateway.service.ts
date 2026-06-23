import { Injectable } from '@nestjs/common';
import { generateText, streamText } from 'ai';
import {
  type AiChatProviderStatus,
  getAzureChatModel,
  getAzureChatProviderStatus,
} from './ai-azure-provider.js';

export type AiModelGatewayStatus = AiChatProviderStatus;

export interface AiModelGatewayMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiModelGatewayGenerateRequest {
  system?: string;
  messages: AiModelGatewayMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  abortSignal?: AbortSignal;
}

export interface AiModelGatewayGenerateResult {
  text: string;
  providerStatus: AiModelGatewayStatus;
}

export interface AiModelGatewayStreamFinish {
  text?: string;
  providerStatus: AiModelGatewayStatus;
}

export interface AiModelGatewayStreamRequest extends AiModelGatewayGenerateRequest {
  onFinish?: (event: AiModelGatewayStreamFinish) => Promise<void> | void;
  onError?: (error: unknown) => Promise<void> | void;
}

export type AiModelGatewayStreamResult = ReturnType<typeof streamText>;

@Injectable()
export class AiModelGatewayService {
  getStatus(): AiModelGatewayStatus {
    return getAzureChatProviderStatus();
  }

  async generateText(
    request: AiModelGatewayGenerateRequest,
  ): Promise<AiModelGatewayGenerateResult> {
    const providerStatus = this.getStatus();
    const model = await getAzureChatModel();
    const result = await generateText({
      model,
      temperature: request.temperature,
      maxOutputTokens: request.maxOutputTokens,
      abortSignal: request.abortSignal,
      system: request.system,
      messages: request.messages,
    });

    return {
      text: result.text,
      providerStatus,
    };
  }

  async streamText(
    request: AiModelGatewayStreamRequest,
  ): Promise<AiModelGatewayStreamResult> {
    const providerStatus = this.getStatus();
    const model = await getAzureChatModel();

    return streamText({
      model,
      temperature: request.temperature,
      maxOutputTokens: request.maxOutputTokens,
      abortSignal: request.abortSignal,
      system: request.system,
      messages: request.messages,
      onFinish: async ({ text }) => {
        await request.onFinish?.({
          text,
          providerStatus,
        });
      },
      onError: (error: unknown) => {
        void request.onError?.(error);
      },
    });
  }
}
