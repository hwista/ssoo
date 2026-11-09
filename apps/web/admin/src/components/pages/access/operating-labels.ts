/** Operator-facing names; persisted/API codes remain unchanged. */
export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: '정상', suspended: '이용 정지', locked: '잠김', disabled: '비활성', inactive: '비활성', pending: '승인 대기', missing: '로그인 계정 없음',
};
export const PARTICIPATION_STATUS_LABELS: Record<string, string> = {
  active: '참여 승인', pending: '참여 승인 대기', suspended: '참여 중지',
};
