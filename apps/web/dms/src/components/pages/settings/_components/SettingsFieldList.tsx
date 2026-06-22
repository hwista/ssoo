import { JsonRenderer, type JsonFieldDescriptor } from '@/components/common/json';

export function SettingsFieldList({
  items,
  localConfig,
  originalConfig,
  validationErrors,
  getValue,
  onChange,
  readOnly = false,
  getItemAnchorId,
}: {
  items: JsonFieldDescriptor[];
  localConfig: Record<string, unknown>;
  originalConfig: Record<string, unknown>;
  validationErrors: Record<string, string>;
  getValue: (obj: Record<string, unknown>, path: string) => unknown;
  onChange: (key: string, value: unknown) => void;
  readOnly?: boolean;
  getItemAnchorId?: (item: JsonFieldDescriptor) => string;
}) {
  return (
    <JsonRenderer
      items={items}
      localConfig={localConfig}
      originalConfig={originalConfig}
      validationErrors={validationErrors}
      getValue={getValue}
      onChange={onChange}
      readOnly={readOnly}
      getItemAnchorId={getItemAnchorId}
    />
  );
}
