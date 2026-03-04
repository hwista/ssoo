'use client';

import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Terminal,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link,
  ImageIcon,
  Table,
  CheckSquare,
  Highlighter,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { Divider } from '@/components/ui/divider';

export type ToolbarCommandId =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'inlineCode'
  | 'highlight'
  | 'link'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'ul'
  | 'ol'
  | 'task'
  | 'quote'
  | 'code'
  | 'hr'
  | 'table'
  | 'image';

export interface EditorToolbarProps {
  disabled?: boolean;
  onCommand: (id: ToolbarCommandId) => void;
}

export function EditorToolbar({ disabled = false, onCommand }: EditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <div className={cn('flex flex-wrap items-center gap-1', disabled && 'opacity-50 pointer-events-none')}>
        <SimpleTooltip content="굵게 (Ctrl/Cmd+B)"><Button size="sm" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => onCommand('bold')}><Bold className="h-4 w-4" /></Button></SimpleTooltip>
        <SimpleTooltip content="기울임 (Ctrl/Cmd+I)"><Button size="sm" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => onCommand('italic')}><Italic className="h-4 w-4" /></Button></SimpleTooltip>
        <SimpleTooltip content="취소선 (Ctrl/Cmd+Shift+X)"><Button size="sm" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => onCommand('strike')}><Strikethrough className="h-4 w-4" /></Button></SimpleTooltip>
        <SimpleTooltip content="형광펜"><Button size="sm" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => onCommand('highlight')}><Highlighter className="h-4 w-4" /></Button></SimpleTooltip>
        <SimpleTooltip content="인라인 코드"><Button size="sm" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => onCommand('inlineCode')}><Code className="h-4 w-4" /></Button></SimpleTooltip>
        <Divider orientation="vertical" className="h-6 mx-1" />
        <SimpleTooltip content="제목 1"><Button size="sm" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => onCommand('h1')}><Heading1 className="h-4 w-4" /></Button></SimpleTooltip>
        <SimpleTooltip content="제목 2"><Button size="sm" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => onCommand('h2')}><Heading2 className="h-4 w-4" /></Button></SimpleTooltip>
        <SimpleTooltip content="제목 3"><Button size="sm" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => onCommand('h3')}><Heading3 className="h-4 w-4" /></Button></SimpleTooltip>
        <Divider orientation="vertical" className="h-6 mx-1" />
        <SimpleTooltip content="글머리"><Button size="sm" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => onCommand('ul')}><List className="h-4 w-4" /></Button></SimpleTooltip>
        <SimpleTooltip content="번호"><Button size="sm" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => onCommand('ol')}><ListOrdered className="h-4 w-4" /></Button></SimpleTooltip>
        <SimpleTooltip content="체크"><Button size="sm" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => onCommand('task')}><CheckSquare className="h-4 w-4" /></Button></SimpleTooltip>
        <SimpleTooltip content="인용"><Button size="sm" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => onCommand('quote')}><Quote className="h-4 w-4" /></Button></SimpleTooltip>
        <SimpleTooltip content="코드 블록"><Button size="sm" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => onCommand('code')}><Terminal className="h-4 w-4" /></Button></SimpleTooltip>
        <SimpleTooltip content="구분선"><Button size="sm" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => onCommand('hr')}><Minus className="h-4 w-4" /></Button></SimpleTooltip>
        <SimpleTooltip content="테이블"><Button size="sm" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => onCommand('table')}><Table className="h-4 w-4" /></Button></SimpleTooltip>
        <SimpleTooltip content="이미지"><Button size="sm" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => onCommand('image')}><ImageIcon className="h-4 w-4" /></Button></SimpleTooltip>
        <SimpleTooltip content="링크"><Button size="sm" variant="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => onCommand('link')}><Link className="h-4 w-4" /></Button></SimpleTooltip>
      </div>
    </div>
  );
}
