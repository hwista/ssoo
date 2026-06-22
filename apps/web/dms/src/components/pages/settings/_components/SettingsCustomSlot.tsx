'use client';

import type { Dispatch, SetStateAction } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  getSsooUserSurfaceTabId,
  getSsooUserSurfaceTabPath,
  getSsooUserSurfaceTabTitle,
  type SsooUserSurfaceTabKind,
} from '@ssoo/web-auth';
import { useOpenTabWithConfirm } from '@/hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  onSelect?: () => Promise<void> | void;
  status: string;
  description: string;
}

function getExternalSettingLinks(openUserSurfaceTab: (kind: SsooUserSurfaceTabKind) => Promise<void>): ExternalSettingLink[] {
  return [
    {
      title: 'SSOO Profile / Settings',
      owner: '공용 사용자 표면',
      href: null,
      onSelect: () => openUserSurfaceTab('personal-settings'),
      status: '프레임 탭',
      description: '표시명, 아바타, 자기소개, 공개 프로필, 사람 링크와 개인 표시/알림 설정을 관리합니다.',
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
  anchorIds?: Record<string, string>;
}

function AdminTemplatesSurface({
  templates,
  isLoadingTemplates,
  templateDraft,
  setTemplateDraft,
  onSave,
  onDelete,
  anchorIds = {},
}: Omit<SettingsCustomSlotProps, 'slotKey'>) {
  return (
    <div className="space-y-3">
      <article id={anchorIds.status} className="scroll-mt-4 rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
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
        anchorIds={anchorIds}
      />
    </div>
  );
}

function ExternalSettingsSurface({ anchorIds = {} }: { anchorIds?: Record<string, string> }) {
  const openTabWithConfirm = useOpenTabWithConfirm();

  const openUserSurfaceTab = async (kind: SsooUserSurfaceTabKind) => {
    await openTabWithConfirm({
      id: getSsooUserSurfaceTabId(kind),
      title: getSsooUserSurfaceTabTitle(kind),
      icon: kind === 'personal-settings' ? 'Settings' : 'User',
      path: getSsooUserSurfaceTabPath(kind),
      closable: true,
      activate: true,
    });
  };

  return (
    <div className="space-y-3">
      <article id={anchorIds.boundary} className="scroll-mt-4 rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
        <p className="text-badge text-ssoo-primary/70">설정 경계</p>
        <h3 className="mt-1 text-label-strong text-ssoo-primary">플랫폼 공통은 Admin, 세부 설정은 이 화면</h3>
        <p className="mt-2 text-body-sm text-ssoo-primary/80">
          SSOO Profile/Settings, 조직/권한, AI Control Plane은 SSOT 공통 surface가 소유합니다. 이 설정은 문서 저장소,
          스토리지, 수집, 검색/색인/문서 보조 정책, 문서 분석/추출, 권한 요청/승인, 템플릿, 운영 상태처럼
          문서 도메인 내부의 시스템 설정/제어/운영을 직접 다룹니다.
        </p>
      </article>

      <div id={anchorIds['external-links']} className="scroll-mt-4 grid gap-3 md:grid-cols-2">
        {getExternalSettingLinks(openUserSurfaceTab).map((link) => {
          const content = (
            <>
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-badge text-ssoo-primary/60">{link.owner}</span>
                  <span className="mt-1 block text-label-strong text-ssoo-primary">{link.title}</span>
                </span>
                <Badge variant="outline" className="shrink-0 rounded-full border-ssoo-content-border bg-ssoo-content-bg px-2 py-0.5 text-caption text-ssoo-primary/70">
                  {link.status}
                </Badge>
              </span>
              <span className="mt-2 block text-body-sm text-ssoo-primary/80">{link.description}</span>
            </>
          );

          if (link.onSelect) {
            return (
              <Button
                key={link.title}
                type="button"
                variant="outline"
                onClick={() => {
                  void link.onSelect?.();
                }}
                className="group h-auto w-full flex-col items-stretch justify-start whitespace-normal rounded-lg border-ssoo-content-border bg-white px-4 py-3 text-left shadow-none hover:border-ssoo-primary/40 hover:bg-ssoo-content-bg/40"
              >
                {content}
                <span className="mt-2 inline-flex items-center gap-1 text-caption text-ssoo-primary/60 group-hover:text-ssoo-primary">
                  열기
                </span>
              </Button>
            );
          }

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
  anchorIds,
}: SettingsCustomSlotProps) {
  if (slotKey === 'document-access') {
    return <DocumentAccessSurface anchorIds={anchorIds} />;
  }

  if (slotKey === 'external-settings') {
    return <ExternalSettingsSurface anchorIds={anchorIds} />;
  }

  return (
    <AdminTemplatesSurface
      templates={templates}
      isLoadingTemplates={isLoadingTemplates}
      templateDraft={templateDraft}
      setTemplateDraft={setTemplateDraft}
      onSave={onSave}
      onDelete={onDelete}
      anchorIds={anchorIds}
    />
  );
}
