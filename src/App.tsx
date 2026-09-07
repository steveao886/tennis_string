import { useCallback, useEffect, useState } from 'react';
import { I18nProvider } from './i18n/useI18n';
import { ToastProvider } from './components/Toast/Toast';
import { Nav, type Section } from './components/Nav/Nav';
import { Hero } from './components/Shell/Hero';
import { Footer } from './components/Shell/Footer';
import { Lab } from './components/Lab/Lab';
import { Solver } from './components/Solver/Solver';
import { Rackets } from './components/Rackets/Rackets';
import { Players } from './components/Players/Players';
import { useSetup } from './state/useSetup';

const SECTION_KEY = 'tsh.section';
const SECTIONS: Section[] = ['lab', 'solve', 'rackets', 'players'];

function initialSection(): Section {
  try {
    const s = sessionStorage.getItem(SECTION_KEY);
    if (s && (SECTIONS as string[]).includes(s)) return s as Section;
  } catch {
    /* ignore */
  }
  return 'lab';
}

function Shell(): JSX.Element {
  const [setup, dispatch] = useSetup();
  const [section, setSection] = useState<Section>(initialSection);

  useEffect(() => {
    try {
      sessionStorage.setItem(SECTION_KEY, section);
    } catch {
      /* ignore */
    }
  }, [section]);

  const goLab = useCallback(() => {
    setSection('lab');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <>
      <Nav section={section} onSelect={setSection} />
      <main className="wrap app-main">
        {section === 'lab' && (
          <>
            <Hero />
            <Lab setup={setup} dispatch={dispatch} />
          </>
        )}
        {section === 'solve' && <Solver setup={setup} dispatch={dispatch} onGoLab={goLab} />}
        {section === 'rackets' && <Rackets setup={setup} dispatch={dispatch} onGoLab={goLab} />}
        {section === 'players' && <Players dispatch={dispatch} onGoLab={goLab} />}
      </main>
      <Footer />
    </>
  );
}

export default function App(): JSX.Element {
  return (
    <I18nProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </I18nProvider>
  );
}
