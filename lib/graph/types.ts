// ---------------------------------------------------------------------------
// Codegraph Visualizer – Type definitions & constants
// ---------------------------------------------------------------------------

// ---- Raw JSON shapes (as emitted by the codegraph extractor) ----

export interface RawCodegraphNode {
  id: string;
  name: string;
  type: '' | 'module' | 'class' | 'function' | 'method';
  file: string;
  line: number;
  group: string;
  size: number;
  docstring?: string;
  decorators?: string[];
  parameters?: string[];
  bases?: string[];
  module_path?: string;
  line_end?: number;
}

export interface RawCodegraphLink {
  source: string;
  target: string;
  type: 'contains' | 'imports' | 'calls' | 'inherits' | 'decorates';
  value: number;
}

export interface RawCodegraphData {
  nodes: RawCodegraphNode[];
  links: RawCodegraphLink[];
  metadata: {
    repo_id: string;
    name: string;
    node_count: number;
    edge_count: number;
  };
}

// ---- Internal graph types ----

export type CodeNodeType = 'module' | 'class' | 'function' | 'method' | 'external';
export type CodeEdgeType = 'contains' | 'imports' | 'calls' | 'inherits' | 'decorates';

export interface GraphNode {
  id: string;
  label: string;
  fullId: string;
  nodeType: CodeNodeType;
  file: string;
  line: number;
  lineEnd: number | undefined;
  group: string;
  size: number;
  color: string;
  shape: string;
  docstring: string | undefined;
  decorators: string[] | undefined;
  parameters: string[] | undefined;
  bases: string[] | undefined;
  modulePath: string | undefined;
  x?: number;
  y?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  edgeType: CodeEdgeType;
  value: number;
  color: string;
}

export type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

export type GraphMetadata = {
  repoId: string;
  name: string;
  nodeCount: number;
  edgeCount: number;
};

// ---- Visual constants ----

export const NODE_TYPE_COLORS: Record<CodeNodeType, string> = {
  module: '#00f0ff',
  class: '#ff00ff',
  function: '#39ff14',
  method: '#bf5fff',
  external: '#555555',
};

export const NODE_TYPE_SIZES: Record<CodeNodeType, number> = {
  module: 10,
  class: 8,
  function: 5,
  method: 4,
  external: 3,
};

export const NODE_TYPE_SHAPES: Record<CodeNodeType, string> = {
  module: 'circle',
  class: 'hexagon',
  function: 'circle',
  method: 'circle',
  external: 'circle',
};

export const EDGE_TYPE_COLORS: Record<CodeEdgeType, string> = {
  contains: '#333333',
  imports: '#facc15',
  calls: '#00f0ff',
  inherits: '#ef4444',
  decorates: '#ff00ff',
};

export const EDGE_TYPE_LABELS: Record<CodeEdgeType, string> = {
  contains: 'Contains',
  imports: 'Imports',
  calls: 'Calls',
  inherits: 'Inherits',
  decorates: 'Decorates',
};

export const NODE_TYPE_LABELS: Record<CodeNodeType, string> = {
  module: 'Module',
  class: 'Class',
  function: 'Function',
  method: 'Method',
  external: 'External',
};

export const NODE_TYPE_TOOLTIPS: Record<CodeNodeType, string> = {
  module: 'A Python module (file)',
  class: 'A class definition',
  function: 'A top-level function',
  method: 'A method within a class',
  external: 'An external dependency not defined in this repo',
};

export const EDGE_TYPE_TOOLTIPS: Record<CodeEdgeType, string> = {
  contains: 'Parent module/class contains this symbol',
  imports: 'This symbol is imported by the source',
  calls: 'The source calls this symbol',
  inherits: 'The source class inherits from this class',
  decorates: 'A decorator applied to the source symbol',
};

// ---- Cyberpunk theme tokens ----

export const CYBERPUNK = {
  bg: '#0a0a0f',
  surface: '#12121a',
  border: '#1e1e2e',
  borderHi: '#2a2a3e',
  text: '#e0e0e8',
  textDim: '#6b6b80',
  accent: '#00f0ff',
  glow: '0 0 10px rgba(0, 240, 255, 0.3)',
} as const;
