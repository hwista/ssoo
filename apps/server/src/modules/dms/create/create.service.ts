import { streamText } from 'ai';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import type { CreateSummaryRequest } from '@ssoo/types/dms';
import { getErrorMessage } from '../search/search.helpers.js';
import { getChatModel } from '../search/search.provider.js';

const TEMPLATE_PROMPTS: Record<string, string> = {
  default: '다음 텍스트를 요약하세요. 핵심 포인트, 요약, 액션 아이템을 포함하세요.',
  doc: '다음 문서를 요약하세요. 목차, 핵심 요약, 결정 사항을 포함하세요.',
  sheet: '다음 데이터를 분석하세요. 주요 지표 요약, 표 구조 설명, 시사점을 포함하세요.',
  slide: '다음 슬라이드 내용을 요약하세요. 핵심 메시지와 각 슬라이드 요약을 포함하세요.',
  pdf: '다음 리포트를 요약하세요. 요약, 분석, 결론을 포함하세요.',
};

@Injectable()
export class CreateService {
  private readonly logger = new Logger(CreateService.name);

  async summarize(
    request: CreateSummaryRequest,
    signal?: AbortSignal,
  ) {
    try {
      const model = await getChatModel();
      const templateType = request.templateType ?? 'default';
      const prompt = TEMPLATE_PROMPTS[templateType] ?? TEMPLATE_PROMPTS.default;

      return streamText({
        model,
        system: '당신은 문서 요약 전문가입니다. 한국어로 답변하세요. 마크다운 형식을 사용하세요.',
        abortSignal: signal,
        messages: [
          { role: 'user', content: `${prompt}\n\n---\n\n${request.text}` },
        ],
        onError: (error: unknown) => {
          if (signal?.aborted) {
            return;
          }

          this.logger.error(`DMS 요약 스트리밍 실패: ${getErrorMessage(error)}`);
        },
      });
    } catch (error) {
      this.logger.error(`DMS 요약 스트림 준비 실패: ${getErrorMessage(error)}`);
      throw new InternalServerErrorException('문서 요약 처리 중 오류가 발생했습니다.');
    }
  }
}
