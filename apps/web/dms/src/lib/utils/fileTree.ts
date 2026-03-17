import type { FileNode } from '@/types/file-tree';

/**
 * 파일 트리를 검색 쿼리로 필터링 (재귀)
 * 이름이 매칭되거나 자식 중 매칭이 있으면 포함
 */
export function filterFileTree(nodes: FileNode[], query: string): FileNode[] {
  if (!query.trim()) return nodes;

  const lowerQuery = query.toLowerCase();

  return nodes.reduce<FileNode[]>((acc, node) => {
    const matchesName = node.name.toLowerCase().includes(lowerQuery);
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
