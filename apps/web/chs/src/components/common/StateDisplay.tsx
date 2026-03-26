import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  fullHeight?: boolean;
  className?: string;
}

export function LoadingState({
  message = '로딩 중...',
  fullHeight,
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        fullHeight && 'min-h-[400px]',
        className
      )}
    >
      <div className="text-center">
        <div className="w-8 h-8 border-3 border-ssoo-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-body-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title = '데이터가 없습니다',
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12',
        className
      )}
    >
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-title-card text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-body-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
