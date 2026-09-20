import { BED_ATTRS, type BedAttr, type BedAttrs } from '../../model/stringbed';

export function TargetSliders(props: {
  value: BedAttrs;
  labels: Record<BedAttr, string>;
  onChange: (next: BedAttrs) => void;
}): JSX.Element {
  const { value, labels, onChange } = props;

  return (
    <div className="solve-targets">
      {BED_ATTRS.map((a) => (
        <div className="solve-target" key={a}>
          <label className="solve-target__label" htmlFor={`target-${a}`}>
            {labels[a]}
          </label>
          <input
            id={`target-${a}`}
            className="solve-target__input"
            type="range"
            min={0}
            max={100}
            step={1}
            value={value[a]}
            onChange={(e) => onChange({ ...value, [a]: Number(e.target.value) })}
          />
          <span className="solve-target__value num">{value[a]}</span>
        </div>
      ))}
    </div>
  );
}
