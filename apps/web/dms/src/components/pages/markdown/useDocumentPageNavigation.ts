'use client';

import { useCallback, useState } from 'react';
import { ASSISTANT_FOCUS_INPUT_EVENT } from '@/lib/constants/assistant';
import { resolveDocPath } from '@/lib/utils/linkUtils';
import type { PageMode } from './documentPageTypes';
import type { EditorRef } from './_components/editor';

interface AttachedReference {
  path: string;
}

interface UseDocumentPageNavigationParams {
  editorRef: React.RefObject<EditorRef | null>;
  mode: PageMode;
  filePath: string | null;
  attachedReferences: AttachedReference[];
  openAssistantPanel: () => void;
  openDocumentTab: (options: { path: string }) => void;
  toggleAssistantReference: (reference: { path: string; title: string }) => void;
}

export function useDocumentPageNavigation({
  editorRef,
  mode,
  filePath,
  attachedReferences,
  openAssistantPanel,
  openDocumentTab,
  toggleAssistantReference,
}: UseDocumentPageNavigationParams) {
  const [imagePreview, setImagePreview] = useState<{ src: string; alt: string } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  const handleAttachCurrentDocToAssistant = useCallback(() => {
    if (!filePath) return;
    const alreadyAttached = attachedReferences.some((item) => item.path === filePath);
    if (!alreadyAttached) {
      const title = filePath.split('/').pop() || filePath;
      toggleAssistantReference({ path: filePath, title });
    }
    openAssistantPanel();
    window.dispatchEvent(new Event(ASSISTANT_FOCUS_INPUT_EVENT));
  }, [attachedReferences, filePath, openAssistantPanel, toggleAssistantReference]);

  const handleTocClick = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleScrollToBodyLink = useCallback((url: string) => {
    if (mode === 'viewer') {
      const link = document.querySelector(`a[href="${CSS.escape(url)}"]`)
        ?? document.querySelector(`img[data-original-src="${CSS.escape(url)}"]`);
      if (link) {
        link.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const el = link as HTMLElement;
        const prevBg = el.style.backgroundColor;
        const prevOutline = el.style.outline;
        const prevOutlineOffset = el.style.outlineOffset;
        const prevRadius = el.style.borderRadius;
        const prevPadding = el.style.padding;
        el.style.backgroundColor = '#fef08a';
        el.style.outline = '2px solid #fb923c';
        el.style.outlineOffset = '1px';
        el.style.borderRadius = '2px';
        el.style.padding = '0 2px';
        setTimeout(() => {
          el.style.backgroundColor = prevBg;
          el.style.outline = prevOutline;
          el.style.outlineOffset = prevOutlineOffset;
          el.style.borderRadius = prevRadius;
          el.style.padding = prevPadding;
        }, 2000);
      }
      return;
    }

    const markdown = editorRef.current?.getMarkdown() ?? '';
    const index = markdown.indexOf(url);
    if (index < 0) return;

    const cmContent = document.querySelector('.cm-content');
    if (!cmContent) return;

    const walker = document.createTreeWalker(cmContent, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent ?? '';
      const pos = text.indexOf(url);
      if (pos < 0) continue;

      const range = document.createRange();
      range.setStart(node, pos);
      range.setEnd(node, pos + url.length);
      const rect = range.getBoundingClientRect();
      const scroller = document.querySelector('.cm-scroller');
      if (rect && scroller) {
        const scrollerRect = scroller.getBoundingClientRect();
        scroller.scrollTo({
          top: scroller.scrollTop + rect.top - scrollerRect.top - scrollerRect.height / 2,
          behavior: 'smooth',
        });
      }

      const mark = document.createElement('mark');
      mark.className = 'search-highlight';
      mark.style.backgroundColor = '#fef08a';
      mark.style.color = 'inherit';
      mark.style.borderRadius = '2px';
      mark.style.padding = '0 2px';
      mark.style.outline = '2px solid #fb923c';
      mark.style.outlineOffset = '1px';
      range.surroundContents(mark);
      setTimeout(() => {
        const parent = mark.parentNode;
        if (parent) {
          while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
          parent.removeChild(mark);
        }
      }, 2000);
      break;
    }
  }, [editorRef, mode]);

  const handleOpenLink = useCallback((url: string, type?: 'link' | 'image') => {
    if (type === 'image') {
      setImagePreview({ src: url, alt: '이미지 미리보기' });
      return;
    }
    const docPath = resolveDocPath(url, filePath);
    if (docPath) {
      openDocumentTab({ path: docPath });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [filePath, openDocumentTab]);

  const handleViewerLinkClick = useCallback((href: string) => {
    const docPath = resolveDocPath(href, filePath);
    if (docPath) {
      openDocumentTab({ path: docPath });
    } else {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  }, [filePath, openDocumentTab]);

  const handleViewerImageClick = useCallback((src: string, alt: string) => {
    setLightboxImage({ src, alt });
  }, []);

  return {
    imagePreview,
    setImagePreview,
    lightboxImage,
    setLightboxImage,
    handleAttachCurrentDocToAssistant,
    handleTocClick,
    handleScrollToBodyLink,
    handleOpenLink,
    handleViewerLinkClick,
    handleViewerImageClick,
  };
}
