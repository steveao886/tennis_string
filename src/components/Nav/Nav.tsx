import { useI18n } from '../../i18n/useI18n';
import type { Key } from '../../i18n/en';
import './Nav.css';

export type Section = 'lab' | 'rackets' | 'players';

const SECTIONS: { key: Section; labelKey: Key }[] = [
  { key: 'lab', labelKey: 'nav.lab' },
  { key: 'rackets', labelKey: 'nav.rackets' },
  { key: 'players', labelKey: 'nav.players' },
];

export function Nav(props: { section: Section; onSelect: (s: Section) => void }): JSX.Element {
  const { section, onSelect } = props;
  const { lang, setLang, t } = useI18n();

  return (
    <header className="nav">
      <div className="wrap nav__row">
        <div className="nav__brand">
          <svg className="nav__mark" viewBox="0 0 22 22" width="22" height="22" aria-hidden="true">
            <circle cx="11" cy="11" r="10" style={{ fill: 'var(--accent)' }} />
            <path
              d="M7.5 4.5c3 2.8 3 10.2 0 13"
              style={{ stroke: 'var(--accent-ink)', fill: 'none' }}
              strokeWidth={1.3}
            />
            <path
              d="M14.5 4.5c-3 2.8-3 10.2 0 13"
              style={{ stroke: 'var(--accent-ink)', fill: 'none' }}
              strokeWidth={1.3}
            />
          </svg>
          <span className="nav__title">String Lab</span>
          <span className="nav__subtitle">网球穿线助手</span>
        </div>

        <nav className="nav__sections" aria-label="Sections">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              className="nav__section-btn"
              aria-current={section === s.key ? 'page' : undefined}
              onClick={() => onSelect(s.key)}
            >
              {t(s.labelKey)}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="btn btn-sm nav__lang"
          onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
        >
          {t('nav.langToggle')}
        </button>
      </div>
    </header>
  );
}
