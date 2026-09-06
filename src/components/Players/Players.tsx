import { useState, type Dispatch } from 'react';
import { players } from '../../data';
import type { Player } from '../../data';
import type { SetupAction } from '../../state/useSetup';
import { useI18n } from '../../i18n/useI18n';
import { pick } from '../../i18n/l10n';
import { formatTension } from '../../model/units';
import { useToast } from '../Toast/Toast';
import { resolvePlayerStrings } from './resolve';
import './Players.css';

type Tour = 'all' | Player['tour'];

const TOUR_CHIP: Record<Player['tour'], string> = { ATP: 'chip-court', WTA: 'chip-clay', Legend: 'chip-accent' };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function hashHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

function flagEmoji(cc: string): string {
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function Players(props: { dispatch: Dispatch<SetupAction>; onGoLab: () => void }): JSX.Element {
  const { dispatch, onGoLab } = props;
  const { t, lang } = useI18n();
  const { show } = useToast();
  const [tour, setTour] = useState<Tour>('all');

  const tourLabel = (tr: Player['tour']): string =>
    tr === 'ATP' ? t('players.atp') : tr === 'WTA' ? t('players.wta') : t('players.legends');

  function handleLoad(p: Player) {
    const r = resolvePlayerStrings(p);
    dispatch({ type: 'loadPlayer', player: p, mainsId: r.mainsId, crossesId: r.crossesId });
    show(t('toast.loadedPlayer', { name: lang === 'zh' ? p.nameZh : p.name }));
    for (const s of r.substitutions) {
      show(t('players.substituted', { name: s.wanted, sub: `${s.got.brand} ${s.got.name}` }));
    }
    onGoLab();
  }

  const filtered = tour === 'all' ? players : players.filter((p) => p.tour === tour);

  return (
    <section>
      <div className="section-head">
        <h2>{t('players.title')}</h2>
        <p>{t('players.subtitle')}</p>
      </div>

      <div className="players-note">
        <span className="players-note__icon">!</span>
        <p>{t('players.disclaimer')}</p>
      </div>

      <div className="player-filters">
        {(['all', 'ATP', 'WTA', 'Legend'] as Tour[]).map((tr) => (
          <button key={tr} type="button" className="filter" aria-pressed={tour === tr} onClick={() => setTour(tr)}>
            {tr === 'all' ? t('players.all') : tourLabel(tr)}
          </button>
        ))}
      </div>

      <div className="player-grid">
        {filtered.map((p, i) => {
          const sameTension = p.tension.mains === p.tension.crosses;
          const tensionLb = sameTension
            ? formatTension(p.tension.mains, 'lb')
            : `${formatTension(p.tension.mains, 'lb')} / ${formatTension(p.tension.crosses, 'lb')}`;
          const tensionKg = sameTension
            ? formatTension(p.tension.mains, 'kg')
            : `${formatTension(p.tension.mains, 'kg')} / ${formatTension(p.tension.crosses, 'kg')}`;

          return (
            <article key={p.id} className="player-card panel rise" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="player-card__head">
                <div className="player-avatar" style={{ background: `hsl(${hashHue(p.id)} 55% 62%)` }}>
                  {initials(p.name)}
                </div>
                <div className="player-card__id">
                  <div className="player-card__name">{lang === 'zh' ? `${p.nameZh} · ${p.name}` : p.name}</div>
                  <div className="player-card__sub">
                    <span className="player-card__flag">{flagEmoji(p.country)}</span>
                    <span className={`chip ${TOUR_CHIP[p.tour]}`}>{tourLabel(p.tour)}</span>
                  </div>
                </div>
              </div>

              <dl className="player-spec">
                <dt className="eyebrow">{t('players.racket')}</dt>
                <dd>
                  <span className="player-spec__row">{p.racket.label}</span>
                  {p.racket.note && <span className="player-spec__note">{pick(p.racket.note, lang)}</span>}
                </dd>

                <dt className="eyebrow">{t('players.mains')}</dt>
                <dd>
                  <span className="player-spec__row">
                    {p.mains.label}
                    {p.mains.gauge != null && <span className="chip num">{p.mains.gauge}</span>}
                  </span>
                </dd>

                <dt className="eyebrow">{t('players.crosses')}</dt>
                <dd>
                  <span className="player-spec__row">
                    {p.crosses.label}
                    {p.crosses.gauge != null && <span className="chip num">{p.crosses.gauge}</span>}
                  </span>
                </dd>

                <dt className="eyebrow">{t('players.tension')}</dt>
                <dd>
                  <span className="num">{tensionLb}</span>
                  <span className="player-spec__kg num">{tensionKg}</span>
                </dd>
              </dl>

              {p.note && <p className="player-card__note">{pick(p.note, lang)}</p>}

              <div className="hairline player-card__hr" />

              <div className="player-card__footer">
                <div className="player-card__source">
                  <a href={p.source.url} target="_blank" rel="noopener noreferrer">
                    {t('players.source')} · {p.source.label}
                  </a>
                  <div className="player-card__verified num">
                    {t('players.verifiedOn')} {p.verifiedOn}
                  </div>
                </div>
                <button type="button" className="btn btn-sm btn-accent" onClick={() => handleLoad(p)}>
                  {t('players.loadInLab')}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
