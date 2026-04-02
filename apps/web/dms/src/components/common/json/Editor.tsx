import { cn } from '@/lib/utils';

export function JsonEditor({
  value,
  onChange,
  errorMessage,
  readOnly = false,
  className,
}: {
  value: string;
  onChange?: (nextValue: string) => void;
  errorMessage?: string | null;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex h-full flex-col overflow-hidden rounded-lg border border-ssoo-content-border bg-white', className)}>
      <textarea
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        readOnly={readOnly}
        spellCheck={false}
        className="min-h-0 flex-1 resize-none bg-transparent px-4 py-4 font-mono text-code-block text-ssoo-primary outline-none"
      />
      {errorMessage ? (
        <div className="border-t border-destructive/20 bg-destructive/10 px-4 py-3 text-caption text-destructive">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
