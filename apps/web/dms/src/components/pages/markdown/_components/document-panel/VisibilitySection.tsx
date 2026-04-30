'use client';

import * as React from 'react';
import { Eye, Globe, Building2, Lock } from 'lucide-react';
import { KeyValueSection } from '@/components/templates/page-frame/panel';
import { Dropdown, Option } from '@/components/ui/dropdown';
import type { DocumentVisibilityScope } from '@ssoo/types/dms';

const VISIBILITY_OPTIONS: { value: DocumentVisibilityScope; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'public', label: '공개', icon: <Globe className="h-4 w-4" />, description: '모든 사용자가 읽을 수 있습니다' },
  { value: 'organization', label: '조직 공개', icon: <Building2 className="h-4 w-4" />, description: '같은 조직 사용자만 읽을 수 있습니다' },
  { value: 'self', label: '소유자 전용', icon: <Lock className="h-4 w-4" />, description: '소유자만 읽고 쓸 수 있습니다' },
];

function formatVisibilityScope(scope: DocumentVisibilityScope): string {
  const option = VISIBILITY_OPTIONS.find((o) => o.value === scope);
  return option?.label ?? scope;
}

function VisibilityIcon({ scope }: { scope: DocumentVisibilityScope }) {
  const option = VISIBILITY_OPTIONS.find((o) => o.value === scope);
  return option?.icon ?? <Eye className="h-4 w-4" />;
}

export interface VisibilitySectionProps {
  /** 현재 공개 범위 */
  scope: DocumentVisibilityScope;
  /** 공개 범위 변경 콜백 (null이면 read-only) */
  onScopeChange?: ((scope: DocumentVisibilityScope) => void) | null;
  /** 변경 가능 여부 (오너 또는 manage 권한) */
  canManage?: boolean;
}

export function VisibilitySection({ scope, onScopeChange, canManage = false }: VisibilitySectionProps) {
  const handleChange = React.useCallback(
    (value: string) => {
      if (canManage && onScopeChange) {
        onScopeChange(value as DocumentVisibilityScope);
      }
    },
    [canManage, onScopeChange],
  );

  const visibilityValue = (
    canManage && onScopeChange ? (
      <Dropdown
        value={formatVisibilityScope(scope)}
        onValueChange={handleChange}
        className="h-7 w-[130px] border-ssoo-content-border bg-white text-body-sm text-ssoo-primary"
        contentClassName="border-ssoo-content-border bg-white text-ssoo-primary"
        itemClassName="text-ssoo-primary focus:bg-ssoo-content-background focus:text-ssoo-primary"
      >
        {VISIBILITY_OPTIONS.map((opt) => (
          <Option key={opt.value} value={opt.value}>
            <span className="flex items-center gap-1.5">
              {opt.icon}
              {opt.label}
            </span>
          </Option>
        ))}
      </Dropdown>
    ) : (
      <span className="flex items-center gap-1.5 text-body-sm">
        <VisibilityIcon scope={scope} />
        {formatVisibilityScope(scope)}
      </span>
    )
  );

  return (
    <KeyValueSection
      title="공개 범위"
      icon={<Eye className="h-4 w-4" />}
      items={[
        {
          label: '문서 공개',
          value: visibilityValue,
        },
      ]}
    />
  );
}
