import type { QueryInputMode } from '../types';
import clsx from 'clsx';

interface Props {
  mode: QueryInputMode;
  onChange: (m: QueryInputMode) => void;
}

export default function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="segmented" role="tablist" aria-label="Input mode">
      <button
        role="tab"
        aria-selected={mode === 'sql'}
        className={clsx('seg-btn', { active: mode === 'sql' })}
        onClick={() => onChange('sql')}
      >
        SQL
      </button>
      <button
        role="tab"
        aria-selected={mode === 'orm-js'}
        className={clsx('seg-btn', { active: mode === 'orm-js' })}
        onClick={() => onChange('orm-js')}
      >
        ORM (JS)
      </button>
      <button
        role="tab"
        aria-selected={mode === 'orm-py'}
        className={clsx('seg-btn', { active: mode === 'orm-py' })}
        onClick={() => onChange('orm-py')}
      >
        ORM (Python)
      </button>
    </div>
  );
} 