import { useState } from 'react';
import { strings } from '../../data';
import type { Material } from '../../data/types';
import type { SolveConstraints } from '../../model/solve';
import { formatTension, type Unit } from '../../model/units';
import { TENSION_MAX, TENSION_MIN } from '../../state/hash';
import { useI18n } from '../../i18n/useI18n';
import type { Key } from '../../i18n/en';

/** Only offer materials the catalogue actually contains. */
const MATERIALS: Material[] = [...new Set(strings.map((s) => s.material))];

export function Constraints(props: {
  value: SolveConstraints;
  unit: Unit;
  /** The Lab's current racket id, independent of whether the lock is on. */
  racketId: string | null;
  /** Name of the Lab's current racket, or null when none is chosen. */
  racketName: string | null;
  onChange: (next: SolveConstraints) => void;
}): JSX.Element {
  const { value, unit, racketId, racketName, onChange } = props;
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  function toggleMaterial(m: Material) {
    const next = value.materials.includes(m)
      ? value.materials.filter((x) => x !== m)
      : [...value.materials, m];
    onChange({ ...value, materials: next });
  }

  function setFrom(lb: number) {
    onChange({ ...value, tensionRange: [Math.min(lb, value.tensionRange[1]), value.tensionRange[1]] });
  }

  function setTo(lb: number) {
    onChange({ ...value, tensionRange: [value.tensionRange[0], Math.max(lb, value.tensionRange[0])] });
  }

  return (
    <div className="solve-constraints">
      <button
        type="button"
        className="btn btn-sm btn-ghost solve-constraints__toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? t('solve.hideConstraints') : t('solve.showConstraints')}
      </button>

      {open && (
        <div className="solve-constraints__body">
          <label className={racketName ? 'solve-check' : 'solve-check solve-check--disabled'}>
            <input
              type="checkbox"
              checked={value.racketId !== null}
              disabled={racketName === null}
              onChange={(e) => onChange({ ...value, racketId: e.target.checked ? racketId : null })}
            />
            <span>
              {t('solve.lockRacket')}
              <span className="solve-check__hint">{racketName ?? t('solve.lockRacketHint')}</span>
            </span>
          </label>

          <div className="solve-field">
            <div className="eyebrow">{t('solve.materials')}</div>
            <div className="filters filters--sub">
              <button
                type="button"
                className="filter"
                aria-pressed={value.materials.length === 0}
                onClick={() => onChange({ ...value, materials: [] })}
              >
                {t('solve.materialsAll')}
              </button>
              {MATERIALS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="filter"
                  aria-pressed={value.materials.includes(m)}
                  onClick={() => toggleMaterial(m)}
                >
                  {t(`material.${m}` as Key)}
                </button>
              ))}
            </div>
          </div>

          <div className="solve-field">
            <div className="solve-field__head">
              <span className="eyebrow">{t('solve.tensionRange')}</span>
              <span className="num solve-field__value">
                {formatTension(value.tensionRange[0], unit)} – {formatTension(value.tensionRange[1], unit)}
              </span>
            </div>
            <label className="sr-only" htmlFor="solve-range-from">
              {t('solve.rangeFrom')}
            </label>
            <input
              id="solve-range-from"
              className="solve-target__input"
              type="range"
              min={TENSION_MIN}
              max={TENSION_MAX}
              step={1}
              value={value.tensionRange[0]}
              onChange={(e) => setFrom(Number(e.target.value))}
            />
            <label className="sr-only" htmlFor="solve-range-to">
              {t('solve.rangeTo')}
            </label>
            <input
              id="solve-range-to"
              className="solve-target__input"
              type="range"
              min={TENSION_MIN}
              max={TENSION_MAX}
              step={1}
              value={value.tensionRange[1]}
              onChange={(e) => setTo(Number(e.target.value))}
            />
          </div>

          <label className="solve-check">
            <input
              type="checkbox"
              checked={value.allowHybrid}
              onChange={(e) => onChange({ ...value, allowHybrid: e.target.checked })}
            />
            <span>
              {t('solve.allowHybrid')}
              <span className="solve-check__hint">{t('solve.allowHybridHint')}</span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
