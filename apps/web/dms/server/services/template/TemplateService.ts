import fs from 'fs';
import path from 'path';
import type {
  TemplateItem,
  TemplateScope,
} from '@/types/template';
import type { StoredTemplateItem, TemplateStoreShape, TemplateSidecarData } from './types';

const TEMPLATE_ROOT = path.join(process.cwd(), 'data', 'templates');
const LEGACY_TEMPLATE_FILE = path.join(TEMPLATE_ROOT, 'templates.json');
const GLOBAL_TEMPLATE_DIR = path.join(TEMPLATE_ROOT, 'global');
const PERSONAL_TEMPLATE_DIR = path.join(TEMPLATE_ROOT, 'personal');

const DEFAULT_GLOBAL_TEMPLATES: Array<Omit<TemplateItem, 'updatedAt'>> = [
  {
    id: 'global-doc-default',
    name: '기본 문서 템플릿',
    description: '요약/배경/핵심 내용/액션 아이템 구조',
    scope: 'global',
    kind: 'document',
    content: '# 제목\n\n## 배경\n\n## 핵심 내용\n\n## 액션 아이템\n',
    ownerId: 'system',
    visibility: 'shared',
    status: 'active',
    sourceType: 'markdown-file',
  },
  {
    id: 'global-folder-default',
    name: '기본 폴더 구조 템플릿',
    description: '주제 기준의 표준 폴더 구조',
    scope: 'global',
    kind: 'folder',
    content: 'project/\n  docs/\n  references/\n  decisions/\n',
    ownerId: 'system',
    visibility: 'shared',
    status: 'active',
    sourceType: 'markdown-file',
  },
];

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function safeParseStore(raw: string): TemplateStoreShape {
  const parsed = JSON.parse(raw) as Partial<TemplateStoreShape>;
  return {
    global: Array.isArray(parsed.global) ? parsed.global : [],
    personal: parsed.personal && typeof parsed.personal === 'object' ? parsed.personal : {},
  };
}

function getTemplateDir(scope: TemplateScope, userId: string): string {
  return scope === 'global'
    ? GLOBAL_TEMPLATE_DIR
    : path.join(PERSONAL_TEMPLATE_DIR, userId || 'anonymous');
}

function getTemplateFilePath(scope: TemplateScope, userId: string, id: string): string {
  return path.join(getTemplateDir(scope, userId), `${id}.md`);
}

function getTemplateSidecarPath(markdownPath: string): string {
  const parsed = path.parse(markdownPath);
  return path.join(parsed.dir, `${parsed.name}.sidecar.json`);
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readTemplateFromFile(markdownPath: string): TemplateItem | null {
  const sidecarPath = getTemplateSidecarPath(markdownPath);
  if (!fs.existsSync(markdownPath) || !fs.existsSync(sidecarPath)) return null;

  try {
    const content = fs.readFileSync(markdownPath, 'utf-8');
    const sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8')) as TemplateSidecarData;
    const sourcePath = path.relative(TEMPLATE_ROOT, markdownPath).replace(/\\/g, '/');

    return {
      id: sidecar.id,
      name: sidecar.name,
      description: sidecar.description,
      scope: sidecar.scope,
      kind: sidecar.kind,
      content,
      updatedAt: sidecar.updatedAt,
      ownerId: sidecar.ownerId,
      visibility: sidecar.visibility,
      status: sidecar.status,
      sourceType: sidecar.sourceType,
      sourcePath,
    };
  } catch {
    return null;
  }
}

function writeTemplateFiles(template: TemplateItem, userId: string): TemplateItem {
  const markdownPath = getTemplateFilePath(template.scope, userId, template.id);
  const sidecarPath = getTemplateSidecarPath(markdownPath);

  ensureDir(path.dirname(markdownPath));

  fs.writeFileSync(markdownPath, template.content, 'utf-8');
  const sidecar: TemplateSidecarData = {
    id: template.id,
    name: template.name,
    description: template.description,
    scope: template.scope,
    kind: template.kind,
    updatedAt: template.updatedAt,
    ownerId: template.ownerId ?? (template.scope === 'global' ? 'system' : userId),
    visibility: template.visibility ?? (template.scope === 'global' ? 'shared' : 'personal'),
    status: template.status ?? 'active',
    sourceType: 'markdown-file',
  };
  fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2) + '\n', 'utf-8');

  return {
    ...template,
    ownerId: sidecar.ownerId,
    visibility: sidecar.visibility,
    status: sidecar.status,
    sourceType: sidecar.sourceType,
    sourcePath: path.relative(TEMPLATE_ROOT, markdownPath).replace(/\\/g, '/'),
  };
}

function readTemplatesInDir(dirPath: string): TemplateItem[] {
  if (!fs.existsSync(dirPath)) return [];

  return fs.readdirSync(dirPath)
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => readTemplateFromFile(path.join(dirPath, entry)))
    .filter((item): item is TemplateItem => item !== null)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function storedTemplateToPublic(
  template: StoredTemplateItem,
  scope: TemplateScope,
  userId: string
): TemplateItem {
  const nextId = template.id?.trim() || `${scope}-${Date.now()}`;
  const nextName = template.name?.trim() || nextId;
  const sourcePath = template.sourcePath?.trim() || path.relative(
    TEMPLATE_ROOT,
    getTemplateFilePath(scope, userId, nextId)
  ).replace(/\\/g, '/');
  return {
    id: nextId,
    name: nextName,
    description: template.description,
    scope,
    kind: template.kind ?? 'document',
    content: template.content ?? '',
    updatedAt: template.updatedAt || new Date().toISOString(),
    ownerId: template.ownerId ?? (scope === 'global' ? 'system' : userId),
    visibility: template.visibility ?? (scope === 'global' ? 'shared' : 'personal'),
    status: template.status ?? 'active',
    sourceType: 'markdown-file',
    sourcePath,
  };
}

function ensureLegacyMigration(userId = 'anonymous'): void {
  if (!fs.existsSync(LEGACY_TEMPLATE_FILE)) return;

  try {
    const store = safeParseStore(fs.readFileSync(LEGACY_TEMPLATE_FILE, 'utf-8'));
    const candidates: Array<{ template: StoredTemplateItem; scope: TemplateScope; userId: string }> = [];

    for (const template of store.global) {
      candidates.push({ template, scope: 'global', userId: 'system' });
    }

    for (const [ownerId, templates] of Object.entries(store.personal)) {
      for (const template of templates) {
        candidates.push({ template, scope: 'personal', userId: ownerId || userId });
      }
    }

    for (const candidate of candidates) {
      const template = storedTemplateToPublic(candidate.template, candidate.scope, candidate.userId);
      const markdownPath = getTemplateFilePath(template.scope, candidate.userId, template.id);
      const sidecarPath = getTemplateSidecarPath(markdownPath);
      if (fs.existsSync(markdownPath) && fs.existsSync(sidecarPath)) continue;
      writeTemplateFiles(template, candidate.userId);
    }
  } catch {
    // legacy 파일은 best-effort 마이그레이션만 수행한다.
  }
}

class TemplateService {
  private ensureRoots(): void {
    ensureDir(TEMPLATE_ROOT);
    ensureDir(GLOBAL_TEMPLATE_DIR);
    ensureDir(PERSONAL_TEMPLATE_DIR);
    ensureLegacyMigration();

    const existingGlobal = readTemplatesInDir(GLOBAL_TEMPLATE_DIR);
    if (existingGlobal.length > 0) return;

    for (const template of DEFAULT_GLOBAL_TEMPLATES) {
      writeTemplateFiles(
        {
          ...template,
          updatedAt: new Date(0).toISOString(),
        },
        'system'
      );
    }
  }

  list(userId = 'anonymous'): { global: TemplateItem[]; personal: TemplateItem[] } {
    this.ensureRoots();
    return {
      global: readTemplatesInDir(GLOBAL_TEMPLATE_DIR),
      personal: readTemplatesInDir(getTemplateDir('personal', userId)),
    };
  }

  save(template: Omit<TemplateItem, 'id' | 'updatedAt'> & { id?: string }, userId = 'anonymous'): TemplateItem {
    this.ensureRoots();
    const now = new Date().toISOString();
    const idBase = template.id?.trim() || slugify(template.name) || `${template.scope}-template`;
    const nextId = template.id?.trim() || `${template.scope}-${idBase}-${Date.now()}`;
    const next = writeTemplateFiles(
      {
        id: nextId,
        name: template.name,
        description: template.description,
        scope: template.scope,
        kind: template.kind,
        content: template.content,
        updatedAt: now,
        ownerId: template.ownerId ?? (template.scope === 'global' ? 'system' : userId),
        visibility: template.visibility ?? (template.scope === 'global' ? 'shared' : 'personal'),
        status: template.status ?? 'active',
        sourceType: 'markdown-file',
      },
      userId
    );

    return next;
  }

  remove(id: string, scope: 'global' | 'personal', userId = 'anonymous'): boolean {
    this.ensureRoots();
    const markdownPath = getTemplateFilePath(scope, scope === 'global' ? 'system' : userId, id);
    const sidecarPath = getTemplateSidecarPath(markdownPath);
    let removed = false;

    if (fs.existsSync(markdownPath)) {
      fs.unlinkSync(markdownPath);
      removed = true;
    }

    if (fs.existsSync(sidecarPath)) {
      fs.unlinkSync(sidecarPath);
      removed = true;
    }

    return removed;
  }
}

export const templateService = new TemplateService();
