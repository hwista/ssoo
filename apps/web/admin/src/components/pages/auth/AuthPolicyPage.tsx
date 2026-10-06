'use client';

import { SsooErrorNotice } from '@ssoo/web-shell';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, MailCheck, RefreshCw, RotateCcw, Save, Send, ShieldCheck, X } from 'lucide-react';
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
  useEmailDeliveryStatus,
  useRegistrationRequests,
  useRejectRegistrationRequest,
  useRetryEmailDelivery,
  useRunEmailDelivery,
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
    ? 'bg-ssoo-warning-bg text-ssoo-warning'
    : value === 'approved'
      ? 'bg-ssoo-success-bg text-ssoo-success'
      : 'bg-muted text-muted-foreground';

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
  const [form, setForm] = useState<SettingsForm>(INITIAL_FORM);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [approvalRoleByRequestId, setApprovalRoleByRequestId] = useState<Record<string, string>>({});

  const settingsQuery = useAuthProviderSettings();
  const updateSettingsMutation = useUpdateAuthProviderSettings();
  const emailDeliveryQuery = useEmailDeliveryStatus();
  const runEmailDeliveryMutation = useRunEmailDelivery();
  const retryEmailDeliveryMutation = useRetryEmailDelivery();
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
  const emailDelivery = emailDeliveryQuery.data?.data;
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

  const handleSave = useCallback(async () => {
    setSaveError(null);

    try {
      await updateSettingsMutation.mutateAsync(toRequest(form));
      setForm((current) => ({ ...current, microsoftClientSecret: '' }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '인증 설정 저장에 실패했습니다.');
    }
  }, [form, updateSettingsMutation]);

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

  const headerActions: SsooPageHeaderAction[] = [
    {
      label: settingsQuery.isFetching ? '갱신 중...' : '새로고침',
      icon: <RefreshCw className="h-4 w-4" />,
      variant: 'outline',
      onClick: () => {
        void settingsQuery.refetch();
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
      disabled: settingsQuery.isLoading || updateSettingsMutation.isPending,
    },
  ];

  return (
    <SsooSettingsPage
      filePath="admin/auth"
      headerActions={{
        extraActions: headerActions,
        extraActionsPosition: 'right',
      }}
      index={{
        ariaLabel: '인증 정책 항목 색인',
        items: [
          { id: 'admin-auth-login-settings', label: '로그인 설정' },
          { id: 'admin-auth-email-delivery', label: '메일 전달' },
          { id: 'admin-auth-registration-requests', label: '가입 신청' },
        ],
        onItemSelect: (item) => {
          document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
      }}
    >
      <div id="admin-auth-login-settings" className="scroll-mt-4 rounded-lg border bg-card p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">로그인 설정</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Microsoft OAuth 버튼은 tenant/client/redirect/secret이 모두 준비된 경우에만 공개 로그인 화면에 노출됩니다.
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
              runtimeReady ? 'bg-ssoo-success-bg text-ssoo-success' : 'bg-muted text-muted-foreground'
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
                label="셀프 회원가입 (미지원)"
                checked={false}
                onChange={() => undefined}
                disabled
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
                <label className="text-sm font-medium" htmlFor="microsoft-client-secret">Client Secret</label>
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

            {saveError ? <SsooErrorNotice as="p" compact error={saveError} /> : null}

          </div>
        )}
      </div>

      <div id="admin-auth-email-delivery" className="scroll-mt-4 rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <MailCheck className="h-5 w-5" />
              비밀번호 재설정 메일 전달
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              outbox 적재부터 SMTP 전달·실패·재시도까지 운영 상태를 확인합니다. 수신 주소는 마스킹됩니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                form.emailDeliveryMode === 'disabled'
                  ? 'bg-muted text-muted-foreground'
                  : emailDelivery?.state === 'ready'
                    ? 'bg-ssoo-success-bg text-ssoo-success'
                    : 'bg-destructive/10 text-destructive'
              }`}
            >
              {form.emailDeliveryMode === 'disabled'
                ? '정책 비활성'
                : emailDelivery?.state === 'ready' ? '전달 준비됨' : '전달 차단'}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={runEmailDeliveryMutation.isPending || form.emailDeliveryMode === 'disabled'}
              onClick={() => runEmailDeliveryMutation.mutate()}
            >
              <Send className="mr-1 h-4 w-4" />
              지금 처리
            </Button>
            <Button variant="outline" size="sm" onClick={() => emailDeliveryQuery.refetch()}>
              <RefreshCw className="mr-1 h-4 w-4" />
              새로고침
            </Button>
          </div>
        </div>

        {emailDeliveryQuery.isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">로딩 중...</div>
        ) : emailDeliveryQuery.isError || !emailDelivery ? (
          <SsooErrorNotice className="px-5 py-6">메일 전달 상태를 조회하지 못했습니다.</SsooErrorNotice>
        ) : (
          <div className="space-y-4 p-5">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Pending</p><p className="mt-1 text-xl font-semibold">{emailDelivery.counts.pending ?? 0}</p></div>
              <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Processing</p><p className="mt-1 text-xl font-semibold">{emailDelivery.counts.processing ?? 0}</p></div>
              <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Sent</p><p className="mt-1 text-xl font-semibold">{emailDelivery.counts.sent ?? 0}</p></div>
              <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Failed</p><p className="mt-1 text-xl font-semibold">{emailDelivery.counts.failed ?? 0}</p></div>
            </div>
            <p className={`text-sm ${emailDelivery.state === 'blocked' ? 'text-destructive' : 'text-muted-foreground'}`}>
              {emailDelivery.reason}
            </p>

            {emailDelivery.recent.length === 0 ? (
              <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">메일 이력이 없습니다.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>상태</TableHead>
                    <TableHead>수신자</TableHead>
                    <TableHead>템플릿</TableHead>
                    <TableHead>생성일</TableHead>
                    <TableHead>실패 사유</TableHead>
                    <TableHead className="w-[80px]">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailDelivery.recent.map((message) => (
                    <TableRow key={message.messageId}>
                      <TableCell><StatusBadge value={message.statusCode} /></TableCell>
                      <TableCell className="font-mono text-sm">{message.recipient}</TableCell>
                      <TableCell>{message.templateCode}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(message.createdAt)}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-xs text-destructive" title={message.failReason ?? undefined}>{message.failReason ? <SsooErrorNotice compact error={message.failReason} /> : '-'}</TableCell>
                      <TableCell>
                        {message.statusCode === 'failed' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="재시도"
                            disabled={retryEmailDeliveryMutation.isPending}
                            onClick={() => retryEmailDeliveryMutation.mutate(message.messageId)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </div>

      <div id="admin-auth-registration-requests" className="scroll-mt-4 rounded-lg border bg-card">
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
                          <Check className="h-4 w-4 text-ssoo-success" />
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
    </SsooSettingsPage>
  );
}
