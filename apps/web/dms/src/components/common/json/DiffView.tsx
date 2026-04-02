import { SplitDiffViewer } from '@/components/common/diff/SplitDiffViewer';

export function JsonDiffView({
  originalText,
  currentText,
  className,
}: {
  originalText: string;
  currentText: string;
  className?: string;
}) {
  return (
    <SplitDiffViewer
      originalText={originalText}
      currentText={currentText}
      language="json"
      className={className}
    />
  );
}
