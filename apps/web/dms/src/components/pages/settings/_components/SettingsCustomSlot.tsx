'use client';

import type { Dispatch, SetStateAction } from 'react';
import { ExternalLink } from 'lucide-react';
import { resolveSsooAccountCenterHref } from '@ssoo/web-auth';
import type { TemplateItem, TemplateKind, TemplateScope } from '@/types/template';
import { DocumentAccessSurface } from './DocumentAccessSurface';
import { TemplateSection } from './TemplateSection';

interface TemplateDraft {
  name: string;
  description: string;
  content: string;
  scope: TemplateScope;
  kind: TemplateKind;
}

type SettingsCustomSlotKey = 'document-access' | 'admin-templates' | 'external-settings';

interface ExternalSettingLink {
  title: string;
  owner: string;
  href: string | null;
  status: string;
  description: string;
}

function getExternalSettingLinks(): ExternalSettingLink[] {
  return [
    {
      title: 'SNS Profile / Account',
      owner: 'SNS + 공통 Auth runtime',
      href: resolveSsooAccountCenterHref({ snsAppUrl: process.env.NEXT_PUBLIC_SNS_APP_URL }),
      status: 'SNS 설정',
      description: '표시명, 아바타, 자기소개, 공개 프로필, 사람 링크와 사용자-facing 계정/보안 진입점을 관리합니다.',
    },
    {
      title: 'Admin / Organization',
      owner: 'Admin',
      href: 'http://localhost:3000/organizations',
      status: 'Admin 조직',
      description: '사용자 초대/비활성, 조직/부서/직책, 역할/권한, 앱 접근 권한, M365/Teams 조직 연동 같은 플랫폼 공통 설정을 관리합니다.',
    },
    {
      title: 'AI Control Plane',
      owner: 'Admin AI',
      href: null,
      status: '후속 구현',
      description: 'Provider, model, capability, prompt, persona, soul, agent, policy, 관측 설정은 공통 control plane 에서 관리합니다.',
    },
  ];
}

interface SettingsCustomSlotProps {
  slotKey: SettingsCustomSlotKey;
  templates: TemplateItem[];
  isLoadingTemplates: boolean;
  templateDraft: TemplateDraft;
  setTemplateDraft: Dispatch<SetStateAction<TemplateDraft>>;
  onSave: () => void;
  onDelete: (template: TemplateItem) => void;
}

function AdminTemplatesSurface({
  templates,
  isLoadingTemplates,
  templateDraft,
  setTemplateDraft,
  onSave,
  onDelete,
}: Omit<SettingsCustomSlotProps, 'slotKey'>) {
  return (
    <div className="space-y-3">
      <article className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-badge text-ssoo-primary/70">현재 사용 가능</p>
            <h3 className="mt-1 text-label-strong text-ssoo-primary">관리자 템플릿 관리</h3>
            <p className="mt-2 text-body-sm text-ssoo-primary/80">
              기존 템플릿 관리 기능은 문서 도메인 관리 업무로 유지합니다. 마켓플레이스와 공개/개인 템플릿 관리는
              별도 설정 항목으로 분리합니다.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-caption text-emerald-700">
            사용 가능
          </span>
        </div>
      </article>

      <TemplateSection
        templates={templates}
        isLoadingTemplates={isLoadingTemplates}
        templateDraft={templateDraft}
        setTemplateDraft={setTemplateDraft}
        onSave={onSave}
        onDelete={onDelete}
      />
    </div>
  );
}

function ExternalSettingsSurface() {
  return (
    <div className="space-y-3">
      <article className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
        <p className="text-badge text-ssoo-primary/70">설정 경계</p>
        <h3 className="mt-1 text-label-strong text-ssoo-primary">플랫폼 공통은 Admin, 세부 설정은 이 화면</h3>
        <p className="mt-2 text-body-sm text-ssoo-primary/80">
          SNS Profile/Account, 조직/권한, AI Control Plane은 SSOT 공통 surface가 소유합니다. 이 설정은 문서 저장소,
          스토리지, 수집, 검색/색인/문서 보조 정책, 문서 분석/추출, 권한 요청/승인, 템플릿, 운영 상태처럼
          문서 도메인 내부의 시스템 설정/제어/운영을 직접 다룹니다.
        </p>
      </article>

      <div className="grid gap-3 md:grid-cols-2">
        {getExternalSettingLinks().map((link) => {
          const content = (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-badge text-ssoo-primary/60">{link.owner}</p>
                  <h4 className="mt-1 text-label-strong text-ssoo-primary">{link.title}</h4>
                </div>
                <span className="shrink-0 rounded-full border border-ssoo-content-border bg-ssoo-content-bg px-2 py-0.5 text-caption text-ssoo-primary/70">
                  {link.status}
                </span>
              </div>
              <p className="mt-2 text-body-sm text-ssoo-primary/80">{link.description}</p>
            </>
          );

          if (!link.href) {
            return (
              <article key={link.title} className="rounded-lg border border-dashed border-ssoo-content-border bg-white px-4 py-3">
                {content}
              </article>
            );
          }

          return (
            <a
              key={link.title}
              href={link.href}
              className="group rounded-lg border border-ssoo-content-border bg-white px-4 py-3 transition-colors hover:border-ssoo-primary/40 hover:bg-ssoo-content-bg/40"
            >
              {content}
              <span className="mt-2 inline-flex items-center gap-1 text-caption text-ssoo-primary/60 group-hover:text-ssoo-primary">
                이동 <ExternalLink className="h-3 w-3" />
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsCustomSlot({
  slotKey,
  templates,
  isLoadingTemplates,
  templateDraft,
  setTemplateDraft,
  onSave,
  onDelete,
}: SettingsCustomSlotProps) {
  if (slotKey === 'document-access') {
    return <DocumentAccessSurface />;
  }

  if (slotKey === 'external-settings') {
    return <ExternalSettingsSurface />;
  }

  return (
    <AdminTemplatesSurface
      templates={templates}
      isLoadingTemplates={isLoadingTemplates}
      templateDraft={templateDraft}
      setTemplateDraft={setTemplateDraft}
      onSave={onSave}
      onDelete={onDelete}
    />
  );
}
