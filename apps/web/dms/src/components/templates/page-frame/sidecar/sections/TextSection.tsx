'use client';

import * as React from 'react';
import { CollapsibleSection } from '../CollapsibleSection';
import type { CollapsibleSectionVariant } from '../CollapsibleSection';

export interface TextSectionProps {
  title: string;
  text?: string;
  content?: React.ReactNode;
  emptyText?: string;
  icon?: React.ReactNode;
  /** 타이틀 우측 추가 요소 (접기 아이콘 왼쪽) */
  headerRight?: React.ReactNode;
  defaultOpen?: boolean;
  sectionVariant?: CollapsibleSectionVariant;
  preserveWhitespace?: boolean;
}

export function TextSection({
  title,
  text,
  content,
  emptyText = '-',
  icon,
  headerRight,
  defaultOpen = true,
  sectionVariant = 'default',
  preserveWhitespace = true,
}: TextSectionProps) {
  const node = content ?? (
    text?.trim()
      ? <p className={preserveWhitespace ? 'text-caption text-ssoo-primary/80 whitespace-pre-wrap leading-relaxed' : 'text-caption text-ssoo-primary/80 leading-relaxed'}>{text}</p>
      : <p className="py-1 text-caption text-gray-400">{emptyText}</p>
  );

  return (
    <CollapsibleSection
      title={title}
      icon={icon}
      headerRight={headerRight}
      defaultOpen={defaultOpen}
      variant={sectionVariant}
    >
      {node}
    </CollapsibleSection>
  );
}
