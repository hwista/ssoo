import { nanoid } from 'nanoid';

/**
 * nanoid(8) 기반 유니크 파일명 생성.
 * 결과 예: `V1StGXR8.md`
 */
export function generateUniqueFilename(extension = '.md'): string {
  return `${nanoid(8)}${extension}`;
}
