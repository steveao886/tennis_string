import { describe, it, expect } from 'vitest';
import { buildInsights } from './insights';
import type { BedInput } from './stringbed';
import type { TennisString, Racket } from '../data/types';

const poly: TennisString = { id: 'p', brand: 'Luxilon', name: 'ALU Power', material: 'poly', shape: 'round', gauges: [1.25], defaultGauge: 1.25, refTension: [48, 58], attrs: { power: 40, control: 85, spin: 70, comfort: 35, durability: 80, tensionMaintenance: 55 }, blurb: { zh: '测试', en: 'test' } };
const shaped: TennisString = { ...poly, id: 's', name: 'RPM Blast', shape: 'shaped' };
const gut: TennisString = { ...poly, id: 'g', name: 'VS Touch', material: 'natural-gut', refTension: [50, 62] };
const r1619: Racket = { id: 'r', brand: 'Head', family: 'F', name: 'Extreme MP', headSize: 100, weightUnstrung: 300, balance: '', stiffness: 65, pattern: [16, 19], beam: '', recTension: [48, 57], attrs: { power: 50, control: 50, spin: 50, comfort: 50, durability: 50, tensionMaintenance: 50 }, blurb: { zh: '测试', en: 'test' } };
const base = (o: Partial<BedInput> = {}): BedInput => ({ mains: poly, crosses: poly, mainsGauge: 1.25, crossesGauge: 1.25, mainsTension: 53, crossesTension: 51, ...o });
const ids = (i: BedInput) => buildInsights(i).map((x) => x.id);

describe('buildInsights', () => {
  it('warns when mains tension is above the string comfort zone', () => {
    expect(ids(base({ mainsTension: 62, crossesTension: 60 }))).toContain('mains-high');
  });
  it('tips when mains tension is below the zone', () => {
    expect(ids(base({ mainsTension: 42, crossesTension: 40 }))).toContain('mains-low');
  });
  it('flags full poly bed', () => { expect(ids(base())).toContain('full-poly'); });
  it('explains poly/gut hybrid', () => { expect(ids(base({ crosses: gut }))).toContain('hybrid-poly-gut'); });
  it('flags crosses tighter than mains and large differential', () => {
    expect(ids(base({ mainsTension: 50, crossesTension: 54 }))).toContain('crosses-tighter');
    expect(ids(base({ mainsTension: 58, crossesTension: 50 }))).toContain('big-differential');
  });
  it('flags racket band mismatch and spin combo', () => {
    expect(ids(base({ racket: r1619, mainsTension: 64, crossesTension: 62 }))).toContain('racket-band');
    expect(ids(base({ racket: r1619, mains: shaped, crosses: shaped }))).toContain('spin-combo');
  });
  it('returns at most 5, warnings first, each with zh and en text', () => {
    const out = buildInsights(base({ racket: r1619, mains: shaped, mainsTension: 66, crossesTension: 56 }));
    expect(out.length).toBeLessThanOrEqual(5);
    const tones = out.map((x) => x.tone);
    const firstNonWarn = tones.findIndex((t) => t !== 'warn');
    if (firstNonWarn >= 0) expect(tones.slice(firstNonWarn)).not.toContain('warn');
    for (const x of out) { expect(x.text.zh.length).toBeGreaterThan(4); expect(x.text.en.length).toBeGreaterThan(4); }
  });
});
