import { ATTRS, type Attrs, type TennisString, type Racket } from '../data/types';

export interface BedInput {
  mains: TennisString;
  crosses: TennisString;
  mainsGauge: number;
  crossesGauge: number;
  mainsTension: number; // lb
  crossesTension: number; // lb
  racket?: Racket;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const mid = ([a, b]: readonly [number, number]) => (a + b) / 2;
export const MAINS_WEIGHT = 0.6;
export const CROSSES_WEIGHT = 0.4;

export function effectiveTension(i: Pick<BedInput, 'mainsTension' | 'crossesTension'>): number {
  return MAINS_WEIGHT * i.mainsTension + CROSSES_WEIGHT * i.crossesTension;
}
export function referenceTension(i: Pick<BedInput, 'mains' | 'crosses'>): number {
  return MAINS_WEIGHT * mid(i.mains.refTension) + CROSSES_WEIGHT * mid(i.crosses.refTension);
}

export function computeBed(i: BedInput): Attrs {
  const out = {} as Attrs;
  for (const a of ATTRS) out[a] = MAINS_WEIGHT * i.mains.attrs[a] + CROSSES_WEIGHT * i.crosses.attrs[a];

  const d = Math.tanh(clamp((effectiveTension(i) - referenceTension(i)) / 10, -1.5, 1.5));
  out.control += 14 * d;
  out.power -= 12 * d;
  out.comfort -= 10 * d;
  out.spin -= 4 * d;
  out.tensionMaintenance += 3 * d;

  const g = MAINS_WEIGHT * i.mainsGauge + CROSSES_WEIGHT * i.crossesGauge;
  const dg = (1.25 - g) * 40;
  out.spin += dg;
  out.comfort += 0.5 * dg;
  out.power += 0.5 * dg;
  out.durability -= 1.5 * dg;

  if (i.racket) {
    const r = i.racket;
    const o = 19 - r.pattern[1] + (16 - r.pattern[0]);
    out.spin += 4 * o;
    out.control -= 3 * o;
    const s = (r.stiffness - 65) / 5;
    out.power += 3 * s;
    out.comfort -= 3 * s;
    const h = (r.headSize - 98) / 5;
    out.power += 3 * h;
    const w = (r.weightUnstrung - 300) / 10;
    out.power += 2 * w;
    out.control += 1.5 * w;
  }
  for (const a of ATTRS) out[a] = Math.round(clamp(out[a], 0, 100));
  return out;
}
