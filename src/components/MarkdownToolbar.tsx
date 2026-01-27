'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { MarkdownToolbarProps } from '@/types/components';

const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
  textareaRef,
  onContentChange,
  onInsertImage,
  onInsertLink,
  onInsertTable
}) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // 텍스트 삽입 유틸리티 함수
  const insertText = useCallback((before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    const newText = before + textToInsert + after;
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);
    
    const newContent = beforeText + newText + afterText;
    onContentChange(newContent);
    
    // 커서 위치 조정
    setTimeout(() => {
      const newStart = start + before.length;
      const newEnd = newStart + textToInsert.length;
      textarea.setSelectionRange(newStart, newEnd);
      textarea.focus();
    }, 0);
  }, [textareaRef, onContentChange]);

  // 라인 시작에 텍스트 삽입
  const insertLinePrefix = useCallback((prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const value = textarea.value;
    
    // 현재 라인 시작 위치 찾기
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const beforeLine = value.substring(0, lineStart);
    const currentLine = value.substring(lineStart, value.indexOf('\n', start) !== -1 ? value.indexOf('\n', start) : value.length);
    const afterLine = value.substring(lineStart + currentLine.length);
    
    const newLine = prefix + currentLine;
    const newContent = beforeLine + newLine + afterLine;
    
    onContentChange(newContent);
    
    setTimeout(() => {
      const newPosition = lineStart + prefix.length + (start - lineStart);
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  }, [textareaRef, onContentChange]);

  // 헤딩 삽입
  const insertHeading = useCallback((level: number) => {
    const prefix = '#'.repeat(level) + ' ';
    insertLinePrefix(prefix);
  }, [insertLinePrefix]);

  // 목록 삽입
  const insertList = useCallback((ordered: boolean = false) => {
    const prefix = ordered ? '1. ' : '- ';
    insertLinePrefix(prefix);
  }, [insertLinePrefix]);

  // 표 삽입
  const insertTable = useCallback(() => {
    const tableMarkdown = `| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

`;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(start);
    
    const newContent = beforeText + tableMarkdown + afterText;
    onContentChange(newContent);
    
    setTimeout(() => {
      textarea.setSelectionRange(start + 10, start + 18); // "Header 1" 선택
      textarea.focus();
    }, 0);
  }, [textareaRef, onContentChange]);

  // 코드 블록 삽입
  const insertCodeBlock = useCallback((language: string = '') => {
    const codeBlock = `\`\`\`${language}
코드를 여기에 입력하세요
\`\`\`

`;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(start);
    
    const newContent = beforeText + codeBlock + afterText;
    onContentChange(newContent);
    
    setTimeout(() => {
      const codeStart = start + `\`\`\`${language}\n`.length;
      const codeEnd = codeStart + '코드를 여기에 입력하세요'.length;
      textarea.setSelectionRange(codeStart, codeEnd);
      textarea.focus();
    }, 0);
  }, [textareaRef, onContentChange]);

  return (
    <div className="border-b border-gray-200 bg-gray-50 p-2">
      <div className="flex flex-wrap gap-1 items-center">
        {/* 포맷팅 그룹 */}
        <div className="flex gap-1">
          <Button
            variant="secondary"
            className="h-8 w-8 p-0 text-sm hover:bg-gray-200"
            onClick={() => insertText('**', '**', '굵게 텍스트')}
            title="굵게 (Ctrl+B)"
          >
            <strong>B</strong>
          </Button>
          <Button
            variant="secondary"
            className="h-8 w-8 p-0 text-sm hover:bg-gray-200"
            onClick={() => insertText('*', '*', '기울임 텍스트')}
            title="기울임 (Ctrl+I)"
          >
            <em>I</em>
          </Button>
          <Button
            variant="secondary"
            className="h-8 w-8 p-0 text-sm hover:bg-gray-200"
            onClick={() => insertText('<u>', '</u>', '밑줄 텍스트')}
            title="밑줄"
          >
            <u>U</u>
          </Button>
          <Button
            variant="secondary"
            className="h-8 w-8 p-0 text-sm hover:bg-gray-200"
            onClick={() => insertText('~~', '~~', '취소선 텍스트')}
            title="취소선"
          >
            <span style={{ textDecoration: 'line-through' }}>S</span>
          </Button>
          <Button
            variant="secondary"
            className="h-8 w-8 p-0 text-sm hover:bg-gray-200"
            onClick={() => insertText('`', '`', '코드')}
            title="인라인 코드"
          >
            <code>{'<'}</code>
          </Button>
        </div>
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        {/* 헤딩 그룹 */}
        <div className="flex gap-1">
          <div className="relative">
            <Button
              variant="secondary"
              className="h-8 w-8 p-0 text-sm hover:bg-gray-200"
              onClick={() => setActiveDropdown(activeDropdown === 'heading' ? null : 'heading')}
              title="헤딩"
            >
              H
            </Button>
            {activeDropdown === 'heading' && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-40">
                {[1, 2, 3, 4, 5, 6].map((level) => (
                  <button
                    key={level}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 first:rounded-t-md last:rounded-b-md"
                    onClick={() => {
                      insertHeading(level);
                      setActiveDropdown(null);
                    }}
                  >
                    H{level} - {level === 1 ? '큰 제목' : level === 2 ? '중간 제목' : level === 3 ? '작은 제목' : level === 4 ? '소제목' : level === 5 ? '세부제목' : '최소제목'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        {/* 목록 그룹 */}
        <div className="flex gap-1">
          <Button
            variant="secondary"
            className="h-8 w-8 p-0 text-sm hover:bg-gray-200"
            onClick={() => insertList(false)}
            title="글머리 기호 목록"
          >
            •
          </Button>
          <Button
            variant="secondary"
            className="h-8 w-8 p-0 text-sm hover:bg-gray-200"
            onClick={() => insertList(true)}
            title="번호 목록"
          >
            1.
          </Button>
        </div>
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        {/* 삽입 그룹 */}
        <div className="flex gap-1">
          <Button
            variant="secondary"
            className="h-8 w-8 p-0 text-sm hover:bg-gray-200"
            onClick={() => {
              if (onInsertLink) {
                onInsertLink();
              } else {
                insertText('[', '](https://example.com)', '링크 텍스트');
              }
            }}
            title="링크 삽입"
          >
            🔗
          </Button>
          <Button
            variant="secondary"
            className="h-8 w-8 p-0 text-sm hover:bg-gray-200"
            onClick={() => {
              if (onInsertImage) {
                onInsertImage();
              } else {
                insertText('![', '](https://example.com/image.jpg)', '이미지 설명');
              }
            }}
            title="이미지 삽입"
          >
            🖼️
          </Button>
          <Button
            variant="secondary"
            className="h-8 w-8 p-0 text-sm hover:bg-gray-200"
            onClick={() => {
              if (onInsertTable) {
                onInsertTable();
              } else {
                insertTable();
              }
            }}
            title="표 삽입"
          >
            📊
          </Button>
          <div className="relative">
            <Button
              variant="secondary"
              className="h-8 w-8 p-0 text-sm hover:bg-gray-200"
              onClick={() => setActiveDropdown(activeDropdown === 'code' ? null : 'code')}
              title="코드 블록"
            >
              📋
            </Button>
            {activeDropdown === 'code' && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-40">
                {[
                  { label: '일반 코드 블록', lang: '' },
                  { label: 'JavaScript', lang: 'javascript' },
                  { label: 'TypeScript', lang: 'typescript' },
                  { label: 'Python', lang: 'python' },
                  { label: 'Java', lang: 'java' },
                  { label: 'C#', lang: 'csharp' },
                  { label: 'HTML', lang: 'html' },
                  { label: 'CSS', lang: 'css' },
                  { label: 'SQL', lang: 'sql' },
                  { label: 'JSON', lang: 'json' }
                ].map((item) => (
                  <button
                    key={item.lang}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 first:rounded-t-md last:rounded-b-md"
                    onClick={() => {
                      insertCodeBlock(item.lang);
                      setActiveDropdown(null);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        {/* 블록 그룹 */}
        <div className="flex gap-1">
          <Button
            variant="secondary"
            className="h-8 w-8 p-0 text-sm hover:bg-gray-200"
            onClick={() => insertLinePrefix('> ')}
            title="인용문"
          >
            ❝
          </Button>
          <Button
            variant="secondary"
            className="h-8 w-8 p-0 text-sm hover:bg-gray-200"
            onClick={() => insertText('\n---\n', '', '')}
            title="수평선"
          >
            ―
          </Button>
        </div>
      </div>
      
      {/* 클릭 외부 영역 감지로 드롭다운 닫기 */}
      {activeDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setActiveDropdown(null)}
        />
      )}
    </div>
  );
};

export default MarkdownToolbar;