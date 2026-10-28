import type { ClaimWeight, CommunityClaim, CommunityTake } from '../../data/types';
import type { I18n } from '../../i18n/useI18n';
import type { Key } from '../../i18n/en';
import { pick, type Lang } from '../../i18n/l10n';
import './Community.css';

const WEIGHT_CHIP: Record<ClaimWeight, string> = {
  consensus: 'chip chip-ok',
  upvoted: 'chip chip-ok',
  disputed: 'chip chip-warn',
  minority: 'chip',
};

function Claim(props: { claim: CommunityClaim; lang: Lang; t: I18n['t'] }): JSX.Element {
  const { claim, lang, t } = props;
  return (
    <li className="community__claim">
      <span className={WEIGHT_CHIP[claim.weight]}>
        {t(`community.weight.${claim.weight}` as Key, { people: claim.people, score: claim.topScore })}
      </span>
      <span>{pick(claim.text, lang)}</span>
    </li>
  );
}

function Section(props: { title: string; claims: CommunityClaim[]; lang: Lang; t: I18n['t'] }): JSX.Element | null {
  const { title, claims, lang, t } = props;
  if (claims.length === 0) return null;
  return (
    <div className="community__section">
      <div className="community__label">{title}</div>
      <ul className="community__claims">
        {claims.map((c) => (
          <Claim key={c.text.en} claim={c} lang={lang} t={t} />
        ))}
      </ul>
    </div>
  );
}

/**
 * Reddit feedback for one string. Credible claims show up front; minority views
 * and the threads themselves sit behind a disclosure, because the block renders
 * once per string and two open ones would bury the rest of the column.
 */
export function Community(props: { take: CommunityTake | undefined; attrName: (a: string) => string; lang: Lang; t: I18n['t'] }): JSX.Element | null {
  const { take, attrName, lang, t } = props;
  if (!take) return null;

  const credible = (c: CommunityClaim) => c.weight === 'consensus' || c.weight === 'upvoted';
  const agreed = take.claims.filter((c) => credible(c) && c.tone !== 'complaint');
  const complaints = take.claims.filter((c) => credible(c) && c.tone === 'complaint');
  const disputed = take.claims.filter((c) => c.weight === 'disputed');
  const minority = take.claims.filter((c) => c.weight === 'minority');
  const empty = agreed.length + complaints.length + disputed.length === 0;

  return (
    <div className="community">
      <div className="community__head">
        <span className="community__title">{t('community.title')}</span>
        <span className="muted community__meta">
          {t('community.meta', { threads: take.threads, date: take.checkedOn })}
          {take.via === 'gemini' && ` · ${t('community.viaGemini')}`}
        </span>
      </div>

      {empty && <p className="muted community__thin">{t('community.thin')}</p>}
      <Section title={t('community.agreed')} claims={agreed} lang={lang} t={t} />
      <Section title={t('community.complaints')} claims={complaints} lang={lang} t={t} />
      <Section title={t('community.disputed')} claims={disputed} lang={lang} t={t} />

      {take.conflicts.map((c) => (
        <div key={c.attr} className="community__conflict">
          <span className="community__conflict-label">
            {t('community.conflict', { attr: attrName(c.attr), ours: c.ours })}
          </span>
          <span>{pick(c.text, lang)}</span>
        </div>
      ))}

      {(minority.length > 0 || take.sources.length > 0) && (
        <details className="community__more">
          <summary>{t('community.more')}</summary>
          <Section title={t('community.minority')} claims={minority} lang={lang} t={t} />
          {take.sources.length > 0 && (
            <div className="community__section">
              <div className="community__label">{t('community.sources')}</div>
              <ul className="community__sources">
                {take.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer noopener">
                      {s.title}
                    </a>
                    <span className="muted community__source-meta">
                      {s.score === undefined || s.comments === undefined
                        ? s.date
                        : t('community.source', { score: s.score, comments: s.comments, date: s.date })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </details>
      )}

      <p className="muted community__note">{t('community.note')}</p>
    </div>
  );
}
