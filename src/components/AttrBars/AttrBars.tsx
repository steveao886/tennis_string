import type { Attr, Attrs } from '../../data/types';
import { ATTRS } from '../../data/types';
import './AttrBars.css';

function levelClass(v: number): 'lvl-hi' | 'lvl-mid' | 'lvl-lo' {
  if (v >= 70) return 'lvl-hi';
  if (v >= 40) return 'lvl-mid';
  return 'lvl-lo';
}

export function AttrBars(props: { values: Attrs; labels: Record<Attr, string>; compact?: boolean }): JSX.Element {
  const { values, labels, compact } = props;
  const rootClass = ['attr-bars', compact ? 'attr-bars--compact' : ''].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      {ATTRS.map((k) => {
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
