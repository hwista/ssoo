import { ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common';
import type { CommonNotificationDomainEvent, CommonNotificationItem } from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import { NotificationObjectPolicyService, type NotificationObjectPolicy } from '../../common/notification/notification-object-policy.service.js';
import { AccessService } from './access.service.js';
import { DocumentAclService } from './document-acl.service.js';
import { DocumentControlPlaneService } from './document-control-plane.service.js';

function id(value: unknown): bigint | undefined {
  return typeof value === 'string' && /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n ? BigInt(value) : undefined;
}

@Injectable()
export class DocumentNotificationPolicyService implements OnModuleInit, NotificationObjectPolicy {
  constructor(private readonly db: DatabaseService, private readonly policies: NotificationObjectPolicyService,
    private readonly access: AccessService, private readonly acl: DocumentAclService,
    private readonly control: DocumentControlPlaneService) {}

  onModuleInit(): void { this.policies.register('dms', this); }

  async canReadNotification(item: CommonNotificationItem): Promise<boolean> {
    const payload = item.action?.payload;
    let documentId = id(payload?.documentId ?? (item.reference?.type === 'dms.document' ? item.reference.id : undefined));
    if (!documentId && item.reference?.type === 'dms.document-access-request' && id(item.reference.id)) {
      const request = await this.db.client.dmsDocumentAccessRequest.findUnique({ where: { accessRequestId: id(item.reference.id) }, select: { documentId: true } });
      documentId = request?.documentId;
    }
    return this.canRead(BigInt(item.recipientUserId), documentId, item.reference?.path ?? payload?.path);
  }

  async canReadDomainEvent(userId: bigint, event: CommonNotificationDomainEvent): Promise<boolean> {
    return this.canRead(userId, id(event.payload?.documentId), event.payload?.path);
  }

  private async canRead(userId: bigint, documentId: bigint | undefined, relativePath: unknown): Promise<boolean> {
    if (!documentId && (typeof relativePath !== 'string' || !relativePath)) return false;
    const [account, document] = await Promise.all([
      this.db.client.user.findFirst({ where: { id: userId, isActive: true }, select: { authAccount: { select: { loginId: true, accountStatusCode: true } } } }),
      this.db.client.dmsDocument.findFirst({ where: {
        ...(documentId ? { documentId } : { relativePath: relativePath as string }),
        isActive: true, documentStatusCode: 'active', syncStatusCode: { notIn: ['missing', 'deleted'] },
      }, select: { relativePath: true } }),
    ]);
    if (!account?.authAccount || account.authAccount.accountStatusCode !== 'active' || !document) return false;
    const user = { userId: userId.toString(), loginId: account.authAccount.loginId };
    try { await this.access.assertFeatures(user, ['canReadDocuments']); }
    catch (error) { if (error instanceof ForbiddenException) return false; throw error; }
    const metadata = await this.control.refreshProjectedMetadataByRelativePath(document.relativePath);
    return Boolean(metadata && this.acl.isReadableMetadata(user, metadata));
  }
}
