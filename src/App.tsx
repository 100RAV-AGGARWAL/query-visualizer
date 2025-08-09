import { useMemo, useRef, useState, useEffect } from 'react';
import './App.css';
import type { ParsedQuery, QueryInputMode } from './types';
import ModeToggle from './components/ModeToggle';
import DirectionToggle from './components/DirectionToggle';
import CodeEditor from './components/Editor';
import GraphView from './components/GraphView';
import Insights from './components/Insights';
import { parseSqlToGraph } from './lib/sqlParser';
import { parseOrmJsToGraph } from './lib/ormParser';
import { parseOrmPyToGraph } from './lib/ormPyParser';
import { format } from 'sql-formatter';

const EXAMPLE_SQL = `WITH sales_per_user AS (
  SELECT user_id, SUM(amount) AS total
  FROM orders
  GROUP BY user_id
)
SELECT u.id, u.name, s.total
FROM users u
JOIN sales_per_user s ON s.user_id = u.id
WHERE s.total > 100
ORDER BY s.total DESC
LIMIT 50;`;

const EXAMPLE_ORM = `// Prisma example
await prisma.user.findMany({
  where: { posts: { some: { published: true } } },
});

// Knex-like example
const result = db('orders')
  .join('users', 'orders.user_id', 'users.id')
  .where('amount', '>', 100)
  .select('users.id', 'users.name', 'orders.amount');`;

const EXAMPLE_SQLALCHEMY = `# SQLAlchemy ORM examples
session.query(User, Address).join(Address).filter(User.id == Address.user_id)

stmt = select(User).join(Address).where(Address.city == 'NYC')

q = session.query(Order).join(User).outerjoin(Product).filter(Order.amount > 100)
`;

function buildGraph(mode: QueryInputMode, text: string): ParsedQuery {
  if (mode === 'sql') return parseSqlToGraph(text);
  if (mode === 'orm-js') return parseOrmJsToGraph(text);
  return parseOrmPyToGraph(text);
}

export default function App() {
  const [mode, setMode] = useState<QueryInputMode>('sql');
  const [text, setText] = useState<string>(EXAMPLE_SQL);
  const [direction, setDirection] = useState<'LR' | 'TB'>('LR');
  const [leftWidthPct, setLeftWidthPct] = useState<number>(45);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = (x / rect.width) * 100;
      const clamped = Math.min(80, Math.max(20, pct));
      setLeftWidthPct(clamped);
    }
    function onMouseUp() {
      if (isDragging) setIsDragging(false);
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  const graph = useMemo(() => buildGraph(mode, text), [mode, text]);

  const showFormat = mode === 'sql';

  return (
    <div className="App" style={{ height: '100vh', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <header className="header-gradient" style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 style={{ margin: 0, letterSpacing: 0.2 }}>SQL/ORM Query Visualizer</h2>
        <div style={{ flex: 1 }} />
        <ModeToggle mode={mode} onChange={(m) => {
          setMode(m);
          setText(m === 'sql' ? EXAMPLE_SQL : m === 'orm-js' ? EXAMPLE_ORM : EXAMPLE_SQLALCHEMY);
        }} />
        <DirectionToggle value={direction} onChange={setDirection} />
        <div style={{ width: 140, marginLeft: 8, display: 'flex', justifyContent: 'flex-end' }}>
          {showFormat ? (
            <button
              style={{ whiteSpace: 'nowrap', minWidth: 120, height: 36 }}
              onClick={() => setText((t) => { try { return format(t); } catch { return t; } })}
            >
              Format SQL
            </button>
          ) : (
            <div style={{ width: 120, height: 36 }} />
          )}
        </div>
      </header>

      <div ref={containerRef} style={{ flex: 1, padding: 16, paddingTop: 0, display: 'flex', gap: 0, minHeight: 0 }}>
        <div className="panel" style={{ width: `${leftWidthPct}%`, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 700, padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Query</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <CodeEditor value={text} onChange={setText} mode={mode} />
          </div>
        </div>

        <div
          className={isDragging ? 'resizer dragging' : 'resizer'}
          onMouseDown={() => setIsDragging(true)}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize editor and graph panels"
        />

        <div className="panel" style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 700 }}>Visualizer</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Direction: {direction}</div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <GraphView data={graph} direction={direction} />
          </div>
        </div>
      </div>

      <Insights data={graph} />

      {graph.errors && graph.errors.length > 0 && (
        <div style={{ padding: 12, color: '#b91c1c' }}>
          Error: {graph.errors[0]}
        </div>
      )}
    </div>
  );
}
