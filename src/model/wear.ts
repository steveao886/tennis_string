import type { Material, Racket, TennisString } from '../data/types';
import { patternOpenness } from './stringbed';

/**
 * Two materials, two ways to die, and the attribute that predicts each is not
 * the same one.
 *
 * A poly almost never breaks — every poly in this library sits between 60 and
 * 90 durability — it goes dead, and how fast it goes dead is what
 * tensionMaintenance measures: 43 for RPM Rough, 78 for 4G. A multifilament is
 * the mirror image. They all hold tension inside a five-point band, and what
 * actually varies is how long they survive being sawed: 42 for NXT, 60 for
 * Triax.
 *
 * So each material's own spread lives in one attribute and the other is flat.
 * Scaling everything by durability would leave 31 polys indistinguishable,
 * which is how a flat per-material table behaved in the first place.
 */
export type Killer = 'tension' | 'abrasion';

export const KILLER: Record<Material, Killer> = {
  poly: 'tension',
  kevlar: 'tension',
  multifilament: 'abrasion',
  'synthetic-gut': 'abrasion',
  'natural-gut': 'abrasion',
};

/** What the median string of each material lasts while it is being swung. */
export const BASE_PLAY_HOURS: Record<Material, number> = {
  poly: 15,
  kevlar: 15,
  multifilament: 30,
  'synthetic-gut': 30,
  'natural-gut': 30,
};

/** What the median string of each material lasts sitting in a bag. */
export const BASE_CALENDAR_DAYS: Record<Material, number> = {
  poly: 90,
  kevlar: 90,
  multifilament: 180,
  'synthetic-gut': 180,
  'natural-gut': 180,
};

/**
 * The median of each material's own killing attribute. Anchoring on the median
 * keeps the middle of every material exactly where it was, so this opens up the
 * spread inside a material without moving the calibration between them.
 */
export const PLAY_REFERENCE: Record<Material, number> = {
  poly: 49,
  kevlar: 49,
  multifilament: 44,
  'synthetic-gut': 56,
  'natural-gut': 55,
};

/** The same idea for the calendar clock, which reads tension hold everywhere. */
export const CALENDAR_REFERENCE: Record<Material, number> = {
  poly: 49,
  kevlar: 49,
  multifilament: 69,
  'synthetic-gut': 58,
  'natural-gut': 90,
};

const SCALE_MIN = 0.6;
const SCALE_MAX = 1.8;

/** Matches the gauge-to-durability slope the bed model already uses. */
const GAUGE_PER_MM = 60;
const NEUTRAL_GAUGE = 1.25;

/** An open pattern lets the crosses cut deeper into every main. 16x19 is the
 *  neutral point, because that is what the base hours were calibrated on. */
const OPENNESS_PENALTY = 0.07;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Play hours the mains should survive. Mains govern: they are what the crosses
 * saw through, and in a hybrid they are the half that dies first, so blending
 * in a soft cross string would only dilute the signal.
 */
export function playHoursLimit(
  mains: TennisString | undefined,
  mainsGauge: number,
  racket?: Racket,
): number {
  const material: Material = mains?.material ?? 'poly';
  const base = BASE_PLAY_HOURS[material];
  if (!mains) return base;

  const killer = KILLER[material];
  const gauge = GAUGE_PER_MM * (mainsGauge - NEUTRAL_GAUGE);

  // Cross-section is what survives the sawing, so gauge tells most on the
  // abrasion clock. A thin poly does die sooner as well, but less of that is
  // the cross-section and more of it is the polymer.
  const attr =
    killer === 'tension'
      ? mains.attrs.tensionMaintenance + 0.5 * gauge
      : mains.attrs.durability + gauge;

  const scale = clamp(attr / PLAY_REFERENCE[material], SCALE_MIN, SCALE_MAX);
  const pattern = racket ? 1 - patternOpenness(racket) * OPENNESS_PENALTY : 1;

  return Math.round(base * scale * pattern);
}

/**
 * Days the bed stays worth playing while nobody swings it.
 *
 * Nothing saws in a bag, so this clock has only one failure mode for every
 * material: the string relaxing and stiffening on its own. That makes tension
 * hold the attribute everywhere, even for the multifilaments whose tension hold
 * was the flat, useless one on the play clock — and it is why gauge and pattern
 * are deliberately absent here. Cross-section and string spacing decide how
 * fast something cuts, and nothing is cutting.
 *
 * The material base stays, because it carries chemistry rather than spread:
 * nylon and polyester age differently no matter how they rate for tension loss
 * under play, which is a short-term measurement and not a shelf life.
 */
export function calendarDaysLimit(mains: TennisString | undefined): number {
  const material: Material = mains?.material ?? 'poly';
  const base = BASE_CALENDAR_DAYS[material];
  if (!mains) return base;

  const scale = clamp(mains.attrs.tensionMaintenance / CALENDAR_REFERENCE[material], SCALE_MIN, SCALE_MAX);
  return Math.round(base * scale);
}
