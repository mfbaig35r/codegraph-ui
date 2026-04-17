// ---------------------------------------------------------------------------
// Codegraph Visualizer – Client-side graph filtering
// ---------------------------------------------------------------------------

import type { CodeNodeType, CodeEdgeType, GraphData } from './types';

export interface GraphFilters {
  nodeTypes: Set<CodeNodeType>;
  edgeTypes: Set<CodeEdgeType>;
  showExternal: boolean;
}

export const DEFAULT_FILTERS: GraphFilters = {
  nodeTypes: new Set<CodeNodeType>(['module', 'class', 'function', 'method']),
  edgeTypes: new Set<CodeEdgeType>(['imports', 'calls', 'inherits', 'decorates']),
  showExternal: false,
};

/**
 * Return a new {@link GraphData} containing only the nodes and links that
 * pass the given filters.
 */
export function applyFilters(data: GraphData, filters: GraphFilters): GraphData {
  // 1. Filter nodes
  const visibleNodes = data.nodes.filter((node) => {
    if (node.nodeType === 'external') {
      return filters.showExternal;
    }
    return filters.nodeTypes.has(node.nodeType);
  });

  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));

  // 2. Filter links — edge type must be enabled AND both endpoints visible
  const visibleLinks = data.links.filter(
    (link) =>
      filters.edgeTypes.has(link.edgeType) &&
      visibleNodeIds.has(link.source) &&
      visibleNodeIds.has(link.target),
  );

  return { nodes: visibleNodes, links: visibleLinks };
}
