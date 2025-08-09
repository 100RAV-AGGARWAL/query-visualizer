import { useMemo, useState } from 'react';
import './App.css';
import type { ParsedQuery, QueryInputMode } from './types';
import ModeToggle from './components/ModeToggle';
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

  const graph = useMemo(() => buildGraph(mode, text), [mode, text]);

  return (
    <div className="App" style={{ height: '100vh', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px' }}>
        <h2 style={{ margin: 0 }}>SQL/ORM Query Visualizer</h2>
        <div style={{ flex: 1 }} />
        <ModeToggle mode={mode} onChange={(m) => {
          setMode(m);
          setText(m === 'sql' ? EXAMPLE_SQL : m === 'orm-js' ? EXAMPLE_ORM : EXAMPLE_SQLALCHEMY);
        }} />
        <select value={direction} onChange={(e) => setDirection(e.target.value as any)} style={{ marginLeft: 8 }}>
          <option value="LR">Left-Right</option>
          <option value="TB">Top-Bottom</option>
        </select>
        {mode === 'sql' && (
          <button
            onClick={() => setText((t) => {
              try { return format(t); } catch { return t; }
            })}
            style={{ marginLeft: 8 }}
          >
            Format SQL
          </button>
        )}
      </header>

      <div style={{ padding: '0 16px' }}>
        <CodeEditor value={text} onChange={setText} mode={mode} />
      </div>

      <div style={{ flex: 1, padding: 16 }}>
        <GraphView data={graph} direction={direction} />
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
