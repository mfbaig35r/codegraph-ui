'use client';

import {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
  type ChangeEvent,
} from 'react';
import {
  Upload,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCode2,
  Box,
  Braces,
  Code2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  CYBERPUNK,
  NODE_TYPE_COLORS,
  EDGE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  EDGE_TYPE_LABELS,
  NODE_TYPE_TOOLTIPS,
  EDGE_TYPE_TOOLTIPS,
} from '@/lib/graph/types';
import type {
  GraphData,
  GraphMetadata,
  GraphNode,
  GraphLink,
  CodeNodeType,
  CodeEdgeType,
  RawCodegraphData,
} from '@/lib/graph/types';
import { transformCodegraph } from '@/lib/graph/transform';
import { applyFilters, DEFAULT_FILTERS, type GraphFilters } from '@/lib/graph/filters';
import { Tooltip } from './tooltip';
import { GraphViewer, type GraphViewerRef } from './graph-viewer';

// ---- Icon map for node types ----

const NODE_TYPE_ICONS: Record<CodeNodeType, typeof FileCode2> = {
  module: FileCode2,
  class: Box,
  function: Braces,
  method: Code2,
  external: ExternalLink,
};

// ---- Component ----

export function CodeGraph() {
  // ---- State ----
  const [rawData, setRawData] = useState<RawCodegraphData | null>(null);
  const [fullGraphData, setFullGraphData] = useState<GraphData | null>(null);
  const [metadata, setMetadata] = useState<GraphMetadata | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filters, setFilters] = useState<GraphFilters>(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [graphWidth, setGraphWidth] = useState(800);
  const [tableOpen, setTableOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<GraphViewerRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- File upload ----

  const handleFileUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string) as RawCodegraphData;
        const { graphData, metadata: meta } = transformCodegraph(json);
        setRawData(json);
        setFullGraphData(graphData);
        setMetadata(meta);
        setSelectedNode(null);
        setFilters(DEFAULT_FILTERS);
        setSearchQuery('');
        setTableOpen(false);
      } catch (err) {
        setError(`Failed to parse JSON: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
    // Reset so same file can be re-uploaded
    e.target.value = '';
  }, []);

  // ---- Responsive width ----

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setGraphWidth(entry.contentRect.width);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ---- Filtered data ----

  const filteredData = useMemo<GraphData>(() => {
    if (!fullGraphData) return { nodes: [], links: [] };
    return applyFilters(fullGraphData, filters);
  }, [fullGraphData, filters]);

  // ---- Highlight data (connected nodes for selected node) ----

  const highlightData = useMemo<Set<string>>(() => {
    if (!selectedNode || !filteredData) return new Set();
    const ids = new Set<string>();
    ids.add(selectedNode.id);
    for (const link of filteredData.links) {
      const src = typeof link.source === 'object'
        ? (link.source as GraphNode).id
        : link.source;
      const tgt = typeof link.target === 'object'
        ? (link.target as GraphNode).id
        : link.target;
      if (src === selectedNode.id) ids.add(tgt);
      if (tgt === selectedNode.id) ids.add(src);
    }
    return ids;
  }, [selectedNode, filteredData]);

  // ---- Node/edge type toggle callbacks ----

  const toggleNodeType = useCallback((t: CodeNodeType) => {
    setFilters((prev) => {
      const next = new Set(prev.nodeTypes);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return { ...prev, nodeTypes: next };
    });
  }, []);

  const toggleEdgeType = useCallback((t: CodeEdgeType) => {
    setFilters((prev) => {
      const next = new Set(prev.edgeTypes);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return { ...prev, edgeTypes: next };
    });
  }, []);

  const toggleExternal = useCallback(() => {
    setFilters((prev) => ({ ...prev, showExternal: !prev.showExternal }));
  }, []);

  // ---- Search ----

  const handleSearch = useCallback(() => {
    if (!filteredData || !searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    const match = filteredData.nodes.find(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.fullId.toLowerCase().includes(q),
    );
    if (match && match.x != null && match.y != null) {
      setSelectedNode(match);
      graphRef.current?.centerAt(match.x, match.y, 500);
      graphRef.current?.zoom(3, 500);
    }
  }, [filteredData, searchQuery]);

  // ---- Stats ----

  const stats = useMemo(() => {
    if (!fullGraphData) return null;
    const nodeCounts: Record<string, number> = {};
    for (const n of fullGraphData.nodes) {
      nodeCounts[n.nodeType] = (nodeCounts[n.nodeType] || 0) + 1;
    }
    const edgeCounts: Record<string, number> = {};
    for (const l of fullGraphData.links) {
      edgeCounts[l.edgeType] = (edgeCounts[l.edgeType] || 0) + 1;
    }
    return { nodeCounts, edgeCounts };
  }, [fullGraphData]);

  // ---- Connections for selected node ----

  const connections = useMemo(() => {
    if (!selectedNode || !filteredData) return [];
    const result: { node: GraphNode; edgeType: CodeEdgeType; direction: 'in' | 'out' }[] = [];
    const nodeMap = new Map(filteredData.nodes.map((n) => [n.id, n]));
    for (const link of filteredData.links) {
      const src = typeof link.source === 'object'
        ? (link.source as GraphNode).id
        : link.source;
      const tgt = typeof link.target === 'object'
        ? (link.target as GraphNode).id
        : link.target;
      if (src === selectedNode.id) {
        const target = nodeMap.get(tgt);
        if (target) result.push({ node: target, edgeType: link.edgeType, direction: 'out' });
      }
      if (tgt === selectedNode.id) {
        const source = nodeMap.get(src);
        if (source) result.push({ node: source, edgeType: link.edgeType, direction: 'in' });
      }
    }
    return result;
  }, [selectedNode, filteredData]);

  // ---- Node click ----

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node));
  }, []);

  // ---- Upload screen ----

  if (!fullGraphData) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen gap-6"
        style={{ background: CYBERPUNK.bg, color: CYBERPUNK.text, fontFamily: "'JetBrains Mono', monospace" }}
      >
        <Upload size={48} style={{ color: CYBERPUNK.accent }} />
        <h1 className="text-2xl font-bold" style={{ color: CYBERPUNK.accent }}>
          codegraph
        </h1>
        <p style={{ color: CYBERPUNK.textDim }} className="text-sm">
          Drop a codegraph JSON file or click to upload
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-3 rounded-lg text-sm font-medium cursor-pointer transition-all"
          style={{
            background: CYBERPUNK.surface,
            border: `1px solid ${CYBERPUNK.borderHi}`,
            color: CYBERPUNK.accent,
            boxShadow: CYBERPUNK.glow,
          }}
        >
          Upload JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="hidden"
        />
        {error && (
          <p className="text-sm" style={{ color: '#ef4444' }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  // ---- Graph height ----
  const graphHeight = 600;
  const detailPanelWidth = 320;

  // ---- Main layout ----

  return (
    <div
      ref={containerRef}
      className="min-h-screen flex flex-col"
      style={{
        background: CYBERPUNK.bg,
        color: CYBERPUNK.text,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {/* ---- Header row ---- */}
      <div
        className="flex items-center gap-4 px-4 py-3 border-b"
        style={{ borderColor: CYBERPUNK.border }}
      >
        <h1 className="text-lg font-bold shrink-0" style={{ color: CYBERPUNK.accent }}>
          codegraph
        </h1>

        {metadata && (
          <div className="flex items-center gap-3 text-[11px]" style={{ color: CYBERPUNK.textDim }}>
            <span>{metadata.name}</span>
            <span>{metadata.nodeCount} nodes</span>
            <span>{metadata.edgeCount} edges</span>
          </div>
        )}

        <div className="flex-1" />

        {/* Search */}
        <div className="flex items-center gap-1">
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="px-2 py-1 rounded text-[11px] outline-none"
            style={{
              background: CYBERPUNK.surface,
              border: `1px solid ${CYBERPUNK.border}`,
              color: CYBERPUNK.text,
              width: 180,
            }}
          />
          <button
            onClick={handleSearch}
            className="p-1.5 rounded cursor-pointer"
            style={{
              background: CYBERPUNK.surface,
              border: `1px solid ${CYBERPUNK.border}`,
              color: CYBERPUNK.textDim,
            }}
          >
            <Search size={14} />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => graphRef.current?.zoom(4, 400)}
            className="p-1.5 rounded cursor-pointer"
            style={{
              background: CYBERPUNK.surface,
              border: `1px solid ${CYBERPUNK.border}`,
              color: CYBERPUNK.textDim,
            }}
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => graphRef.current?.zoom(1, 400)}
            className="p-1.5 rounded cursor-pointer"
            style={{
              background: CYBERPUNK.surface,
              border: `1px solid ${CYBERPUNK.border}`,
              color: CYBERPUNK.textDim,
            }}
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => graphRef.current?.zoomToFit(400, 40)}
            className="p-1.5 rounded cursor-pointer"
            style={{
              background: CYBERPUNK.surface,
              border: `1px solid ${CYBERPUNK.border}`,
              color: CYBERPUNK.textDim,
            }}
          >
            <Maximize2 size={14} />
          </button>
        </div>

        {/* Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 rounded text-[11px] cursor-pointer"
          style={{
            background: CYBERPUNK.surface,
            border: `1px solid ${CYBERPUNK.borderHi}`,
            color: CYBERPUNK.accent,
          }}
        >
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* ---- Filter bar ---- */}
      <div
        className="flex items-center gap-3 px-4 py-2 border-b flex-wrap"
        style={{ borderColor: CYBERPUNK.border }}
      >
        {/* Node type toggles */}
        <span className="text-[10px] uppercase" style={{ color: CYBERPUNK.textDim }}>
          Nodes
        </span>
        {(
          ['module', 'class', 'function', 'method'] as CodeNodeType[]
        ).map((t) => {
          const Icon = NODE_TYPE_ICONS[t];
          const active = filters.nodeTypes.has(t);
          return (
            <Tooltip key={t} content={NODE_TYPE_TOOLTIPS[t]}>
              <button
                onClick={() => toggleNodeType(t)}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] cursor-pointer transition-opacity"
                style={{
                  background: active ? CYBERPUNK.surface : 'transparent',
                  border: `1px solid ${active ? NODE_TYPE_COLORS[t] : CYBERPUNK.border}`,
                  color: active ? NODE_TYPE_COLORS[t] : CYBERPUNK.textDim,
                  opacity: active ? 1 : 0.5,
                }}
              >
                <Icon size={12} />
                {NODE_TYPE_LABELS[t]}
              </button>
            </Tooltip>
          );
        })}

        {/* External toggle */}
        <Tooltip content={NODE_TYPE_TOOLTIPS.external}>
          <button
            onClick={toggleExternal}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] cursor-pointer transition-opacity"
            style={{
              background: filters.showExternal ? CYBERPUNK.surface : 'transparent',
              border: `1px solid ${filters.showExternal ? NODE_TYPE_COLORS.external : CYBERPUNK.border}`,
              color: filters.showExternal ? NODE_TYPE_COLORS.external : CYBERPUNK.textDim,
              opacity: filters.showExternal ? 1 : 0.5,
            }}
          >
            <ExternalLink size={12} />
            External
          </button>
        </Tooltip>

        <div
          className="h-4 mx-1"
          style={{ borderLeft: `1px solid ${CYBERPUNK.border}` }}
        />

        {/* Edge type toggles */}
        <span className="text-[10px] uppercase" style={{ color: CYBERPUNK.textDim }}>
          Edges
        </span>
        {(
          ['contains', 'imports', 'calls', 'inherits', 'decorates'] as CodeEdgeType[]
        ).map((t) => {
          const active = filters.edgeTypes.has(t);
          const count = stats?.edgeCounts[t] || 0;
          return (
            <Tooltip key={t} content={EDGE_TYPE_TOOLTIPS[t]}>
              <button
                onClick={() => toggleEdgeType(t)}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] cursor-pointer transition-opacity"
                style={{
                  background: active ? CYBERPUNK.surface : 'transparent',
                  border: `1px solid ${active ? EDGE_TYPE_COLORS[t] : CYBERPUNK.border}`,
                  color: active ? EDGE_TYPE_COLORS[t] : CYBERPUNK.textDim,
                  opacity: active ? 1 : 0.5,
                }}
              >
                {EDGE_TYPE_LABELS[t]}
                <span style={{ color: CYBERPUNK.textDim, fontSize: 10 }}>
                  {count}
                </span>
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* ---- Main content ---- */}
      <div className="flex flex-1 min-h-0">
        {/* Graph */}
        <div className="flex-1">
          <GraphViewer
            ref={graphRef}
            graphData={filteredData}
            selectedNodeId={selectedNode?.id ?? null}
            highlightData={highlightData}
            onNodeClick={handleNodeClick}
            onNodeHover={() => {}}
            width={
              selectedNode
                ? Math.max(graphWidth - detailPanelWidth, 300)
                : graphWidth
            }
            height={graphHeight}
          />
        </div>

        {/* Detail panel */}
        {selectedNode && (
          <div
            className="overflow-y-auto"
            style={{
              width: detailPanelWidth,
              background: CYBERPUNK.surface,
              borderLeft: `1px solid ${CYBERPUNK.border}`,
              padding: 16,
            }}
          >
            {/* Name + type badge */}
            <h2
              className="text-sm font-bold mb-1"
              style={{ color: NODE_TYPE_COLORS[selectedNode.nodeType] }}
            >
              {selectedNode.label}
            </h2>
            <span
              className="inline-block px-2 py-0.5 rounded text-[10px] mb-3"
              style={{
                background: CYBERPUNK.bg,
                border: `1px solid ${NODE_TYPE_COLORS[selectedNode.nodeType]}`,
                color: NODE_TYPE_COLORS[selectedNode.nodeType],
              }}
            >
              {NODE_TYPE_LABELS[selectedNode.nodeType]}
            </span>

            {/* Full ID */}
            <div className="mb-2">
              <div className="text-[10px] uppercase mb-0.5" style={{ color: CYBERPUNK.textDim }}>
                Full ID
              </div>
              <div className="text-[11px] break-all" style={{ color: CYBERPUNK.text }}>
                {selectedNode.fullId}
              </div>
            </div>

            {/* File:line */}
            {selectedNode.file && (
              <div className="mb-2">
                <div className="text-[10px] uppercase mb-0.5" style={{ color: CYBERPUNK.textDim }}>
                  Location
                </div>
                <div className="text-[11px]" style={{ color: CYBERPUNK.text }}>
                  {selectedNode.file}:{selectedNode.line}
                  {selectedNode.lineEnd ? `-${selectedNode.lineEnd}` : ''}
                </div>
              </div>
            )}

            {/* Docstring */}
            {selectedNode.docstring && (
              <div className="mb-2">
                <div className="text-[10px] uppercase mb-0.5" style={{ color: CYBERPUNK.textDim }}>
                  Docstring
                </div>
                <div
                  className="text-[11px] p-2 rounded whitespace-pre-wrap"
                  style={{
                    background: CYBERPUNK.bg,
                    border: `1px solid ${CYBERPUNK.border}`,
                    color: CYBERPUNK.textDim,
                    maxHeight: 120,
                    overflowY: 'auto',
                  }}
                >
                  {selectedNode.docstring}
                </div>
              </div>
            )}

            {/* Parameters */}
            {selectedNode.parameters && selectedNode.parameters.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] uppercase mb-0.5" style={{ color: CYBERPUNK.textDim }}>
                  Parameters
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedNode.parameters.map((p, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded text-[10px]"
                      style={{
                        background: CYBERPUNK.bg,
                        border: `1px solid ${CYBERPUNK.border}`,
                        color: CYBERPUNK.text,
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Decorators */}
            {selectedNode.decorators && selectedNode.decorators.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] uppercase mb-0.5" style={{ color: CYBERPUNK.textDim }}>
                  Decorators
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedNode.decorators.map((d, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded text-[10px]"
                      style={{
                        background: CYBERPUNK.bg,
                        border: `1px solid ${CYBERPUNK.borderHi}`,
                        color: CYBERPUNK.accent,
                      }}
                    >
                      @{d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bases */}
            {selectedNode.bases && selectedNode.bases.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] uppercase mb-0.5" style={{ color: CYBERPUNK.textDim }}>
                  Bases
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedNode.bases.map((b, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded text-[10px]"
                      style={{
                        background: CYBERPUNK.bg,
                        border: `1px solid ${NODE_TYPE_COLORS.class}`,
                        color: NODE_TYPE_COLORS.class,
                      }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Connections */}
            {connections.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] uppercase mb-1" style={{ color: CYBERPUNK.textDim }}>
                  Connections ({connections.length})
                </div>
                <div
                  className="flex flex-col gap-0.5"
                  style={{ maxHeight: 200, overflowY: 'auto' }}
                >
                  {connections.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedNode(c.node);
                        if (c.node.x != null && c.node.y != null) {
                          graphRef.current?.centerAt(c.node.x, c.node.y, 500);
                        }
                      }}
                      className="flex items-center gap-1.5 text-[11px] text-left cursor-pointer rounded px-1.5 py-0.5 transition-colors"
                      style={{ color: CYBERPUNK.text }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = CYBERPUNK.bg;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ background: NODE_TYPE_COLORS[c.node.nodeType] }}
                      />
                      <span className="truncate">{c.node.label}</span>
                      <span
                        className="text-[9px] ml-auto shrink-0"
                        style={{ color: EDGE_TYPE_COLORS[c.edgeType] }}
                      >
                        {c.direction === 'out' ? '\u2192' : '\u2190'}{' '}
                        {EDGE_TYPE_LABELS[c.edgeType]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---- Collapsible node table ---- */}
      <div style={{ borderTop: `1px solid ${CYBERPUNK.border}` }}>
        <button
          onClick={() => setTableOpen((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 w-full text-left text-[11px] cursor-pointer"
          style={{ color: CYBERPUNK.textDim, background: CYBERPUNK.surface }}
        >
          {tableOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          Node Table ({filteredData.nodes.length})
        </button>
        {tableOpen && (
          <div
            className="overflow-auto"
            style={{ maxHeight: 240, background: CYBERPUNK.bg }}
          >
            <table className="w-full text-[11px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${CYBERPUNK.border}` }}>
                  {['Name', 'Type', 'File', 'Line'].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-1.5 text-left font-medium"
                      style={{ color: CYBERPUNK.textDim }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.nodes.map((n) => (
                  <tr
                    key={n.id}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: `1px solid ${CYBERPUNK.border}` }}
                    onClick={() => handleNodeClick(n)}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = CYBERPUNK.surface;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <td
                      className="px-3 py-1"
                      style={{ color: NODE_TYPE_COLORS[n.nodeType] }}
                    >
                      {n.label}
                    </td>
                    <td className="px-3 py-1" style={{ color: CYBERPUNK.textDim }}>
                      {NODE_TYPE_LABELS[n.nodeType]}
                    </td>
                    <td className="px-3 py-1" style={{ color: CYBERPUNK.textDim }}>
                      {n.file}
                    </td>
                    <td className="px-3 py-1" style={{ color: CYBERPUNK.textDim }}>
                      {n.line}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---- Legend ---- */}
      <div
        className="flex items-center gap-4 px-4 py-2 border-t flex-wrap"
        style={{ borderColor: CYBERPUNK.border, background: CYBERPUNK.surface }}
      >
        {/* Node type legend */}
        {(Object.keys(NODE_TYPE_COLORS) as CodeNodeType[]).map((t) => (
          <div key={t} className="flex items-center gap-1 text-[10px]">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: NODE_TYPE_COLORS[t] }}
            />
            <span style={{ color: CYBERPUNK.textDim }}>{NODE_TYPE_LABELS[t]}</span>
          </div>
        ))}

        <div
          className="h-3 mx-1"
          style={{ borderLeft: `1px solid ${CYBERPUNK.border}` }}
        />

        {/* Edge type legend */}
        {(Object.keys(EDGE_TYPE_COLORS) as CodeEdgeType[]).map((t) => (
          <div key={t} className="flex items-center gap-1 text-[10px]">
            <span
              className="inline-block w-4 h-0.5"
              style={{ background: EDGE_TYPE_COLORS[t] }}
            />
            <span style={{ color: CYBERPUNK.textDim }}>{EDGE_TYPE_LABELS[t]}</span>
          </div>
        ))}
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 text-[11px]" style={{ color: '#ef4444' }}>
          {error}
        </div>
      )}
    </div>
  );
}
