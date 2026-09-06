import { describe, it, expect } from 'vitest';
import { ATTRS } from './types';
import { rackets } from './rackets';

describe('rackets catalogue', () => {
  it('has 20 well-formed Wilson/Head rackets with unique ids', () => {
    expect(rackets.length).toBeGreaterThanOrEqual(18);
    expect(new Set(rackets.map((r) => r.id)).size).toBe(rackets.length);
    for (const r of rackets) {
      expect(r.id).toMatch(/^[a-z0-9-]+$/);
      expect(['Wilson', 'Head']).toContain(r.brand);
      expect(r.headSize).toBeGreaterThanOrEqual(95);
      expect(r.headSize).toBeLessThanOrEqual(104);
      expect(r.weightUnstrung).toBeGreaterThanOrEqual(280);
      expect(r.weightUnstrung).toBeLessThanOrEqual(330);
      expect(r.stiffness).toBeGreaterThanOrEqual(50);
      expect(r.stiffness).toBeLessThanOrEqual(75);
      expect(r.pattern[0]).toBeGreaterThanOrEqual(16);
      expect(r.recTension[0]).toBeLessThan(r.recTension[1]);
      for (const a of ATTRS) { expect(r.attrs[a]).toBeGreaterThanOrEqual(0); expect(r.attrs[a]).toBeLessThanOrEqual(100); }
      expect(r.blurb.zh.length).toBeGreaterThan(4);
      expect(r.blurb.en.length).toBeGreaterThan(4);
    }
  });
  it('contains the ids other modules rely on', () => {
    const ids = new Set(rackets.map((r) => r.id));
    for (const id of ['wilson-pro-staff-97-v14', 'wilson-blade-98-16x19-v9', 'wilson-blade-98-18x20-v9', 'head-speed-pro-2024', 'head-gravity-pro-2025', 'head-extreme-mp-2024']) expect(ids.has(id), id).toBe(true);
  });
});
