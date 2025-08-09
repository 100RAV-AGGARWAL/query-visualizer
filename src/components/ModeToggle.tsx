import React from 'react';
import type { QueryInputMode } from '../types';
import clsx from 'clsx';

interface Props {
  mode: QueryInputMode;
  onChange: (m: QueryInputMode) => void;
}

export default function ModeToggle({ mode, onChange }: Props) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
      <button
        className={clsx('toggle-btn', { active: mode === 'sql' })}
        onClick={() => onChange('sql')}
        style={btnStyle(mode === 'sql')}
      >
        SQL
      </button>
      <button
        className={clsx('toggle-btn', { active: mode === 'orm-js' })}
        onClick={() => onChange('orm-js')}
        style={btnStyle(mode === 'orm-js')}
      >
        ORM (JS)
      </button>
      <button
        className={clsx('toggle-btn', { active: mode === 'orm-py' })}
        onClick={() => onChange('orm-py')}
        style={btnStyle(mode === 'orm-py')}
      >
        ORM (Python)
      </button>
    </div>
  );
}

function btnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '8px 12px',
    background: active ? '#111827' : '#fff',
    color: active ? '#fff' : '#111827',
    border: 'none',
    cursor: 'pointer',
  };
} 