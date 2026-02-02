'use client';

import React, { useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import EditorToolbar from './EditorToolbar';
import SlashCommand from './SlashCommand';
import './editor.css';

const lowlight = createLowlight(common);

export interface BlockEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  editable?: boolean;
  placeholder?: string;
  className?: string;
}

export interface BlockEditorRef {
  getEditor: () => Editor | null;
  getMarkdown: () => string;
  setContent: (content: string) => void;
  focus: () => void;
}

const BlockEditor = forwardRef<BlockEditorRef, BlockEditorProps>(({
  content,
  onChange,
  onSave,
  editable = true,
  placeholder = '내용을 입력하세요... "/" 를 입력하여 블록을 추가하세요',
  className = '',
}, ref) => {
  const editor = useEditor({
    immediatelyRender: false, // SSR hydration mismatch 방지
    extensions: [
      StarterKit.configure({
        codeBlock: false, // CodeBlockLowlight 사용
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:underline cursor-pointer',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-2',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full',
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 p-2',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 p-2 bg-gray-100 font-semibold',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-gray-900 text-gray-100 rounded-lg p-4 my-2 overflow-x-auto',
        },
      }),
      SlashCommand,
    ],
    content: content || '',
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
  });

  // content prop이 변경되면 에디터 내용 업데이트
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  // editable 상태 변경 시 업데이트
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  // Ctrl+S 단축키 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  // ref를 통해 외부에서 에디터 제어
  useImperativeHandle(ref, () => ({
    getEditor: () => editor,
    getMarkdown: () => editor?.getHTML() || '',
    setContent: (newContent: string) => {
      editor?.commands.setContent(newContent);
    },
    focus: () => {
      editor?.commands.focus();
    },
  }), [editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-pulse text-gray-400">에디터 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className={`block-editor flex flex-col h-full ${className}`}>
      {editable && (
        <EditorToolbar editor={editor} />
      )}
      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});

BlockEditor.displayName = 'BlockEditor';

export { BlockEditor };
