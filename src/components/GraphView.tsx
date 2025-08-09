import { useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import type { ParsedQuery } from '../types';
import { computeLayout } from '../lib/graphLayout';

interface Props {
  data: ParsedQuery;
  direction?: 'LR' | 'TB';
}

export default function GraphView({ data, direction = 'LR' }: Props) {
  const { nodes, edges } = data;

  const { rfNodes, rfEdges } = useMemo(() => {
    const positions = computeLayout(nodes, edges, { layoutDirection: direction });
    const rfNodes: Node[] = nodes.map((n) => ({
      id: n.id,
      position: positions[n.id] ?? { x: 0, y: 0 },
      data: { label: `${n.label}${n.complexity ? `\n${n.complexity}` : ''}${n.warnings?.length ? `\n⚠︎ ${n.warnings[0]}` : ''}` },
      type: 'default',
      style: {
        border: '1px solid #888',
        borderRadius: 8,
        padding: 8,
        background: costToColor(n.cost ?? 1),
        color: '#0b1020',
        fontWeight: 600,
        whiteSpace: 'pre-line',
      },
    }));

    const rfEdges: Edge[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label ? `${e.label}${e.complexity ? ` (${e.complexity})` : ''}` : e.complexity,
      animated: true,
      type: 'smoothstep',
      style: { stroke: edgeColor(e.cost ?? 1) },
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 4,
      labelBgStyle: { fill: '#eef3f6', color: '#333', fillOpacity: 0.8 },
    }));

    return { rfNodes, rfEdges };
  }, [nodes, edges, direction]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow nodes={rfNodes} edges={rfEdges} fitView>
        <MiniMap />
        <Controls />
        <Background gap={16} color="#eee" />
      </ReactFlow>
    </div>
  );
}

function costToColor(cost: number): string {
  if (cost >= 3) return '#ffebee';
  if (cost === 2) return '#fff8e1';
  return '#e8f5e9';
}

function edgeColor(cost: number): string {
  if (cost >= 3) return '#c62828';
  if (cost === 2) return '#ef6c00';
  return '#607d8b';
} 