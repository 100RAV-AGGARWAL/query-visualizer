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
    <div style={{ height: 300, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        theme="vs-light"
        value={value}
        options={{ fontSize: 14, minimap: { enabled: false } }}
        onChange={(v) => onChange(v ?? '')}
      />
    </div>
  );
} 