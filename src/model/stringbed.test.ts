import { describe, it, expect } from 'vitest';
import { computeBed, type BedInput } from './stringbed';
import { ATTRS, type TennisString, type Racket } from '../data/types';

const poly: TennisString = { id: 'p', brand: 'X', name: 'P', material: 'poly', shape: 'round', gauges: [1.25], defaultGauge: 1.25, refTension: [48, 58], attrs: { power: 40, control: 85, spin: 70, comfort: 35, durability: 80, tensionMaintenance: 55 }, blurb: { zh: '测试', en: 'test' } };
const gut: TennisString = { ...poly, id: 'g', material: 'natural-gut', refTension: [50, 62], attrs: { power: 90, control: 60, spin: 45, comfort: 95, durability: 55, tensionMaintenance: 90 } };
const r1619: Racket = { id: 'r', brand: 'Head', family: 'F', name: 'R', headSize: 98, weightUnstrung: 300, balance: '', stiffness: 65, pattern: [16, 19], beam: '', recTension: [48, 57], attrs: { power: 50, control: 50, spin: 50, comfort: 50, durability: 50, tensionMaintenance: 50 }, blurb: { zh: '测试', en: 'test' } };
const r1820: Racket = { ...r1619, pattern: [18, 20] };
const base = (o: Partial<BedInput> = {}): BedInput => ({ mains: poly, crosses: poly, mainsGauge: 1.25, crossesGauge: 1.25, mainsTension: 53, crossesTension: 53, ...o });

describe('computeBed', () => {
  it('returns each attr as an integer in 0..100', () => {
    for (const t of [35, 53, 70]) {
      const r = computeBed(base({ mainsTension: t, crossesTension: t }));
      for (const a of ATTRS) { expect(Number.isInteger(r[a])).toBe(true); expect(r[a]).toBeGreaterThanOrEqual(0); expect(r[a]).toBeLessThanOrEqual(100); }
    }
  });
  it('at reference tension and default gauge with no racket, returns the blended string attrs', () => {
    const r = computeBed(base({ mains: poly, crosses: gut, mainsTension: 53, crossesTension: 56 }));
    expect(r.power).toBe(Math.round(0.6 * 40 + 0.4 * 90));
    expect(r.comfort).toBe(Math.round(0.6 * 35 + 0.4 * 95));
  });
  it('raising tension raises control and lowers power/comfort monotonically', () => {
    let prev = computeBed(base({ mainsTension: 40, crossesTension: 40 }));
    for (let t = 42; t <= 66; t += 2) {
      const cur = computeBed(base({ mainsTension: t, crossesTension: t }));
      expect(cur.control).toBeGreaterThanOrEqual(prev.control);
      expect(cur.power).toBeLessThanOrEqual(prev.power);
      expect(cur.comfort).toBeLessThanOrEqual(prev.comfort);
      prev = cur;
    }
    expect(computeBed(base({ mainsTension: 66, crossesTension: 66 })).control).toBeGreaterThan(computeBed(base({ mainsTension: 40, crossesTension: 40 })).control);
  });
  it('thinner gauge raises spin and lowers durability', () => {
    const thin = computeBed(base({ mainsGauge: 1.15, crossesGauge: 1.15 }));
    const thick = computeBed(base({ mainsGauge: 1.35, crossesGauge: 1.35 }));
    expect(thin.spin).toBeGreaterThan(thick.spin);
    expect(thin.durability).toBeLessThan(thick.durability);
  });
  it('18x20 frame lowers spin and raises control vs 16x19', () => {
    const open = computeBed(base({ racket: r1619 }));
    const dense = computeBed(base({ racket: r1820 }));
    expect(dense.spin).toBeLessThan(open.spin);
    expect(dense.control).toBeGreaterThan(open.control);
  });
  it('stiffer frame adds power and removes comfort', () => {
    const soft = computeBed(base({ racket: { ...r1619, stiffness: 55 } }));
    const stiff = computeBed(base({ racket: { ...r1619, stiffness: 72 } }));
    expect(stiff.power).toBeGreaterThan(soft.power);
    expect(stiff.comfort).toBeLessThan(soft.comfort);
  });
});
