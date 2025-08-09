import dagre from 'dagre';
import type { BuildGraphOptions, GraphEdgeData, GraphNodeData } from '../types';

export interface PositionedNode {
  id: string;
  x: number;
  y: number;
}

export function computeLayout(
  nodes: GraphNodeData[],
  edges: GraphEdgeData[],
  options?: BuildGraphOptions
): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: options?.layoutDirection ?? 'LR', nodesep: 40, ranksep: 80 });
  g.setDefaultEdgeLabel(() => ({}));

  const NODE_W = 200;
  const NODE_H = 60;

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  }

  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  const pos: Record<string, { x: number; y: number }> = {};
  for (const n of nodes) {
    const p = g.node(n.id);
    if (p) pos[n.id] = { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 };
  }
  return pos;
} 