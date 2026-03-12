'use client';

import type { TemplateItem } from '@/types/template';

export interface DocReferenceItem {
  path: string;
  title: string;
}

interface TabLike {
  path: string;
  title?: string;
}

interface TreeNode {
  type: 'file' | 'directory';
  name: string;
  path: string;
  children?: TreeNode[];
}

function dedupeDocItems(items: DocReferenceItem[]): DocReferenceItem[] {
  return Array.from(new Map(items.map((item) => [item.path, item])).values());
}

export function decodeDocPath(path: string): string | null {
  if (!path.startsWith('/doc/')) return null;
  try {
    return decodeURIComponent(path.slice('/doc/'.length));
  } catch {
    return path.slice('/doc/'.length);
  }
}

export function collectOpenDocs(tabs: TabLike[]): DocReferenceItem[] {
  const docs = tabs
    .map((tab) => {
      const filePath = decodeDocPath(tab.path);
      if (!filePath) return null;
      return {
        path: filePath,
        title: tab.title || filePath.split('/').pop() || filePath,
      };
    })
    .filter((item): item is DocReferenceItem => Boolean(item));

  return dedupeDocItems(docs);
}

export function flattenFileTreeDocs(tree: unknown): DocReferenceItem[] {
  const flatten = (nodes: TreeNode[]): DocReferenceItem[] => {
    const output: DocReferenceItem[] = [];
    for (const node of nodes) {
      if (node.type === 'file') {
        output.push({
          path: node.path,
          title: node.name || node.path.split('/').pop() || node.path,
        });
        continue;
      }
      if (node.type === 'directory' && Array.isArray(node.children)) {
        output.push(...flatten(node.children));
      }
    }
    return output;
  };

  return dedupeDocItems(flatten(Array.isArray(tree) ? (tree as TreeNode[]) : []));
}

export function filterDocReferences(items: DocReferenceItem[], query: string): DocReferenceItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return items.filter((item) => (
    item.title.toLowerCase().includes(normalized) || item.path.toLowerCase().includes(normalized)
  ));
}

export function filterPersonalDocumentTemplates(
  templates: TemplateItem[],
  query: string
): TemplateItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return templates.filter((item) => (
    item.name.toLowerCase().includes(normalized)
    || (item.description ?? '').toLowerCase().includes(normalized)
    || item.scope.toLowerCase().includes(normalized)
  ));
}
