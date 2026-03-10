import { SettingRow } from './SettingRow';

interface SectionItem {
  key: string;
  label: string;
  helpKey: string;
  description: string;
  type: 'text' | 'email' | 'checkbox' | 'select';
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
}

export function SettingsFieldList({
  items,
  localConfig,
  originalConfig,
  validationErrors,
  getValue,
  onChange,
}: {
  items: SectionItem[];
  localConfig: Record<string, unknown>;
  originalConfig: Record<string, unknown>;
  validationErrors: Record<string, string>;
  getValue: (obj: Record<string, unknown>, path: string) => unknown;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <SettingRow
          key={item.key}
          item={item}
          value={getValue(localConfig, item.key)}
          originalValue={getValue(originalConfig, item.key)}
          errorMessage={validationErrors[item.key]}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
