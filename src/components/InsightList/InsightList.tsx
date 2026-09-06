import type { Insight, Tone } from '../../model/insights';
import type { Lang } from '../../i18n/l10n';
import { pick } from '../../i18n/l10n';
import './InsightList.css';

const GLYPH: Record<Tone, string> = { warn: '!', tip: '→', info: 'i' };

export function InsightList(props: { insights: Insight[]; lang: Lang; emptyText: string }): JSX.Element {
  const { insights, lang, emptyText } = props;

  if (insights.length === 0) {
    return (
      <div className="insight-list">
        <div className="insight-card insight-card--empty">
          <span className="insight-card__text">{emptyText}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="insight-list">
      {insights.map((insight) => (
        <div key={insight.id} className={`insight-card insight-card--${insight.tone} rise`}>
          <span className={`insight-card__glyph insight-card__glyph--${insight.tone}`} aria-hidden="true">
            {GLYPH[insight.tone]}
          </span>
          <span className="insight-card__text">{pick(insight.text, lang)}</span>
        </div>
      ))}
    </div>
  );
}
