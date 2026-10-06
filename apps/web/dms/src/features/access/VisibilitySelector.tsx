'use client';

import * as React from 'react';
import { Eye, Globe, Building2, Lock } from 'lucide-react';
import { KeyValueSection } from '@/components/templates/page-frame/panel';
import { Dropdown, Option } from '@/components/ui/dropdown';
import type { DocumentVisibilityScope } from '@ssoo/types/dms';
import { ServiceOrganizationSelect } from '@ssoo/web-auth';
import { Button } from '@ssoo/web-ui';
import { useAuthStore } from '@/stores/auth.store';

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
  onScopeChange?: ((scope: DocumentVisibilityScope, targetOrgId?: string) => void) | null;
  targetOrgId?: string;
  /** 변경 가능 여부 (오너 또는 manage 권한) */
  canManage?: boolean;
}

export function VisibilityValue({ scope, onScopeChange, canManage = false, targetOrgId }: VisibilitySectionProps) {
  const accessToken = useAuthStore(state => state.accessToken);
  const [selectingOrganization, setSelectingOrganization] = React.useState(false);
  const [organizationId, setOrganizationId] = React.useState(targetOrgId ?? '');
  React.useEffect(() => { setOrganizationId(targetOrgId ?? ''); setSelectingOrganization(false); }, [targetOrgId, scope]);
  const handleChange = React.useCallback(
    (value: string) => {
      if (canManage && onScopeChange) {
        if (value === 'organization') { setSelectingOrganization(true); return; }
        setSelectingOrganization(false);
        onScopeChange(value as DocumentVisibilityScope);
      }
    },
    [canManage, onScopeChange],
  );

  if (canManage && onScopeChange) {
    return (
      <div className="min-w-0 space-y-2"><Dropdown
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
        {selectingOrganization ? <div className="space-y-2">
          <ServiceOrganizationSelect service="dms" accessToken={accessToken} value={organizationId} onChange={setOrganizationId} />
          <Button type="button" size="sm" disabled={!organizationId} onClick={() => { onScopeChange('organization', organizationId); setSelectingOrganization(false); }}>조직 공개 적용</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSelectingOrganization(false)}>취소</Button>
        </div> : null}
      </div>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-body-sm">
      <VisibilityIcon scope={scope} />
      {formatVisibilityScope(scope)}
    </span>
  );
}

export function VisibilitySection(props: VisibilitySectionProps) {
  return (
    <KeyValueSection
      title="공개 범위"
      icon={<Eye className="h-4 w-4" />}
      items={[
        {
          label: '문서 공개',
          value: <VisibilityValue {...props} />,
        },
      ]}
    />
  );
}
