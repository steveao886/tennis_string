import './AttrBars.css';

function levelClass(v: number): 'lvl-hi' | 'lvl-mid' | 'lvl-lo' {
  if (v >= 70) return 'lvl-hi';
  if (v >= 40) return 'lvl-mid';
  return 'lvl-lo';
}

/**
 * Generic over the key set so the same bars render a racket's six authored
 * attributes and a bed's seven computed ones.
 */
export function AttrBars<K extends string>(props: {
  keys: readonly K[];
  values: Record<K, number>;
  labels: Record<K, string>;
  compact?: boolean;
}): JSX.Element {
  const { keys, values, labels, compact } = props;
  const rootClass = ['attr-bars', compact ? 'attr-bars--compact' : ''].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      {keys.map((k) => {
        const v = Math.max(0, Math.min(100, values[k]));
        const label = labels[k];
        return (
          <div className="attr-bars__row" key={k}>
            <span className="attr-bars__label">{label}</span>
            <span
              className="attr-bars__track"
              role="meter"
              aria-valuenow={v}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={label}
            >
              <span className={`attr-bars__fill ${levelClass(v)}`} style={{ width: `${v}%` }} />
            </span>
            <span className="attr-bars__value num">{Math.round(v)}</span>
          </div>
        );
      })}
    </div>
  );
}
