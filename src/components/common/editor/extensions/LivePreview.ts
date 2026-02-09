/**
 * LivePreview Extension
 *
 * 옵시디언 스타일 라이브 프리뷰: 활성 블록을 마크다운 소스로 변환
 *
 * 동작 방식:
 * - 커서가 위치한 블록을 마크다운 텍스트(codeBlock)로 변환 → 편집 가능
 * - 커서가 떠나면 마크다운을 파싱하여 WYSIWYG 노드로 복원
 * - 항상 최대 1개의 소스 블록만 존재
 *
 * 기술 구현:
 * - ProseMirror appendTransaction으로 블록 변환
 * - htmlToMarkdown / markdownToHtmlSync로 양방향 변환
 * - codeBlock(language='livepreview') 노드를 소스 블록으로 활용
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';
import { DOMSerializer, DOMParser as PMDOMParser, Fragment } from '@tiptap/pm/model';
import type { Node as ProseMirrorNode, Schema } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';
import { htmlToMarkdown, markdownToHtmlSync } from '@/lib/markdownConverter';

/** 소스 블록의 language 속성값 */
export const SOURCE_LANGUAGE = 'livepreview';

const livePreviewKey = new PluginKey('livePreview');

/** 노드가 라이브 프리뷰 소스 블록인지 확인 */
function isSourceBlock(node: ProseMirrorNode): boolean {
  return (
    node.type.name === 'codeBlock' && node.attrs.language === SOURCE_LANGUAGE
  );
}

/**
 * ProseMirror 노드를 마크다운 텍스트로 변환
 * DOMSerializer → HTML string → TurndownService → Markdown
 */
function nodeToMarkdown(node: ProseMirrorNode, schema: Schema): string {
  try {
    const serializer = DOMSerializer.fromSchema(schema);
    const dom = serializer.serializeNode(node);
    const wrapper = document.createElement('div');
    wrapper.appendChild(dom);
    return htmlToMarkdown(wrapper.innerHTML).trim();
  } catch {
    return node.textContent;
  }
}

/**
 * 마크다운 텍스트를 ProseMirror Fragment로 변환
 * Markdown → marked → HTML string → ProseMirror DOMParser → Fragment
 */
function markdownToFragment(markdown: string, schema: Schema): Fragment {
  try {
    const html = markdownToHtmlSync(markdown);
    if (!html.trim()) {
      return Fragment.from(schema.nodes.paragraph.create());
    }
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const parsed = PMDOMParser.fromSchema(schema).parse(wrapper);
    return parsed.content;
  } catch {
    // 파싱 실패 시 플레인 텍스트 paragraph로 대체
    return Fragment.from(
      schema.nodes.paragraph.create(
        null,
        markdown ? schema.text(markdown) : undefined,
      ),
    );
  }
}

/**
 * 소스 블록을 구조화된 WYSIWYG 노드로 복원
 * @returns 복원이 수행되었으면 true
 */
function restoreSourceBlock(
  tr: Transaction,
  pos: number,
  schema: Schema,
): number {
  const node = tr.doc.nodeAt(pos);
  if (!node || !isSourceBlock(node)) return 0;

  const markdown = node.textContent;
  const oldSize = node.nodeSize;

  if (!markdown.trim()) {
    const emptyP = schema.nodes.paragraph.create();
    tr.replaceWith(pos, pos + oldSize, emptyP);
    return emptyP.nodeSize - oldSize;
  }

  const fragment = markdownToFragment(markdown, schema);
  tr.replaceWith(pos, pos + oldSize, fragment);
  return fragment.size - oldSize;
}

export const LivePreview = Extension.create({
  name: 'livePreview',

  onBlur() {
    // 에디터 포커스 해제 시 모든 소스 블록 복원
    const { state, view } = this.editor;
    const { tr, schema } = state;
    let changed = false;

    state.doc.forEach((node, pos) => {
      if (isSourceBlock(node)) {
        restoreSourceBlock(tr, pos, schema);
        changed = true;
      }
    });

    if (changed) {
      tr.setMeta('livePreview', true);
      view.dispatch(tr);
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: livePreviewKey,

        appendTransaction(transactions, _oldState, newState) {
          // 자체 트랜잭션은 무시 (무한 루프 방지)
          if (transactions.some((t) => t.getMeta('livePreview'))) return null;

          const { selection, schema, doc } = newState;
          const { $from } = selection;

          // 현재 커서의 최상위 블록 위치
          const cursorBlockPos =
            $from.depth >= 1 ? $from.before(1) : null;
          const cursorBlockNode =
            cursorBlockPos !== null ? doc.nodeAt(cursorBlockPos) : null;

          // 문서에서 기존 소스 블록 찾기 (최대 1개)
          let sourcePos: number | null = null;
          doc.forEach((node, pos) => {
            if (isSourceBlock(node) && sourcePos === null) {
              sourcePos = pos;
            }
          });

          // 커서가 이미 소스 블록 안에 있으면 아무것도 안 함
          if (sourcePos !== null && cursorBlockPos === sourcePos) {
            return null;
          }

          // 변환할 것이 없으면 종료
          if (sourcePos === null && (cursorBlockPos === null || cursorBlockNode === null)) {
            return null;
          }

          const tr = newState.tr;
          let offset = 0;

          // Step 1: 기존 소스 블록 복원 (마크다운 → WYSIWYG 노드)
          if (sourcePos !== null) {
            offset = restoreSourceBlock(tr, sourcePos, schema);
          }

          // Step 2: 새 활성 블록을 소스 블록으로 변환 (WYSIWYG → 마크다운 텍스트)
          if (cursorBlockPos !== null && cursorBlockNode !== null && !isSourceBlock(cursorBlockNode)) {
            // 이전 복원으로 인한 위치 보정
            const adjustedPos =
              cursorBlockPos +
              (sourcePos !== null && sourcePos < cursorBlockPos ? offset : 0);
            const nodeAtPos = tr.doc.nodeAt(adjustedPos);

            if (nodeAtPos) {
              const markdown = nodeToMarkdown(nodeAtPos, schema);
              const sourceBlock = schema.nodes.codeBlock.create(
                { language: SOURCE_LANGUAGE },
                markdown ? schema.text(markdown) : undefined,
              );

              tr.replaceWith(
                adjustedPos,
                adjustedPos + nodeAtPos.nodeSize,
                sourceBlock,
              );

              // 커서를 소스 블록 시작에 배치
              const cursorPos = adjustedPos + 1;
              tr.setSelection(
                TextSelection.create(
                  tr.doc,
                  Math.min(cursorPos, tr.doc.content.size - 1),
                ),
              );
            }
          }

          if (!tr.docChanged) return null;

          tr.setMeta('livePreview', true);
          return tr;
        },
      }),
    ];
  },
});

export default LivePreview;
