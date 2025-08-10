import { useRef, useState, useEffect } from 'react';
import './App.css';
import type { ParsedQuery, QueryInputMode } from './types';
import ModeToggle from './components/ModeToggle';
import DirectionToggle from './components/DirectionToggle';
import CodeEditor from './components/Editor';
import GraphView from './components/GraphView';
import ASTTree from './components/ASTTree';
import GraphicalAST from './components/GraphicalAST';
import ASTViewToggle from './components/ASTViewToggle';
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



export default function App() {
  const [text, setText] = useState(EXAMPLE_SQL);
  const [mode, setMode] = useState<QueryInputMode>('sql');
  const [direction, setDirection] = useState<'LR' | 'TB'>('LR');
  const [astViewType, setAstViewType] = useState<'text' | 'graphical'>('text');
  const [leftWidthPct, setLeftWidthPct] = useState(40);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingMiddle, setIsDraggingMiddle] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const showFormat = mode === 'sql';
  const parsed: ParsedQuery = (() => {
    try {
      if (mode === 'sql') return parseSqlToGraph(text);
      if (mode === 'orm-js') return parseOrmJsToGraph(text);
      if (mode === 'orm-py') return parseOrmPyToGraph(text);
      return parseSqlToGraph(text);
    } catch {
      return { rootId: 'root:error', nodes: [{ id: 'root:error', label: 'Parse error', kind: 'select' }], edges: [] };
    }
  })();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidthPct(Math.max(20, Math.min(60, newLeftWidth)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingMiddle || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newMiddleWidth = ((e.clientX - rect.left) / rect.width) * 100;
      const newMiddleWidthPct = Math.max(25, Math.min(50, newMiddleWidth));
      // Adjust left panel to maintain proportions
      const remainingWidth = 100 - newMiddleWidthPct;
      setLeftWidthPct(Math.max(20, Math.min(40, remainingWidth * 0.6)));
    };

    const handleMouseUp = () => {
      setIsDraggingMiddle(false);
    };

    if (isDraggingMiddle) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingMiddle]);

  return (
    <div className="App" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Query Visualizer
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ModeToggle mode={mode} onChange={(m) => {
              setMode(m);
              setText(m === 'sql' ? EXAMPLE_SQL : m === 'orm-js' ? EXAMPLE_ORM : EXAMPLE_SQLALCHEMY);
            }} />
            <DirectionToggle value={direction} onChange={setDirection} />
            {showFormat && (
              <button
                style={{ 
                  whiteSpace: 'nowrap', 
                  minWidth: 100, 
                  height: 32,
                  padding: '0 12px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.2)',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  color: '#e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onClick={() => setText((t) => { try { return format(t); } catch { return t; } })}
              >
                Format SQL
              </button>
            )}
          </div>
        </div>
      </header>
      
      <div 
        ref={containerRef}
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '8px',
          gap: '8px'
        }}
      >
        {/* Top Row - Query Editor and Graph View */}
        <div style={{ 
          display: 'flex', 
          height: '60%',
          gap: '8px'
        }}>
          {/* Left Panel - Query Editor */}
          <div className="panel" style={{ width: `${leftWidthPct}%`, minWidth: 280 }}>
            <div style={{ 
              padding: '8px 12px', 
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              fontSize: 12,
              fontWeight: 500,
              color: '#9ca3af'
            }}>
              Query Editor
            </div>
            <div style={{ height: 'calc(100% - 40px)', padding: '8px' }}>
              <CodeEditor value={text} onChange={setText} mode={mode} />
            </div>
          </div>
          
          {/* First Resizer */}
          <div 
            className="resizer"
            onMouseDown={() => setIsDragging(true)}
          />
          
          {/* Right Panel - Graph View */}
          <div className="panel" style={{ flex: 1, minWidth: 280 }}>
            <div style={{ 
              padding: '8px 12px', 
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              fontSize: 12,
              fontWeight: 500,
              color: '#9ca3af'
            }}>
              Graph View
            </div>
            <div style={{ height: 'calc(100% - 40px)', padding: '8px' }}>
              <GraphView data={parsed} direction={direction} />
            </div>
          </div>
        </div>
        
        {/* Bottom Row - AST Structure (100% width) */}
        <div className="panel" style={{ height: '40%' }}>
          <div style={{ 
            padding: '8px 12px', 
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af' }}>AST Structure</span>
            <ASTViewToggle value={astViewType} onChange={setAstViewType} />
          </div>
          <div style={{ height: 'calc(100% - 40px)', padding: '8px' }}>
            {astViewType === 'text' ? (
              <ASTTree data={parsed} />
            ) : (
              <GraphicalAST data={parsed} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
