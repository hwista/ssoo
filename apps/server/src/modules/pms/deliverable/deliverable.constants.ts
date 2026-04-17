export const COMPLETED_DELIVERABLE_SUBMISSION_STATUSES: readonly string[] = [
  'approved',
  'not_required',
];

export function isDeliverableSubmissionCompleted(
  submissionStatusCode: string,
): boolean {
  return COMPLETED_DELIVERABLE_SUBMISSION_STATUSES.includes(submissionStatusCode);
}
