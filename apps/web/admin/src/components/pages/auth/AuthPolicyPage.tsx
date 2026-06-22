'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, RefreshCw, Save, ShieldCheck, X } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useApproveRegistrationRequest,
  useAssignableRoles,
  useAuthProviderSettings,
  useRegistrationRequests,
  useRejectRegistrationRequest,
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
    selfSignupEnabled: form.selfSignupEnabled,
    emailDeliveryMode: form.emailDeliveryMode,
    emailFromAddress: form.emailFromAddress.trim() || null,
  };

  if (form.microsoftClientSecret.trim()) {
    request.microsoftClientSecret = form.microsoftClientSecret.trim();
  }

  return request;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ value }: { value: string }) {
  const tone = value === 'pending'
    ? 'bg-amber-100 text-amber-700'
    : value === 'approved'
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-600';

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {value}
    </span>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-md border border-input px-3 text-sm">
      <Input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
      {label}
    </label>
  );
}

export function AuthPolicyPage() {
  const [form, setForm] = useState<SettingsForm>(INITIAL_FORM);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [approvalRoleByRequestId, setApprovalRoleByRequestId] = useState<Record<string, string>>({});

  const settingsQuery = useAuthProviderSettings();
  const updateSettingsMutation = useUpdateAuthProviderSettings();
  const rolesQuery = useAssignableRoles();
  const requestsQuery = useRegistrationRequests({
    page: 1,
    limit: 20,
    statusCode: statusFilter === 'all' ? undefined : statusFilter,
  });
  const approveMutation = useApproveRegistrationRequest();
  const rejectMutation = useRejectRegistrationRequest();

  const settings = settingsQuery.data?.data;
  const requests = requestsQuery.data?.data?.data ?? [];
  const total = requestsQuery.data?.data?.total ?? 0;
  const roles = rolesQuery.data?.data ?? [];
  const defaultApprovalRole = roles.find((role) => role.roleCode === 'user')?.roleCode
    ?? roles[0]?.roleCode
    ?? 'user';

  useEffect(() => {
    if (settings) {
      setForm(toForm(settings));
    }
  }, [settings]);

  const runtimeReady = useMemo(() => {
    return Boolean(
      form.microsoftTenantId.trim()
      && form.microsoftClientId.trim()
      && form.microsoftRedirectUri.trim()
      && settings?.microsoftClientSecretConfigured,
    );
  }, [form.microsoftClientId, form.microsoftRedirectUri, form.microsoftTenantId, settings?.microsoftClientSecretConfigured]);

  const updateField = <K extends keyof SettingsForm>(field: K, value: SettingsForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setSaveError(null);

    try {
      await updateSettingsMutation.mutateAsync(toRequest(form));
      setForm((current) => ({ ...current, microsoftClientSecret: '' }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '인증 설정 저장에 실패했습니다.');
    }
  };

  const updateApprovalRole = (id: string, roleCode: string) => {
    setApprovalRoleByRequestId((current) => ({ ...current, [id]: roleCode }));
  };

  const approve = async (id: string) => {
    const roleCode = approvalRoleByRequestId[id] || defaultApprovalRole;
    await approveMutation.mutateAsync({ id, data: { roleCode } });
    setApprovalRoleByRequestId((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const reject = async (id: string) => {
    const memo = window.prompt('반려 메모를 입력하세요.', '') || null;
    await rejectMutation.mutateAsync({ id, data: { memo } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">인증 정책</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            로그인 provider, Microsoft 365 가입 신청, 비밀번호 재설정 정책을 관리합니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => settingsQuery.refetch()}>
          <RefreshCw className="mr-1 h-4 w-4" />
          새로고침
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">로그인 설정</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Microsoft OAuth 버튼은 tenant/client/redirect/secret이 모두 준비된 경우에만 공개 로그인 화면에 노출됩니다.
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
              runtimeReady ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            {runtimeReady ? 'MS runtime ready' : 'MS runtime pending'}
          </span>
        </div>

        {settingsQuery.isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">로딩 중...</div>
        ) : (
          <div className="space-y-5">
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

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">재설정 코드 TTL(분)</label>
                <Input
                  type="number"
                  value={form.resetCodeTtlMinutes}
                  onChange={(event) => updateField('resetCodeTtlMinutes', event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">재설정 코드 길이</label>
                <Input
                  type="number"
                  value={form.resetCodeLength}
                  onChange={(event) => updateField('resetCodeLength', event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <ToggleField
                label="사내 SSO"
                checked={form.internalSsoEnabled}
                onChange={(value) => updateField('internalSsoEnabled', value)}
              />
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">사내 SSO URL</label>
                <Input
                  value={form.internalSsoLoginUrl}
                  onChange={(event) => updateField('internalSsoLoginUrl', event.target.value)}
                  placeholder="https://sso.example.com/login"
                />
              </div>
            </div>

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
                label="셀프 회원가입"
                checked={form.selfSignupEnabled}
                onChange={(value) => updateField('selfSignupEnabled', value)}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Tenant ID</label>
                <Input
                  value={form.microsoftTenantId}
                  onChange={(event) => updateField('microsoftTenantId', event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Client ID</label>
                <Input
                  value={form.microsoftClientId}
                  onChange={(event) => updateField('microsoftClientId', event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Client Secret</label>
                <Input
                  type="password"
                  value={form.microsoftClientSecret}
                  onChange={(event) => updateField('microsoftClientSecret', event.target.value)}
                  placeholder={settings?.microsoftClientSecretConfigured ? '저장됨' : '미설정'}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Redirect URI</label>
                <Input
                  value={form.microsoftRedirectUri}
                  onChange={(event) => updateField('microsoftRedirectUri', event.target.value)}
                  placeholder="http://localhost:4000/api/auth/microsoft/callback"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Scopes</label>
                <Input
                  value={form.microsoftScopes}
                  onChange={(event) => updateField('microsoftScopes', event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">허용 Tenant</label>
                <Input
                  value={form.allowedTenantIds}
                  onChange={(event) => updateField('allowedTenantIds', event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">허용 도메인</label>
                <Input
                  value={form.allowedEmailDomains}
                  onChange={(event) => updateField('allowedEmailDomains', event.target.value)}
                  placeholder="example.com"
                />
              </div>
            </div>

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
                    <SelectItem value="outbox">outbox</SelectItem>
                    <SelectItem value="disabled">disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">발신 주소</label>
                <Input
                  value={form.emailFromAddress}
                  onChange={(event) => updateField('emailFromAddress', event.target.value)}
                  placeholder="no-reply@example.com"
                />
              </div>
            </div>

            {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={updateSettingsMutation.isPending}>
                <Save className="mr-1 h-4 w-4" />
                {updateSettingsMutation.isPending ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">가입 신청</h2>
            <p className="mt-1 text-sm text-muted-foreground">총 {total}건</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">pending</SelectItem>
                <SelectItem value="approved">approved</SelectItem>
                <SelectItem value="rejected">rejected</SelectItem>
                <SelectItem value="all">all</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => requestsQuery.refetch()}>
              <RefreshCw className="mr-1 h-4 w-4" />
              새로고침
            </Button>
          </div>
        </div>

        {requestsQuery.isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">로딩 중...</div>
        ) : requests.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">신청이 없습니다.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상태</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>표시명</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>신청일</TableHead>
                <TableHead className="w-[220px]">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.registrationRequestId}>
                  <TableCell><StatusBadge value={request.statusCode} /></TableCell>
                  <TableCell className="font-mono text-sm">{request.email}</TableCell>
                  <TableCell>{request.displayName ?? '-'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{request.tenantId || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(request.requestedAt)}</TableCell>
                  <TableCell>
                    {request.statusCode === 'pending' ? (
                      <div className="flex items-center gap-1">
                        <Select
                          value={approvalRoleByRequestId[request.registrationRequestId] || defaultApprovalRole}
                          onValueChange={(value) => updateApprovalRole(request.registrationRequestId, value)}
                          disabled={rolesQuery.isLoading || roles.length === 0}
                        >
                          <SelectTrigger className="h-8 w-[126px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.roleCode} value={role.roleCode}>
                                {role.roleName || role.roleCode}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="승인"
                          disabled={approveMutation.isPending || rolesQuery.isLoading || roles.length === 0}
                          onClick={() => approve(request.registrationRequestId)}
                        >
                          <Check className="h-4 w-4 text-green-700" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="반려"
                          disabled={rejectMutation.isPending}
                          onClick={() => reject(request.registrationRequestId)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
