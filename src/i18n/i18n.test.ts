import { describe, it, expect } from 'vitest';
import { en } from './en';
import { zh } from './zh';
import { fill } from './l10n';

describe('i18n parity', () => {
  it('zh and en have identical keys and no empty values', () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
    for (const k of Object.keys(en)) {
      expect((en as Record<string, string>)[k].length).toBeGreaterThan(0);
      expect((zh as Record<string, string>)[k].length).toBeGreaterThan(0);
    }
  });

  it('fill replaces placeholders', () => {
    expect(fill('Loaded {name}', { name: 'Nadal' })).toBe('Loaded Nadal');
    expect(fill('{a}/{b}', { a: 1, b: 2 })).toBe('1/2');
  });
});
