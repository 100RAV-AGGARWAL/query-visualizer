interface Props {
  value: 'LR' | 'TB';
  onChange: (v: 'LR' | 'TB') => void;
}

export default function DirectionToggle({ value, onChange }: Props) {
  return (
    <div className="segmented" role="tablist" aria-label="Graph direction">
      <button
        role="tab"
        aria-selected={value === 'LR'}
        className={value === 'LR' ? 'seg-btn active' : 'seg-btn'}
        onClick={() => onChange('LR')}
      >
        Left-Right
      </button>
      <button
        role="tab"
        aria-selected={value === 'TB'}
        className={value === 'TB' ? 'seg-btn active' : 'seg-btn'}
        onClick={() => onChange('TB')}
      >
        Top-Bottom
      </button>
    </div>
  );
} 