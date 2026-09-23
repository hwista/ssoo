import type { JsonFieldDescriptor } from './types';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@ssoo/web-ui';
import { cn } from '@/lib/utils';

export function JsonFieldRow({
  item,
  id,
  value,
  originalValue,
  errorMessage,
  onChange,
  readOnly = false,
  showDescription = false,
}: {
  item: JsonFieldDescriptor;
  id?: string;
  value: unknown;
  originalValue: unknown;
  errorMessage?: string;
  onChange?: (key: string, value: unknown) => void;
  readOnly?: boolean;
  showDescription?: boolean;
}) {
  const isModified = value !== originalValue;
  const strVal = String(value ?? '');
  const boolVal = Boolean(value);

  return (
    <article id={id} className="scroll-mt-4 px-3 py-2.5 [container-type:inline-size]">
      <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,360px)] md:items-center [@container(max-width:559px)]:grid-cols-1 [@container(max-width:559px)]:items-start">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              'mt-1.5 block h-2 w-2 shrink-0 rounded-full',
              isModified ? 'bg-ssoo-primary' : 'bg-ssoo-content-border'
            )}
            aria-hidden
          />

          <div className="min-w-0 flex-1">
            <label htmlFor={`json-field-${item.key}`} className="text-label-strong text-ssoo-primary">
              {item.label}
            </label>
            {showDescription ? (
              <p className="mt-0.5 text-caption text-ssoo-primary/60">{item.description}</p>
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          {item.type === 'checkbox' ? (
            <label className="flex h-control-h w-full cursor-pointer items-center gap-2 rounded-md border border-ssoo-content-border bg-card px-3 text-body-sm text-ssoo-primary/80">
              <Input
                id={`json-field-${item.key}`}
                type="checkbox"
                checked={boolVal}
                onChange={(event) => onChange?.(item.key, event.target.checked)}
                disabled={readOnly}
                className="h-4 w-4 rounded border-ssoo-content-border accent-ssoo-primary"
              />
              <span>{boolVal ? '활성화' : '비활성화'}</span>
            </label>
          ) : item.type === 'select' ? (
            <NativeSelect
              id={`json-field-${item.key}`}
              value={strVal}
              onChange={(event) => onChange?.(item.key, event.target.value)}
              disabled={readOnly}
              className={cn(
                'border-ssoo-content-border bg-card text-ssoo-primary focus-visible:ring-ssoo-primary',
                'disabled:bg-ssoo-content-bg/40 disabled:text-ssoo-primary/60',
                errorMessage && 'border-destructive'
              )}
            >
              {(item.options ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          ) : (
            <Input
              id={`json-field-${item.key}`}
              type={item.type}
              value={strVal}
              onChange={(event) => onChange?.(item.key, event.target.value)}
              placeholder={item.placeholder}
              disabled={readOnly}
              className={cn(
                'border-ssoo-content-border bg-card text-ssoo-primary placeholder:text-ssoo-primary/40 focus-visible:ring-ssoo-primary',
                'disabled:bg-ssoo-content-bg/40 disabled:text-ssoo-primary/60',
                errorMessage && 'border-destructive'
              )}
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
