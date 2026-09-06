import { Fragment, type ReactNode } from 'react';
import './Select.css';

export interface SelectOption<T> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectGroup<T> {
  label: string;
  options: SelectOption<T>[];
}

export function Select<T extends string | number>(props: {
  id: string;
  label: string;
  value: T;
  onChange: (v: T) => void;
  groups: SelectGroup<T>[];
  hint?: ReactNode;
  compact?: boolean;
  hideLabel?: boolean;
  disabled?: boolean;
}): JSX.Element {
  const { id, label, value, onChange, groups, hint, compact, hideLabel, disabled } = props;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const raw = e.target.value;
    onChange((typeof value === 'number' ? Number(raw) : raw) as T);
  }

  return (
    <div className={disabled ? 'select-field select-field--disabled' : 'select-field'}>
      <label htmlFor={id} className={hideLabel ? 'select-field__label sr-only' : 'select-field__label'}>
        {label}
      </label>
      <select
        id={id}
        className={compact ? 'select-field__control select-field__control--compact' : 'select-field__control'}
        value={value}
        onChange={handleChange}
        disabled={disabled}
      >
        {groups.map((group, gi) =>
          group.label ? (
            <optgroup key={gi} label={group.label}>
              {group.options.map((opt) => (
                <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))}
            </optgroup>
          ) : (
            <Fragment key={gi}>
              {group.options.map((opt) => (
                <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))}
            </Fragment>
          ),
        )}
      </select>
      {hint && <div className="select-hint">{hint}</div>}
    </div>
  );
}
