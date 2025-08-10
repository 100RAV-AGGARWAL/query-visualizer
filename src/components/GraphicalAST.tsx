import { useMemo, useRef, useEffect, useState } from 'react';
import type { ParsedQuery, GraphNodeData } from '../types';

interface Props {
  data: ParsedQuery;
}

interface TreeNodeData extends GraphNodeData {
  children: TreeNodeData[];
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TreeLayout {
  nodes: TreeNodeData[];
  width: number;
  height: number;
}

export default function GraphicalAST({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 8.0));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button only
      setIsDragging(true);
      setDragStart({
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(8.0, zoomLevel * zoomFactor));
    
    // Zoom towards mouse position
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomRatio = newZoom / zoomLevel;
    setPanOffset(prev => ({
      x: mouseX - (mouseX - prev.x) * zoomRatio,
      y: mouseY - (mouseY - prev.y) * zoomRatio
    }));
    
    setZoomLevel(newZoom);
  };

  const treeLayout = useMemo((): TreeLayout => {
    if (!data.nodes.length) return { nodes: [], width: 0, height: 0 };

    // Build tree structure
    const nodeMap = new Map<string, TreeNodeData>();
    data.nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [], x: 0, y: 0, width: 0, height: 0 });
    });
    
    // Add edges to build parent-child relationships
    data.edges.forEach(edge => {
      const parent = nodeMap.get(edge.target);
      const child = nodeMap.get(edge.source);
      if (parent && child) {
        parent.children.push(child);
      }
    });

    const root = nodeMap.get(data.rootId);
    if (!root) return { nodes: [], width: 0, height: 0 };

    // Calculate layout with better spacing
    const nodeWidth = 140;
    const nodeHeight = 70;
    const levelHeight = 120;
    const nodeSpacing = 30;

    const layoutNode = (node: TreeNodeData, level: number, x: number): number => {
      node.x = x;
      node.y = level * levelHeight;
      node.width = nodeWidth;
      node.height = nodeHeight;

      if (node.children.length === 0) {
        return nodeWidth;
      }

      let totalWidth = 0;
      const childX = x - (node.children.length - 1) * (nodeWidth + nodeSpacing) / 2;
      
      node.children.forEach((child, index) => {
        const childWidth = layoutNode(child, level + 1, childX + index * (nodeWidth + nodeSpacing));
        totalWidth = Math.max(totalWidth, childWidth);
      });

      return Math.max(nodeWidth, totalWidth);
    };

    layoutNode(root, 0, 0);

    // Calculate bounds
    const allNodes = Array.from(nodeMap.values());
    const minX = Math.min(...allNodes.map(n => n.x));
    const maxX = Math.max(...allNodes.map(n => n.x + n.width));
    const maxY = Math.max(...allNodes.map(n => n.y + n.height));

    return {
      nodes: allNodes,
      width: maxX - minX + 200, // Add more padding
      height: maxY + 200
    };
  }, [data]);

  if (!treeLayout.nodes.length) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#9ca3af',
        fontSize: 14
      }}>
        No AST data available
      </div>
    );
  }

  const getNodeColor = (kind: string) => {
    switch (kind) {
      case 'table': return '#10b981';
      case 'cte': return '#f59e0b';
      case 'select': return '#3b82f6';
      case 'join': return '#8b5cf6';
      case 'where': return '#ef4444';
      case 'group-by': return '#06b6d4';
      case 'order-by': return '#84cc16';
      case 'limit': return '#f97316';
      case 'window': return '#ec4899';
      case 'aggregate': return '#6366f1';
      default: return '#6b7280';
    }
  };

  const getNodeBgColor = (kind: string) => {
    const color = getNodeColor(kind);
    return color + '20'; // Add transparency
  };

  // Calculate scale and offset to fit the tree in the container
  const baseScale = Math.min(
    (containerSize.width - 40) / treeLayout.width,
    (containerSize.height - 40) / treeLayout.height,
    4.0 // Increased zoom for better readability
  );

  const finalScale = baseScale * zoomLevel;
  const offsetX = (containerSize.width - treeLayout.width * finalScale) / 2 + panOffset.x;
  const offsetY = (containerSize.height - treeLayout.height * finalScale) / 2 + panOffset.y;

  return (
    <div 
      ref={containerRef}
      style={{ 
        height: '100%', 
        overflow: 'hidden',
        position: 'relative',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Zoom Controls */}
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        display: 'flex',
        gap: '4px',
        zIndex: 10
      }}>
        <button
          onClick={handleZoomOut}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.2)',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: '#e5e7eb',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={handleResetZoom}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.2)',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: '#e5e7eb',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          title="Reset Zoom & Position"
        >
          ⌂
        </button>
        <button
          onClick={handleZoomIn}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.2)',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: '#e5e7eb',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          title="Zoom In"
        >
          +
        </button>
      </div>

      {/* Instructions */}
      <div style={{
        position: 'absolute',
        top: '8px',
        left: '8px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: '#9ca3af',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        zIndex: 10
      }}>
        Drag to pan • Scroll to zoom
      </div>

      <svg 
        width={containerSize.width}
        height={containerSize.height}
        style={{ 
          display: 'block',
          userSelect: 'none'
        }}
      >
        <g transform={`translate(${offsetX}, ${offsetY}) scale(${finalScale})`}>
          {/* Draw edges */}
          {data.edges.map((edge) => {
            const source = treeLayout.nodes.find(n => n.id === edge.source);
            const target = treeLayout.nodes.find(n => n.id === edge.target);
            
            if (!source || !target) return null;

            const sourceX = source.x + source.width / 2;
            const sourceY = source.y + source.height;
            const targetX = target.x + target.width / 2;
            const targetY = target.y;

            return (
              <g key={edge.id}>
                <line
                  x1={sourceX}
                  y1={sourceY}
                  x2={targetX}
                  y2={targetY}
                  stroke="#6b7280"
                  strokeWidth="2"
                  strokeDasharray="4,4"
                  opacity="0.6"
                />
                {edge.label && (
                  <text
                    x={(sourceX + targetX) / 2}
                    y={(sourceY + targetY) / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    fill="#9ca3af"
                    style={{ pointerEvents: 'none' }}
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Draw nodes */}
          {treeLayout.nodes.map((node) => (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                rx="8"
                fill={getNodeBgColor(node.kind)}
                stroke={getNodeColor(node.kind)}
                strokeWidth="2"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
              />
              <text
                x={node.x + node.width / 2}
                y={node.y + 20}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fontWeight="600"
                fill={getNodeColor(node.kind)}
              >
                {node.label}
              </text>
              <text
                x={node.x + node.width / 2}
                y={node.y + 35}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fill="#6b7280"
              >
                {node.kind}
              </text>
              {node.complexity && (
                <text
                  x={node.x + node.width / 2}
                  y={node.y + 50}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="8"
                  fill="#10b981"
                  fontWeight="500"
                >
                  {node.complexity}
                </text>
              )}
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
} 