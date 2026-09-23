'use client';

import { useEffect, useState } from 'react';
import { Button } from '@ssoo/web-ui';

function DraftImage({ file }: { file: File }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt={file.name} className="h-24 w-full object-contain" /> : null;
}

export function ImageDrafts({ files, disabled, onRemove }: { files: File[]; disabled: boolean; onRemove: (index: number) => void }) {
  if (!files.length) return null;
  return <div className="grid grid-cols-2 gap-2" aria-label="선택한 사진">
    {files.map((file, index) => <div key={`${index}:${file.name}`} className="min-w-0 space-y-1 rounded-md border p-2">
      <DraftImage file={file} />
      <p className="truncate text-caption-xs">{file.name}</p>
      <Button variant="outline" size="sm" disabled={disabled} aria-label={`${file.name} 제거`} onClick={() => onRemove(index)}>제거</Button>
    </div>)}
  </div>;
}
