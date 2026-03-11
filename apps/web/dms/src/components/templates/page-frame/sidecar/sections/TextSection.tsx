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
  defaultOpen = true,
  sectionVariant = 'default',
  preserveWhitespace = true,
}: TextSectionProps) {
  const node = content ?? (
    text?.trim()
      ? <p className={preserveWhitespace ? 'text-xs text-ssoo-primary/80 whitespace-pre-wrap leading-relaxed' : 'text-xs text-ssoo-primary/80 leading-relaxed'}>{text}</p>
      : <p className="text-xs text-gray-400 py-1">{emptyText}</p>
  );

  return (
    <CollapsibleSection
      title={title}
      icon={icon}
      defaultOpen={defaultOpen}
      variant={sectionVariant}
    >
      {node}
    </CollapsibleSection>
  );
}
