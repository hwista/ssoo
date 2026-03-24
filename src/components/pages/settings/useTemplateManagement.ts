'use client';

import { useCallback, useEffect, useState } from 'react';
import { templateApi } from '@/lib/api';
import type { TemplateItem, TemplateKind, TemplateScope } from '@/types/template';

export function useTemplateManagement(activeSection: string) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateDraft, setTemplateDraft] = useState({
    name: '',
    description: '',
    content: '',
    scope: 'personal' as TemplateScope,
    kind: 'document' as TemplateKind,
  });

  useEffect(() => {
    if (activeSection !== 'templates') return;
    let mounted = true;
    const loadTemplates = async () => {
      setIsLoadingTemplates(true);
      const response = await templateApi.list();
      if (!mounted) return;
      if (response.success && response.data) {
        setTemplates([...(response.data.personal ?? []), ...(response.data.global ?? [])]);
      }
      setIsLoadingTemplates(false);
    };
    void loadTemplates();
    return () => {
      mounted = false;
    };
  }, [activeSection]);

  const handleTemplateSave = useCallback(async () => {
    if (!templateDraft.name.trim() || !templateDraft.content.trim()) return;
    const response = await templateApi.upsert({
      name: templateDraft.name.trim(),
      description: templateDraft.description.trim(),
      content: templateDraft.content,
      scope: templateDraft.scope,
      kind: templateDraft.kind,
    });
    if (!response.success || !response.data) return;
    setTemplates((prev) => [response.data as TemplateItem, ...prev.filter((item) => item.id !== response.data?.id)]);
    setTemplateDraft({
      name: '',
      description: '',
      content: '',
      scope: 'personal',
      kind: 'document',
    });
  }, [templateDraft]);

  const handleTemplateDelete = useCallback(async (template: TemplateItem) => {
    const response = await templateApi.remove(template.id, template.scope);
    if (!response.success) return;
    setTemplates((prev) => prev.filter((item) => item.id !== template.id));
  }, []);

  return {
    templates,
    isLoadingTemplates,
    templateDraft,
    setTemplateDraft,
    handleTemplateSave,
    handleTemplateDelete,
  };
}
