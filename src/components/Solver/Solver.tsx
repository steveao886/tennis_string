import { useCallback, useDeferredValue, useMemo, useState, type Dispatch } from 'react';
import { racketById, stringById } from '../../data';
import { ATTRS, type Attr, type Attrs } from '../../data/types';
import { computeBed } from '../../model/stringbed';
import { bedInputFromSetup, solve, type Candidate, type SolveConstraints } from '../../model/solve';
import { TENSION_MAX, TENSION_MIN, type SetupState } from '../../state/hash';
import type { SetupAction } from '../../state/useSetup';
import { useI18n } from '../../i18n/useI18n';
import type { Key } from '../../i18n/en';
import { useToast } from '../Toast/Toast';
import { Constraints } from './Constraints';
import { ResultCard } from './ResultCard';
import { buildLoadActions } from './load';
import { TargetSliders } from './TargetSliders';
import './Solver.css';

const STORAGE = 'tsh.solve';

function loadTarget(): Attrs | null {
  try {
    const raw = sessionStorage.getItem(STORAGE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Record<Attr, unknown>>;
    const out = {} as Attrs;
    for (const a of ATTRS) {
      const v = parsed[a];
      if (typeof v !== 'number' || !Number.isFinite(v)) return null;
      out[a] = Math.max(0, Math.min(100, Math.round(v)));
    }
    return out;
  } catch {
    return null;
  }
}

function saveTarget(t: Attrs): void {
  try {
    sessionStorage.setItem(STORAGE, JSON.stringify(t));
  } catch {
    /* ignore */
  }
}

export function Solver(props: {
  setup: SetupState;
  dispatch: Dispatch<SetupAction>;
  onGoLab: () => void;
}): JSX.Element {
  const { setup } = props;
  const { t } = useI18n();
  const { show } = useToast();

  const current = useMemo(() => computeBed(bedInputFromSetup(setup)), [setup]);
  const [target, setTargetState] = useState<Attrs>(() => loadTarget() ?? current);

  const setTarget = useCallback((next: Attrs) => {
    setTargetState(next);
    saveTarget(next);
  }, []);

  const [constraints, setConstraints] = useState<SolveConstraints>({
    racketId: null,
    materials: [],
    tensionRange: [TENSION_MIN, TENSION_MAX],
    allowHybrid: true,
  });

  const racket = setup.racketId ? racketById.get(setup.racketId) : undefined;

  // Drop a lock that points at a racket the Lab no longer has selected.
  const effective: SolveConstraints = useMemo(
    () =>
      constraints.racketId && constraints.racketId !== setup.racketId
        ? { ...constraints, racketId: setup.racketId }
        : constraints,
    [constraints, setup.racketId],
  );

  const deferredTarget = useDeferredValue(target);
  const deferredConstraints = useDeferredValue(effective);
  const results = useMemo(
    () => solve(deferredTarget, deferredConstraints),
    [deferredTarget, deferredConstraints],
  );

  const labels = useMemo(
    () => Object.fromEntries(ATTRS.map((a) => [a, t(`attr.${a}` as Key)])) as Record<Attr, string>,
    [t],
  );

  function loadCandidate(c: Candidate) {
    for (const action of buildLoadActions(c)) props.dispatch(action);
    const chosen = c.racketId ? racketById.get(c.racketId) : undefined;
    show(chosen ? t('toast.loadedRacket', { name: chosen.name }) : stringById.get(c.mainsId)!.name);
    props.onGoLab();
  }

  return (
    <section>
      <div className="section-head">
        <h2>{t('solve.title')}</h2>
        <p>{t('solve.subtitle')}</p>
      </div>

      <div className="solve">
        <div className="panel solve__panel solve__inputs">
          <div className="solve-inputs__head">
            <span className="eyebrow">{t('solve.targets')}</span>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setTarget(current)}>
              {t('solve.fromCurrent')}
            </button>
          </div>
          <TargetSliders value={target} labels={labels} onChange={setTarget} />

          <Constraints
            value={effective}
            racketId={setup.racketId}
            racketName={racket?.name ?? null}
            unit={setup.unit}
            onChange={setConstraints}
          />
        </div>

        <div className="panel solve__panel solve__results">
          <div className="solve-results__head">
            <span className="eyebrow">{t('solve.results')}</span>
            <span className="solve-results__count num">{t('solve.resultCount', { n: results.length })}</span>
          </div>
          {results.length === 0 && <p className="solve-empty">{t('solve.empty')}</p>}
          <div className="solve-list">
            {results.map((c, i) => (
              <div
                key={`${c.racketId}|${c.mainsId}|${c.mainsGauge}|${c.crossesId}|${c.crossesGauge}|${c.mainsTension}`}
                className="rise"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <ResultCard
                  candidate={c}
                  target={target}
                  labels={labels}
                  unit={setup.unit}
                  onLoad={() => loadCandidate(c)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
