export interface SnsPostAccessRequest {
  id: string;
  postId: string;
  requesterUserId: string;
  requestedRole: 'read' | 'write';
  statusCode: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'revoked';
  requestMessage: string;
  decisionMessage: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface SnsPostAccessState {
  postId: string;
  canRead: boolean;
  canManage: boolean;
  requests: SnsPostAccessRequest[];
}
