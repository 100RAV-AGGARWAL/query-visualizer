

interface Props {
  value: 'text' | 'graphical';
  onChange: (v: 'text' | 'graphical') => void;
}

export default function ASTViewToggle({ value, onChange }: Props) {
  return (
    <div className="segmented" role="tablist" aria-label="AST view type">
      <button
        role="tab"
        aria-selected={value === 'text'}
        className={value === 'text' ? 'seg-btn active' : 'seg-btn'}
        onClick={() => onChange('text')}
      >
        Text AST
      </button>
      <button
        role="tab"
        aria-selected={value === 'graphical'}
        className={value === 'graphical' ? 'seg-btn active' : 'seg-btn'}
        onClick={() => onChange('graphical')}
      >
        Graphical AST
      </button>
    </div>
  );
} 