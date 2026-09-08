import { useMemo, useState } from 'react';
import { racketById, stringById } from '../../data';
import { ATTRS, type Attr } from '../../data/types';
import { computeBed } from '../../model/stringbed';
import { formatTension, type Unit } from '../../model/units';
import { estimateDue, latestJob, todayISO, type BagRacket, type DueStatus, type StringJob } from '../../state/bag';
import { useI18n } from '../../i18n/useI18n';
import type { Key } from '../../i18n/en';
import { AttrBars } from '../AttrBars/AttrBars';
import { JobForm } from './JobForm';
import { RacketForm } from './RacketForm';

const STATUS_KEY: Record<DueStatus, Key> = {
  fresh: 'bag.statusFresh',
  due: 'bag.statusDue',
  overdue: 'bag.statusOverdue',
};

function Meter(props: { label: string; text: string; ratio: number; warn: boolean }): JSX.Element {
  const { label, text, ratio, warn } = props;
  const pct = Math.min(100, Math.max(0, ratio * 100));
  return (
    <div className="bag-meter">
      <span className="bag-meter__label eyebrow">{label}</span>
      <span className="bag-meter__track" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <span className={`bag-meter__fill${warn ? ' bag-meter__fill--warn' : ''}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="bag-meter__text num">{text}</span>
    </div>
  );
}

export function BagCard(props: {
  racket: BagRacket;
  unit: Unit;
  index: number;
  onUpdate: (r: BagRacket) => void;
  onRemove: () => void;
  onAddJob: (job: StringJob) => void;
  onRemoveJob: (jobId: string) => void;
  onLoad: (job: StringJob) => void;
}): JSX.Element {
  const { racket, unit, index, onUpdate, onRemove, onAddJob, onRemoveJob, onLoad } = props;
  const { t } = useI18n();
  const [logging, setLogging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const frame = racketById.get(racket.racketId)!;
  const job = latestJob(racket);

  const labels = useMemo(
    () => Object.fromEntries(ATTRS.map((a) => [a, t(`attr.${a}` as Key)])) as Record<Attr, string>,
    [t],
  );

  const bed = useMemo(() => {
    if (!job) return null;
    const mains = stringById.get(job.mainsId);
    const crosses = stringById.get(job.crossesId);
    if (!mains || !crosses) return null;
    return computeBed({
      mains,
      crosses,
      mainsGauge: job.mainsGauge,
      crossesGauge: job.crossesGauge,
      mainsTension: job.mainsTension,
      crossesTension: job.crossesTension,
      racket: frame,
    });
  }, [job, frame]);

  const due = job ? estimateDue(job, racket.hoursPerWeek, todayISO()) : null;

  const jobLine = (j: StringJob): string => {
    const mains = stringById.get(j.mainsId);
    const crosses = stringById.get(j.crossesId);
    const same = j.mainsId === j.crossesId && j.mainsGauge === j.crossesGauge;
    const m = `${mains?.brand ?? ''} ${mains?.name ?? j.mainsId} ${j.mainsGauge.toFixed(2)}`;
    if (same) return m;
    return `${m} / ${crosses?.brand ?? ''} ${crosses?.name ?? j.crossesId} ${j.crossesGauge.toFixed(2)}`;
  };

  const tensionLine = (j: StringJob): string =>
    j.mainsTension === j.crossesTension
      ? formatTension(j.mainsTension, unit)
      : `${formatTension(j.mainsTension, unit)} / ${formatTension(j.crossesTension, unit)}`;

  if (editing) {
    return (
      <article className="bag-card panel">
        <RacketForm
          initial={racket}
          onSubmit={(r) => {
            onUpdate(r);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </article>
    );
  }

  return (
    <article className="bag-card panel rise" style={{ animationDelay: `${index * 40}ms` }}>
      <div className="bag-card__top">
        <div className="bag-card__badges">
          <span className={`eyebrow brand-${frame.brand.toLowerCase()}`}>{frame.brand}</span>
          <span className="chip">{frame.family}</span>
        </div>
        {due && (
          <span className={`bag-status bag-status--${due.status}`}>{t(STATUS_KEY[due.status])}</span>
        )}
      </div>

      <h3 className="bag-card__name">{racket.nickname}</h3>
      <p className="bag-card__frame muted">{frame.name}</p>

      <dl className="bag-card__spec">
        <dt className="eyebrow">{t('rackets.headSize')}</dt>
        <dd className="num">{frame.headSize} in²</dd>
        <dt className="eyebrow">{t('rackets.weight')}</dt>
        <dd className="num">{frame.weightUnstrung} g</dd>
        <dt className="eyebrow">{t('rackets.balance')}</dt>
        <dd className="num">{frame.balance}</dd>
        <dt className="eyebrow">{t('rackets.stiffness')}</dt>
        <dd className="num">RA {frame.stiffness}</dd>
        <dt className="eyebrow">{t('rackets.pattern')}</dt>
        <dd className="num">
          {frame.pattern[0]}×{frame.pattern[1]}
        </dd>
        <dt className="eyebrow">{t('rackets.recTension')}</dt>
        <dd className="num">
          {frame.recTension[0]}–{frame.recTension[1]} lb
        </dd>
        <dt className="eyebrow">{t('bag.hoursPerWeek')}</dt>
        <dd className="num">
          {racket.hoursPerWeek} {t('bag.hoursUnit')}
        </dd>
      </dl>

      <div className="hairline" />

      {job && due ? (
        <>
          <div className="bag-current">
            <div className="eyebrow">{t('bag.current')}</div>
            <p className="bag-current__strings">{jobLine(job)}</p>
            <p className="bag-current__meta num">
              {tensionLine(job)} · {job.strungOn}
            </p>
            {job.note && <p className="bag-current__note muted">{job.note}</p>}
          </div>

          <div className="bag-due">
            <p className="bag-due__headline">
              {t('bag.dueOn', { date: due.dueDate })}{' '}
              <span className="muted">{t('bag.dueBasis', { hours: racket.hoursPerWeek })}</span>
            </p>
            <Meter
              label={t('bag.playClock')}
              text={t('bag.hoursOf', { used: Math.round(due.playHours), limit: due.playLimit })}
              ratio={due.playHours / due.playLimit}
              warn={due.binding === 'play'}
            />
            <Meter
              label={t('bag.calendarClock')}
              text={t('bag.daysOf', { used: due.daysElapsed, limit: due.dayLimit })}
              ratio={due.daysElapsed / due.dayLimit}
              warn={due.binding === 'calendar'}
            />
            <p className="bag-due__note muted">
              {due.binding === 'play' ? t('bag.bindingPlay') : t('bag.bindingCalendar')}
            </p>
          </div>

          {bed && (
            <>
              <div className="hairline" />
              <div className="eyebrow bag-card__attrs-head">{t('bag.attrs')}</div>
              <AttrBars values={bed} labels={labels} compact />
            </>
          )}
        </>
      ) : (
        <div className="bag-empty-job">
          <p>{t('bag.noJob')}</p>
          <p className="muted">{t('bag.noJobHint')}</p>
        </div>
      )}

      {logging ? (
        <JobForm
          preset={job}
          onSubmit={(j) => {
            onAddJob(j);
            setLogging(false);
          }}
          onCancel={() => setLogging(false)}
        />
      ) : (
        <div className="bag-card__actions">
          <button type="button" className="btn btn-accent btn-sm" onClick={() => setLogging(true)}>
            {t('bag.newJob')}
          </button>
          {job && (
            <button type="button" className="btn btn-sm" onClick={() => onLoad(job)}>
              {t('bag.loadInLab')}
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
            {t('bag.editRacket')}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm bag-card__danger"
            onClick={() => {
              if (window.confirm(t('bag.confirmRemoveRacket', { name: racket.nickname }))) onRemove();
            }}
          >
            {t('bag.removeRacket')}
          </button>
        </div>
      )}

      {racket.jobs.length > 1 && (
        <div className="bag-history">
          <button type="button" className="bag-history__toggle" onClick={() => setShowHistory((v) => !v)}>
            {t('bag.history')} <span className="num">({racket.jobs.length})</span>
          </button>
          {showHistory && (
            <ul className="bag-history__list">
              {racket.jobs.slice(1).map((j) => (
                <li key={j.id} className="bag-history__row">
                  <span className="bag-history__date num">{j.strungOn}</span>
                  <span className="bag-history__strings">{jobLine(j)}</span>
                  <span className="bag-history__tension num">{tensionLine(j)}</span>
                  <button
                    type="button"
                    className="bag-history__remove"
                    aria-label={t('bag.removeJob')}
                    title={t('bag.removeJob')}
                    onClick={() => onRemoveJob(j.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}
