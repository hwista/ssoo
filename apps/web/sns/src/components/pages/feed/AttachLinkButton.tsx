'use client';

import { useId, useState } from 'react';
import { Link2 } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input } from '@ssoo/web-ui';
import { parsePostUrl } from '@/lib/utils/post-links';

export function AttachLinkButton({ disabled, onAdd }: { disabled: boolean; onAdd: (url: string) => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  function changeOpen(next: boolean) {
    setOpen(next);
    setValue('');
    setError('');
  }
  function add() {
    const url = parsePostUrl(value);
    if (!url) {
      setError('http:// 또는 https://로 시작하는 올바른 웹 주소를 입력해 주세요.');
      return;
    }
    onAdd(url);
    changeOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild><Button variant="ghost" size="icon" disabled={disabled} aria-label="링크 첨부"><Link2 className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>링크 첨부</DialogTitle><DialogDescription>웹 주소를 작성 중인 본문 끝에 추가합니다.</DialogDescription></DialogHeader>
        <div className="space-y-2">
          <label htmlFor={id} className="text-body-sm">웹 주소</label>
          <Input id={id} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); add(); } }} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} autoComplete="off" />
          {error && <p id={`${id}-error`} role="alert" className="text-body-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2"><Button variant="outline" onClick={() => changeOpen(false)}>취소</Button><Button onClick={add} disabled={disabled}>추가</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
