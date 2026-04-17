import type { DeepPartialClient, DmsSettingsConfigClient } from '@/lib/api/endpoints/settings';
import { deepMergeRecords, parseJsonObject, stringifyJson } from '@/lib/utils/json';
import { getNestedValue, setNestedValue } from '@/lib/utils/objectPath';
import type { SettingItem, SettingSection } from '../_config/settingsPageConfig';

export { getNestedValue, setNestedValue };

export function isRelativePath(pathText: string): boolean {
  if (!pathText.trim()) return false;
  if (pathText.startsWith('/') || pathText.startsWith('~')) return false;
  if (/^[A-Za-z]:[\\/]/.test(pathText)) return false;
  return true;
}

function buildSettingItemMap(sections: SettingSection[]) {
  const map = new Map<string, SettingItem>();
  sections.forEach((section) => {
    section.items.forEach((item) => {
      map.set(item.key, item);
    });
  });
  return map;
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
  localConfig: Record<string, unknown>,
  sections: SettingSection[]
): DeepPartialClient<DmsSettingsConfigClient> {
  const itemMap = buildSettingItemMap(sections);
  let partial: Record<string, unknown> = {};

  modifiedKeys.forEach((key) => {
    const item = itemMap.get(key);
    const rawValue = getNestedValue(localConfig, key);
    const value = item?.coerce ? item.coerce(rawValue) : rawValue;
    partial = setNestedValue(partial, key, value);
  });

  return partial as DeepPartialClient<DmsSettingsConfigClient>;
}

export function buildSectionUpdatePayload(
  sectionPath: string,
  sectionValue: Record<string, unknown>
): DeepPartialClient<DmsSettingsConfigClient> {
  return setNestedValue({}, sectionPath, sectionValue) as DeepPartialClient<DmsSettingsConfigClient>;
}

export function mergeSettingsPayloads(
  ...partials: Array<DeepPartialClient<DmsSettingsConfigClient>>
): DeepPartialClient<DmsSettingsConfigClient> {
  return partials.reduce<DeepPartialClient<DmsSettingsConfigClient>>((merged, partial) => {
    return deepMergeRecords(
      merged as Record<string, unknown>,
      partial as Record<string, unknown>
    ) as DeepPartialClient<DmsSettingsConfigClient>;
  }, {});
}

export function getSectionObject(
  config: Record<string, unknown>,
  sectionPath: string
): Record<string, unknown> {
  const value = getNestedValue(config, sectionPath);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function replaceSectionValue(
  config: Record<string, unknown>,
  sectionPath: string,
  sectionValue: Record<string, unknown>
): Record<string, unknown> {
  return setNestedValue(config, sectionPath, sectionValue);
}

export function buildSectionJsonDraft(config: Record<string, unknown>, sectionPath: string): string {
  return stringifyJson(getSectionObject(config, sectionPath));
}

export function parseSectionJsonDraft(text: string):
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string } {
  return parseJsonObject(text);
}
