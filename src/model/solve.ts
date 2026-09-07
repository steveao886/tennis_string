import { racketById, rackets, stringById, strings } from '../data';
import { ATTRS, type Attrs, type Material, type Racket, type TennisString } from '../data/types';
import { LINK_GAP, TENSION_MAX, TENSION_MIN, type SetupState } from '../state/hash';
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

/** A scored combination, kept in string-object form until it is handed to the UI. */
interface Scored {
  racketId: string | null;
  mains: TennisString;
  mainsGauge: number;
  crosses: TennisString;
  crossesGauge: number;
  mainsTension: number;
  crossesTension: number;
  attrs: Attrs;
  score: number;
}

/** Crosses follow mains by the Lab's link gap, floored at the Lab's minimum. */
const crossesTensionFor = (mainsTension: number): number => Math.max(TENSION_MIN, mainsTension - LINK_GAP);

/**
 * The pool holds one entry per (racket, mains, crosses) triple: its best gauge
 * and tension. Without this collapse a single string at 36 tensions x 4 gauges
 * would flood any fixed-size top-K, and the diversity filter downstream would
 * have almost nothing distinct left to choose from.
 */
type BestMap = Map<string, Scored>;

function keep(best: BestMap, s: Scored): void {
  const key = `${s.racketId ?? '-'}|${s.mains.id}|${s.crosses.id}`;
  const prev = best.get(key);
  if (prev === undefined || s.score > prev.score) best.set(key, s);
}

const ranked = (best: BestMap): Scored[] => [...best.values()].sort((a, b) => b.score - a.score);

function evaluate(
  target: Attrs,
  racket: Racket | undefined,
  mains: TennisString,
  mainsGauge: number,
  crosses: TennisString,
  crossesGauge: number,
  mainsTension: number,
): Scored {
  const crossesTension = crossesTensionFor(mainsTension);
  const attrs = computeBed({ mains, crosses, mainsGauge, crossesGauge, mainsTension, crossesTension, racket });
  const penalty = realismPenalty({ racket, mainsTension, mains, mainsGauge, crosses, crossesGauge });
  const score = Math.max(0, Math.min(100, 100 - distanceTo(target, attrs) - penalty));
  return { racketId: racket?.id ?? null, mains, mainsGauge, crosses, crossesGauge, mainsTension, crossesTension, attrs, score };
}

function racketPool(c: SolveConstraints): (Racket | undefined)[] {
  if (c.racketId) {
    const r = racketById.get(c.racketId);
    return r ? [r] : [undefined];
  }
  return [undefined, ...rackets];
}

function stringPool(c: SolveConstraints): TennisString[] {
  return c.materials.length === 0 ? strings : strings.filter((s) => c.materials.includes(s.material));
}

function tensionSteps(c: SolveConstraints): number[] {
  const lo = Math.max(TENSION_MIN, Math.ceil(c.tensionRange[0]));
  const hi = Math.min(TENSION_MAX, Math.floor(c.tensionRange[1]));
  const out: number[] = [];
  for (let t = lo; t <= hi; t++) out.push(t);
  return out;
}

/** Same string on mains and crosses across every racket, gauge and tension. */
function mainSweep(target: Attrs, c: SolveConstraints, steps: number[]): Scored[] {
  const best: BestMap = new Map();
  for (const racket of racketPool(c)) {
    for (const s of stringPool(c)) {
      for (const g of s.gauges) {
        for (const t of steps) {
          keep(best, evaluate(target, racket, s, g, s, g, t));
        }
      }
    }
  }
  return ranked(best);
}

function toCandidate(s: Scored, target: Attrs): Candidate {
  const gaps = {} as Attrs;
  for (const a of ATTRS) gaps[a] = Math.round(s.attrs[a] - target[a]);
  return {
    racketId: s.racketId,
    mainsId: s.mains.id,
    mainsGauge: s.mainsGauge,
    crossesId: s.crosses.id,
    crossesGauge: s.crossesGauge,
    mainsTension: s.mainsTension,
    crossesTension: s.crossesTension,
    attrs: s.attrs,
    gaps,
    score: s.score,
  };
}

const MAX_PER_RACKET = 2;
const MAX_PER_MAINS = 2;

/**
 * Without this the top eight are typically one string at eight adjacent
 * tensions, which tells the user nothing they could not have guessed.
 *
 * `capRacket` is off when the user locked a racket - every candidate shares it,
 * so the per-racket cap would cut the list down to two.
 */
function diversify(pool: Scored[], count: number, capRacket: boolean): Scored[] {
  const byRacket = new Map<string, number>();
  const byMains = new Map<string, number>();
  const out: Scored[] = [];
  for (const s of pool) {
    const rk = s.racketId ?? '-';
    if (capRacket && (byRacket.get(rk) ?? 0) >= MAX_PER_RACKET) continue;
    if ((byMains.get(s.mains.id) ?? 0) >= MAX_PER_MAINS) continue;
    byRacket.set(rk, (byRacket.get(rk) ?? 0) + 1);
    byMains.set(s.mains.id, (byMains.get(s.mains.id) ?? 0) + 1);
    out.push(s);
    if (out.length === count) break;
  }
  return out;
}

/** Crosses materials worth pairing under a poly mains. */
const SOFT_MATERIALS: Material[] = ['multifilament', 'synthetic-gut', 'natural-gut'];

/** How many of the strongest poly-mains setups get a soft-crosses re-sweep. */
const HYBRID_BASE = 40;

/**
 * Re-sweeps the strongest poly-mains candidates against soft crosses. Searching
 * all 47x47 string pairs would mostly surface combinations nobody strings, so
 * this covers the one hybrid pattern that is actually common.
 */
function hybridSweep(target: Attrs, base: Scored[], c: SolveConstraints, steps: number[]): Scored[] {
  const softs = stringPool(c).filter((s) => SOFT_MATERIALS.includes(s.material));
  if (softs.length === 0) return [];

  const best: BestMap = new Map();
  let expanded = 0;
  for (const b of base) {
    if (b.mains.material !== 'poly') continue;
    if (expanded >= HYBRID_BASE) break;
    expanded++;

    const racket = b.racketId ? racketById.get(b.racketId) : undefined;
    for (const x of softs) {
      for (const xg of x.gauges) {
        for (const t of steps) {
          keep(best, evaluate(target, racket, b.mains, b.mainsGauge, x, xg, t));
        }
      }
    }
  }
  return ranked(best);
}

export function solve(target: Attrs, c: SolveConstraints): Candidate[] {
  const steps = tensionSteps(c);
  if (steps.length === 0) return [];

  const pool = mainSweep(target, c, steps);
  const merged = c.allowHybrid
    ? [...pool, ...hybridSweep(target, pool, c, steps)].sort((a, b) => b.score - a.score)
    : pool;

  return diversify(merged, RESULT_COUNT, c.racketId === null).map((s) => toCandidate(s, target));
}
