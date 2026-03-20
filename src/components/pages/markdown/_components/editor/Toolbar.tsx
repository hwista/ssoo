'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  MoreHorizontal,
  type LucideIcon,
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

export interface EditorCommandDefinition {
  id: ToolbarCommandId;
  title: string;
  description: string;
  tooltip: string;
  icon: LucideIcon;
}

export const EDITOR_COMMANDS: EditorCommandDefinition[] = [
  { id: 'bold', title: '굵게', description: '선택한 텍스트를 굵게 표시', tooltip: '굵게 (Ctrl/Cmd+B)', icon: Bold },
  { id: 'italic', title: '기울임', description: '선택한 텍스트를 기울임으로 표시', tooltip: '기울임 (Ctrl/Cmd+I)', icon: Italic },
  { id: 'strike', title: '취소선', description: '선택한 텍스트에 취소선 적용', tooltip: '취소선 (Ctrl/Cmd+Shift+X)', icon: Strikethrough },
  { id: 'highlight', title: '형광펜', description: '선택한 텍스트를 강조', tooltip: '형광펜', icon: Highlighter },
  { id: 'inlineCode', title: '인라인 코드', description: '짧은 코드를 인라인으로 삽입', tooltip: '인라인 코드', icon: Code },
  { id: 'h1', title: '제목 1', description: '가장 큰 제목 추가', tooltip: '제목 1', icon: Heading1 },
  { id: 'h2', title: '제목 2', description: '중간 크기 제목 추가', tooltip: '제목 2', icon: Heading2 },
  { id: 'h3', title: '제목 3', description: '작은 제목 추가', tooltip: '제목 3', icon: Heading3 },
  { id: 'ul', title: '글머리', description: '순서 없는 목록 추가', tooltip: '글머리', icon: List },
  { id: 'ol', title: '번호', description: '순서 있는 목록 추가', tooltip: '번호', icon: ListOrdered },
  { id: 'task', title: '체크', description: '체크리스트 추가', tooltip: '체크', icon: CheckSquare },
  { id: 'quote', title: '인용', description: '인용 블록 추가', tooltip: '인용', icon: Quote },
  { id: 'code', title: '코드 블록', description: '코드 블록 삽입', tooltip: '코드 블록', icon: Terminal },
  { id: 'hr', title: '구분선', description: '가로 구분선 삽입', tooltip: '구분선', icon: Minus },
  { id: 'table', title: '테이블', description: '기본 표 삽입', tooltip: '테이블', icon: Table },
  { id: 'image', title: '이미지', description: '이미지 URL을 마크다운으로 삽입', tooltip: '이미지', icon: ImageIcon },
  { id: 'link', title: '링크', description: '선택 영역에 링크 추가', tooltip: '링크', icon: Link },
];

export const TOOLBAR_COMMAND_GROUPS: ToolbarCommandId[][] = [
  ['bold', 'italic', 'strike', 'highlight', 'inlineCode'],
  ['h1', 'h2', 'h3'],
  ['ul', 'ol', 'task', 'quote', 'code', 'hr', 'table', 'image', 'link'],
];

export interface EditorToolbarProps {
  disabled?: boolean;
  onCommand: (id: ToolbarCommandId) => void;
}

const MAX_VISIBLE = 3;

function ToolbarOverflowGroup({
  commands,
  onCommand,
}: {
  commands: EditorCommandDefinition[];
  onCommand: (id: ToolbarCommandId) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }, []);

  const handleLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const visible = commands.slice(0, MAX_VISIBLE);
  const overflow = commands.slice(MAX_VISIBLE);

  return (
    <>
      {visible.map((command) => {
        const Icon = command.icon;
        return (
          <SimpleTooltip key={command.id} content={command.tooltip}>
            <Button
              size="sm"
              variant="ghost"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onCommand(command.id)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          </SimpleTooltip>
        );
      })}
      {overflow.length > 0 && (
        <div
          ref={containerRef}
          className="relative"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          <SimpleTooltip content="더보기">
            <Button
              size="sm"
              variant="ghost"
              onMouseDown={(e) => e.preventDefault()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </SimpleTooltip>
          {open && (
            <div className="absolute left-0 top-full z-30 mt-1 flex items-center gap-1 rounded-lg border border-ssoo-content-border bg-white p-1 shadow-md">
              {overflow.map((command) => {
                const Icon = command.icon;
                return (
                  <SimpleTooltip key={command.id} content={command.tooltip}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onCommand(command.id)}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  </SimpleTooltip>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function EditorToolbar({ disabled = false, onCommand }: EditorToolbarProps) {
  const commandMap = new Map(EDITOR_COMMANDS.map((command) => [command.id, command]));

  return (
    <div className="flex flex-wrap items-center gap-1">
      <div className={cn('flex items-center gap-1', disabled && 'opacity-50 pointer-events-none')}>
        {TOOLBAR_COMMAND_GROUPS.map((group, groupIndex) => {
          const commands = group
            .map((id) => commandMap.get(id))
            .filter((c): c is EditorCommandDefinition => c != null);

          return (
            <React.Fragment key={group.join('-')}>
              {commands.length > MAX_VISIBLE ? (
                <ToolbarOverflowGroup commands={commands} onCommand={onCommand} />
              ) : (
                commands.map((command) => {
                  const Icon = command.icon;
                  return (
                    <SimpleTooltip key={command.id} content={command.tooltip}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onCommand(command.id)}
                      >
                        <Icon className="h-4 w-4" />
                      </Button>
                    </SimpleTooltip>
                  );
                })
              )}
              {groupIndex < TOOLBAR_COMMAND_GROUPS.length - 1 && (
                <Divider orientation="vertical" className="h-6 mx-1" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
