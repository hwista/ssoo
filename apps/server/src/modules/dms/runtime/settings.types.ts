export type SettingsScope = 'system' | 'personal';

export type SettingsViewMode = 'structured' | 'json' | 'diff';

export type PreferredSettingsViewMode = Exclude<SettingsViewMode, 'diff'>;

export type SettingsProfileKey = 'anonymous' | (string & {});

export type SettingsAccessMode = 'anonymous-first';

// ============================================================================
// DB Client (Prisma extended client)
// ============================================================================

import type { ExtendedPrismaClient } from '@ssoo/database';

/** dms-config.service / personal-settings.service 가 사용하는 DB 클라이언트 타입 */
export type DmsConfigDbClient = ExtendedPrismaClient;

