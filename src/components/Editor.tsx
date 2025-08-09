import Editor from '@monaco-editor/react';
import type { QueryInputMode } from '../types';

interface Props {
  value: string;
  onChange: (v: string) => void;
  mode: QueryInputMode;
}

export default function CodeEditor({ value, onChange, mode }: Props) {
  const language = mode === 'sql' ? 'sql' : mode === 'orm-js' ? 'javascript' : 'python';
  return (
    <div style={{ height: '100%', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        theme={window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'vs-dark' : 'vs-light'}
        value={value}
        options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, smoothScrolling: true, wordWrap: 'on', wrappingStrategy: 'advanced' }}
        onChange={(v) => onChange(v ?? '')}
      />
    </div>
  );
} 