import { useMemo, useState, type Dispatch } from 'react';
import { rackets, racketFamilies } from '../../data';
import { ATTRS, type Attr, type Racket } from '../../data/types';
import type { SetupState } from '../../state/hash';
import type { SetupAction } from '../../state/useSetup';
import { useI18n } from '../../i18n/useI18n';
import { pick } from '../../i18n/l10n';
import type { Key } from '../../i18n/en';
import { AttrBars } from '../AttrBars/AttrBars';
import { useToast } from '../Toast/Toast';
import './Rackets.css';

type Brand = 'all' | 'Wilson' | 'Head';

export function Rackets(props: { setup: SetupState; dispatch: Dispatch<SetupAction>; onGoLab: () => void }): JSX.Element {
  const { setup, dispatch, onGoLab } = props;
  const { t, lang } = useI18n();
  const { show } = useToast();
  const [brand, setBrand] = useState<Brand>('all');
  const [family, setFamily] = useState<string | null>(null);

  const labels = useMemo(() => {
    const result = {} as Record<Attr, string>;
    for (const key of ATTRS) result[key] = t(`attr.${key}` as Key);
    return result;
  }, [t]);

  function selectBrand(b: Brand) {
    setBrand(b);
    setFamily(null);
  }

  function useRacket(r: Racket) {
    dispatch({ type: 'setRacket', id: r.id });
    show(t('toast.loadedRacket', { name: r.name }));
    onGoLab();
  }

  const families = brand === 'all' ? [] : racketFamilies(brand);
  const filtered = rackets.filter((r) => (brand === 'all' || r.brand === brand) && (family === null || r.family === family));

  return (
    <section>
      <div className="section-head">
        <h2>{t('rackets.title')}</h2>
        <p>{t('rackets.subtitle')}</p>
      </div>

      <div className="filters">
        <button type="button" className="filter" aria-pressed={brand === 'all'} onClick={() => selectBrand('all')}>
          {t('rackets.all')}
        </button>
        <button type="button" className="filter" aria-pressed={brand === 'Wilson'} onClick={() => selectBrand('Wilson')}>
          Wilson
        </button>
        <button type="button" className="filter" aria-pressed={brand === 'Head'} onClick={() => selectBrand('Head')}>
          Head
        </button>
      </div>

      {brand !== 'all' && (
        <div className="filters filters--sub">
          <button type="button" className="filter" aria-pressed={family === null} onClick={() => setFamily(null)}>
            {t('rackets.all')}
          </button>
          {families.map((f) => (
            <button key={f} type="button" className="filter" aria-pressed={family === f} onClick={() => setFamily(f)}>
              {f}
            </button>
          ))}
        </div>
      )}

      <div className="racket-grid">
        {filtered.map((r, i) => {
          const inUse = setup.racketId === r.id;
          return (
            <article
              key={r.id}
              className={`racket-card panel rise${inUse ? ' racket-card--active' : ''}`}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="racket-card__top">
                <div className="racket-card__badges">
                  <span className={`eyebrow brand-${r.brand.toLowerCase()}`}>{r.brand}</span>
                  <span className="chip">{r.family}</span>
                </div>
                {inUse && <span className="chip chip-accent">{t('rackets.inUse')}</span>}
              </div>

              <h3 className="racket-card__name">{r.name}</h3>

              <dl className="spec">
                <dt className="eyebrow">{t('rackets.headSize')}</dt>
                <dd className="num">{r.headSize} in²</dd>
                <dt className="eyebrow">{t('rackets.weight')}</dt>
                <dd className="num">{r.weightUnstrung} g</dd>
                <dt className="eyebrow">{t('rackets.balance')}</dt>
                <dd className="num">{r.balance}</dd>
                <dt className="eyebrow">{t('rackets.stiffness')}</dt>
                <dd className="num">RA {r.stiffness}</dd>
                <dt className="eyebrow">{t('rackets.pattern')}</dt>
                <dd className="num">
                  {r.pattern[0]}×{r.pattern[1]}
                </dd>
                <dt className="eyebrow">{t('rackets.beam')}</dt>
                <dd className="num">{r.beam}</dd>
                <dt className="eyebrow">{t('rackets.recTension')}</dt>
                <dd className="num">
                  {r.recTension[0]}–{r.recTension[1]} lb
                </dd>
              </dl>

              <div className="hairline" />

              <AttrBars values={r.attrs} labels={labels} compact />

              <p className="racket-card__blurb">{pick(r.blurb, lang)}</p>

              <div className="racket-card__footer">
                <button type="button" className={`btn btn-sm${inUse ? '' : ' btn-accent'}`} onClick={() => useRacket(r)}>
                  {t('rackets.useInLab')}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
