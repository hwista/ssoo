import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { configService } from '../runtime/dms-config.service.js';
import { contentService } from '../runtime/content.service.js';
import { personalSettingsService } from '../runtime/personal-settings.service.js';
import type {
  TemplateItem,
  TemplateOriginType,
  TemplateScope,
  UserTemplateManifest,
} from '@ssoo/types/dms';
import type { TemplateSidecarData } from './template.types.js';

function getTemplateRoot(): string {
  return path.join(configService.getAppRoot(), 'data', 'templates');
}

function getSystemTemplateDir(): string {
  return path.join(getTemplateRoot(), 'system');
}

function getPersonalTemplateDir(): string {
  return path.join(getTemplateRoot(), 'personal');
}

function getPersonalManifestDir(): string {
  return path.join(getPersonalTemplateDir(), 'manifest');
}

const DEFAULT_SYSTEM_TEMPLATES: Array<Omit<TemplateItem, 'updatedAt'>> = [
  {
    id: 'system-doc-default',
    name: '기본 문서 템플릿',
    description: '요약/배경/핵심 내용/액션 아이템 구조',
    scope: 'global',
    kind: 'document',
    content: '# 제목\n\n## 배경\n\n## 핵심 내용\n\n## 액션 아이템\n',
    ownerId: 'system',
    visibility: 'shared',
    status: 'active',
    sourceType: 'markdown-file',
    originType: 'generated',
    referenceDocuments: [],
    generation: { source: 'manual' },
  },
  {
    id: 'system-folder-default',
    name: '기본 폴더 구조 템플릿',
    description: '주제 기준의 표준 폴더 구조',
    scope: 'global',
    kind: 'folder',
    content: 'project/\n  docs/\n  references/\n  decisions/\n',
    ownerId: 'system',
    visibility: 'shared',
    status: 'active',
    sourceType: 'markdown-file',
    originType: 'generated',
    referenceDocuments: [],
    generation: { source: 'manual' },
  },
];

interface TemplateListFilter {
  scope?: TemplateScope;
  originType?: TemplateOriginType;
}

interface SaveTemplateInput extends Omit<TemplateItem, 'id' | 'updatedAt'> {
  id?: string;
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureTemplateRoots(): void {
  ensureDir(getTemplateRoot());
  ensureDir(getSystemTemplateDir());
  ensureDir(getPersonalTemplateDir());
  ensureDir(getPersonalManifestDir());
}

function resolveOwnerId(scope: TemplateScope, userId: string): string {
  return scope === 'global' ? 'system' : (userId || 'anonymous');
}

function resolveAuthor(requestUserId: string | undefined): string {
  const requestUser = requestUserId?.trim();
  if (requestUser) return requestUser;

  const gitAuthorName = personalSettingsService.getAuthorIdentity().name?.trim();
  if (gitAuthorName) return gitAuthorName;

  return 'Unknown';
}

function getSystemTemplatePath(id: string): string {
  return path.join(getSystemTemplateDir(), `${id}.md`);
}

function getPersonalTemplatePath(id: string): string {
  return path.join(getPersonalTemplateDir(), `${id}.md`);
}

function getManifestPath(userId: string): string {
  return path.join(getPersonalManifestDir(), `${userId || 'anonymous'}.json`);
}

function readManifest(userId: string): UserTemplateManifest {
  const manifestPath = getManifestPath(userId);
  if (!fs.existsSync(manifestPath)) return { owned: [], scraped: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Partial<UserTemplateManifest>;
    return {
      owned: Array.isArray(parsed.owned) ? parsed.owned : [],
      scraped: Array.isArray(parsed.scraped) ? parsed.scraped : [],
    };
  } catch {
    return { owned: [], scraped: [] };
  }
}

function writeManifest(userId: string, manifest: UserTemplateManifest): void {
  ensureDir(getPersonalManifestDir());
  fs.writeFileSync(getManifestPath(userId), JSON.stringify(manifest, null, 2), 'utf-8');
}

function readTemplateFromFile(markdownPath: string): TemplateItem | null {
  const sidecarPath = contentService.getSidecarPath(markdownPath);
  if (!fs.existsSync(markdownPath) || !fs.existsSync(sidecarPath)) return null;

  try {
    const content = fs.readFileSync(markdownPath, 'utf-8');
    const sidecar = contentService.readSidecar(markdownPath) as TemplateSidecarData | null;
    if (!sidecar) return null;
    const sourcePath = path.relative(getTemplateRoot(), markdownPath).replace(/\\/g, '/');

    return {
      id: sidecar.id,
      name: sidecar.name,
      description: sidecar.description,
      summary: sidecar.summary,
      tags: sidecar.tags,
      createdAt: sidecar.createdAt,
      updatedAt: sidecar.updatedAt,
      author: sidecar.author,
      lastModifiedBy: sidecar.lastModifiedBy,
      scope: sidecar.scope,
      kind: sidecar.kind,
      content,
      ownerId: sidecar.ownerId,
      visibility: sidecar.visibility,
      status: sidecar.status,
      sourceType: sidecar.sourceType,
      sourcePath,
      originType: sidecar.originType,
      referenceDocuments: sidecar.referenceDocuments,
      generation: sidecar.generation,
    };
  } catch {
    return null;
  }
}

function readTemplatesInDir(dirPath: string): TemplateItem[] {
  if (!fs.existsSync(dirPath)) return [];

  return fs.readdirSync(dirPath)
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => readTemplateFromFile(path.join(dirPath, entry)))
    .filter((item): item is TemplateItem => item !== null)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function writeTemplateFiles(template: TemplateItem, templateDir: string, userId: string): TemplateItem {
  const markdownPath = path.join(templateDir, `${template.id}.md`);

  ensureDir(templateDir);
  fs.writeFileSync(markdownPath, template.content, 'utf-8');

  const sidecar: TemplateSidecarData = {
    id: template.id,
    name: template.name,
    description: template.description,
    summary: template.summary ?? '',
    tags: template.tags ?? [],
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    author: template.author,
    lastModifiedBy: template.lastModifiedBy,
    scope: template.scope,
    kind: template.kind,
    ownerId: template.ownerId ?? resolveOwnerId(template.scope, userId),
    visibility: template.visibility ?? (template.scope === 'global' ? 'shared' : 'private'),
    status: template.status ?? 'active',
    sourceType: template.sourceType ?? 'markdown-file',
    originType: template.originType,
    referenceDocuments: template.referenceDocuments ?? [],
    generation: template.generation,
  };
  contentService.writeSidecar(markdownPath, sidecar as unknown as Record<string, unknown>);

  return {
    ...template,
    summary: sidecar.summary,
    tags: sidecar.tags,
    ownerId: sidecar.ownerId,
    visibility: sidecar.visibility,
    status: sidecar.status,
    sourceType: sidecar.sourceType,
    originType: sidecar.originType,
    referenceDocuments: sidecar.referenceDocuments,
    generation: sidecar.generation,
      sourcePath: path.relative(getTemplateRoot(), markdownPath).replace(/\\/g, '/'),
  };
}

function deleteTemplateFiles(markdownPath: string): boolean {
  const sidecarPath = contentService.getSidecarPath(markdownPath);
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

function dedupeTemplates(templates: TemplateItem[]): TemplateItem[] {
  const map = new Map<string, TemplateItem>();
  for (const item of templates) {
    const key = `${item.scope}:${item.id}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values()).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

class TemplateService {
  private ensureRoots(): void {
    ensureTemplateRoots();

    const existingSystem = readTemplatesInDir(getSystemTemplateDir());
    if (existingSystem.length > 0) return;

    for (const template of DEFAULT_SYSTEM_TEMPLATES) {
      writeTemplateFiles(
        {
          ...template,
          summary: '',
          tags: [],
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
          author: 'system',
          lastModifiedBy: 'system',
        },
        getSystemTemplateDir(),
        'system',
      );
    }
  }

  get(id: string, scope: TemplateScope, _userId = 'anonymous'): TemplateItem | null {
    this.ensureRoots();

    if (scope === 'global') {
      return readTemplateFromFile(getSystemTemplatePath(id));
    }
    return readTemplateFromFile(getPersonalTemplatePath(id));
  }

  list(userId = 'anonymous', filter?: TemplateListFilter): { global: TemplateItem[]; personal: TemplateItem[] } {
    this.ensureRoots();

    const globalTemplates = dedupeTemplates(readTemplatesInDir(getSystemTemplateDir()));

    const manifest = readManifest(userId);
    const ownedTemplates = manifest.owned
      .map((id) => readTemplateFromFile(getPersonalTemplatePath(id)))
      .filter((item): item is TemplateItem => item !== null);

    const personalTemplates = dedupeTemplates(ownedTemplates);

    const applyFilter = (items: TemplateItem[], scope: TemplateScope) => items.filter((item) => {
      if (filter?.scope && filter.scope !== scope) return false;
      if (filter?.originType && item.originType !== filter.originType) return false;
      return true;
    });

    return {
      global: applyFilter(globalTemplates, 'global'),
      personal: applyFilter(personalTemplates, 'personal'),
    };
  }

  listByReferenceDocument(docPath: string, userId = 'anonymous'): TemplateItem[] {
    this.ensureRoots();

    const systemTemplates = readTemplatesInDir(getSystemTemplateDir());
    const manifest = readManifest(userId);
    const personalTemplates = manifest.owned
      .map((id) => readTemplateFromFile(getPersonalTemplatePath(id)))
      .filter((item): item is TemplateItem => item !== null);

    return dedupeTemplates(
      [...systemTemplates, ...personalTemplates].filter((item) =>
        (item.referenceDocuments ?? []).some((reference) => reference.path === docPath),
      ),
    );
  }

  save(template: SaveTemplateInput, userId = 'anonymous', requestUserId?: string): TemplateItem {
    this.ensureRoots();
    const now = new Date().toISOString();
    const nextId = template.id?.trim() || `tpl-${crypto.randomBytes(4).toString('hex')}`;
    const author = resolveAuthor(requestUserId || userId);
    const isSystem = template.scope === 'global';

    const built: TemplateItem = {
      ...template,
      id: nextId,
      summary: template.summary ?? '',
      tags: template.tags ?? [],
      createdAt: template.createdAt ?? now,
      updatedAt: now,
      ownerId: template.ownerId ?? resolveOwnerId(template.scope, userId),
      visibility: template.visibility ?? (isSystem ? 'shared' : 'private'),
      status: template.status ?? 'active',
      sourceType: template.sourceType ?? 'markdown-file',
      author,
      lastModifiedBy: author,
      originType: template.originType ?? 'generated',
      referenceDocuments: template.referenceDocuments ?? [],
      generation: template.generation ?? { source: 'manual' },
    };

    const templateDir = isSystem ? getSystemTemplateDir() : getPersonalTemplateDir();
    const result = writeTemplateFiles(built, templateDir, isSystem ? 'system' : userId);

    if (!isSystem) {
      const manifest = readManifest(userId);
      if (!manifest.owned.includes(nextId)) {
        manifest.owned.push(nextId);
        writeManifest(userId, manifest);
      }
    }

    return result;
  }

  remove(id: string, scope: TemplateScope, userId = 'anonymous'): boolean {
    this.ensureRoots();

    if (scope === 'global') {
      return deleteTemplateFiles(getSystemTemplatePath(id));
    }

    const removed = deleteTemplateFiles(getPersonalTemplatePath(id));
    if (removed) {
      const manifest = readManifest(userId);
      const ownerIdx = manifest.owned.indexOf(id);
      if (ownerIdx !== -1) {
        manifest.owned.splice(ownerIdx, 1);
        writeManifest(userId, manifest);
      }
    }
    return removed;
  }
}

export const templateService = new TemplateService();
