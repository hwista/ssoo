interface RowItem {
  key: string;
  label: string;
  helpKey: string;
  description: string;
  type: 'text' | 'email' | 'checkbox' | 'select';
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
}

export function SettingRow({
  item,
  value,
  originalValue,
  errorMessage,
  onChange,
}: {
  item: RowItem;
  value: unknown;
  originalValue: unknown;
  errorMessage?: string;
  onChange: (key: string, value: unknown) => void;
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
          <label htmlFor={`setting-${item.key}`} className="text-sm font-semibold text-ssoo-primary">
            {item.label}
          </label>
          <p className="mt-0.5 text-xs text-ssoo-primary/70">{item.description}</p>
          <p className="mt-1 text-xs text-ssoo-primary/60">{item.helpKey}</p>

          {item.type === 'checkbox' ? (
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-ssoo-primary/80">
              <input
                id={`setting-${item.key}`}
                type="checkbox"
                checked={boolVal}
                onChange={(event) => onChange(item.key, event.target.checked)}
                className="h-4 w-4 rounded border-ssoo-content-border accent-ssoo-primary"
              />
              <span>{boolVal ? '활성화됨' : '비활성화됨'}</span>
            </label>
          ) : item.type === 'select' ? (
            <select
              id={`setting-${item.key}`}
              value={strVal}
              onChange={(event) => onChange(item.key, event.target.value)}
              className={[
                'mt-3 flex h-control-h w-full max-w-2xl rounded-md border bg-white px-3 text-sm text-ssoo-primary',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ssoo-primary',
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
              id={`setting-${item.key}`}
              type={item.type}
              value={strVal}
              onChange={(event) => onChange(item.key, event.target.value)}
              placeholder={item.placeholder}
              className={[
                'mt-3 flex h-control-h w-full max-w-2xl rounded-md border bg-white px-3 text-sm text-ssoo-primary',
                'placeholder:text-ssoo-primary/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ssoo-primary',
                errorMessage ? 'border-destructive' : 'border-ssoo-content-border',
              ].join(' ')}
            />
          )}

          {errorMessage && (
            <p className="mt-2 text-xs text-destructive">{errorMessage}</p>
          )}
        </div>
      </div>
    </article>
  );
}
