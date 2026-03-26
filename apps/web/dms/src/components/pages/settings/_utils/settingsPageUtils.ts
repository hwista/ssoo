import type { DeepPartialClient, DmsConfigClient } from '@/lib/api';
import type { SettingSection } from '../_config/settingsPageConfig';

export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split('.');
  const result = { ...obj };
  let current: Record<string, unknown> = result;

  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    current[key] = { ...((current[key] as Record<string, unknown>) || {}) };
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

export function isRelativePath(pathText: string): boolean {
  if (!pathText.trim()) return false;
  if (pathText.startsWith('/') || pathText.startsWith('~')) return false;
  if (/^[A-Za-z]:[\\/]/.test(pathText)) return false;
  return true;
}

export function buildKeyToLabelMap(sections: SettingSection[]) {
  const map = new Map<string, string>();
  sections.forEach((section) => {
    section.items.forEach((item) => {
      map.set(item.key, item.label);
    });
  });
  return map;
}

export function getModifiedKeys(
  sections: SettingSection[],
  localConfig: Record<string, unknown>,
  originalConfig: Record<string, unknown>
) {
  const keys: string[] = [];
  sections.forEach((section) => {
    section.items.forEach((item) => {
      const localValue = getNestedValue(localConfig, item.key);
      const originalValue = getNestedValue(originalConfig, item.key);
      if (localValue !== originalValue) {
        keys.push(item.key);
      }
    });
  });
  return keys;
}

export function getValidationErrors(
  sections: SettingSection[],
  localConfig: Record<string, unknown>
) {
  const errors: Record<string, string> = {};
  sections.forEach((section) => {
    section.items.forEach((item) => {
      if (!item.validate) return;
      const value = getNestedValue(localConfig, item.key);
      const message = item.validate(value);
      if (message) {
        errors[item.key] = message;
      }
    });
  });
  return errors;
}

export function buildSettingsUpdatePayload(
  modifiedKeys: string[],
  localConfig: Record<string, unknown>
): DeepPartialClient<DmsConfigClient> {
  let partial: Record<string, unknown> = {};

  modifiedKeys.forEach((key) => {
    const rawValue = getNestedValue(localConfig, key);
    const value = key === 'ingest.maxConcurrentJobs' ? Number(rawValue) : rawValue;
    partial = setNestedValue(partial, key, value);
  });

  return partial as DeepPartialClient<DmsConfigClient>;
}
