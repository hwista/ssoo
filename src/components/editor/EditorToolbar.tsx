'use client';

import React, { useCallback, useState } from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { Divider } from '@/components/ui/divider';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link,
  Image,
  Table,
  CheckSquare,
  Highlighter,
  Undo,
  Redo,
  Minus,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);

  const setLink = useCallback(() => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      setLinkUrl('');
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  const addImage = useCallback(() => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
    }
    setShowImageInput(false);
  }, [editor, imageUrl]);

  const addTable = useCallback(() => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const ToolbarButton = ({
    onClick,
    isActive = false,
    disabled = false,
    tooltip,
    children
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    tooltip: string;
    children: React.ReactNode;
  }) => (
    <SimpleTooltip content={tooltip}>
      <Button
        variant={isActive ? 'default' : 'ghost'}
        size="sm"
        onClick={onClick}
        disabled={disabled}
        className={`min-w-8 px-2 ${isActive ? 'bg-blue-600 text-white' : ''}`}
      >
        {children}
      </Button>
    </SimpleTooltip>
  );

  return (
    <div className="editor-toolbar flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        tooltip="실행 취소 (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        tooltip="다시 실행 (Ctrl+Y)"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>

      <Divider orientation="vertical" className="h-6 mx-1" />

      {/* 텍스트 스타일 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        tooltip="굵게 (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        tooltip="기울임 (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        tooltip="취소선"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive('highlight')}
        tooltip="형광펜"
      >
        <Highlighter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        tooltip="인라인 코드"
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>

      <Divider orientation="vertical" className="h-6 mx-1" />

      {/* 헤딩 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        tooltip="제목 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        tooltip="제목 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        tooltip="제목 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <Divider orientation="vertical" className="h-6 mx-1" />

      {/* 리스트 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        tooltip="글머리 기호"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        tooltip="번호 매기기"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive('taskList')}
        tooltip="체크리스트"
      >
        <CheckSquare className="h-4 w-4" />
      </ToolbarButton>

      <Divider orientation="vertical" className="h-6 mx-1" />

      {/* 블록 요소 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        tooltip="인용구"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        tooltip="코드 블록"
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        tooltip="구분선"
      >
        <Minus className="h-4 w-4" />
      </ToolbarButton>

      <Divider orientation="vertical" className="h-6 mx-1" />

      {/* 링크 */}
      <div className="relative">
        <ToolbarButton
          onClick={() => setShowLinkInput(!showLinkInput)}
          isActive={editor.isActive('link')}
          tooltip="링크 삽입"
        >
          <Link className="h-4 w-4" />
        </ToolbarButton>
        {showLinkInput && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 flex gap-2">
            <input
              type="url"
              placeholder="URL 입력..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm w-48"
              onKeyDown={(e) => e.key === 'Enter' && setLink()}
            />
            <Button size="sm" onClick={setLink}>
              확인
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowLinkInput(false)}>
              취소
            </Button>
          </div>
        )}
      </div>

      {/* 이미지 */}
      <div className="relative">
        <ToolbarButton
          onClick={() => setShowImageInput(!showImageInput)}
          tooltip="이미지 삽입"
        >
          <Image className="h-4 w-4" />
        </ToolbarButton>
        {showImageInput && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 flex gap-2">
            <input
              type="url"
              placeholder="이미지 URL 입력..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm w-48"
              onKeyDown={(e) => e.key === 'Enter' && addImage()}
            />
            <Button size="sm" onClick={addImage}>
              확인
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowImageInput(false)}>
              취소
            </Button>
          </div>
        )}
      </div>

      {/* 테이블 */}
      <ToolbarButton
        onClick={addTable}
        tooltip="테이블 삽입"
      >
        <Table className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
};

export default EditorToolbar;
