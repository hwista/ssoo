import type { JsonFieldDescriptor } from './types';

export function JsonFieldRow({
  item,
  value,
  originalValue,
  errorMessage,
  onChange,
  readOnly = false,
}: {
  item: JsonFieldDescriptor;
  value: unknown;
  originalValue: unknown;
  errorMessage?: string;
  onChange?: (key: string, value: unknown) => void;
  readOnly?: boolean;
}) {
  const isModified = value !== originalValue;
  const strVal = String(value ?? '');
  const boolVal = Boolean(value);

  return (
    <article className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        <span
          className={[
            'mt-1 block h-2.5 w-2.5 rounded-full shrink-0',
            isModified ? 'bg-ssoo-primary' : 'bg-ssoo-content-border',
          ].join(' ')}
          aria-hidden
        />

        <div className="min-w-0 flex-1">
          <label htmlFor={`json-field-${item.key}`} className="text-label-strong text-ssoo-primary">
            {item.label}
          </label>
          <p className="mt-0.5 text-caption text-ssoo-primary/70">{item.description}</p>
          <p className="mt-1 text-caption text-ssoo-primary/60">{item.helpKey}</p>

          {item.type === 'checkbox' ? (
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-body-sm text-ssoo-primary/80">
              <input
                id={`json-field-${item.key}`}
                type="checkbox"
                checked={boolVal}
                onChange={(event) => onChange?.(item.key, event.target.checked)}
                disabled={readOnly}
                className="h-4 w-4 rounded border-ssoo-content-border accent-ssoo-primary"
              />
              <span>{boolVal ? '활성화됨' : '비활성화됨'}</span>
            </label>
          ) : item.type === 'select' ? (
            <select
              id={`json-field-${item.key}`}
              value={strVal}
              onChange={(event) => onChange?.(item.key, event.target.value)}
              disabled={readOnly}
              className={[
                'mt-3 flex h-control-h w-full max-w-2xl rounded-md border bg-white px-3 text-body-sm text-ssoo-primary',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ssoo-primary',
                'disabled:cursor-not-allowed disabled:bg-ssoo-content-bg/40 disabled:text-ssoo-primary/60',
                errorMessage ? 'border-destructive' : 'border-ssoo-content-border',
              ].join(' ')}
            >
              {(item.options ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`json-field-${item.key}`}
              type={item.type}
              value={strVal}
              onChange={(event) => onChange?.(item.key, event.target.value)}
              placeholder={item.placeholder}
              disabled={readOnly}
              className={[
                'mt-3 flex h-control-h w-full max-w-2xl rounded-md border bg-white px-3 text-body-sm text-ssoo-primary',
                'placeholder:text-ssoo-primary/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ssoo-primary',
                'disabled:cursor-not-allowed disabled:bg-ssoo-content-bg/40 disabled:text-ssoo-primary/60',
                errorMessage ? 'border-destructive' : 'border-ssoo-content-border',
              ].join(' ')}
            />
          )}

          {errorMessage && (
            <p className="mt-2 text-caption text-destructive">{errorMessage}</p>
          )}
        </div>
      </div>
    </article>
  );
}
