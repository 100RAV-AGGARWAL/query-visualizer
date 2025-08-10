import { useState } from 'react';
import type { ParsedQuery, GraphNodeData } from '../types';

interface Props {
  data: ParsedQuery;
}

interface TreeNodeData extends GraphNodeData {
  children: TreeNodeData[];
}

interface TreeNodeProps {
  node: TreeNodeData;
  level: number;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

function TreeNode({ node, level, isExpanded, onToggle }: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const indent = level * 20;
  
  return (
    <div>
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '4px 8px',
          marginLeft: indent,
          cursor: hasChildren ? 'pointer' : 'default',
          borderRadius: 6,
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        onClick={() => hasChildren && onToggle(node.id)}
      >
        {hasChildren && (
          <span style={{ 
            marginRight: 8, 
            fontSize: 12, 
            color: '#8b5cf6',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}>
            ▶
          </span>
        )}
        <span style={{ 
          fontSize: 13, 
          fontWeight: 500,
          color: node.kind === 'table' ? '#10b981' : 
                 node.kind === 'cte' ? '#f59e0b' : 
                 node.kind === 'select' ? '#3b82f6' : '#e5e7eb'
        }}>
          {node.label}
        </span>
        {node.kind && (
          <span style={{ 
            marginLeft: 8, 
            fontSize: 11, 
            padding: '2px 6px', 
            borderRadius: 4,
            backgroundColor: 'rgba(139, 92, 246, 0.2)',
            color: '#a78bfa'
          }}>
            {node.kind}
          </span>
        )}
        {node.complexity && (
          <span style={{ 
            marginLeft: 8, 
            fontSize: 11, 
            padding: '2px 6px', 
            borderRadius: 4,
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            color: '#34d399'
          }}>
            {node.complexity}
          </span>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              isExpanded={isExpanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ASTTree({ data }: Props) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root:query']));

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  // Build tree structure from nodes and edges
  const buildTree = (): TreeNodeData | null => {
    const nodeMap = new Map<string, TreeNodeData>();
    
    // Initialize nodes with empty children arrays
    data.nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });
    
    // Add edges to build parent-child relationships
    data.edges.forEach(edge => {
      const parent = nodeMap.get(edge.target);
      const child = nodeMap.get(edge.source);
      if (parent && child) {
        parent.children.push(child);
      }
    });

    // Find root node
    const root = nodeMap.get(data.rootId);
    return root || null;
  };

  const treeData = buildTree();

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      {treeData && (
        <TreeNode
          node={treeData}
          level={0}
          isExpanded={expandedNodes.has(treeData.id)}
          onToggle={toggleNode}
        />
      )}
      
      {data.errors && data.errors.length > 0 && (
        <div style={{ 
          padding: '8px 12px', 
          margin: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 6,
          color: '#fca5a5'
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 11 }}>Parse Errors:</div>
          {data.errors.map((error, i) => (
            <div key={i} style={{ fontSize: 11 }}>{error}</div>
          ))}
        </div>
      )}
    </div>
  );
} 