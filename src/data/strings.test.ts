import { describe, it, expect } from 'vitest';
import { ATTRS } from './types';
import { strings } from './strings';

describe('strings catalogue', () => {
  it('has at least 40 entries with unique ids', () => {
    expect(strings.length).toBeGreaterThanOrEqual(40);
    expect(new Set(strings.map((s) => s.id)).size).toBe(strings.length);
  });
  it('every string is well formed', () => {
    for (const s of strings) {
      expect(s.id).toMatch(/^[a-z0-9-]+$/);
      expect(s.gauges.length).toBeGreaterThan(0);
      expect([...s.gauges]).toEqual([...s.gauges].sort((a, b) => a - b));
      expect(s.gauges).toContain(s.defaultGauge);
      expect(s.refTension[0]).toBeLessThan(s.refTension[1]);
      for (const a of ATTRS) {
        expect(s.attrs[a]).toBeGreaterThanOrEqual(0);
        expect(s.attrs[a]).toBeLessThanOrEqual(100);
      }
      expect(s.blurb.zh.length).toBeGreaterThan(4);
      expect(s.blurb.en.length).toBeGreaterThan(4);
    }
  });
  it('contains the ids other modules rely on', () => {
    const ids = new Set(strings.map((s) => s.id));
    for (const id of ['luxilon-alu-power', 'luxilon-alu-power-rough', 'luxilon-4g', 'babolat-rpm-blast', 'babolat-vs-touch', 'wilson-natural-gut', 'head-hawk-touch', 'head-lynx-tour', 'solinco-hyper-g', 'tecnifibre-razor-code', 'yonex-poly-tour-pro'])
      expect(ids.has(id), id).toBe(true);
  });
});
