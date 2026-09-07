import { useDeferredValue, useMemo, useState, type Dispatch } from 'react';
import { ATTRS, type Attr, type Material } from '../../data/types';
import { computeBed } from '../../model/stringbed';
import { bedInputFromSetup, solve, type SolveConstraints } from '../../model/solve';
import { TENSION_MAX, TENSION_MIN, type SetupState } from '../../state/hash';
import type { SetupAction } from '../../state/useSetup';
import { useI18n } from '../../i18n/useI18n';
import type { Key } from '../../i18n/en';
import './Solver.css';

export function Solver(props: {
  setup: SetupState;
  dispatch: Dispatch<SetupAction>;
  onGoLab: () => void;
}): JSX.Element {
  const { setup } = props;
  const { t } = useI18n();

  const current = useMemo(() => computeBed(bedInputFromSetup(setup)), [setup]);
  const [target] = useState(current);

  const constraints: SolveConstraints = useMemo(
    () => ({
      racketId: null,
      materials: [] as Material[],
      tensionRange: [TENSION_MIN, TENSION_MAX],
      allowHybrid: true,
    }),
    [],
  );

  const deferredTarget = useDeferredValue(target);
  const results = useMemo(() => solve(deferredTarget, constraints), [deferredTarget, constraints]);

  const labels = useMemo(
    () => Object.fromEntries(ATTRS.map((a) => [a, t(`attr.${a}` as Key)])) as Record<Attr, string>,
    [t],
  );

  return (
    <section>
      <div className="section-head">
        <h2>{t('solve.title')}</h2>
        <p>{t('solve.subtitle')}</p>
      </div>

      <div className="solve">
        <div className="panel solve__panel solve__inputs">
          <div className="eyebrow">{t('solve.targets')}</div>
        </div>

        <div className="panel solve__panel solve__results">
          <div className="solve-results__head">
            <span className="eyebrow">{t('solve.results')}</span>
            <span className="solve-results__count num">{t('solve.resultCount', { n: results.length })}</span>
          </div>
          {results.length === 0 && <p className="solve-empty">{t('solve.empty')}</p>}
          <ul className="solve-list">
            {results.map((c) => (
              <li key={`${c.racketId}|${c.mainsId}|${c.mainsGauge}|${c.crossesId}|${c.crossesGauge}|${c.mainsTension}`}>
                <span className="num">{Math.round(c.score)}</span> · {labels.power}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
