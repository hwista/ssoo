import { Injectable } from '@nestjs/common';
import { streamText, type ModelMessage } from 'ai';
import { getChatModel } from '../search/search.provider.js';

const TEMPLATE_CONVERT_SYSTEM_PROMPT = `당신은 재사용 가능한 문서 템플릿 작성 전문가입니다.
- 입력 문서의 고유 정보는 일반화하고, 반복 사용 가능한 템플릿으로 변환합니다.
- 사람 이름, 프로젝트명, 날짜, 수치, 고유 식별자는 {{플레이스홀더}}로 치환합니다.
- 템플릿은 한국어 마크다운 본문만 출력합니다.
- 설명 문장이나 변환 해설은 포함하지 않습니다.
- 필요한 경우 HTML 주석으로 작성 가이드를 남깁니다.`;

@Injectable()
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

    const model = await getChatModel();
    const result = streamText({
      model,
      system: TEMPLATE_CONVERT_SYSTEM_PROMPT,
      messages,
      abortSignal: signal,
      maxOutputTokens: 4096,
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

    return { stream };
  }
}
