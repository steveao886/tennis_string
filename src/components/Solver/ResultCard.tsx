import { racketById, stringById } from '../../data';
import { ATTRS, type Attr, type Attrs } from '../../data/types';
import type { Candidate } from '../../model/solve';
import { formatTension, type Unit } from '../../model/units';
import { useI18n } from '../../i18n/useI18n';

const GAP_CHIP_THRESHOLD = 3;

function StringLine(props: { label: string; id: string; gauge: number }): JSX.Element {
  const s = stringById.get(props.id)!;
  return (
    <div className="solve-card__line">
      <span className="eyebrow">{props.label}</span>
      <span className="solve-card__string">
        {s.brand} {s.name} <span className="num">{props.gauge.toFixed(2)}</span> mm
      </span>
    </div>
  );
}

export function ResultCard(props: {
  candidate: Candidate;
  target: Attrs;
  labels: Record<Attr, string>;
  unit: Unit;
  onLoad: () => void;
}): JSX.Element {
  const { candidate: c, target, labels, unit, onLoad } = props;
  const { t } = useI18n();

  const racket = c.racketId ? racketById.get(c.racketId) : undefined;
  const same = c.mainsId === c.crossesId && c.mainsGauge === c.crossesGauge;

  return (
    <article className="solve-card panel">
      <div className="solve-card__head">
        <h3 className="solve-card__racket">{racket ? racket.name : t('solve.noRacket')}</h3>
        <span className="chip chip-accent solve-card__match">
          {t('solve.match')} <span className="num">{Math.round(c.score)}</span>
        </span>
      </div>

      <div className="solve-card__strings">
        {same ? (
          <StringLine label={t('solve.sameString')} id={c.mainsId} gauge={c.mainsGauge} />
        ) : (
          <>
            <StringLine label={t('solve.mains')} id={c.mainsId} gauge={c.mainsGauge} />
            <StringLine label={t('solve.crosses')} id={c.crossesId} gauge={c.crossesGauge} />
          </>
        )}
        <div className="solve-card__line">
          <span className="eyebrow">{t('solve.tension')}</span>
          <span className="num solve-card__tension">
            {formatTension(c.mainsTension, unit)} / {formatTension(c.crossesTension, unit)}
          </span>
        </div>
      </div>

      <div className="hairline" />

      <div className="solve-card__attrs">
        {ATTRS.map((a) => {
          const value = c.attrs[a];
          const gap = c.gaps[a];
          return (
            <div className="solve-attr" key={a}>
              <span className="solve-attr__label">{labels[a]}</span>
              <span
                className="solve-attr__track"
                role="meter"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={labels[a]}
              >
                <span className="solve-attr__fill" style={{ width: `${value}%` }} />
                <span className="solve-attr__tick" style={{ left: `${target[a]}%` }} title={t('solve.targetTick')} />
              </span>
              <span className="solve-attr__value num">{value}</span>
              {Math.abs(gap) > GAP_CHIP_THRESHOLD && (
                <span
                  className={gap > 0 ? 'solve-attr__gap solve-attr__gap--up' : 'solve-attr__gap solve-attr__gap--down'}
                >
                  {gap > 0 ? `+${gap}` : gap}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="solve-card__foot">
        <button type="button" className="btn btn-sm btn-accent" onClick={onLoad}>
          {t('solve.loadInLab')}
        </button>
      </div>
    </article>
  );
}
