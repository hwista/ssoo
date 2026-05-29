import type { FileNode } from '@/types/file-tree';

/**
 * 파일/문서 표시 제목 (문서명 우선, 없으면 파일명)
 */
export function getFileNodeDisplayTitle(node: Pick<FileNode, 'name' | 'title'>): string {
  const normalizedTitle = node.title?.trim();
  return normalizedTitle || node.name;
}

/**
 * 파일 트리를 검색 쿼리로 필터링 (재귀)
 * 파일은 문서명/파일명 둘 다 검색하고, 폴더는 이름 기준으로 유지한다.
 */
export function filterFileTree(nodes: FileNode[], query: string): FileNode[] {
  const lowerQuery = query.trim().toLowerCase();
  if (!lowerQuery) return nodes;

  return nodes.reduce<FileNode[]>((acc, node) => {
    const searchableTerms = node.type === 'file'
      ? [getFileNodeDisplayTitle(node), node.name]
      : [node.name];
    const matchesName = searchableTerms.some((term) => term.toLowerCase().includes(lowerQuery));
    const filteredChildren = node.children ? filterFileTree(node.children, query) : [];

    if (matchesName || filteredChildren.length > 0) {
      acc.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
      });
    }

    return acc;
  }, []);
}
