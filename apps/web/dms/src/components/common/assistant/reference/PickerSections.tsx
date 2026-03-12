'use client';

import type { TemplateItem } from '@/types/template';
import type { DocReferenceItem } from './pickerUtils';

function ReferenceButton({
  item,
  attached,
  onToggle,
}: {
  item: DocReferenceItem;
  attached: boolean;
  onToggle: (item: DocReferenceItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(item)}
      className={`w-full rounded-md border px-2 py-1.5 text-left transition-colors ${
        attached
          ? 'border-ssoo-primary/45 bg-ssoo-primary/10'
          : 'border-ssoo-primary/20 bg-white hover:border-ssoo-primary/40 hover:bg-ssoo-primary/5'
      }`}
    >
      <p className="truncate text-xs font-medium text-ssoo-primary">{item.title}</p>
      <p className="truncate text-[11px] text-ssoo-primary/60">{item.path}</p>
    </button>
  );
}

function TemplateButton({
  template,
  selected,
  onSelect,
}: {
  template: TemplateItem;
  selected: boolean;
  onSelect: (template: TemplateItem) => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        void onSelect(template);
      }}
      className={`w-full rounded-md border px-2 py-1.5 text-left transition-colors ${
        selected
          ? 'border-ssoo-primary/45 bg-ssoo-primary/10'
          : 'border-ssoo-primary/20 bg-white hover:border-ssoo-primary/40 hover:bg-ssoo-primary/5'
      }`}
    >
      <p className="truncate text-xs font-medium text-ssoo-primary">{template.name}</p>
      <p className="truncate text-[11px] text-ssoo-primary/60">
        {template.scope === 'global' ? '공용' : '개인'} · {template.kind === 'document' ? '문서 템플릿' : '폴더 템플릿'}
      </p>
    </button>
  );
}

export function AssistantReferenceDocSections({
  query,
  isLoadingDocs,
  searchedDocs,
  openDocs,
  attachedPaths,
  onToggleReference,
}: {
  query: string;
  isLoadingDocs: boolean;
  searchedDocs: DocReferenceItem[];
  openDocs: DocReferenceItem[];
  attachedPaths: Set<string>;
  onToggleReference: (item: DocReferenceItem) => void;
}) {
  return (
    <>
      <div className="space-y-1">
        {query.trim().length === 0 ? null : isLoadingDocs ? (
          <p className="px-1 py-1 text-xs text-ssoo-primary/60">문서 목록 불러오는 중...</p>
        ) : searchedDocs.length === 0 ? (
          <p className="px-1 py-1 text-xs text-ssoo-primary/60">검색 결과가 없습니다.</p>
        ) : (
          searchedDocs.slice(0, 20).map((item) => (
            <ReferenceButton
              key={`search-${item.path}`}
              item={item}
              attached={attachedPaths.has(item.path)}
              onToggle={onToggleReference}
            />
          ))
        )}
      </div>

      <div className="border-t border-ssoo-primary/20 pt-2">
        <p className="px-1 pb-1 text-[11px] font-semibold text-ssoo-primary/70">열린 문서</p>
        <div className="space-y-1">
          {openDocs.length === 0 ? (
            <p className="px-1 py-1 text-xs text-ssoo-primary/60">현재 열린 문서가 없습니다.</p>
          ) : (
            openDocs.map((item) => (
              <ReferenceButton
                key={`open-${item.path}`}
                item={item}
                attached={attachedPaths.has(item.path)}
                onToggle={onToggleReference}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

export function InlineTemplateSections({
  query,
  isLoadingTemplates,
  searchedTemplates,
  globalDocumentTemplates,
  selectedTemplateId,
  onSelectTemplate,
}: {
  query: string;
  isLoadingTemplates: boolean;
  searchedTemplates: TemplateItem[];
  globalDocumentTemplates: TemplateItem[];
  selectedTemplateId?: string;
  onSelectTemplate: (template: TemplateItem) => void | Promise<void>;
}) {
  return (
    <>
      <div>
        <div className="space-y-1">
          {query.trim().length === 0 ? null : isLoadingTemplates ? (
            <p className="px-1 py-1 text-xs text-ssoo-primary/60">템플릿 불러오는 중...</p>
          ) : searchedTemplates.length === 0 ? (
            <p className="px-1 py-1 text-xs text-ssoo-primary/60">검색 결과가 없습니다.</p>
          ) : (
            searchedTemplates.slice(0, 20).map((template) => (
              <TemplateButton
                key={template.id}
                template={template}
                selected={selectedTemplateId === template.id}
                onSelect={onSelectTemplate}
              />
            ))
          )}
        </div>
      </div>

      <div className="border-t border-ssoo-primary/20 pt-2">
        <p className="px-1 pb-1 text-[11px] font-semibold text-ssoo-primary/70">공통 템플릿</p>
        <div className="space-y-1">
          {isLoadingTemplates ? (
            <p className="px-1 py-1 text-xs text-ssoo-primary/60">템플릿 불러오는 중...</p>
          ) : globalDocumentTemplates.length === 0 ? (
            <p className="px-1 py-1 text-xs text-ssoo-primary/60">선택 가능한 공통 템플릿이 없습니다.</p>
          ) : (
            globalDocumentTemplates.map((template) => (
              <TemplateButton
                key={template.id}
                template={template}
                selected={selectedTemplateId === template.id}
                onSelect={onSelectTemplate}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
