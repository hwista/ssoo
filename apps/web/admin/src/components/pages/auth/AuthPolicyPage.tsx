'use client';
import { getAdminBreadcrumb } from '@/components/layout/navigation';

import { useTabStore } from '@/stores/tab.store';
import { getAdminTabOptions } from '@/components/layout/navigation';
import { OperationHistoryButton } from '../access/OperationHistoryButton';
import { SsooErrorNotice } from '@ssoo/web-shell';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { SsooSettingsPage, type SsooPageHeaderAction } from '@ssoo/web-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAuthProviderSettings,
  useUpdateAuthProviderSettings,
} from '@/hooks/queries/useAuthAdmin';
import type { AuthProviderSettings, UpdateAuthProviderSettingsRequest } from '@ssoo/types/common';

interface SettingsForm {
  passwordLoginEnabled: boolean;
  passwordResetEnabled: boolean;
  passwordChangeEnabled: boolean;
  resetCodeTtlMinutes: string;
  resetCodeLength: string;
  internalSsoEnabled: boolean;
  internalSsoLoginUrl: string;
  microsoftLoginEnabled: boolean;
  microsoftSignupRequestEnabled: boolean;
  microsoftTenantId: string;
  microsoftClientId: string;
  microsoftClientSecret: string;
  microsoftRedirectUri: string;
  microsoftScopes: string;
  allowedTenantIds: string;
  allowedEmailDomains: string;
  selfSignupEnabled: boolean;
  emailDeliveryMode: 'outbox' | 'disabled';
  emailFromAddress: string;
}

const INITIAL_FORM: SettingsForm = {
  passwordLoginEnabled: true,
  passwordResetEnabled: true,
  passwordChangeEnabled: true,
  resetCodeTtlMinutes: '15',
  resetCodeLength: '6',
  internalSsoEnabled: false,
  internalSsoLoginUrl: '',
  microsoftLoginEnabled: false,
  microsoftSignupRequestEnabled: false,
  microsoftTenantId: '',
  microsoftClientId: '',
  microsoftClientSecret: '',
  microsoftRedirectUri: '',
  microsoftScopes: 'openid, profile, email, User.Read',
  allowedTenantIds: '',
  allowedEmailDomains: '',
  selfSignupEnabled: false,
  emailDeliveryMode: 'outbox',
  emailFromAddress: '',
};

function listToText(values: string[]): string {
  return values.join(', ');
}

function textToList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

function toForm(settings: AuthProviderSettings): SettingsForm {
  return {
    passwordLoginEnabled: settings.passwordLoginEnabled,
    passwordResetEnabled: settings.passwordResetEnabled,
    passwordChangeEnabled: settings.passwordChangeEnabled,
    resetCodeTtlMinutes: String(settings.resetCodeTtlMinutes),
    resetCodeLength: String(settings.resetCodeLength),
    internalSsoEnabled: settings.internalSsoEnabled,
    internalSsoLoginUrl: settings.internalSsoLoginUrl ?? '',
    microsoftLoginEnabled: settings.microsoftLoginEnabled,
    microsoftSignupRequestEnabled: settings.microsoftSignupRequestEnabled,
    microsoftTenantId: settings.microsoftTenantId ?? '',
    microsoftClientId: settings.microsoftClientId ?? '',
    microsoftClientSecret: '',
    microsoftRedirectUri: settings.microsoftRedirectUri ?? '',
    microsoftScopes: listToText(settings.microsoftScopes),
    allowedTenantIds: listToText(settings.allowedTenantIds),
    allowedEmailDomains: listToText(settings.allowedEmailDomains),
    selfSignupEnabled: settings.selfSignupEnabled,
    emailDeliveryMode: settings.emailDeliveryMode,
    emailFromAddress: settings.emailFromAddress ?? '',
  };
}

function toRequest(form: SettingsForm): UpdateAuthProviderSettingsRequest {
  const request: UpdateAuthProviderSettingsRequest = {
    passwordLoginEnabled: form.passwordLoginEnabled,
    passwordResetEnabled: form.passwordResetEnabled,
    passwordChangeEnabled: form.passwordChangeEnabled,
    resetCodeTtlMinutes: Number(form.resetCodeTtlMinutes),
    resetCodeLength: Number(form.resetCodeLength),
    internalSsoEnabled: form.internalSsoEnabled,
    internalSsoLoginUrl: form.internalSsoLoginUrl.trim() || null,
    microsoftLoginEnabled: form.microsoftLoginEnabled,
    microsoftSignupRequestEnabled: form.microsoftSignupRequestEnabled,
    microsoftTenantId: form.microsoftTenantId.trim() || null,
    microsoftClientId: form.microsoftClientId.trim() || null,
    microsoftRedirectUri: form.microsoftRedirectUri.trim() || null,
    microsoftScopes: textToList(form.microsoftScopes),
    allowedTenantIds: textToList(form.allowedTenantIds),
    allowedEmailDomains: textToList(form.allowedEmailDomains),
    // Public self-signup has no supported runtime route. Persist false so a
    // legacy true value can be remediated from this control surface.
    selfSignupEnabled: false,
    emailDeliveryMode: form.emailDeliveryMode,
    emailFromAddress: form.emailFromAddress.trim() || null,
  };

  if (form.microsoftClientSecret.trim()) {
    request.microsoftClientSecret = form.microsoftClientSecret.trim();
  }

  return request;
}

function ToggleField({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex h-11 items-center gap-2 rounded-md border border-input px-3 text-sm ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
      <Input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-border"
      />
      {label}
    </label>
  );
}

export function AuthPolicyPage() {
  const openTab = useTabStore(state => state.openTab);
  const [form, setForm] = useState<SettingsForm>(INITIAL_FORM);
  const [hasEdits, setHasEdits] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const settingsQuery = useAuthProviderSettings();
  const updateSettingsMutation = useUpdateAuthProviderSettings();
  const settings = settingsQuery.data?.data;
  useEffect(() => {
    if (settings && !hasEdits) {
      setForm(toForm(settings));
    }
  }, [settings, hasEdits]);

  const runtimeReady = useMemo(() => {
    return Boolean(
      form.microsoftTenantId.trim()
      && form.microsoftClientId.trim()
      && form.microsoftRedirectUri.trim()
      && settings?.microsoftClientSecretConfigured,
    );
  }, [form.microsoftClientId, form.microsoftRedirectUri, form.microsoftTenantId, settings?.microsoftClientSecretConfigured]);

  const updateField = <K extends keyof SettingsForm>(field: K, value: SettingsForm[K]) => {
    setHasEdits(true);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = useCallback(async () => {
    setSaveError(null);

    try {
      await updateSettingsMutation.mutateAsync(toRequest(form));
      setForm((current) => ({ ...current, microsoftClientSecret: '' }));
      setHasEdits(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '인증 설정 저장에 실패했습니다.');
    }
  }, [form, updateSettingsMutation]);

  const changedFields = settings ? (Object.keys(form) as (keyof SettingsForm)[]).filter(key => form[key] !== toForm(settings)[key]) : [];
  const fieldLabels: Record<keyof SettingsForm, string> = { passwordLoginEnabled: '비밀번호 로그인', passwordResetEnabled: '비밀번호 재설정', passwordChangeEnabled: '비밀번호 변경', resetCodeTtlMinutes: '재설정 코드 유효 시간', resetCodeLength: '재설정 코드 길이', internalSsoEnabled: '내부 SSO', internalSsoLoginUrl: '내부 SSO 주소', microsoftLoginEnabled: 'Microsoft 로그인', microsoftSignupRequestEnabled: 'Microsoft 가입 신청', microsoftTenantId: 'Microsoft 테넌트', microsoftClientId: 'Microsoft 클라이언트', microsoftClientSecret: 'Microsoft 비밀값', microsoftRedirectUri: 'Microsoft 콜백 주소', microsoftScopes: 'Microsoft 범위', allowedTenantIds: '허용 테넌트', allowedEmailDomains: '허용 이메일 도메인', selfSignupEnabled: '자체 가입', emailDeliveryMode: '메일 전달 방식', emailFromAddress: '발신 주소' };

  const headerActions: SsooPageHeaderAction[] = [
    {
      label: settingsQuery.isFetching ? '갱신 중...' : '새로고침',
      icon: <RefreshCw className="h-4 w-4" />,
      variant: 'outline',
      onClick: () => {
        if (!hasEdits || window.confirm('저장하지 않은 정책 변경을 버리고 적용된 값을 다시 조회할까요?')) { setHasEdits(false); void settingsQuery.refetch(); }
      },
      disabled: settingsQuery.isFetching,
    },
    {
      label: updateSettingsMutation.isPending ? '저장 중...' : '저장',
      icon: <Save className="h-4 w-4" />,
      variant: 'default',
      onClick: () => {
        void handleSave();
      },
      disabled: settingsQuery.isLoading || settingsQuery.isError || !settings || updateSettingsMutation.isPending,
    },
  ];

  return (
    <SsooSettingsPage
      breadcrumbItems={getAdminBreadcrumb("/auth")}
      title="인증 정책"
      description="로그인 방식과 가입·비밀번호 복구 정책을 관리합니다."
      headerActions={{ wrapContent: true, compact: true,
        extraActions: headerActions,
        extraActionsPosition: 'right',
      }}

    >
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => openTab(getAdminTabOptions('/email-operations'))}>인증 메일 운영 열기</Button><Button variant="outline" onClick={() => openTab(getAdminTabOptions('/approvals?view=registration'))}>계정 가입 신청 처리</Button></div>
      {hasEdits && <div role="status" className="rounded-md border p-3 text-sm"><p>미저장 변경 {changedFields.length}개: {changedFields.map(key => fieldLabels[key]).join(", ") || "적용값과 동일"}</p><Button variant="outline" disabled={updateSettingsMutation.isPending} onClick={() => { if (window.confirm("입력한 변경을 버리고 현재 적용값으로 되돌릴까요?")) { setHasEdits(false); setSaveError(null); } }}>적용값으로 되돌리기</Button></div>}
      {settingsQuery.isError ? <SsooErrorNotice error={settingsQuery.error} actions={[{label:'인증 정책 다시 조회',onClick:() => settingsQuery.refetch()}]} /> : null}
      <div id="admin-auth-login-settings" className="scroll-mt-4 rounded-lg border bg-card p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">로그인 설정</h2>

          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
              runtimeReady ? 'bg-ssoo-success-bg text-ssoo-success' : 'bg-muted text-muted-foreground'
            }`}
          >
            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            {runtimeReady ? 'Microsoft 연결 준비됨' : 'Microsoft 설정 필요'}
          </span>
        </div>

        {settingsQuery.isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">로딩 중...</div>
        ) : (
          <fieldset disabled={updateSettingsMutation.isPending} className="min-w-0 space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <ToggleField
                label="비밀번호 로그인"
                checked={form.passwordLoginEnabled}
                onChange={(value) => updateField('passwordLoginEnabled', value)}
              />
              <ToggleField
                label="비밀번호 찾기"
                checked={form.passwordResetEnabled}
                onChange={(value) => updateField('passwordResetEnabled', value)}
              />
              <ToggleField
                label="비밀번호 변경"
                checked={form.passwordChangeEnabled}
                onChange={(value) => updateField('passwordChangeEnabled', value)}
              />
            </div>

            <h3 className="text-sm font-semibold">비밀번호 복구</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="auth-policy-resetCodeTtlMinutes">복구 코드 유효 시간(분)</label>
                <Input id="auth-policy-resetCodeTtlMinutes"
                  type="number"
                  value={form.resetCodeTtlMinutes}
                  onChange={(event) => updateField('resetCodeTtlMinutes', event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="auth-policy-resetCodeLength">재설정 코드 길이</label>
                <Input id="auth-policy-resetCodeLength"
                  type="number"
                  value={form.resetCodeLength}
                  onChange={(event) => updateField('resetCodeLength', event.target.value)}
                />
              </div>
            </div>

            <h3 className="text-sm font-semibold">사내 로그인</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleField
                label="사내 SSO"
                checked={form.internalSsoEnabled}
                onChange={(value) => updateField('internalSsoEnabled', value)}
              />
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="auth-policy-internalSsoLoginUrl">사내 SSO URL</label>
                <Input id="auth-policy-internalSsoLoginUrl"
                  value={form.internalSsoLoginUrl}
                  onChange={(event) => updateField('internalSsoLoginUrl', event.target.value)}
                  placeholder="https://sso.example.com/login"
                />
              </div>
            </div>

            <h3 className="text-sm font-semibold">Microsoft 로그인·가입</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <ToggleField
                label="Microsoft 로그인"
                checked={form.microsoftLoginEnabled}
                onChange={(value) => updateField('microsoftLoginEnabled', value)}
              />
              <ToggleField
                label="MS 가입 신청"
                checked={form.microsoftSignupRequestEnabled}
                onChange={(value) => updateField('microsoftSignupRequestEnabled', value)}
              />
              <ToggleField
                label="셀프 회원가입 (미지원)"
                checked={false}
                onChange={() => undefined}
                disabled
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="auth-policy-microsoftTenantId">테넌트 ID</label>
                <Input id="auth-policy-microsoftTenantId"
                  value={form.microsoftTenantId}
                  onChange={(event) => updateField('microsoftTenantId', event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="auth-policy-microsoftClientId">애플리케이션 ID</label>
                <Input id="auth-policy-microsoftClientId"
                  value={form.microsoftClientId}
                  onChange={(event) => updateField('microsoftClientId', event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="microsoft-client-secret">클라이언트 비밀값</label>
                <Input
                  id="microsoft-client-secret"
                  name="microsoft-client-secret"
                  type="password"
                  autoComplete="off"
                  data-ssoo-input-intent="noncredential-secret"
                  data-form-type="other"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-bwignore="true"
                  value={form.microsoftClientSecret}
                  onChange={(event) => updateField('microsoftClientSecret', event.target.value)}
                  placeholder={settings?.microsoftClientSecretConfigured ? '저장됨' : '미설정'}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="auth-policy-microsoftRedirectUri">로그인 콜백 주소</label>
                <Input id="auth-policy-microsoftRedirectUri"
                  value={form.microsoftRedirectUri}
                  onChange={(event) => updateField('microsoftRedirectUri', event.target.value)}
                  placeholder="http://localhost:4000/api/auth/microsoft/callback"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">필수 연결값을 저장하면 Microsoft 로그인 버튼에 반영됩니다. 비밀값은 암호화해 보관하며 빈 입력은 기존 값을 유지합니다.</p>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="auth-policy-microsoftScopes">요청 권한 범위</label>
                <Input id="auth-policy-microsoftScopes"
                  value={form.microsoftScopes}
                  onChange={(event) => updateField('microsoftScopes', event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="auth-policy-allowedTenantIds">허용 테넌트</label>
                <Input id="auth-policy-allowedTenantIds"
                  value={form.allowedTenantIds}
                  onChange={(event) => updateField('allowedTenantIds', event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="auth-policy-allowedEmailDomains">허용 도메인</label>
                <Input id="auth-policy-allowedEmailDomains"
                  value={form.allowedEmailDomains}
                  onChange={(event) => updateField('allowedEmailDomains', event.target.value)}
                  placeholder="example.com"
                />
              </div>
            </div>

            <h3 className="text-sm font-semibold">인증 메일 정책</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">메일 전달 모드</label>
                <Select
                  value={form.emailDeliveryMode}
                  onValueChange={(value) => updateField('emailDeliveryMode', value as 'outbox' | 'disabled')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbox">발송 대기열 사용</SelectItem>
                    <SelectItem value="disabled">전달 중지</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="auth-policy-emailFromAddress">발신 주소</label>
                <Input id="auth-policy-emailFromAddress"
                  value={form.emailFromAddress}
                  onChange={(event) => updateField('emailFromAddress', event.target.value)}
                  placeholder="no-reply@example.com"
                />
              </div>
            </div>

            {saveError ? <SsooErrorNotice as="p" compact error={saveError} /> : null}

          </fieldset>
        )}
      </div>


      <OperationHistoryButton filter={{ category: 'auth-policy' }} label="인증 정책 변경 이력" />

    </SsooSettingsPage>
  );
}
