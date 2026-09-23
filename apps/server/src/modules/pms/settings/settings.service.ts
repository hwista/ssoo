import { Injectable } from '@nestjs/common';
import type { PmsUserSettings } from '@ssoo/types';
import { DatabaseService } from '../../../database/database.service.js';

export const DEFAULT_PMS_SETTINGS: PmsUserSettings = {
  showCompletedTasks: true,
  defaultProjectView: 'board',
  notifyTaskAssignment: true,
  notifyIssueUpdate: true,
};

@Injectable()
export class PmsSettingsService {
  constructor(private readonly db: DatabaseService) {}

  async lock(tx: Pick<DatabaseService['client'], 'pmsUserSettings' | '$queryRaw'>, userId: bigint) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`pms-settings:${userId}`}, 0))::text`;
  }

  async read(userId: bigint, tx: Pick<DatabaseService['client'], 'pmsUserSettings' | '$queryRaw'> = this.db.client): Promise<PmsUserSettings> {
    const row = await tx.pmsUserSettings.findUnique({ where: { userId } });
    if (!row) return { ...DEFAULT_PMS_SETTINGS };
    return {
      showCompletedTasks: row.showCompletedTasks,
      defaultProjectView: row.defaultProjectView as PmsUserSettings['defaultProjectView'],
      notifyTaskAssignment: row.notifyTaskAssignment,
      notifyIssueUpdate: row.notifyIssueUpdate,
    };
  }

  async update(userId: bigint, patch: Partial<PmsUserSettings>) {
    return this.db.client.$transaction(async (tx) => {
      await this.lock(tx, userId);
      await tx.pmsUserSettings.upsert({
        where: { userId },
        create: { userId, ...patch, createdBy: userId, updatedBy: userId, lastSource: 'pms.settings' },
        update: { ...patch, updatedBy: userId, lastSource: 'pms.settings' },
      });
      return this.read(userId, tx);
    });
  }
}
