import { useI18n } from '../../i18n/useI18n';
import './Shell.css';

export function Hero(): JSX.Element {
  const { t, lang } = useI18n();
  return (
    <header className="hero">
      <div className="hero-copy rise rise-1">
        <p className="eyebrow hero-eyebrow">{lang === 'zh' ? 'String Lab' : '网球穿线助手'}</p>
        <h1 className="hero-title">{t('hero.title')}</h1>
        <p className="hero-sub">{t('hero.subtitle')}</p>
      </div>
      <div className="hero-mark rise rise-2" aria-hidden="true">
        <svg viewBox="0 0 120 120" width="120" height="120">
          <defs>
            <radialGradient id="ballGrad" cx="35%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#eaff7a" />
              <stop offset="60%" stopColor="#d9ff3d" />
              <stop offset="100%" stopColor="#9fc21a" />
            </radialGradient>
          </defs>
          <circle cx="60" cy="60" r="54" fill="url(#ballGrad)" />
          <path d="M22 26 Q60 60 22 94" fill="none" stroke="#141a00" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
          <path d="M98 26 Q60 60 98 94" fill="none" stroke="#141a00" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
        </svg>
      </div>
    </header>
  );
}
