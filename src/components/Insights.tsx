import type { ParsedQuery } from '../types';

interface Props {
  data: ParsedQuery;
}

export default function Insights({ data }: Props) {
  const ctes = data.nodes.filter((n) => n.kind === 'cte');
  const warnings = [
    ...(data.analysis?.warnings ?? []),
    ...data.nodes.flatMap((n) => n.warnings ?? []),
    ...data.edges.flatMap((e) => e.warnings ?? []),
  ];

  return (
    <div style={{ padding: 12, borderTop: '1px solid #eee', display: 'flex', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>CTEs</div>
        {ctes.length === 0 ? (
          <div style={{ color: '#6b7280' }}>None</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {ctes.map((c) => (
              <li key={c.id}>
                {c.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Potential bottlenecks</div>
        {warnings.length === 0 ? (
          <div style={{ color: '#6b7280' }}>None detected</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {warnings.map((w, i) => (
              <li key={i}>
                {w}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 