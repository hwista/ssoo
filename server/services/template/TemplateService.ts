import fs from 'fs';
import path from 'path';
import type { TemplateItem, TemplateStoreShape } from '@/types/template';

const TEMPLATE_FILE = path.join(process.cwd(), 'data', 'templates', 'templates.json');

const DEFAULT_STORE: TemplateStoreShape = {
  global: [
    {
      id: 'global-doc-default',
      name: '기본 문서 템플릿',
      description: '요약/배경/핵심 내용/액션 아이템 구조',
      scope: 'global',
      kind: 'document',
      content: '# 제목\n\n## 배경\n\n## 핵심 내용\n\n## 액션 아이템\n',
      updatedAt: new Date(0).toISOString(),
    },
    {
      id: 'global-folder-default',
      name: '기본 폴더 구조 템플릿',
      description: '주제 기준의 표준 폴더 구조',
      scope: 'global',
      kind: 'folder',
      content: 'project/\n  docs/\n  references/\n  decisions/\n',
      updatedAt: new Date(0).toISOString(),
    },
  ],
  personal: {},
};

function safeParseStore(raw: string): TemplateStoreShape {
  const parsed = JSON.parse(raw) as Partial<TemplateStoreShape>;
  return {
    global: Array.isArray(parsed.global) ? parsed.global : [],
    personal: parsed.personal && typeof parsed.personal === 'object' ? parsed.personal : {},
  };
}

class TemplateService {
  private ensureFile(): void {
    const dir = path.dirname(TEMPLATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(TEMPLATE_FILE)) {
      fs.writeFileSync(TEMPLATE_FILE, JSON.stringify(DEFAULT_STORE, null, 2) + '\n', 'utf-8');
    }
  }

  private readStore(): TemplateStoreShape {
    this.ensureFile();
    const raw = fs.readFileSync(TEMPLATE_FILE, 'utf-8');
    return safeParseStore(raw);
  }

  private writeStore(store: TemplateStoreShape): void {
    this.ensureFile();
    fs.writeFileSync(TEMPLATE_FILE, JSON.stringify(store, null, 2) + '\n', 'utf-8');
  }

  list(userId = 'anonymous'): { global: TemplateItem[]; personal: TemplateItem[] } {
    const store = this.readStore();
    return {
      global: store.global,
      personal: store.personal[userId] ?? [],
    };
  }

  save(template: Omit<TemplateItem, 'id' | 'updatedAt'> & { id?: string }, userId = 'anonymous'): TemplateItem {
    const now = new Date().toISOString();
    const next: TemplateItem = {
      id: template.id && template.id.trim().length > 0
        ? template.id
        : `${template.scope}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: template.name,
      description: template.description,
      scope: template.scope,
      kind: template.kind,
      content: template.content,
      updatedAt: now,
    };

    const store = this.readStore();
    if (next.scope === 'global') {
      const without = store.global.filter((item) => item.id !== next.id);
      store.global = [next, ...without];
    } else {
      const bucket = store.personal[userId] ?? [];
      store.personal[userId] = [next, ...bucket.filter((item) => item.id !== next.id)];
    }

    this.writeStore(store);
    return next;
  }

  remove(id: string, scope: 'global' | 'personal', userId = 'anonymous'): boolean {
    const store = this.readStore();
    if (scope === 'global') {
      const before = store.global.length;
      store.global = store.global.filter((item) => item.id !== id);
      this.writeStore(store);
      return before !== store.global.length;
    }

    const bucket = store.personal[userId] ?? [];
    const next = bucket.filter((item) => item.id !== id);
    store.personal[userId] = next;
    this.writeStore(store);
    return next.length !== bucket.length;
  }
}

export const templateService = new TemplateService();
