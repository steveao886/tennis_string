import type { L10n } from '../data/types';

export type Lang = 'zh' | 'en';

export const pick = (o: L10n, lang: Lang): string => o[lang];

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
