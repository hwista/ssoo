import type { ModelMessage } from 'ai';
import { aiTaskRunner } from '@/server/services/ai';

export class TemplateConvertService {
  async convertToTemplateStream(
    input: { documentContent: string; documentPath?: string },
    userId?: string,
    signal?: AbortSignal,
  ): Promise<{ stream: ReadableStream<string> }> {
    const content = input.documentContent.trim();
    if (!content) {
      throw new Error('documentContent는 필수입니다.');
    }

    const messages: ModelMessage[] = [
      {
        role: 'user',
        content: [
          input.documentPath ? `[문서 경로]\n${input.documentPath}` : '',
          `[원본 문서]\n${content}`,
        ].filter(Boolean).join('\n\n'),
      },
    ];

    const result = await aiTaskRunner.runStream({
      taskKey: 'document-to-template',
      messages,
      userId,
      signal,
    });

    return { stream: result.stream };
  }
}

export const templateConvertService = new TemplateConvertService();
