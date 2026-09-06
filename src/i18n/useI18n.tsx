import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type Key } from './en';
import { zh } from './zh';
import { fill, type Lang } from './l10n';

const dict: Record<Lang, Record<Key, string>> = { en, zh };
const STORAGE = 'tsh.lang';
export interface I18n { lang: Lang; setLang: (l: Lang) => void; t: (k: Key, vars?: Record<string, string | number>) => string }
const I18nContext = createContext<I18n | null>(null);

function initialLang(): Lang {
  try { const s = localStorage.getItem(STORAGE); if (s === 'en' || s === 'zh') return s; } catch { /* ignore */ }
  return 'zh';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = useCallback((l: Lang) => { setLangState(l); try { localStorage.setItem(STORAGE, l); } catch { /* ignore */ } }, []);
  useEffect(() => { document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'; }, [lang]);
  const t = useCallback((k: Key, vars?: Record<string, string | number>) => (vars ? fill(dict[lang][k], vars) : dict[lang][k]), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const c = useContext(I18nContext);
  if (!c) throw new Error('useI18n must be used inside I18nProvider');
  return c;
}
