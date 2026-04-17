/**
 * 공통 SSE 스트리밍 유틸리티.
 *
 * Chat과 Compose 모두 동일한 reader 루프 + abort 패턴을 사용하여
 * 즉시 중단이 구조적으로 보장됩니다.
 */

import { fetchWithSharedAuth } from './sharedAuth';

export interface SSEEvent {
  type?: string;
  [key: string]: unknown;
}

export interface StreamSSEOptions {
  url: string;
  body: unknown;
  signal?: AbortSignal;
  onEvent: (event: SSEEvent) => void;
  onError?: (error: Error) => void;
}

/**
 * SSE 엔드포인트에 POST 요청을 보내고 이벤트를 콜백으로 전달한다.
 *
 * abort signal이 발화되면 reader.cancel()로 즉시 스트림을 끊고,
 * 루프 내 signal.aborted 체크로 즉시 탈출한다.
 *
 * @returns 정상 완료 시 true, abort 시 false
 */
export async function streamSSE(options: StreamSSEOptions): Promise<boolean> {
  const { url, body, signal, onEvent, onError } = options;

  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  const cancelReader = () => { reader?.cancel().catch(() => {}); };
  signal?.addEventListener('abort', cancelReader, { once: true });

  try {
    const response = await fetchWithSharedAuth(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
      signal,
    });

    if (!response.ok || !response.body) {
      const fallback = await response.text();
      throw new Error(fallback || `HTTP ${response.status}`);
    }

    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done || signal?.aborted) break;

      buffer += decoder.decode(value, { stream: true });
      let splitIndex = buffer.indexOf('\n\n');

      while (splitIndex !== -1) {
        const rawEvent = buffer.slice(0, splitIndex);
        buffer = buffer.slice(splitIndex + 2);

        const dataLines = rawEvent
          .split('\n')
          .filter((line) => line.startsWith('data: '))
          .map((line) => line.slice(6).trim());

        for (const payload of dataLines) {
          if (!payload || payload === '[DONE]') continue;

          try {
            const parsed = JSON.parse(payload) as SSEEvent;
            if (parsed.type === 'error') {
              throw new Error(
                (typeof parsed.errorText === 'string' ? parsed.errorText : null) ??
                '요청 처리 중 오류가 발생했습니다.',
              );
            }
            onEvent(parsed);
          } catch (parseError) {
            if (parseError instanceof SyntaxError) continue;
            throw parseError;
          }
        }

        splitIndex = buffer.indexOf('\n\n');
      }
    }

    return !signal?.aborted;
  } catch (error) {
    if (signal?.aborted) return false;
    if (onError && error instanceof Error) {
      onError(error);
      return false;
    }
    throw error;
  } finally {
    signal?.removeEventListener('abort', cancelReader);
  }
}
