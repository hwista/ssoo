export type SummaryFileExtractionState = 'extracting' | 'ready' | 'failed';

export interface SummaryFileStatusLike {
  name: string;
  textContent?: string;
  images?: unknown[];
  warningReason?: string;
  unsupportedReason?: string;
  protectedMarkerDetected?: boolean;
  extractionState?: SummaryFileExtractionState;
}

function hasExtractedContent(file: SummaryFileStatusLike): boolean {
  return (file.textContent?.trim().length ?? 0) > 0 || (file.images?.length ?? 0) > 0;
}

export function getSummaryFileExtractionState(file: SummaryFileStatusLike): SummaryFileExtractionState {
  if (file.extractionState) {
    return file.extractionState;
  }
  if (file.unsupportedReason) {
    return 'failed';
  }
  if (hasExtractedContent(file)) {
    return 'ready';
  }
  return 'failed';
}

export function isSummaryFileExtracting(file: SummaryFileStatusLike): boolean {
  return getSummaryFileExtractionState(file) === 'extracting';
}

export function isSummaryFileReady(file: SummaryFileStatusLike): boolean {
  return getSummaryFileExtractionState(file) === 'ready';
}

export function getSummaryFileStatusLabel(file: SummaryFileStatusLike): string | null {
  if (isSummaryFileExtracting(file)) {
    return '분석 중';
  }
  if (file.unsupportedReason === 'protected-pdf') {
    return '보안 PDF';
  }
  if (file.unsupportedReason === 'extraction-error') {
    return '추출 실패';
  }
  if (file.unsupportedReason === 'empty-content') {
    return '본문 없음';
  }
  if (file.unsupportedReason === 'unsupported-file-type') {
    return '미지원 형식';
  }
  if (file.warningReason === 'protected-pdf-detected') {
    return '보호 흔적';
  }
  return null;
}

export function getSummaryFileIssueMessage(file: SummaryFileStatusLike): string | null {
  if (isSummaryFileExtracting(file)) {
    return null;
  }
  if (file.unsupportedReason === 'protected-pdf') {
    return '문서보안이 적용된 PDF라 본문을 추출할 수 없어 요약할 수 없습니다. 보안 해제본 또는 텍스트 추출 가능한 파일을 첨부해주세요.';
  }
  if (file.unsupportedReason === 'extraction-error') {
    return '파일의 텍스트를 추출하지 못했습니다. 파일을 확인한 뒤 다시 첨부해주세요.';
  }
  if (file.unsupportedReason === 'empty-content') {
    return '파일에서 요약할 수 있는 본문을 찾지 못했습니다.';
  }
  if (file.unsupportedReason === 'unsupported-file-type') {
    return '지원하지 않는 파일 형식이라 요약할 수 없습니다.';
  }
  if (file.warningReason === 'protected-pdf-detected') {
    return '문서보안 흔적이 감지되었습니다. 추출 가능한 본문 기준으로 요약합니다.';
  }
  if (getSummaryFileExtractionState(file) === 'failed') {
    return '파일의 텍스트를 추출하지 못했습니다. 파일을 확인한 뒤 다시 첨부해주세요.';
  }
  return null;
}

export function formatSummaryFileIssue(file: SummaryFileStatusLike): string | null {
  const message = getSummaryFileIssueMessage(file);
  return message ? `${file.name}: ${message}` : null;
}

export function hasUsableSummaryContent(file: SummaryFileStatusLike): boolean {
  if (!isSummaryFileReady(file)) {
    return false;
  }
  if (file.unsupportedReason) {
    return false;
  }
  return hasExtractedContent(file);
}

export function filterUsableSummaryFiles<T extends SummaryFileStatusLike>(files: T[]): T[] {
  return files.filter(hasUsableSummaryContent);
}

export function collectSummaryFileIssues(files: SummaryFileStatusLike[]): string[] {
  return files.flatMap((file) => {
    const message = formatSummaryFileIssue(file);
    return message ? [message] : [];
  });
}
