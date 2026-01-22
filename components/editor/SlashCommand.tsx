'use client';

import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from 'react';

interface CommandItem {
  title: string;
  description: string;
  icon: string;
  command: (props: { editor: any; range: any }) => void;
}

const commands: CommandItem[] = [
  {
    title: '텍스트',
    description: '일반 텍스트 단락',
    icon: '📝',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: '제목 1',
    description: '큰 제목',
    icon: 'H1',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: '제목 2',
    description: '중간 제목',
    icon: 'H2',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: '제목 3',
    description: '작은 제목',
    icon: 'H3',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: '글머리 기호',
    description: '순서 없는 목록',
    icon: '•',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: '번호 매기기',
    description: '순서 있는 목록',
    icon: '1.',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: '체크리스트',
    description: '할 일 목록',
    icon: '☑',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: '인용구',
    description: '인용 블록',
    icon: '"',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: '코드 블록',
    description: '코드 스니펫',
    icon: '</>',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: '구분선',
    description: '수평선 삽입',
    icon: '—',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: '테이블',
    description: '3x3 테이블 삽입',
    icon: '⊞',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    title: '이미지',
    description: '이미지 URL로 삽입',
    icon: '🖼',
    command: ({ editor, range }) => {
      const url = window.prompt('이미지 URL을 입력하세요:');
      if (url) {
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
      }
    },
  },
];

interface CommandListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

interface CommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const CommandList = forwardRef<CommandListRef, CommandListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index];
        if (item) {
          command(item);
        }
      },
      [items, command]
    );

    const upHandler = useCallback(() => {
      setSelectedIndex((prevIndex) =>
        prevIndex <= 0 ? items.length - 1 : prevIndex - 1
      );
    }, [items.length]);

    const downHandler = useCallback(() => {
      setSelectedIndex((prevIndex) =>
        prevIndex >= items.length - 1 ? 0 : prevIndex + 1
      );
    }, [items.length]);

    const enterHandler = useCallback(() => {
      selectItem(selectedIndex);
    }, [selectItem, selectedIndex]);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          upHandler();
          return true;
        }
        if (event.key === 'ArrowDown') {
          downHandler();
          return true;
        }
        if (event.key === 'Enter') {
          enterHandler();
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="slash-command-menu bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-gray-500 text-sm">
          검색 결과가 없습니다
        </div>
      );
    }

    return (
      <div className="slash-command-menu bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-80 overflow-y-auto">
        {items.map((item, index) => (
          <button
            key={item.title}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 transition-colors ${
              index === selectedIndex ? 'bg-blue-50 text-blue-600' : ''
            }`}
            onClick={() => selectItem(index)}
          >
            <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-sm font-medium">
              {item.icon}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{item.title}</span>
              <span className="text-xs text-gray-500">{item.description}</span>
            </div>
          </button>
        ))}
      </div>
    );
  }
);

CommandList.displayName = 'CommandList';

const renderItems = () => {
  let component: ReactRenderer | null = null;
  let popup: TippyInstance[] | null = null;

  return {
    onStart: (props: SuggestionProps) => {
      component = new ReactRenderer(CommandList, {
        props,
        editor: props.editor,
      });

      if (!props.clientRect) {
        return;
      }

      popup = tippy('body', {
        getReferenceClientRect: props.clientRect as () => DOMRect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
      });
    },
    onUpdate: (props: SuggestionProps) => {
      component?.updateProps(props);

      if (!props.clientRect) {
        return;
      }

      popup?.[0]?.setProps({
        getReferenceClientRect: props.clientRect as () => DOMRect,
      });
    },
    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === 'Escape') {
        popup?.[0]?.hide();
        return true;
      }

      return (component?.ref as CommandListRef)?.onKeyDown(props) || false;
    },
    onExit: () => {
      popup?.[0]?.destroy();
      component?.destroy();
    },
  };
};

const SlashCommand = Extension.create({
  name: 'slash-command',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: { editor: any; range: any; props: CommandItem }) => {
          props.command({ editor, range });
        },
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          return commands.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          );
        },
        render: renderItems,
      }),
    ];
  },
});

export default SlashCommand;
