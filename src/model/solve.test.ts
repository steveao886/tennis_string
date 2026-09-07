import { describe, it, expect } from 'vitest';
import { stringById, racketById, strings } from '../data';
import { ATTRS, type Attrs, type Racket } from '../data/types';
import { distanceTo, realismPenalty, bedInputFromSetup, solve, RESULT_COUNT, type SolveConstraints } from './solve';
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

const FULL: SolveConstraints = {
  racketId: null,
  materials: [],
  tensionRange: [35, 70],
  allowHybrid: false,
};

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

describe('solve — main sweep', () => {
  it('round-trips: a real setup used as its own target scores 100 and is reproduced', () => {
    // Pro Staff 97 v14 (rec 50-60 lb) with RPM Blast 1.25 (a middle gauge) at
    // 54/52 lb draws no realism penalty, so nothing can outscore it.
    const racket = racketById.get('wilson-pro-staff-97-v14')!;
    const rpm = stringById.get('babolat-rpm-blast')!;
    const target = computeBed({
      mains: rpm,
      crosses: rpm,
      mainsGauge: 1.25,
      crossesGauge: 1.25,
      mainsTension: 54,
      crossesTension: 52,
      racket,
    });

    const top = solve(target, FULL)[0];
    expect(top.attrs).toEqual(target);
    expect(top.score).toBeGreaterThanOrEqual(99);
  });

  it('returns results sorted by descending score', () => {
    const out = solve(flat(60), FULL);
    expect(out.length).toBeGreaterThan(1);
    for (let i = 1; i < out.length; i++) expect(out[i - 1].score).toBeGreaterThanOrEqual(out[i].score);
  });

  it('reports gaps as actual minus target', () => {
    const top = solve(flat(60), FULL)[0];
    for (const a of ATTRS) expect(top.gaps[a]).toBe(Math.round(top.attrs[a] - 60));
  });

  it('honours a locked racket', () => {
    const out = solve(flat(60), { ...FULL, racketId: 'head-speed-pro-2024' });
    expect(out.length).toBeGreaterThan(0);
    for (const c of out) expect(c.racketId).toBe('head-speed-pro-2024');
  });

  it('honours the material filter on both mains and crosses', () => {
    const out = solve(flat(60), { ...FULL, materials: ['natural-gut'] });
    expect(out.length).toBeGreaterThan(0);
    for (const c of out) {
      expect(stringById.get(c.mainsId)!.material).toBe('natural-gut');
      expect(stringById.get(c.crossesId)!.material).toBe('natural-gut');
    }
  });

  it('honours the tension range and keeps crosses at mains minus the link gap', () => {
    const out = solve(flat(60), { ...FULL, tensionRange: [48, 52] });
    expect(out.length).toBeGreaterThan(0);
    for (const c of out) {
      expect(c.mainsTension).toBeGreaterThanOrEqual(48);
      expect(c.mainsTension).toBeLessThanOrEqual(52);
      expect(c.crossesTension).toBe(c.mainsTension - 2);
    }
  });

  it('only offers gauges the string actually comes in', () => {
    for (const c of solve(flat(60), FULL)) {
      expect(stringById.get(c.mainsId)!.gauges).toContain(c.mainsGauge);
      expect(stringById.get(c.crossesId)!.gauges).toContain(c.crossesGauge);
    }
  });

  it('returns an empty array when no string survives the filter', () => {
    expect(solve(flat(60), { ...FULL, materials: ['kevlar'] })).toEqual([]);
  });

  it('returns an empty array for an inverted tension range', () => {
    expect(solve(flat(60), { ...FULL, tensionRange: [60, 50] })).toEqual([]);
  });

  it('has no kevlar strings in the catalogue, which the previous test relies on', () => {
    expect(strings.some((s) => s.material === 'kevlar')).toBe(false);
  });
});

describe('solve — diversity', () => {
  it('returns at most RESULT_COUNT entries', () => {
    expect(solve(flat(60), FULL).length).toBeLessThanOrEqual(RESULT_COUNT);
  });

  it('never lists the same racket more than twice', () => {
    const counts = new Map<string, number>();
    for (const c of solve(flat(60), FULL)) {
      const k = c.racketId ?? '-';
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    for (const n of counts.values()) expect(n).toBeLessThanOrEqual(2);
  });

  it('still fills eight slots when the racket is locked, despite the per-racket cap', () => {
    expect(solve(flat(60), { ...FULL, racketId: 'head-speed-pro-2024' })).toHaveLength(RESULT_COUNT);
  });

  it('never lists the same mains string more than twice', () => {
    const counts = new Map<string, number>();
    for (const c of solve(flat(60), FULL)) counts.set(c.mainsId, (counts.get(c.mainsId) ?? 0) + 1);
    for (const n of counts.values()) expect(n).toBeLessThanOrEqual(2);
  });

  it('still fills eight slots for an ordinary target', () => {
    expect(solve(flat(60), FULL)).toHaveLength(RESULT_COUNT);
  });

  it('returns fewer than eight when the catalogue cannot supply eight diverse setups', () => {
    // Three synthetic gut strings, capped at two entries each: six at most.
    const out = solve(flat(60), { ...FULL, materials: ['synthetic-gut'] });
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(6);
  });
});
