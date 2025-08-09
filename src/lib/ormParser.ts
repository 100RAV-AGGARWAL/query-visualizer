import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import type { GraphEdgeData, GraphNodeData, ParsedQuery } from '../types';

function makeId(prefix: string, name?: string) {
  return `${prefix}:${name ?? Math.random().toString(36).slice(2, 9)}`;
}

const JOIN_METHODS = new Set([
  'join',
  'leftJoin',
  'rightJoin',
  'innerJoin',
  'leftOuterJoin',
  'rightOuterJoin',
  'fullOuterJoin',
]);

function estimateJoinCost(method: string | undefined) {
  const m = (method || '').toLowerCase();
  if (m.includes('outer')) return { complexity: 'O(N+M)', cost: 3, warnings: ['Outer join may be expensive'] };
  if (m.includes('left') || m.includes('right')) return { complexity: 'O(N+M)', cost: 2, warnings: [] };
  return { complexity: 'O(N+M)', cost: 1, warnings: [] };
}

export function parseOrmJsToGraph(code: string): ParsedQuery {
  const nodes: GraphNodeData[] = [];
  const edges: GraphEdgeData[] = [];
  const errors: string[] = [];

  const rootId = 'root:query';
  nodes.push({ id: rootId, label: 'Query', kind: 'select' });

  try {
    const ast = parse(code, {
      sourceType: 'unambiguous',
      plugins: ['typescript', 'jsx'],
    });

    const tables = new Set<string>();
    const joinMethods: Record<string, string> = {};
    const ctes: string[] = [];

    traverse(ast, {
      CallExpression(path) {
        const callee: any = path.node.callee;

        if (callee && callee.type === 'Identifier') {
          const firstArg = path.node.arguments?.[0];
          if (firstArg && firstArg.type === 'StringLiteral') {
            tables.add(firstArg.value);
          }
        }

        if (callee && callee.type === 'MemberExpression') {
          const property = callee.property;
          if (property.type === 'Identifier') {
            const methodName = property.name;
            const firstArg = path.node.arguments?.[0];
            if (
              (methodName === 'from' || methodName === 'table' || methodName === 'selectFrom') &&
              firstArg && firstArg.type === 'StringLiteral'
            ) {
              tables.add(firstArg.value);
            }
            if (JOIN_METHODS.has(methodName) && firstArg && firstArg.type === 'StringLiteral') {
              tables.add(firstArg.value);
              joinMethods[firstArg.value] = methodName;
            }
            if ((methodName === 'with' || methodName === 'withRecursive') && firstArg && firstArg.type === 'StringLiteral') {
              ctes.push(firstArg.value);
            }
          }

          const object = callee.object;
          if (
            object &&
            object.type === 'MemberExpression' &&
            object.object.type === 'Identifier' &&
            object.object.name === 'prisma' &&
            object.property.type === 'Identifier'
          ) {
            const modelName = object.property.name;
            tables.add(modelName);
          }
        }
      },
    });

    if (tables.size === 0 && ctes.length === 0) {
      errors.push('No tables/models/CTEs detected. This is a minimal heuristic parser.');
    }

    for (const t of tables) {
      const id = makeId('table', t);
      const joinInfo = joinMethods[t];
      const metrics = joinInfo ? estimateJoinCost(joinInfo) : { complexity: 'O(N)', cost: 1, warnings: [] as string[] };
      nodes.push({ id, label: t, kind: joinInfo ? 'join' : 'table', ...metrics });
      edges.push({ id: makeId('edge'), source: id, target: rootId, label: joinInfo ? joinInfo.toUpperCase() : 'FROM', ...metrics });
    }

    for (const c of ctes) {
      const id = makeId('cte', c);
      nodes.push({ id, label: c, kind: 'cte', complexity: 'O(N)', cost: 1 });
      edges.push({ id: makeId('edge'), source: id, target: rootId, label: 'WITH', complexity: 'O(N)', cost: 1 });
    }

    // Heuristic aggregate/window detection from code text for common libs
    if (/\b(count|sum|avg|min|max)\s*\(/i.test(code)) {
      const id = makeId('aggregate');
      nodes.push({ id, label: 'AGGREGATE', kind: 'aggregate', complexity: 'O(N)', cost: 1 });
      edges.push({ id: makeId('edge'), source: id, target: rootId, label: 'Agg', complexity: 'O(N)', cost: 1 });
    }
    if (/\bover\s*\(/i.test(code) || /\b(row_number|rank|dense_rank|ntile|lag|lead)\b/i.test(code)) {
      const id = makeId('window');
      nodes.push({ id, label: 'WINDOW', kind: 'window', complexity: 'O(N log N)', cost: 3, warnings: ['Window functions benefit from partition/order indexes'] });
      edges.push({ id: makeId('edge'), source: id, target: rootId, label: 'OVER(...)', complexity: 'O(N log N)', cost: 3 });
    }

    return { rootId, nodes, edges, errors: errors.length ? errors : undefined };
  } catch (e: any) {
    errors.push(e?.message ?? String(e));
    const errId = 'root:error';
    nodes.push({ id: errId, label: 'Parse error', kind: 'select', detail: errors[0] });
    return { rootId: errId, nodes, edges, errors };
  }
} 