import { describe, it, expect } from 'vitest';
import { lbToKg, kgToLb, formatTension } from './units';
describe('units', () => {
  it('round-trips', () => { expect(kgToLb(lbToKg(55))).toBeCloseTo(55, 5); });
  it('formats', () => {
    expect(formatTension(55, 'lb')).toBe('55 lb');
    expect(formatTension(55, 'kg')).toBe('25.0 kg');
    expect(formatTension(52, 'kg')).toBe('23.5 kg');
  });
});
