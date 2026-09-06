import { useI18n } from '../../i18n/useI18n';
import './Shell.css';

const REPO = 'https://github.com/steveao886/tennis_string';

export function Footer(): JSX.Element {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <p className="footer-note">{t('footer.disclaimer')}</p>
        <a className="footer-link" href={REPO} target="_blank" rel="noopener noreferrer">
          {t('footer.source')} ↗
        </a>
      </div>
    </footer>
  );
}
