'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, Input, NativeSelect, Textarea,
} from '@ssoo/web-ui';
import { useCreateBoard } from '@/hooks/queries/useBoards';
import { ApiError } from '@/lib/api/client';
import type { BoardItem } from '@/lib/api/endpoints/boards';
import { BOARD_TYPES, toCreateBoardInput } from '@/lib/validations/board';

interface CreateBoardDialogProps {
  onClose: () => void;
  onCreated: (board: BoardItem) => void;
}

export function CreateBoardDialog({ onClose, onCreated }: CreateBoardDialogProps) {
  const id = useId();
  const mutation = useCreateBoard();
  const submitting = useRef(false);
  const [draft, setDraft] = useState({ boardCode: '', boardName: '', boardType: 'general', description: '' });
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError(null);
    submitting.current = true;
    try {
      const board = await mutation.mutateAsync(toCreateBoardInput(draft));
      onCreated(board);
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 409
        ? '이미 사용 중인 게시판 코드입니다. 다른 코드를 입력하세요.'
        : cause instanceof Error ? cause.message : '게시판을 만들지 못했습니다. 다시 시도해 주세요.');
    } finally {
      submitting.current = false;
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !submitting.current) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 게시판</DialogTitle>
          <DialogDescription>코드·이름·유형은 필수이며, 설명은 선택 항목입니다.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" aria-busy={mutation.isPending}>
          {error && <p role="alert" id={`${id}-error`} className="text-body-sm text-destructive">{error}</p>}
          <fieldset disabled={mutation.isPending} className="space-y-4" aria-describedby={error ? `${id}-error` : undefined}>
            <div className="space-y-1">
              <label htmlFor={`${id}-code`} className="text-body-sm">게시판 코드 (필수)</label>
              <Input id={`${id}-code`} value={draft.boardCode} required maxLength={50} autoComplete="off"
                onChange={(event) => setDraft({ ...draft, boardCode: event.target.value })} />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${id}-name`} className="text-body-sm">게시판 이름 (필수)</label>
              <Input id={`${id}-name`} value={draft.boardName} required maxLength={200} autoComplete="off"
                onChange={(event) => setDraft({ ...draft, boardName: event.target.value })} />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${id}-type`} className="text-body-sm">게시판 유형 (필수)</label>
              <NativeSelect id={`${id}-type`} value={draft.boardType} required
                onChange={(event) => setDraft({ ...draft, boardType: event.target.value })}>
                {BOARD_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <label htmlFor={`${id}-description`} className="text-body-sm">설명</label>
              <Textarea id={`${id}-description`} value={draft.description} maxLength={1000}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>취소</Button>
              <Button type="submit">{mutation.isPending ? '생성 중...' : '생성'}</Button>
            </DialogFooter>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
