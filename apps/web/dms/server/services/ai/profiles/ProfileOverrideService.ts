import fs from 'fs';
import path from 'path';
import { getDefaultProfile } from './registry';
import type { AiProfileOverride, AiTaskKey, AiTaskProfile } from './types';

const PROFILE_ROOT = path.join(process.cwd(), 'data', 'ai', 'profiles');

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readOverride(filePath: string): AiProfileOverride | null {
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as AiProfileOverride;
  } catch {
    return null;
  }
}

function mergeProfile(profile: AiTaskProfile, override: AiProfileOverride | null): AiTaskProfile {
  if (!override) return profile;
  return {
    ...profile,
    persona: override.persona?.trim() || profile.persona,
    instructions: override.instructions?.trim() || profile.instructions,
  };
}

export class ProfileOverrideService {
  private getGlobalOverridePath(key: AiTaskKey): string {
    return path.join(PROFILE_ROOT, 'global', `${key}.json`);
  }

  private getPersonalOverridePath(key: AiTaskKey, userId: string): string {
    return path.join(PROFILE_ROOT, 'personal', userId || 'anonymous', `${key}.json`);
  }

  resolveProfile(key: AiTaskKey, userId = 'anonymous'): AiTaskProfile {
    ensureDir(path.join(PROFILE_ROOT, 'global'));
    ensureDir(path.join(PROFILE_ROOT, 'personal'));

    const base = getDefaultProfile(key);
    const withGlobal = mergeProfile(base, readOverride(this.getGlobalOverridePath(key)));
    return mergeProfile(withGlobal, readOverride(this.getPersonalOverridePath(key, userId)));
  }

  saveOverride(key: AiTaskKey, override: AiProfileOverride, scope: 'global' | 'personal', userId = 'anonymous'): void {
    const filePath = scope === 'global'
      ? this.getGlobalOverridePath(key)
      : this.getPersonalOverridePath(key, userId);
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(override, null, 2) + '\n', 'utf-8');
  }

  removeOverride(key: AiTaskKey, scope: 'global' | 'personal', userId = 'anonymous'): void {
    const filePath = scope === 'global'
      ? this.getGlobalOverridePath(key)
      : this.getPersonalOverridePath(key, userId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

export const profileOverrideService = new ProfileOverrideService();
