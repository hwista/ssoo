// 권한 요청·문서 공개 범위 관련 기능의 단일 진입점.
// 다른 모듈은 이 barrel 만 import 하고 내부 파일을 직접 참조하지 않는다.

export { DocumentAccessRequestDialogHost } from './RequestDialog';
export { VisibilitySection } from './VisibilitySelector';
export type { VisibilitySectionProps } from './VisibilitySelector';
export {
  normalizeDocumentAccessRequestPath,
  useDocumentAccessRequestStore,
} from './dialog-store';
export type { DocumentAccessRequestTarget } from './dialog-store';
export {
  accessRequestKeys,
  useManageableDocumentsQuery,
  useMyDocumentAccessRequestsQuery,
  useDocumentAccessInboxQuery,
  useCreateReadAccessRequestMutation,
  useApproveDocumentAccessRequestMutation,
  useRejectDocumentAccessRequestMutation,
  useCancelDocumentAccessRequestMutation,
  useUpdateDocumentVisibilityMutation,
  useTransferDocumentOwnershipMutation,
  useRevokeDocumentGrantMutation,
  useCreateDirectGrantMutation,
} from './queries';
