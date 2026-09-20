import { describe, it, expect } from 'vitest';
import { BED_ATTRS, NEUTRAL_BEAM_MM, beamMm, computeBed, type BedInput } from './stringbed';
import { type TennisString, type Racket } from '../data/types';
import { racketById, stringById } from '../data';

const poly: TennisString = { id: 'p', brand: 'X', name: 'P', material: 'poly', shape: 'round', gauges: [1.25], defaultGauge: 1.25, refTension: [48, 58], attrs: { power: 40, control: 85, spin: 70, comfort: 35, durability: 80, tensionMaintenance: 55 }, blurb: { zh: '测试', en: 'test' } };
const gut: TennisString = { ...poly, id: 'g', material: 'natural-gut', refTension: [50, 62], attrs: { power: 90, control: 60, spin: 45, comfort: 95, durability: 55, tensionMaintenance: 90 } };
const r1619: Racket = { id: 'r', brand: 'Head', family: 'F', name: 'R', headSize: 98, weightUnstrung: 300, balance: '', stiffness: 65, pattern: [16, 19], beam: '', recTension: [48, 57], attrs: { power: 50, control: 50, spin: 50, comfort: 50, durability: 50, tensionMaintenance: 50 }, blurb: { zh: '测试', en: 'test' } };
const r1820: Racket = { ...r1619, pattern: [18, 20] };
const base = (o: Partial<BedInput> = {}): BedInput => ({ mains: poly, crosses: poly, mainsGauge: 1.25, crossesGauge: 1.25, mainsTension: 53, crossesTension: 53, ...o });

describe('computeBed', () => {
  it('returns each attr as an integer in 0..100', () => {
    for (const t of [35, 53, 70]) {
      const r = computeBed(base({ mainsTension: t, crossesTension: t }));
      for (const a of BED_ATTRS) { expect(Number.isInteger(r[a])).toBe(true); expect(r[a]).toBeGreaterThanOrEqual(0); expect(r[a]).toBeLessThanOrEqual(100); }
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

  it('head size no longer moves power, only launch', () => {
    const small = computeBed(base({ racket: { ...r1619, headSize: 95 } }));
    const big = computeBed(base({ racket: { ...r1619, headSize: 105 } }));
    expect(big.power).toBe(small.power);
    expect(big.launch).toBeGreaterThan(small.launch);
  });
});

describe('beamMm', () => {
  it('reads every real racket spec', () => {
    for (const r of racketById.values()) {
      expect(beamMm(r)).toBeGreaterThan(15);
      expect(beamMm(r)).toBeLessThan(35);
      expect(r.beam.startsWith(String(beamMm(r)))).toBe(true);
    }
  });

  it('falls back to a neutral beam when the spec is unreadable', () => {
    expect(beamMm({ ...r1619, beam: '' })).toBe(NEUTRAL_BEAM_MM);
    expect(beamMm({ ...r1619, beam: '23-26 mm' })).toBe(NEUTRAL_BEAM_MM);
  });
});

describe('launch', () => {
  const withBeam = (mm: string): Racket => ({ ...r1619, beam: mm });

  it('rises with beam thickness', () => {
    let prev = computeBed(base({ racket: withBeam('20 mm') }));
    for (const mm of ['21 mm', '22 mm', '23.5 mm', '26 mm']) {
      const cur = computeBed(base({ racket: withBeam(mm) }));
      expect(cur.launch).toBeGreaterThan(prev.launch);
      prev = cur;
    }
  });

  it('falls monotonically as tension rises', () => {
    let prev = computeBed(base({ mainsTension: 38, crossesTension: 38, racket: r1619 }));
    for (let t = 40; t <= 68; t += 2) {
      const cur = computeBed(base({ mainsTension: t, crossesTension: t, racket: r1619 }));
      expect(cur.launch).toBeLessThanOrEqual(prev.launch);
      prev = cur;
    }
  });

  it('ignores frame stiffness, which does not predict it', () => {
    const soft = computeBed(base({ racket: { ...r1619, stiffness: 55 } }));
    const stiff = computeBed(base({ racket: { ...r1619, stiffness: 72 } }));
    expect(stiff.launch).toBe(soft.launch);
  });

  /**
   * The bug this axis exists for: a Clash on a bed that has dropped fifteen
   * pounds sends the ball deeper than a Pro Staff strung tight, and the old
   * single `power` axis claimed the opposite by a wide margin.
   */
  it('ranks a slack Clash 98 above a tight Pro Staff 97, as the court does', () => {
    const triax = stringById.get('tecnifibre-triax')!;
    const rpm = stringById.get('babolat-rpm-blast')!;
    const proStaff = computeBed({
      mains: triax, crosses: triax, mainsGauge: 1.28, crossesGauge: 1.28,
      mainsTension: 56, crossesTension: 56, racket: racketById.get('wilson-pro-staff-97-v14')!,
    });
    const clash = computeBed({
      mains: rpm, crosses: rpm, mainsGauge: 1.25, crossesGauge: 1.25,
      mainsTension: 40, crossesTension: 40, racket: racketById.get('wilson-clash-98-v2')!,
    });
    expect(clash.launch).toBeGreaterThan(proStaff.launch + 15);
    // Power still reads the other way round, and that is correct: a live multi
    // does return more energy than a dead poly. Depth was never power's job.
    expect(proStaff.power).toBeGreaterThan(clash.power);
  });
});
