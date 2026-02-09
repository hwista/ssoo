/**
 * LivePreview Extension
 *
 * 옵시디언 스타일 라이브 프리뷰
 * - 커서가 위치한 블록에 `live-preview-active` 클래스 부여
 * - CSS에서 마크다운 문법 표시 (::before/::after pseudo-elements)
 * - 다른 블록은 WYSIWYG 렌더링 유지
 *
 * 지원 구문:
 * - 블록: 헤딩(#), 인용문(>)
 * - 인라인: 굵게(**), 기울임(*), 취소선(~~), 인라인 코드(`), 형광펜(==), 링크([](url))
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorState } from '@tiptap/pm/state';

const livePreviewKey = new PluginKey('livePreview');

/**
 * 현재 커서 위치의 최상위 블록에 대한 DecorationSet 생성
 */
function createLivePreviewDecorations(state: EditorState): DecorationSet {
  const { selection, doc } = state;
  const { $from } = selection;

  // 커서가 문서 루트에 있으면 데코레이션 없음
  if ($from.depth < 1) return DecorationSet.empty;

  const blockPos = $from.before(1);
  const blockNode = $from.node(1);

  if (!blockNode) return DecorationSet.empty;

  const blockEnd = blockPos + blockNode.nodeSize;
  const typeName = blockNode.type.name;

  // 코드 블록, 테이블은 이미 소스를 보여주므로 스킵
  if (typeName === 'codeBlock' || typeName === 'table') {
    return DecorationSet.empty;
  }

  const decorations: Decoration[] = [];

  // 최상위 블록에 live-preview-active 클래스 추가
  decorations.push(
    Decoration.node(blockPos, blockEnd, {
      class: 'live-preview-active',
    }),
  );

  return DecorationSet.create(doc, decorations);
}

export const LivePreview = Extension.create({
  name: 'livePreview',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: livePreviewKey,

        state: {
          init() {
            return DecorationSet.empty;
          },

          apply(tr, value, _oldState, newState) {
            // 선택 영역 또는 문서가 변경되지 않으면 기존 데코레이션 유지
            if (!tr.selectionSet && !tr.docChanged) {
              return value;
            }

            return createLivePreviewDecorations(newState);
          },
        },

        props: {
          decorations(state) {
            return livePreviewKey.getState(state) as DecorationSet;
          },
        },
      }),
    ];
  },
});

export default LivePreview;
