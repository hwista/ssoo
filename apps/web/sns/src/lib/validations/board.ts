export const BOARD_TYPES = [
  { value: 'general', label: '일반' },
  { value: 'notice', label: '공지사항' },
  { value: 'qna', label: '질문답변' },
  { value: 'recruit', label: '인력 모집' },
] as const;

export interface BoardDraft {
  boardCode: string;
  boardName: string;
  boardType: string;
  description: string;
}

export function toCreateBoardInput(draft: BoardDraft) {
  const boardCode = draft.boardCode.trim();
  const boardName = draft.boardName.trim();
  const description = draft.description.trim();
  if (!boardCode || !boardName) throw new Error('게시판 코드와 이름을 입력하세요.');
  if (boardCode.length > 50) throw new Error('게시판 코드는 50자 이내로 입력하세요.');
  if (boardName.length > 200) throw new Error('게시판 이름은 200자 이내로 입력하세요.');
  if (description.length > 1000) throw new Error('설명은 1,000자 이내로 입력하세요.');
  if (!BOARD_TYPES.some(({ value }) => value === draft.boardType)) {
    throw new Error('게시판 유형을 선택하세요.');
  }
  return { boardCode, boardName, boardType: draft.boardType, description: description || undefined };
}
