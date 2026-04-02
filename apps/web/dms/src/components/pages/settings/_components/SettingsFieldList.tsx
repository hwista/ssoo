import { JsonRenderer, type JsonFieldDescriptor } from '@/components/common/json';

export function SettingsFieldList({
  items,
  localConfig,
  originalConfig,
  validationErrors,
  getValue,
  onChange,
}: {
  items: JsonFieldDescriptor[];
  localConfig: Record<string, unknown>;
  originalConfig: Record<string, unknown>;
  validationErrors: Record<string, string>;
  getValue: (obj: Record<string, unknown>, path: string) => unknown;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <JsonRenderer
      items={items}
      localConfig={localConfig}
      originalConfig={originalConfig}
      validationErrors={validationErrors}
      getValue={getValue}
      onChange={onChange}
    />
  );
}
