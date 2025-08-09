import type { GraphEdgeData, GraphNodeData, ParsedQuery } from '../types';

function makeId(prefix: string, name?: string) {
  return `${prefix}:${name ?? Math.random().toString(36).slice(2, 9)}`;
}

function splitArgs(argList: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let depth = 0;
  let inStr: string | null = null;
  for (let i = 0; i < argList.length; i++) {
    const ch = argList[i];
    if (inStr) {
      cur += ch;
      if (ch === inStr && argList[i - 1] !== '\\') inStr = null;
      continue;
    }
    if (ch === '"' || ch === '\'') {
      inStr = ch;
      cur += ch;
      continue;
    }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts.filter(Boolean);
}

function normalizeName(token: string): string | null {
  let t = token.trim();
  if (!t) return null;
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith('\'') && t.endsWith('\''))) {
    t = t.slice(1, -1);
  }
  const aliasMatch = t.match(/^aliased\(([^)]+)\)$/);
  if (aliasMatch) t = aliasMatch[1].trim();
  if (t.includes('.')) t = t.split('.').pop() as string;
  t = t.replace(/\.__table__$/, '');
  if (!t) return null;
  return t;
}

export function parseOrmPyToGraph(code: string): ParsedQuery {
  const nodes: GraphNodeData[] = [];
  const edges: GraphEdgeData[] = [];
  const errors: string[] = [];
  const rootId = 'root:query';
  nodes.push({ id: rootId, label: 'Query', kind: 'select' });

  try {
    const tables = new Set<string>();
    const joins: string[] = [];
    const ctes: string[] = [];

    for (const m of code.matchAll(/\bquery\s*\(([^)]+)\)/g)) {
      const args = splitArgs(m[1]);
      for (const a of args) {
        const name = normalizeName(a);
        if (name) tables.add(name);
      }
    }

    for (const m of code.matchAll(/\bselect\s*\(([^)]+)\)/g)) {
      const args = splitArgs(m[1]);
      for (const a of args) {
        const name = normalizeName(a);
        if (name) tables.add(name);
      }
    }

    for (const m of code.matchAll(/\bfrom_\s*\(([^)]+)\)/g)) {
      const name = normalizeName(m[1]);
      if (name) tables.add(name);
    }

    for (const m of code.matchAll(/\bjoin\s*\(([^,\)]+)[^\)]*\)/g)) {
      const name = normalizeName(m[1]);
      if (name) {
        tables.add(name);
        joins.push(name);
      }
    }

    for (const m of code.matchAll(/\bouterjoin\s*\(([^,\)]+)[^\)]*\)/g)) {
      const name = normalizeName(m[1]);
      if (name) {
        tables.add(name);
        joins.push(name + ' (outer)');
      }
    }

    for (const m of code.matchAll(/\.cte\s*\(\s*(['"])\s*([^'"\)]+)\s*\1\s*\)/g)) {
      const name = m[2]?.trim();
      if (name) ctes.push(name);
    }

    if (tables.size === 0 && ctes.length === 0) {
      errors.push('No models/tables/CTEs detected from SQLAlchemy code.');
    }

    for (const t of tables) {
      const id = makeId('table', t);
      const isJoin = joins.some((j) => j.startsWith(t));
      const metrics = isJoin ? { complexity: 'O(N+M)', cost: 2, warnings: [] as string[] } : { complexity: 'O(N)', cost: 1, warnings: [] as string[] };
      nodes.push({ id, label: t, kind: isJoin ? 'join' : 'table', ...metrics });
      edges.push({ id: makeId('edge'), source: id, target: rootId, label: isJoin ? 'JOIN' : 'FROM', ...metrics });
    }

    for (const c of ctes) {
      const id = makeId('cte', c);
      nodes.push({ id, label: c, kind: 'cte', complexity: 'O(N)', cost: 1 });
      edges.push({ id: makeId('edge'), source: id, target: rootId, label: 'WITH', complexity: 'O(N)', cost: 1 });
    }

    // Heuristic aggregates/windows in SQLAlchemy
    if (/\b(func\.)?(count|sum|avg|min|max)\s*\(/i.test(code)) {
      const id = makeId('aggregate');
      nodes.push({ id, label: 'AGGREGATE', kind: 'aggregate', complexity: 'O(N)', cost: 1 });
      edges.push({ id: makeId('edge'), source: id, target: rootId, label: 'Agg', complexity: 'O(N)', cost: 1 });
    }
    if (/\.over\s*\(/i.test(code) || /\b(row_number|rank|dense_rank|ntile|lag|lead)\b/i.test(code)) {
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