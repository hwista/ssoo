import { JsonFieldRow, type JsonFieldDescriptor } from '@/components/common/json';

export function SettingRow({
  item,
  value,
  originalValue,
  errorMessage,
  onChange,
}: {
  item: JsonFieldDescriptor;
  value: unknown;
  originalValue: unknown;
  errorMessage?: string;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <JsonFieldRow
      item={item}
      value={value}
      originalValue={originalValue}
      errorMessage={errorMessage}
      onChange={onChange}
    />
  );
}
