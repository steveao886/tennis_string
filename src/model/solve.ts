import { racketById, stringById } from '../data';
import { ATTRS, type Attrs, type Material, type Racket, type TennisString } from '../data/types';
import type { SetupState } from '../state/hash';
import { computeBed, type BedInput } from './stringbed';

export interface SolveConstraints {
  /** Locked racket id, or null to search every racket plus "no racket". */
  racketId: string | null;
  /** Empty means unrestricted. */
  materials: Material[];
  /** Mains tension bounds in lb. */
  tensionRange: [number, number];
  allowHybrid: boolean;
}

export interface Candidate {
  racketId: string | null;
  mainsId: string;
  mainsGauge: number;
  crossesId: string;
  crossesGauge: number;
  mainsTension: number;
  crossesTension: number;
  /** The setup's actual read-out. */
  attrs: Attrs;
  /** actual minus target, per attribute, rounded. */
  gaps: Attrs;
  /** 0-100 match quality, unrounded. */
  score: number;
}

export const RESULT_COUNT = 8;

/** Root-mean-square distance across the six attributes. */
export function distanceTo(target: Attrs, actual: Attrs): number {
  let sum = 0;
  for (const a of ATTRS) {
    const d = actual[a] - target[a];
    sum += d * d;
  }
  return Math.sqrt(sum / ATTRS.length);
}

/**
 * A gauge only counts as extreme when the string offers a middle option;
 * penalising the only choice a two-gauge string has would be meaningless.
 */
function isExtremeGauge(s: TennisString, gauge: number): boolean {
  if (s.gauges.length < 3) return false;
  return gauge === s.gauges[0] || gauge === s.gauges[s.gauges.length - 1];
}

export interface PenaltyInput {
  racket: Racket | undefined;
  mainsTension: number;
  mains: TennisString;
  mainsGauge: number;
  crosses: TennisString;
  crossesGauge: number;
}

/**
 * Small nudges that separate near-ties towards setups people actually string.
 * Deliberately capped low so they never override a real attribute difference.
 */
export function realismPenalty(p: PenaltyInput): number {
  let penalty = 0;
  if (p.racket) {
    const [lo, hi] = p.racket.recTension;
    const off = p.mainsTension < lo ? lo - p.mainsTension : p.mainsTension > hi ? p.mainsTension - hi : 0;
    penalty += Math.min(6, off * 0.3);
  }
  if (isExtremeGauge(p.mains, p.mainsGauge) || isExtremeGauge(p.crosses, p.crossesGauge)) penalty += 1;
  return penalty;
}

/** The Lab's current setup as a bed input, so the solver can seed targets from it. */
export function bedInputFromSetup(s: SetupState): BedInput {
  return {
    mains: stringById.get(s.mainsId)!,
    crosses: stringById.get(s.crossesId)!,
    mainsGauge: s.mainsGauge,
    crossesGauge: s.crossesGauge,
    mainsTension: s.mainsTension,
    crossesTension: s.crossesTension,
    racket: s.racketId ? racketById.get(s.racketId) : undefined,
  };
}
