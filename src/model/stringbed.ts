import { ATTRS, type TennisString, type Racket } from '../data/types';

/**
 * The bed read-out carries one axis the data does not: `launch`. Strings and
 * rackets keep their six authored attributes; the seventh only ever exists as
 * something computed, so nothing in `data/` has to invent a number for it.
 */
export const BED_ATTRS = [...ATTRS, 'launch'] as const;
export type BedAttr = (typeof BED_ATTRS)[number];
export type BedAttrs = Record<BedAttr, number>;

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

/** A beam nobody would call thick or thin, so an unreadable spec adds nothing. */
export const NEUTRAL_BEAM_MM = 22.5;
const BEAM_RE = /^(\d+(?:\.\d+)?) mm$/;

/** `beam` stays the display string; this is the only place it becomes a number. */
export function beamMm(r: Racket): number {
  const m = BEAM_RE.exec(r.beam);
  return m === null ? NEUTRAL_BEAM_MM : Number(m[1]);
}

export function computeBed(i: BedInput): BedAttrs {
  const out = {} as BedAttrs;
  for (const a of ATTRS) out[a] = MAINS_WEIGHT * i.mains.attrs[a] + CROSSES_WEIGHT * i.crosses.attrs[a];

  /** How lively the string itself is, before the bed does anything to it. */
  const stringPower = out.power;

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

  /**
   * Power is energy return: how fast the ball comes off. Launch is how high it
   * leaves, which is what actually sets depth. They used to share one axis, and
   * the frame's contribution to it was small enough to be noise — a control
   * frame strung tight read as more powerful than a launchy frame on a bed that
   * had dropped fifteen pounds, which is backwards on court.
   *
   * Beam thickness is the frame variable that tracks launch. Across this
   * database beam and RA correlate at 0.14, and sorting by beam ranks the Ultra
   * and the Clash at the top and the Prestige and the Gravity Pro at the bottom
   * — which is how those frames behave. RA predicts two of those three wrong,
   * so it stays out of launch and keeps doing comfort and energy return.
   */
  let launch = 50 - 22 * d + (stringPower - 60) * 0.15;

  if (i.racket) {
    const r = i.racket;
    const o = 19 - r.pattern[1] + (16 - r.pattern[0]);
    out.spin += 4 * o;
    out.control -= 3 * o;
    const s = (r.stiffness - 65) / 5;
    out.power += 3 * s;
    out.comfort -= 3 * s;
    const w = (r.weightUnstrung - 300) / 10;
    out.power += 2 * w;
    out.control += 1.5 * w;

    // Head size moved here from power: a bigger head lifts the ball far more
    // than it speeds it up. Open patterns let each string deflect further.
    launch += (beamMm(r) - NEUTRAL_BEAM_MM) * 6;
    launch += (r.headSize - 98) * 1.5;
    launch += o * 2;
  }
  out.launch = launch;

  for (const a of BED_ATTRS) out[a] = Math.round(clamp(out[a], 0, 100));
  return out;
}
