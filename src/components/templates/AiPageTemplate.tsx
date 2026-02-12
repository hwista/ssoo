'use client';

import * as React from 'react';
import { DocPageTemplate } from './DocPageTemplate';
import { AiPageShell, AiSidecar } from '../common/ai';
import type { AiSidecarProps } from '../common/ai';

/**
 * AI 페이지 variant별 설정
 */
const AI_PAGE_CONFIG: Record<AiPageTemplateProps['variant'], { filePath: string }> = {
  ask: { filePath: 'ai/ask' },
  search: { filePath: 'ai/search' },
  create: { filePath: 'ai/create' },
};

/**
 * AiPageTemplate Props
 * AI 페이지 공통 템플릿 - DocPageTemplate + AiPageShell + AiSidecar 래핑
 */
export interface AiPageTemplateProps {
  /** AI 기능 유형 */
  variant: AiSidecarProps['variant'];
  /** 헤더 부가 설명 */
  description: string;
  /** AiPageShell toolbar 슬롯 */
  toolbar?: React.ReactNode;
  /** AiPageShell footer 슬롯 */
  footer?: React.ReactNode;
  /** 메인 콘텐츠 */
  children: React.ReactNode;
  /** AiPageShell 추가 className */
  shellClassName?: string;
  /** AiPageShell 콘텐츠 추가 className */
  shellContentClassName?: string;
}

/**
 * AiPageTemplate 컴포넌트
 * 
 * AI 페이지 3종(질문/검색/작성)의 공통 레이아웃 템플릿
 * - DocPageTemplate (mode=viewer, orientation=portrait)
 * - AiSidecar (variant별 자동 선택)
 * - AiPageShell (toolbar/footer/children 슬롯)
 * 
 * @example
 * ```tsx
 * <AiPageTemplate variant="ask" description="문서 기반으로 질문을 입력하세요.">
 *   {chatMessages}
 * </AiPageTemplate>
 * ```
 */
export function AiPageTemplate({
  variant,
  description,
  toolbar,
  footer,
  children,
  shellClassName,
  shellContentClassName,
}: AiPageTemplateProps) {
  const config = AI_PAGE_CONFIG[variant];

  return (
    <main className="h-full overflow-hidden bg-ssoo-content-bg/30">
      <DocPageTemplate
        filePath={config.filePath}
        mode="viewer"
        contentOrientation="portrait"
        description={description}
        sidecarContent={<AiSidecar variant={variant} />}
      >
        <AiPageShell
          toolbar={toolbar}
          footer={footer}
          className={shellClassName}
          contentClassName={shellContentClassName}
        >
          {children}
        </AiPageShell>
      </DocPageTemplate>
    </main>
  );
}
