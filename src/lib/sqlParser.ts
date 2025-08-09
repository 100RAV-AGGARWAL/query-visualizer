import { Parser } from 'node-sql-parser';
import type { GraphEdgeData, GraphNodeData, ParsedQuery } from '../types';

const parser = new Parser();

function makeId(prefix: string, name?: string) {
  return `${prefix}:${name ?? Math.random().toString(36).slice(2, 9)}`;
}

function estimateJoinCost(joinType?: string): { complexity: string; cost: number; warnings: string[] } {
  const jt = (joinType || '').toLowerCase();
  if (jt.includes('outer')) return { complexity: 'O(N+M)', cost: 3, warnings: ['Outer join may be expensive'] };
  if (jt.includes('left') || jt.includes('right')) return { complexity: 'O(N+M)', cost: 2, warnings: [] };
  return { complexity: 'O(N+M)', cost: 1, warnings: [] };
}

function estimateWhereCost(): { complexity: string; cost: number; warnings: string[] } {
  return { complexity: 'O(N)', cost: 1, warnings: [] };
}

export function parseSqlToGraph(sql: string): ParsedQuery {
  const nodes: GraphNodeData[] = [];
  const edges: GraphEdgeData[] = [];
  const errors: string[] = [];
  const globalWarnings: string[] = [];

  try {
    const ast: any = parser.astify(sql) as any;
    const statements: any[] = Array.isArray(ast) ? ast : [ast];

    const rootId = 'root:query';
    nodes.push({ id: rootId, label: 'Query', kind: 'select' });

    for (const stmt of statements) {
      if (stmt?.with?.with && Array.isArray(stmt.with.with)) {
        for (const cte of stmt.with.with) {
          const id = makeId('cte', cte.name);
          nodes.push({ id, label: cte.name, kind: 'cte', complexity: 'O(N)', cost: 1 });
          edges.push({ id: makeId('edge'), source: id, target: rootId, label: 'WITH', complexity: 'O(N)', cost: 1 });
          tryCollectTables(cte.stmt, id, nodes, edges, globalWarnings);
        }
      }

      tryCollectTables(stmt, rootId, nodes, edges, globalWarnings);

      if (stmt.where) {
        const whereId = makeId('where');
        const wc = estimateWhereCost();
        nodes.push({ id: whereId, label: 'WHERE', kind: 'where', ...wc });
        edges.push({ id: makeId('edge'), source: whereId, target: rootId, label: 'Filter', ...wc });
      }

      if (stmt.groupby) {
        const id = makeId('group-by');
        nodes.push({ id, label: 'GROUP BY', kind: 'group-by', complexity: 'O(N log N)', cost: 2, warnings: ['Grouping can be costly without indexes'] });
        edges.push({ id: makeId('edge'), source: id, target: rootId, label: 'Aggregate', complexity: 'O(N log N)', cost: 2 });
      }

      if (stmt.orderby) {
        const id = makeId('order-by');
        nodes.push({ id, label: 'ORDER BY', kind: 'order-by', complexity: 'O(N log N)', cost: 2, warnings: ['Sorting can be expensive'] });
        edges.push({ id: makeId('edge'), source: id, target: rootId, label: 'Sort', complexity: 'O(N log N)', cost: 2 });
      }

      if (stmt.limit) {
        const id = makeId('limit');
        nodes.push({ id, label: 'LIMIT', kind: 'limit', complexity: 'O(1)', cost: 0 });
        edges.push({ id: makeId('edge'), source: id, target: rootId, label: 'Limit', complexity: 'O(1)', cost: 0 });
      }
    }

    // Heuristic detection for window functions and aggregates in SQL text
    const hasWindow = /\bover\s*\(/i.test(sql) || /\b(row_number|rank|dense_rank|ntile|lag|lead)\b/i.test(sql);
    if (hasWindow) {
      const id = makeId('window');
      nodes.push({ id, label: 'WINDOW', kind: 'window', complexity: 'O(N log N)', cost: 3, warnings: ['Window functions benefit from partition/order indexes'] });
      edges.push({ id: makeId('edge'), source: id, target: 'root:query', label: 'OVER(...)', complexity: 'O(N log N)', cost: 3 });
    }

    const hasAggregate = /\b(count|sum|avg|min|max)\s*\(/i.test(sql);
    if (hasAggregate) {
      const id = makeId('aggregate');
      nodes.push({ id, label: 'AGGREGATE', kind: 'aggregate', complexity: 'O(N)', cost: 1 });
      edges.push({ id: makeId('edge'), source: id, target: 'root:query', label: 'Agg', complexity: 'O(N)', cost: 1 });
    }

    return { rootId, nodes, edges, errors: errors.length ? errors : undefined, analysis: { warnings: globalWarnings } };
  } catch (e: any) {
    errors.push(e?.message ?? String(e));
    const fallbackId = 'root:error';
    nodes.push({ id: fallbackId, label: 'Parse error', kind: 'select', detail: errors[0] });
    return { rootId: fallbackId, nodes, edges, errors };
  }
}

function addTableNode(tableName: string, parentId: string, nodes: GraphNodeData[], edges: GraphEdgeData[]) {
  const id = makeId('table', tableName);
  nodes.push({ id, label: tableName, kind: 'table', complexity: 'O(N)', cost: 1 });
  edges.push({ id: makeId('edge'), source: id, target: parentId, label: 'FROM', complexity: 'O(N)', cost: 1 });
}

function tryCollectTables(node: any, parentId: string, nodes: GraphNodeData[], edges: GraphEdgeData[], globalWarnings: string[]) {
  if (!node) return;

  const fromItems = node.from || node.table || [];
  const arr = Array.isArray(fromItems) ? fromItems : [fromItems];
  for (const f of arr) {
    if (!f) continue;
    if (f.expr && f.expr.type === 'select') {
      const subId = makeId('subquery');
      nodes.push({ id: subId, label: f.as || 'subquery', kind: 'subquery', complexity: 'O(N)', cost: 1 });
      edges.push({ id: makeId('edge'), source: subId, target: parentId, label: 'FROM (sub)', complexity: 'O(N)', cost: 1 });
      tryCollectTables(f.expr, subId, nodes, edges, globalWarnings);
    } else if (f.table) {
      addTableNode(f.table, parentId, nodes, edges);
    } else if (typeof f === 'string') {
      addTableNode(f, parentId, nodes, edges);
    }

    if (f && f.join) {
      const joins = Array.isArray(f.join) ? f.join : [f.join];
      for (const j of joins) {
        if (j && j.table) {
          const jc = estimateJoinCost(j.type);
          const joinId = makeId('join', j.table);
          nodes.push({ id: joinId, label: j.table, kind: 'join', detail: j.on ? 'ON ...' : undefined, ...jc });
          edges.push({ id: makeId('edge'), source: joinId, target: parentId, label: j.type ? `${j.type} JOIN` : 'JOIN', ...jc });
        }
      }
    }
  }

  if (node._next) {
    let cur = node._next;
    while (cur) {
      const unionId = makeId('union');
      nodes.push({ id: unionId, label: 'UNION', kind: 'union', complexity: 'O(N+M)', cost: 2, warnings: ['UNION ALL is cheaper than UNION'] });
      edges.push({ id: makeId('edge'), source: unionId, target: parentId, label: 'UNION', complexity: 'O(N+M)', cost: 2 });
      tryCollectTables(cur, unionId, nodes, edges, globalWarnings);
      cur = cur._next;
    }
  }
} 