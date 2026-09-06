import type { Unit } from '../../model/units';
import { formatTension, lbToKg, roundHalf } from '../../model/units';
import './TensionSlider.css';

export function TensionSlider(props: {
  id: string;
  label: string;
  valueLb: number;
  unit: Unit;
  band?: [number, number] | null;
  bandLabel?: string;
  onChange: (lb: number) => void;
  min?: number;
  max?: number;
}): JSX.Element {
  const { id, label, valueLb, unit, band, bandLabel, onChange, min = 35, max = 70 } = props;

  const clamped = Math.min(max, Math.max(min, valueLb));
  const pct = ((clamped - min) / (max - min)) * 100;
  // Compensate the thumb-following bubble for the thumb's own width (22px) so it
  // stays centred on the thumb even at the extreme ends of the track.
  const bubbleLeft = `calc(${pct}% + ${(11 - pct * 0.22).toFixed(3)}px)`;

  const otherUnit: Unit = unit === 'lb' ? 'kg' : 'lb';
  const primaryValue = formatTension(clamped, unit);
  const secondaryValue = formatTension(clamped, otherUnit);
  const displayMin = unit === 'lb' ? `${min} lb` : `${roundHalf(lbToKg(min)).toFixed(1)} kg`;
  const displayMax = unit === 'lb' ? `${max} lb` : `${roundHalf(lbToKg(max)).toFixed(1)} kg`;

  const bandLeftPct = band ? ((band[0] - min) / (max - min)) * 100 : 0;
  const bandWidthPct = band ? ((band[1] - band[0]) / (max - min)) * 100 : 0;

  return (
    <div className="tension-slider">
      <div className="tension-slider__head">
        <label htmlFor={id} className="tension-slider__label">
          {label}
        </label>
        <span className="tension-slider__value num">
          {primaryValue} · {secondaryValue}
        </span>
      </div>

      <div className="tension-slider__control">
        <div className="tension-slider__track">
          {band && (
            <div
              className="tension-slider__band"
              style={{ left: `${bandLeftPct}%`, width: `${bandWidthPct}%` }}
            />
          )}
          <div className="tension-slider__fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="tension-slider__bubble num" style={{ left: bubbleLeft }}>
          {primaryValue}
        </div>

        <input
          id={id}
          className="tension-slider__input"
          type="range"
          min={min}
          max={max}
          step={1}
          value={clamped}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={primaryValue}
        />

        {band && bandLabel && (
          <div className="tension-slider__band-label num" style={{ left: `${bandLeftPct}%` }}>
            {bandLabel}
          </div>
        )}
      </div>

      <div className="tension-slider__foot">
        <span className="num">{displayMin}</span>
        <span className="num">{displayMax}</span>
      </div>
    </div>
  );
}
