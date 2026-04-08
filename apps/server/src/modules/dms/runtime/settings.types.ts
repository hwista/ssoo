export type SettingsScope = 'system' | 'personal';

export type SettingsViewMode = 'structured' | 'json' | 'diff';

export type PreferredSettingsViewMode = Exclude<SettingsViewMode, 'diff'>;

export type SettingsProfileKey = 'anonymous';

export type SettingsAccessMode = 'anonymous-first';
