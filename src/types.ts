export type QueryInputMode = 'sql' | 'orm-js' | 'orm-py';

export type SqlNodeKind =
  | 'table'
  | 'view'
  | 'cte'
  | 'subquery'
  | 'select'
  | 'join'
  | 'union'
  | 'where'
  | 'group-by'
  | 'order-by'
  | 'limit'
  | 'window'
  | 'aggregate';

export interface GraphNodeData {
  id: string;
  label: string;
  kind: SqlNodeKind;
  detail?: string;
  complexity?: string;
  cost?: number;
  warnings?: string[];
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
  complexity?: string;
  cost?: number;
  warnings?: string[];
}

export interface ParsedQuery {
  rootId: string;
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  errors?: string[];
  analysis?: {
    warnings: string[];
  };
}

export interface BuildGraphOptions {
  layoutDirection?: 'LR' | 'TB';
} 