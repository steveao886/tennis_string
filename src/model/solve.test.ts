import { describe, it, expect } from 'vitest';
import { stringById, racketById } from '../data';
import type { Attrs, Racket } from '../data/types';
import { distanceTo, realismPenalty, bedInputFromSetup } from './solve';
import { DEFAULT_SETUP } from '../state/hash';
import { computeBed } from './stringbed';

const flat = (v: number): Attrs => ({
  power: v,
  control: v,
  spin: v,
  comfort: v,
  durability: v,
  tensionMaintenance: v,
});

describe('distanceTo', () => {
  it('is zero for an exact match', () => {
    expect(distanceTo(flat(50), flat(50))).toBe(0);
  });

  it('is the per-attribute offset when every attribute is off by the same amount', () => {
    expect(distanceTo(flat(50), flat(60))).toBeCloseTo(10, 10);
  });

  it('averages over six attributes, so one attribute off by 60 costs less than all six', () => {
    const one: Attrs = { ...flat(50), power: 110 };
    expect(distanceTo(flat(50), one)).toBeCloseTo(60 / Math.sqrt(6), 10);
  });
});

describe('realismPenalty', () => {
  const rpm = stringById.get('babolat-rpm-blast')!; // gauges [1.2, 1.25, 1.3, 1.35]
  const rough = stringById.get('luxilon-alu-power-rough')!; // gauges [1.25] only
  const ps97 = racketById.get('wilson-pro-staff-97-v14')!; // recTension [50, 60]

  it('is zero inside the recommended band with a mid gauge', () => {
    expect(
      realismPenalty({ racket: ps97, mainsTension: 54, mains: rpm, mainsGauge: 1.25, crosses: rpm, crossesGauge: 1.25 }),
    ).toBe(0);
  });

  it('charges 0.3 per lb outside the racket band', () => {
    expect(
      realismPenalty({ racket: ps97, mainsTension: 45, mains: rpm, mainsGauge: 1.25, crosses: rpm, crossesGauge: 1.25 }),
    ).toBeCloseTo(1.5, 10);
  });

  it('scales with the distance outside the band', () => {
    expect(
      realismPenalty({ racket: ps97, mainsTension: 35, mains: rpm, mainsGauge: 1.25, crosses: rpm, crossesGauge: 1.25 }),
    ).toBeCloseTo(4.5, 10);
  });

  it('caps the tension penalty at 6', () => {
    // No catalogue racket sits far enough from the 35-70 lb range to reach the
    // cap, so this exercises it directly.
    const farBand: Racket = { ...ps97, recTension: [90, 100] };
    expect(
      realismPenalty({ racket: farBand, mainsTension: 35, mains: rpm, mainsGauge: 1.25, crosses: rpm, crossesGauge: 1.25 }),
    ).toBe(6);
  });

  it('charges nothing for tension when no racket is chosen', () => {
    expect(
      realismPenalty({ racket: undefined, mainsTension: 35, mains: rpm, mainsGauge: 1.25, crosses: rpm, crossesGauge: 1.25 }),
    ).toBe(0);
  });

  it('charges 1 once for an extreme gauge', () => {
    expect(
      realismPenalty({ racket: undefined, mainsTension: 54, mains: rpm, mainsGauge: 1.35, crosses: rpm, crossesGauge: 1.35 }),
    ).toBe(1);
  });

  it('does not call a gauge extreme when the string offers fewer than three', () => {
    expect(
      realismPenalty({ racket: undefined, mainsTension: 54, mains: rough, mainsGauge: 1.25, crosses: rough, crossesGauge: 1.25 }),
    ).toBe(0);
  });
});

describe('bedInputFromSetup', () => {
  it('rebuilds the Lab default setup into a computable bed input', () => {
    const input = bedInputFromSetup(DEFAULT_SETUP);
    expect(input.mains.id).toBe(DEFAULT_SETUP.mainsId);
    expect(input.crosses.id).toBe(DEFAULT_SETUP.crossesId);
    expect(input.mainsTension).toBe(DEFAULT_SETUP.mainsTension);
    expect(input.racket).toBeUndefined();
    expect(computeBed(input).power).toBeGreaterThan(0);
  });
});
