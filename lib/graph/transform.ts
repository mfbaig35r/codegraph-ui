// ---------------------------------------------------------------------------
// Codegraph Visualizer – Transform raw JSON into internal GraphData
// ---------------------------------------------------------------------------

import type {
  RawCodegraphData,
  GraphData,
  GraphMetadata,
  GraphNode,
  GraphLink,
  CodeNodeType,
  CodeEdgeType,
} from './types';

import {
  NODE_TYPE_COLORS,
  NODE_TYPE_SIZES,
  NODE_TYPE_SHAPES,
  EDGE_TYPE_COLORS,
} from './types';

/**
 * Transform raw codegraph JSON (as produced by the extractor) into the
 * internal {@link GraphData} format used by the visualizer.
 */
export function transformCodegraph(raw: RawCodegraphData): {
  graphData: GraphData;
  metadata: GraphMetadata;
} {
  const nodes: GraphNode[] = raw.nodes.map((n) => {
    const nodeType: CodeNodeType = n.type === '' ? 'external' : n.type;
    const label = n.name || n.id.split('.').pop() || n.id;
    const baseSize = NODE_TYPE_SIZES[nodeType];
    const size = Math.max(baseSize, Math.sqrt(n.size) * 2);

    return {
      id: n.id,
      label,
      fullId: n.id,
      nodeType,
      file: n.file,
      line: n.line,
      lineEnd: n.line_end,
      group: n.group,
      size,
      color: NODE_TYPE_COLORS[nodeType],
      shape: NODE_TYPE_SHAPES[nodeType],
      docstring: n.docstring,
      decorators: n.decorators,
      parameters: n.parameters,
      bases: n.bases,
      modulePath: n.module_path,
    };
  });

  const links: GraphLink[] = raw.links.map((l) => ({
    source: l.source,
    target: l.target,
    edgeType: l.type as CodeEdgeType,
    value: l.value,
    color: EDGE_TYPE_COLORS[l.type as CodeEdgeType],
  }));

  const metadata: GraphMetadata = {
    repoId: raw.metadata.repo_id,
    name: raw.metadata.name,
    nodeCount: raw.metadata.node_count,
    edgeCount: raw.metadata.edge_count,
  };

  return { graphData: { nodes, links }, metadata };
}
