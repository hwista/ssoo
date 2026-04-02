import { generateText, streamText, type ModelMessage } from 'ai';
import { getChatModel } from './provider';
import { buildSystemPromptFromProfile } from './prompts/buildSystemPrompt';
import { profileOverrideService } from './profiles/ProfileOverrideService';
import type { AiTaskKey } from './profiles/types';

interface RunTaskParams {
  taskKey: AiTaskKey;
  messages: ModelMessage[];
  userId?: string;
  context?: { hasTemplate?: boolean; hasAttachments?: boolean; hasImages?: boolean };
}

export class AiTaskRunner {
  async runStream(params: RunTaskParams & { signal?: AbortSignal }) {
    const profile = profileOverrideService.resolveProfile(params.taskKey, params.userId);
    const model = await getChatModel();
    const result = streamText({
      model,
      system: buildSystemPromptFromProfile(profile, params.context),
      messages: params.messages,
      maxOutputTokens: profile.modelOptions?.maxTokens,
      temperature: profile.modelOptions?.temperature,
      abortSignal: params.signal,
    });

    const stream = new ReadableStream<string>({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(chunk);
          }
        } finally {
          controller.close();
        }
      },
    });

    return { stream, profile };
  }

  async runText(params: RunTaskParams) {
    const profile = profileOverrideService.resolveProfile(params.taskKey, params.userId);
    const model = await getChatModel();
    const result = await generateText({
      model,
      system: buildSystemPromptFromProfile(profile, params.context),
      messages: params.messages,
      maxOutputTokens: profile.modelOptions?.maxTokens,
      temperature: profile.modelOptions?.temperature,
    });

    return { text: result.text, profile };
  }
}

export const aiTaskRunner = new AiTaskRunner();
