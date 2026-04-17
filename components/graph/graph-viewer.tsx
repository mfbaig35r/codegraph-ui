'use client';

import {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import dynamic from 'next/dynamic';
import type { GraphData, GraphNode, GraphLink } from '@/lib/graph/types';
import { CYBERPUNK } from '@/lib/graph/types';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
});

// ---- Public ref handle ----

export interface GraphViewerRef {
  centerAt: (x: number, y: number, ms?: number) => void;
  zoom: (k: number, ms?: number) => void;
  zoomToFit: (ms?: number, padding?: number) => void;
}

// ---- Props ----

interface GraphViewerProps {
  graphData: GraphData;
  selectedNodeId: string | null;
  highlightData: Set<string>;
  onNodeClick: (node: GraphNode) => void;
  onNodeHover: (node: GraphNode | null) => void;
  width: number;
  height: number;
  forceConfig?: {
    chargeStrength?: number;
    linkDistance?: number;
    centerStrength?: number;
  };
}

// ---- Hexagon helper ----

function drawHexagon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// ---- Component ----

export const GraphViewer = forwardRef<GraphViewerRef, GraphViewerProps>(
  function GraphViewer(
    {
      graphData,
      selectedNodeId,
      highlightData,
      onNodeClick,
      onNodeHover,
      width,
      height,
      forceConfig,
    },
    ref,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fgRef = useRef<any>(null);
    const didFitRef = useRef(false);

    // Expose imperative methods
    useImperativeHandle(ref, () => ({
      centerAt(x: number, y: number, ms = 500) {
        fgRef.current?.centerAt(x, y, ms);
      },
      zoom(k: number, ms = 500) {
        fgRef.current?.zoom(k, ms);
      },
      zoomToFit(ms = 400, padding = 40) {
        fgRef.current?.zoomToFit(ms, padding);
      },
    }));

    // Apply force config when it changes
    useEffect(() => {
      const fg = fgRef.current;
      if (!fg) return;
      if (forceConfig?.chargeStrength !== undefined) {
        fg.d3Force('charge')?.strength(forceConfig.chargeStrength);
      }
      if (forceConfig?.linkDistance !== undefined) {
        fg.d3Force('link')?.distance(forceConfig.linkDistance);
      }
      if (forceConfig?.centerStrength !== undefined) {
        fg.d3Force('center')?.strength(forceConfig.centerStrength);
      }
      fg.d3ReheatSimulation();
    }, [forceConfig]);

    // Auto-fit on first engine stop
    const handleEngineStop = useCallback(() => {
      if (!didFitRef.current && fgRef.current) {
        fgRef.current.zoomToFit(400, 40);
        didFitRef.current = true;
      }
    }, []);

    // Reset fit flag when data changes
    useEffect(() => {
      didFitRef.current = false;
    }, [graphData]);

    // ---- Canvas paint: nodes ----
    const paintNode = useCallback(
      (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        const r = node.size / globalScale + 1;
        const isSelected = node.id === selectedNodeId;
        const isHighlight = highlightData.has(node.id);
        const isHex = node.shape === 'hexagon';

        // Glow effect for selected node
        if (isSelected) {
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = node.color;
          if (isHex) {
            drawHexagon(ctx, x, y, r * 2.2);
          } else {
            ctx.beginPath();
            ctx.arc(x, y, r * 2.2, 0, 2 * Math.PI);
          }
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Main shape
        ctx.fillStyle = node.color;
        if (isHex) {
          drawHexagon(ctx, x, y, r);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, 2 * Math.PI);
          ctx.fill();
        }

        // Selection ring
        if (isSelected) {
          ctx.strokeStyle = CYBERPUNK.accent;
          ctx.lineWidth = 1.5 / globalScale;
          if (isHex) {
            drawHexagon(ctx, x, y, r + 2 / globalScale);
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.arc(x, y, r + 2 / globalScale, 0, 2 * Math.PI);
            ctx.stroke();
          }
        }

        // Labels at zoom > 1.2x
        if (globalScale > 1.2) {
          const fontSize = Math.max(10 / globalScale, 2);
          ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = isSelected || isHighlight
            ? CYBERPUNK.text
            : CYBERPUNK.textDim;
          ctx.fillText(node.label, x, y + r + 2 / globalScale);
        }
      },
      [selectedNodeId, highlightData],
    );

    // ---- Link width ----
    const linkWidth = useCallback(
      (link: GraphLink) => {
        const src = typeof link.source === 'object'
          ? (link.source as GraphNode).id
          : link.source;
        const tgt = typeof link.target === 'object'
          ? (link.target as GraphNode).id
          : link.target;
        const touchesSelected =
          selectedNodeId != null &&
          (src === selectedNodeId || tgt === selectedNodeId);
        if (touchesSelected) return 2.5;
        if (link.edgeType === 'contains') return 0.5;
        return 1;
      },
      [selectedNodeId],
    );

    return (
      <div
        style={{
          background: CYBERPUNK.bg,
          border: `1px solid ${CYBERPUNK.border}`,
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <ForceGraph2D
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={fgRef as any}
          graphData={graphData as { nodes: object[]; links: object[] }}
          width={width}
          height={height}
          nodeCanvasObject={paintNode as (node: object, ctx: CanvasRenderingContext2D, globalScale: number) => void}
          nodePointerAreaPaint={(node: object, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const n = node as GraphNode;
            const x = n.x ?? 0;
            const y = n.y ?? 0;
            const r = n.size / globalScale + 3;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            ctx.fill();
          }}
          linkColor={(link: object) => (link as GraphLink).color}
          linkWidth={(link: object) => linkWidth(link as GraphLink)}
          linkDirectionalParticles={0}
          onNodeClick={(_node: object) => onNodeClick(_node as GraphNode)}
          onNodeHover={(_node: object | null) =>
            onNodeHover(_node ? (_node as GraphNode) : null)
          }
          cooldownTicks={200}
          minZoom={0.3}
          maxZoom={10}
          backgroundColor={CYBERPUNK.bg}
          onEngineStop={handleEngineStop}
        />
      </div>
    );
  },
);
