'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface EditorInputDialogProps {
  open: boolean;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function EditorInputDialog({
  open,
  title,
  description,
  label,
  placeholder,
  defaultValue = '',
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
}: EditorInputDialogProps) {
  const [value, setValue] = React.useState(defaultValue);

  React.useEffect(() => {
    if (open) {
      setValue(defaultValue);
    }
  }, [defaultValue, open]);

  const handleConfirm = React.useCallback(() => {
    onConfirm(value.trim());
  }, [onConfirm, value]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-ssoo-primary" htmlFor="editor-input-dialog-field">
            {label}
          </label>
          <input
            id="editor-input-dialog-field"
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleConfirm();
              }
            }}
            placeholder={placeholder}
            className="h-control-h rounded-md border border-ssoo-content-border px-3 text-sm outline-none focus:border-ssoo-primary"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button type="button" onClick={handleConfirm}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
