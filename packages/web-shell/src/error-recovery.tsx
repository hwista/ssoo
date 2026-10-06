'use client';

import { useId, useState, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button, cn } from '@ssoo/web-ui';
import { useSsooRetryDelay } from './retry-delay';
import { getSsooErrorMessage, isSafeSsooRecoveryHref, resolveSsooError, type SsooErrorKind } from './error-model';

export type SsooRecoveryAction = {
  label: string;
  disabled?: boolean;
  intent?: 'retry' | 'exit';
} & ({ href: string; onClick?: never } | { href?: never; onClick: () => void | Promise<unknown> });

export interface SsooErrorPanelProps {
  error?: unknown;
  kind?: SsooErrorKind;
  title?: string;
  description?: ReactNode;
  actions?: readonly SsooRecoveryAction[];
  onRetry?: () => void | Promise<unknown>;
  retrying?: boolean;
  homeHref?: string;
  homeLabel?: string;
  children?: ReactNode;
  className?: string;
}

function RecoveryAction({ action, primary }: { action: SsooRecoveryAction; primary: boolean }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  if (action.href !== undefined) {
    if (!isSafeSsooRecoveryHref(action.href)) return null;
    return <Button asChild variant={primary ? 'default' : 'outline'}><a href={action.href}>{action.label}</a></Button>;
  }
  return (
    <div className="flex flex-col gap-2">
      <Button variant={primary ? 'default' : 'outline'} disabled={pending || action.disabled} onClick={async () => {
        setPending(true);
        setFailed(false);
        try { await action.onClick(); } catch { setFailed(true); } finally { setPending(false); }
      }}>{pending ? '처리 중...' : action.label}</Button>
      {failed ? <SsooErrorNotice message="요청을 처리하지 못했습니다. 다시 시도해 주세요." /> : null}
    </div>
  );
}

export function SsooRecoveryActions({ actions }: { actions: readonly SsooRecoveryAction[] }) {
  return <div className="flex flex-wrap gap-2">{actions.map((action, index) => <RecoveryAction key={`${action.label}-${index}`} action={action} primary={index === 0} />)}</div>;
}

function ErrorContent({ error, kind, title, description, actions, onRetry, retrying, homeHref = '/', homeLabel = '홈으로 이동', children, page }: SsooErrorPanelProps & { page: boolean }) {
  const id = useId();
  const resolved = resolveSsooError(error, kind);
  const retryDelay = useSsooRetryDelay(error);
  const recovery: SsooRecoveryAction[] = [
    ...(onRetry ? [{ label: retrying ? '확인 중...' : '다시 시도', onClick: onRetry, disabled: retrying || retryDelay > 0 }] : []),
    ...(actions ?? []).map(action => action.intent === 'retry' && retryDelay > 0 ? { ...action, disabled: true } : action),
  ];
  // A full/content error can never consist only of text or repeated retries.
  if (!recovery.some(action => (action.href !== undefined && isSafeSsooRecoveryHref(action.href)) || action.intent === 'exit')) {
    recovery.push({ label: homeLabel, href: isSafeSsooRecoveryHref(homeHref) ? homeHref : '/' });
  }
  const Heading = page ? 'h1' : 'h2';
  return (
    <section aria-labelledby={id} data-ssoo-error={resolved.kind} className="w-full space-y-4">
      <AlertCircle aria-hidden="true" className="h-8 w-8 text-muted-foreground" />
      <Heading id={id} className="text-heading-sm font-semibold text-foreground">{title ?? resolved.title}</Heading>
      <div role="alert" className="text-body-sm text-muted-foreground">
        {description ?? getSsooErrorMessage(error, resolved.description)}
      </div>
      {retryDelay > 0 ? <p className="text-body-sm text-muted-foreground">약 {retryDelay}초 후 다시 시도해 주세요.</p> : null}
      {resolved.requestId ? <p className="text-caption text-muted-foreground">문의 코드: {resolved.requestId}</p> : null}
      {children}
      <SsooRecoveryActions actions={recovery} />
    </section>
  );
}

export function SsooErrorPage({ className, ...props }: SsooErrorPanelProps) {
  return <main className={cn('flex min-h-screen items-center justify-center bg-muted/30 p-6', className)}>
    <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-sm"><ErrorContent {...props} page /></div>
  </main>;
}

export function SsooErrorPanel({ className, ...props }: SsooErrorPanelProps) {
  return <div className={cn('flex w-full min-w-0 justify-center p-6', className)}>
    <div className="w-full max-w-lg"><ErrorContent {...props} page={false} /></div>
  </div>;
}

export interface SsooErrorNoticeProps {
  as?: 'div' | 'span' | 'p';
  message?: ReactNode;
  error?: unknown;
  children?: ReactNode;
  actions?: readonly SsooRecoveryAction[];
  id?: string;
  className?: string;
  compact?: boolean;
}

/** Inline/form errors stay with the user's draft; surrounding submit/cancel controls remain usable. */
export function SsooErrorNotice({ as: Tag = 'div', message, error, children, actions, id, className, compact = false }: SsooErrorNoticeProps) {
  const retryDelay = useSsooRetryDelay(error);
  return <Tag id={id} role="alert" data-ssoo-error="notice" className={cn(compact ? 'text-body-sm text-destructive' : 'space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-body-sm text-destructive', className)}>
    {typeof message === 'string' ? getSsooErrorMessage(message) : message ?? (error !== undefined ? getSsooErrorMessage(error) : null)}
    {children}
    {retryDelay > 0 ? <span className="block">약 {retryDelay}초 후 다시 시도해 주세요.</span> : null}
    {actions?.length ? <SsooRecoveryActions actions={actions} /> : null}
  </Tag>;
}
