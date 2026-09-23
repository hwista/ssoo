import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { CommonNotificationItem } from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import { AccessFoundationService } from '../../common/access/access-foundation.service.js';
import { CommonNotificationService } from '../../common/notification/notification.service.js';
import { ProjectAccessService } from '../project/project-access.service.js';
import { PmsSettingsService } from './settings.service.js';

@Injectable()
export class PmsWorkNotificationService {
  constructor(
    private readonly db: DatabaseService,
    private readonly settings: PmsSettingsService,
    private readonly notifications: CommonNotificationService,
    private readonly access: ProjectAccessService,
    private readonly foundation: AccessFoundationService,
  ) {}

  private async eligible(projectId: bigint, userId: bigint, tx: Pick<DatabaseService['client'], 'pmsUserSettings' | '$queryRaw' | 'user' | 'projectMember' | 'commonNotification'>) {
    const user = await tx.user.findFirst({
      where: { id: userId, isActive: true, authAccount: { accountStatusCode: 'active' } },
      select: { id: true, userName: true, displayName: true, authAccount: { select: { loginId: true, lockedUntil: true } } },
    });
    if (!user?.authAccount || (user.authAccount.lockedUntil && user.authAccount.lockedUntil > new Date())) return null;
    try {
      await this.access.assertProjectCapability(projectId, {
        userId: userId.toString(), loginId: user.authAccount.loginId, userName: user.userName,
        organizationIds: (await this.foundation.getUserOrganizationIds(userId)).map(String),
      }, 'canViewProject');
      return user;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) return null;
      throw error;
    }
  }

  async assignees(projectId: bigint) {
    const members = await this.db.client.projectMember.findMany({
      where: { projectId, isActive: true, OR: [{ releasedAt: null }, { releasedAt: { gte: new Date() } }] },
      select: { userId: true }, distinct: ['userId'],
    });
    const candidates = await Promise.all(members.map(async ({ userId }) => {
      const user = await this.eligible(projectId, userId, this.db.client);
      return user ? { userId: userId.toString(), label: user.displayName || user.userName } : null;
    }));
    return candidates.filter((candidate) => candidate !== null);
  }

  async assertAssignee(tx: Pick<DatabaseService['client'], 'pmsUserSettings' | '$queryRaw' | 'user' | 'projectMember' | 'commonNotification'>, projectId: bigint, userId: bigint) {
    const member = await tx.projectMember.findFirst({
      where: { projectId, userId, isActive: true, OR: [{ releasedAt: null }, { releasedAt: { gte: new Date() } }] },
    });
    if (!member || !await this.eligible(projectId, userId, tx)) {
      throw new BadRequestException('현재 프로젝트에 접근할 수 있는 활성 멤버만 담당자로 지정할 수 있습니다.');
    }
  }

  async create(tx: Pick<DatabaseService['client'], 'pmsUserSettings' | '$queryRaw' | 'user' | 'projectMember' | 'commonNotification'>, input: {
    projectId: bigint; actorUserId: bigint; recipients: (bigint | null)[];
    kind: 'task-assignment' | 'issue-update'; referenceId: bigint; title: string;
  }): Promise<CommonNotificationItem[]> {
    const recipientIds = [...new Set(input.recipients.filter((id): id is bigint => id !== null && id !== input.actorUserId))]
      .sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    const items: CommonNotificationItem[] = [];
    for (const userId of recipientIds) {
      await this.settings.lock(tx, userId);
      const prefs = await this.settings.read(userId, tx);
      if (!(input.kind === 'task-assignment' ? prefs.notifyTaskAssignment : prefs.notifyIssueUpdate)) continue;
      if (!await this.eligible(input.projectId, userId, tx)) continue;
      const path = `/?projectId=${input.projectId}&tab=${input.kind === 'task-assignment' ? 'tasks' : 'controls'}&workNotification=true`;
      items.push(await this.notifications.createInTransaction(tx, {
        recipientUserId: userId, actorUserId: input.actorUserId, sourceApp: 'pms',
        notificationType: input.kind,
        title: input.kind === 'task-assignment' ? '작업이 배정되었습니다' : '프로젝트 이슈가 변경되었습니다',
        message: input.title.slice(0, 1000),
        reference: { type: input.kind === 'task-assignment' ? 'task' : 'project-issue', id: String(input.referenceId), path },
        action: { type: 'open-pms-reference', payload: { path, projectId: String(input.projectId) } },
      }));
    }
    return items;
  }

  publish(items: CommonNotificationItem[]) {
    this.notifications.publishCommittedNotifications(items);
  }
}
