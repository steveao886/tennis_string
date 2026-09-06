import { useEffect, useMemo, useState, type Dispatch } from 'react';
import { racketById, rackets, stringBrands, stringById, strings } from '../../data';
import { ATTRS, type Attr, type Material, type Racket, type TennisString } from '../../data/types';
import { computeBed, effectiveTension, type BedInput } from '../../model/stringbed';
import { buildInsights } from '../../model/insights';
import { formatTension } from '../../model/units';
import { useI18n, type I18n } from '../../i18n/useI18n';
import type { Key } from '../../i18n/en';
import { pick, type Lang } from '../../i18n/l10n';
import type { SetupState } from '../../state/hash';
import type { SetupAction } from '../../state/useSetup';
import { Select, type SelectGroup } from '../Select/Select';
import { Radar } from '../Radar/Radar';
import { AttrBars } from '../AttrBars/AttrBars';
import { InsightList } from '../InsightList/InsightList';
import { useToast } from '../Toast/Toast';
import { TensionBlock } from './TensionBlock';
import './Lab.css';

const RACKET_BRANDS: Racket['brand'][] = ['Wilson', 'Head'];

function materialChipClass(material: Material): string {
  if (material === 'poly') return 'chip chip-court';
  if (material === 'natural-gut') return 'chip chip-clay';
  return 'chip';
}

function StringHint(props: { s: TennisString; lang: Lang; t: I18n['t'] }): JSX.Element {
  const { s, lang, t } = props;
  return (
    <div className="lab-hint">
      <div className="lab-hint__chips">
        <span className={materialChipClass(s.material)}>{t(`material.${s.material}` as Key)}</span>
        <span className="chip">{t(`shape.${s.shape}` as Key)}</span>
      </div>
      <p className="lab-hint__blurb">{pick(s.blurb, lang)}</p>
    </div>
  );
}

function RacketHint(props: { r: Racket; lang: Lang }): JSX.Element {
  const { r, lang } = props;
  return (
    <div className="lab-hint">
      <div className="lab-hint__chips">
        <span className="chip">
          <span className="num">{r.headSize}</span> in²
        </span>
        <span className="chip">
          <span className="num">{r.weightUnstrung}</span> g
        </span>
        <span className="chip">
          RA <span className="num">{r.stiffness}</span>
        </span>
        <span className="chip">
          <span className="num">
            {r.pattern[0]}×{r.pattern[1]}
          </span>
        </span>
        <span className="chip">
          <span className="num">
            {r.recTension[0]}–{r.recTension[1]}
          </span>{' '}
          lb
        </span>
      </div>
      <p className="lab-hint__blurb">{pick(r.blurb, lang)}</p>
    </div>
  );
}

export function Lab(props: { setup: SetupState; dispatch: Dispatch<SetupAction> }): JSX.Element {
  const { setup, dispatch } = props;
  const { lang, t } = useI18n();
  const { show } = useToast();

  const mains = stringById.get(setup.mainsId)!;
  const crosses = stringById.get(setup.crossesId)!;
  const racket = setup.racketId ? racketById.get(setup.racketId) : undefined;

  const input: BedInput = useMemo(
    () => ({
      mains,
      crosses,
      mainsGauge: setup.mainsGauge,
      crossesGauge: setup.crossesGauge,
      mainsTension: setup.mainsTension,
      crossesTension: setup.crossesTension,
      racket,
    }),
    [mains, crosses, setup.mainsGauge, setup.crossesGauge, setup.mainsTension, setup.crossesTension, racket],
  );
  const bed = useMemo(() => computeBed(input), [input]);
  const insights = useMemo(() => buildInsights(input), [input]);
  const labels = useMemo(
    () => Object.fromEntries(ATTRS.map((a) => [a, t(`attr.${a}` as Key)])) as Record<Attr, string>,
    [t],
  );

  const [same, setSame] = useState(
    () => setup.crossesId === setup.mainsId && setup.crossesGauge === setup.mainsGauge,
  );

  useEffect(() => {
    if (!same) return;
    dispatch({ type: 'setCrosses', id: setup.mainsId });
    dispatch({ type: 'setCrossesGauge', gauge: setup.mainsGauge });
    // mirror mains -> crosses whenever mains changes while "same" is on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [same, setup.mainsId, setup.mainsGauge]);

  const racketGroups: SelectGroup<string>[] = useMemo(
    () => [
      { label: '', options: [{ value: '', label: t('lab.racketNone') }] },
      ...RACKET_BRANDS.map((brand) => ({
        label: brand,
        options: rackets.filter((r) => r.brand === brand).map((r) => ({ value: r.id, label: r.name })),
      })),
    ],
    [t],
  );

  const stringGroups: SelectGroup<string>[] = useMemo(
    () =>
      stringBrands.map((brand) => ({
        label: brand,
        options: strings.filter((s) => s.brand === brand).map((s) => ({ value: s.id, label: s.name })),
      })),
    [],
  );

  const gaugeGroups = (gauges: number[]): SelectGroup<number>[] => [
    { label: '', options: gauges.map((g) => ({ value: g, label: `${g} mm` })) },
  ];

  const effLb = effectiveTension(input);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      show(t('lab.shareCopied'));
    } catch {
      window.prompt('URL', window.location.href);
    }
  }

  return (
    <section className="lab">
      <div className="panel lab__panel lab__inputs">
        <div className="eyebrow">{t('lab.inputs')}</div>

        <Select
          id="racket"
          label={t('lab.racket')}
          value={setup.racketId ?? ''}
          onChange={(v) => dispatch({ type: 'setRacket', id: v || null })}
          groups={racketGroups}
          hint={racket ? <RacketHint r={racket} lang={lang} /> : undefined}
        />

        <div className="lab-string lab-block">
          <div className="lab-string__head">
            <span>{t('lab.mains')}</span>
            <span className="chip chip-accent">M</span>
          </div>
          <div className="lab-string__row">
            <Select
              id="mains"
              label={t('lab.mains')}
              value={setup.mainsId}
              onChange={(v) => dispatch({ type: 'setMains', id: v })}
              groups={stringGroups}
              hint={<StringHint s={mains} lang={lang} t={t} />}
            />
            <Select
              id="mains-gauge"
              label={t('lab.gauge')}
              value={setup.mainsGauge}
              onChange={(g) => dispatch({ type: 'setMainsGauge', gauge: g })}
              groups={gaugeGroups(mains.gauges)}
              compact
            />
          </div>
        </div>

        <div className="lab-string lab-block">
          <div className="lab-string__head">
            <span>{t('lab.crosses')}</span>
            <span className="chip chip-accent">X</span>
          </div>
          <label className="lab-checkbox">
            <input type="checkbox" checked={same} onChange={(e) => setSame(e.target.checked)} />
            {t('lab.sameAsMains')}
          </label>
          <div className={same ? 'lab-string__row lab-string__row--disabled' : 'lab-string__row'}>
            <Select
              id="crosses"
              label={t('lab.crosses')}
              value={setup.crossesId}
              onChange={(v) => dispatch({ type: 'setCrosses', id: v })}
              groups={stringGroups}
              hint={<StringHint s={crosses} lang={lang} t={t} />}
            />
            <Select
              id="crosses-gauge"
              label={t('lab.gauge')}
              value={setup.crossesGauge}
              onChange={(g) => dispatch({ type: 'setCrossesGauge', gauge: g })}
              groups={gaugeGroups(crosses.gauges)}
              compact
            />
          </div>
        </div>

        <TensionBlock setup={setup} dispatch={dispatch} racket={racket} t={t} />

        <div className="lab-actions lab-block">
          <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: 'reset' })}>
            {t('lab.reset')}
          </button>
          <button type="button" className="btn btn-accent" onClick={handleShare}>
            {t('lab.share')}
          </button>
        </div>
      </div>

      <div className="panel lab__panel lab__readout">
        <div className="lab-readout__head">
          <span className="eyebrow">{t('lab.readout')}</span>
          <span className="lab-readout__effective">
            {t('lab.effective')}{' '}
            <span className="num">
              {formatTension(effLb, 'lb')} · {formatTension(effLb, 'kg')}
            </span>
          </span>
        </div>

        <Radar values={bed} labels={labels} />

        <hr className="hairline" />
        <div className="eyebrow">{t('lab.attributes')}</div>
        <AttrBars values={bed} labels={labels} />

        <hr className="hairline" />
        <div className="eyebrow">{t('lab.insights')}</div>
        <InsightList insights={insights} lang={lang} emptyText={t('lab.noInsights')} />
      </div>
    </section>
  );
}
