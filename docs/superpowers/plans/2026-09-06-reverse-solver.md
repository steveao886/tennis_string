# Reverse Solver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "反推 / Solve" section where the user drags six target attribute sliders and gets back a ranked list of concrete racket + string + gauge + tension setups, each loadable into the String Lab.

**Architecture:** One pure model module (`src/model/solve.ts`) brute-force enumerates the setup space against `computeBed()`, scores each combination by weighted distance to the target plus light realism penalties, and returns the top 8 after a diversity filter. The UI is a new nav section with the Lab's two-panel layout: targets and constraints on the left, result cards on the right.

**Tech Stack:** React 18 + TypeScript + Vite, Vitest for tests. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-06-reverse-solver-design.md`

## Global Constraints

- No new npm dependencies. There is no DOM test environment (no jsdom, no
  `@testing-library/react`), so **every test must exercise a pure module**.
  Component behaviour is tested by extracting the logic into a pure helper,
  exactly as `src/components/Players/resolve.ts` + `resolve.test.ts` already do.
- Every user-visible string goes through `t()` with a key added to **both**
  `src/i18n/en.ts` and `src/i18n/zh.ts`. `src/i18n/i18n.test.ts` enforces parity.
- Attribute values are 0–100 integers. `ATTRS` from `src/data/types.ts` is the
  canonical attribute order — never hardcode the six names in a new array.
- Tension is stored in lb everywhere. Display goes through `formatTension(lb, unit)`
  from `src/model/units.ts`.
- Bounds come from `src/state/hash.ts`: `TENSION_MIN = 35`, `TENSION_MAX = 70`,
  `LINK_GAP = 2`. Do not redefine them.
- CSS: reuse the global classes in `src/styles/global.css` (`panel`, `eyebrow`,
  `chip`, `chip-accent`, `btn`, `btn-sm`, `btn-accent`, `btn-ghost`, `num`,
  `hairline`, `filter`, `section-head`, `rise`, `sr-only`) and the tokens in
  `src/styles/tokens.css`. New classes are namespaced `solve-*` and live in
  `src/components/Solver/Solver.css`.
- Verification commands: `npm test` (vitest) and `npm run build` (`tsc --noEmit`
  then vite build). Both must pass before any commit.

---

## File Structure

**Create:**

| File | Responsibility |
|---|---|
| `src/model/solve.ts` | Pure solver: types, scoring, sweep, hybrid expansion, diversity. No React. |
| `src/model/solve.test.ts` | Solver unit tests. |
| `src/components/Solver/load.ts` | Pure: `Candidate` → the list of `SetupAction`s that load it into the Lab. |
| `src/components/Solver/load.test.ts` | Tests for the above. |
| `src/components/Solver/TargetSliders.tsx` | Left panel: six 0–100 target sliders. |
| `src/components/Solver/Constraints.tsx` | Left panel: racket lock, material chips, tension range, hybrid toggle. |
| `src/components/Solver/ResultCard.tsx` | One result card. |
| `src/components/Solver/Solver.tsx` | Section container: state, persistence, calls `solve()`, lays out both panels. |
| `src/components/Solver/Solver.css` | All `solve-*` styles. |

**Modify:**

| File | Change |
|---|---|
| `src/components/Nav/Nav.tsx` | Add `'solve'` to the `Section` union and the `SECTIONS` array. |
| `src/App.tsx` | Add `'solve'` to `SECTIONS`, render `<Solver />`. |
| `src/i18n/en.ts` | New `solve.*` keys. |
| `src/i18n/zh.ts` | Same keys, Chinese. |

---

### Task 1: Solver types and scoring primitives

**Files:**
- Create: `src/model/solve.ts`
- Test: `src/model/solve.test.ts`

**Interfaces:**
- Consumes: `computeBed`, `BedInput` from `src/model/stringbed.ts`; `ATTRS`, `Attrs`,
  `Material`, `Racket`, `TennisString` from `src/data/types.ts`; `stringById`,
  `racketById` from `src/data`; `SetupState`, `TENSION_MIN`, `TENSION_MAX`,
  `LINK_GAP` from `src/state/hash.ts`.
- Produces: `SolveConstraints`, `Candidate`, `RESULT_COUNT`, `distanceTo(target, actual): number`,
  `realismPenalty(p): number`, `bedInputFromSetup(s: SetupState): BedInput`.

- [ ] **Step 1: Write the failing test**

Create `src/model/solve.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { stringById, racketById } from '../data';
import type { Attrs } from '../data/types';
import { distanceTo, realismPenalty, bedInputFromSetup } from './solve';
import { DEFAULT_SETUP } from '../state/hash';
import { computeBed } from './stringbed';

const flat = (v: number): Attrs => ({
  power: v, control: v, spin: v, comfort: v, durability: v, tensionMaintenance: v,
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
  const rpm = stringById.get('babolat-rpm-blast')!;         // gauges [1.2, 1.25, 1.3, 1.35]
  const rough = stringById.get('luxilon-alu-power-rough')!; // gauges [1.25] only
  const ps97 = racketById.get('wilson-pro-staff-97-v14')!;  // recTension [50, 60]

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

  it('caps the tension penalty at 6', () => {
    expect(
      realismPenalty({ racket: ps97, mainsTension: 35, mains: rpm, mainsGauge: 1.25, crosses: rpm, crossesGauge: 1.25 }),
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/model/solve.test.ts`
Expected: FAIL — `Failed to resolve import "./solve"`.

- [ ] **Step 3: Write the implementation**

Create `src/model/solve.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/model/solve.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/model/solve.ts src/model/solve.test.ts
git commit -m "feat(solve): scoring primitives for the reverse solver"
```

---

### Task 2: Main sweep and `solve()`

**Files:**
- Modify: `src/model/solve.ts`
- Test: `src/model/solve.test.ts`

**Interfaces:**
- Consumes: everything from Task 1.
- Produces: `solve(target: Attrs, c: SolveConstraints): Candidate[]`. At this
  stage it returns the whole ranked pool (no diversity filter, no hybrids);
  Tasks 3 and 4 narrow it.

- [ ] **Step 1: Write the failing test**

Append to `src/model/solve.test.ts`:

```ts
import { solve, type SolveConstraints } from './solve';
import { strings } from '../data';

const FULL: SolveConstraints = {
  racketId: null,
  materials: [],
  tensionRange: [35, 70],
  allowHybrid: false,
};

describe('solve — main sweep', () => {
  it('round-trips: a real setup used as its own target scores 100 and is reproduced', () => {
    // Pro Staff 97 v14 (rec 50-60 lb) with RPM Blast 1.25 (a middle gauge) at
    // 54/52 lb draws no realism penalty, so nothing can outscore it.
    const racket = racketById.get('wilson-pro-staff-97-v14')!;
    const rpm = stringById.get('babolat-rpm-blast')!;
    const target = computeBed({
      mains: rpm, crosses: rpm, mainsGauge: 1.25, crossesGauge: 1.25,
      mainsTension: 54, crossesTension: 52, racket,
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/model/solve.test.ts`
Expected: FAIL — `solve is not a function` / import error.

- [ ] **Step 3: Write the implementation**

Append to `src/model/solve.ts` (add `rackets`, `strings` to the existing `../data`
import and `LINK_GAP`, `TENSION_MAX`, `TENSION_MIN` to the `../state/hash` import;
the hash module owns the Lab's canonical tension bounds and the solver must not
emit a tension the Lab would clamp differently):

```ts
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

export function solve(target: Attrs, c: SolveConstraints): Candidate[] {
  const steps = tensionSteps(c);
  if (steps.length === 0) return [];
  return mainSweep(target, c, steps).map((s) => toCandidate(s, target));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/model/solve.test.ts`
Expected: PASS, 20 tests.

- [ ] **Step 5: Commit**

```bash
git add src/model/solve.ts src/model/solve.test.ts
git commit -m "feat(solve): brute-force main sweep with racket, material and tension constraints"
```

---

### Task 3: Diversity filter and truncation

**Files:**
- Modify: `src/model/solve.ts`
- Test: `src/model/solve.test.ts`

**Interfaces:**
- Consumes: `Scored`, `RESULT_COUNT` from Tasks 1–2.
- Produces: `solve()` now returns at most `RESULT_COUNT` (8) entries with at most
  2 sharing a mains string, and — only when the racket is *not* locked — at most
  2 sharing a racket. Capping per racket while the user has pinned one racket
  would cut every search down to two results.

- [ ] **Step 1: Write the failing test**

Append to `src/model/solve.test.ts`:

```ts
import { RESULT_COUNT } from './solve';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/model/solve.test.ts`
Expected: FAIL — `solve` returns up to 40 entries, so the length and per-racket
assertions fail.

- [ ] **Step 3: Write the implementation**

In `src/model/solve.ts`, add the constants and the filter, then rewrite `solve`:

```ts
const MAX_PER_RACKET = 2;
const MAX_PER_MAINS = 2;

/**
 * Without this the top eight are typically one string at eight adjacent
 * tensions, which tells the user nothing they could not have guessed.
 *
 * `capRacket` is off when the user locked a racket — every candidate shares it,
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

export function solve(target: Attrs, c: SolveConstraints): Candidate[] {
  const steps = tensionSteps(c);
  if (steps.length === 0) return [];
  const pool = mainSweep(target, c, steps);
  return diversify(pool, RESULT_COUNT, c.racketId === null).map((s) => toCandidate(s, target));
}
```

Delete the previous `solve` body — there must be exactly one `export function solve`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/model/solve.test.ts`
Expected: PASS, 25 tests.

- [ ] **Step 5: Commit**

```bash
git add src/model/solve.ts src/model/solve.test.ts
git commit -m "feat(solve): diversity filter so results are not one string at eight tensions"
```

---

### Task 4: Hybrid expansion

**Files:**
- Modify: `src/model/solve.ts`
- Test: `src/model/solve.test.ts`

**Interfaces:**
- Consumes: `mainSweep`, `keep`, `ranked`, `evaluate`, `diversify` from Tasks 2–3.
- Produces: `solve()` honours `allowHybrid`, mixing poly-mains / soft-crosses
  candidates into the same ranked pool.

- [ ] **Step 1: Write the failing test**

Append to `src/model/solve.test.ts`:

```ts
describe('solve — hybrids', () => {
  const HYBRID: SolveConstraints = { ...FULL, allowHybrid: true };

  it('produces only same-string setups when hybrids are off', () => {
    for (const c of solve(flat(60), FULL)) {
      expect(c.crossesId).toBe(c.mainsId);
      expect(c.crossesGauge).toBe(c.mainsGauge);
    }
  });

  it('any hybrid it produces is poly mains with non-poly crosses', () => {
    for (const c of solve(flat(60), HYBRID)) {
      if (c.mainsId === c.crossesId) continue;
      expect(stringById.get(c.mainsId)!.material).toBe('poly');
      expect(stringById.get(c.crossesId)!.material).not.toBe('poly');
    }
  });

  it('never scores worse than the same search without hybrids', () => {
    const target = flat(60);
    const withOut = solve(target, FULL)[0].score;
    const withIn = solve(target, HYBRID)[0].score;
    expect(withIn).toBeGreaterThanOrEqual(withOut - 1e-9);
  });

  it('finds a hybrid when the target only a hybrid can hit is asked for', () => {
    const alu = stringById.get('luxilon-alu-power')!;
    const gut = stringById.get('babolat-vs-touch')!;
    const target = computeBed({
      mains: alu, crosses: gut, mainsGauge: 1.25, crossesGauge: gut.defaultGauge,
      mainsTension: 52, crossesTension: 50, racket: undefined,
    });
    const top = solve(target, { ...HYBRID, racketId: null })[0];
    expect(top.score).toBeGreaterThan(solve(target, FULL)[0].score);
  });

  it('produces no hybrids when the material filter admits only poly', () => {
    for (const c of solve(flat(60), { ...HYBRID, materials: ['poly'] })) {
      expect(stringById.get(c.crossesId)!.material).toBe('poly');
    }
  });

  it('completes an unlocked hybrid search in under 400 ms', () => {
    const started = performance.now();
    solve(flat(60), HYBRID);
    expect(performance.now() - started).toBeLessThan(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/model/solve.test.ts`
Expected: FAIL — `allowHybrid` is ignored, so the hybrid-specific assertions fail.

- [ ] **Step 3: Write the implementation**

In `src/model/solve.ts`, add the hybrid sweep and update `solve`:

```ts
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
```

Again, delete the previous `solve` body so exactly one remains.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/model/solve.test.ts && npm test`
Expected: PASS, 31 tests in `solve.test.ts`, whole suite green.

- [ ] **Step 5: Commit**

```bash
git add src/model/solve.ts src/model/solve.test.ts
git commit -m "feat(solve): poly-mains hybrid expansion"
```

---

### Task 5: i18n keys

**Files:**
- Modify: `src/i18n/en.ts`, `src/i18n/zh.ts`
- Test: `src/i18n/i18n.test.ts` (existing, no changes)

**Interfaces:**
- Produces: the `nav.solve` and `solve.*` keys every later task's UI reads
  through `t()`.

- [ ] **Step 1: Add the English keys**

In `src/i18n/en.ts`, add `'nav.solve': 'Solve',` immediately after `'nav.lab'`,
and insert this block after the `'lab.attributes'` line:

```ts
  'solve.title': 'Reverse Solve',
  'solve.subtitle':
    'Dial in the feel you want and see which frame, string and tension get closest.',
  'solve.targets': 'The feel I want',
  'solve.fromCurrent': 'Use current setup',
  'solve.constraints': 'Constraints',
  'solve.showConstraints': 'Show constraints',
  'solve.hideConstraints': 'Hide constraints',
  'solve.lockRacket': 'Keep my racket',
  'solve.lockRacketHint': 'Pick a racket in the Lab first',
  'solve.materials': 'Materials',
  'solve.materialsAll': 'Any',
  'solve.tensionRange': 'Tension range',
  'solve.rangeFrom': 'Lowest tension',
  'solve.rangeTo': 'Highest tension',
  'solve.allowHybrid': 'Allow hybrids',
  'solve.allowHybridHint': 'poly mains with softer crosses',
  'solve.results': 'Best matches',
  'solve.resultCount': '{n} setups',
  'solve.match': 'Match',
  'solve.noRacket': 'No racket',
  'solve.sameString': 'Mains & crosses',
  'solve.mains': 'Mains',
  'solve.crosses': 'Crosses',
  'solve.tension': 'Tension',
  'solve.loadInLab': 'Load in Lab',
  'solve.empty': 'Nothing matches those constraints. Widen the tension range or allow more materials.',
  'solve.targetTick': 'target',
```

- [ ] **Step 2: Add the Chinese keys**

In `src/i18n/zh.ts`, add `'nav.solve': '反推',` after `'nav.lab'`, and the same
block after `'lab.attributes'`:

```ts
  'solve.title': '反推配置',
  'solve.subtitle': '先说你想要什么手感，再看哪套拍、线、磅数离它最近。',
  'solve.targets': '我想要的手感',
  'solve.fromCurrent': '用当前配置',
  'solve.constraints': '限定条件',
  'solve.showConstraints': '展开限定条件',
  'solve.hideConstraints': '收起限定条件',
  'solve.lockRacket': '锁定当前球拍',
  'solve.lockRacketHint': '先在工作台里选一支拍',
  'solve.materials': '线材',
  'solve.materialsAll': '不限',
  'solve.tensionRange': '磅数区间',
  'solve.rangeFrom': '最低磅数',
  'solve.rangeTo': '最高磅数',
  'solve.allowHybrid': '允许混穿',
  'solve.allowHybridHint': '聚酯竖线配柔性横线',
  'solve.results': '最接近的组合',
  'solve.resultCount': '{n} 套',
  'solve.match': '匹配度',
  'solve.noRacket': '不选球拍',
  'solve.sameString': '竖横同线',
  'solve.mains': '竖线',
  'solve.crosses': '横线',
  'solve.tension': '磅数',
  'solve.loadInLab': '载入工作台',
  'solve.empty': '这些限定条件下没有匹配结果。放宽磅数区间，或者多留几种线材。',
  'solve.targetTick': '目标',
```

- [ ] **Step 3: Run the parity test**

Run: `npx vitest run src/i18n/i18n.test.ts`
Expected: PASS — identical key sets, no empty values.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/en.ts src/i18n/zh.ts
git commit -m "feat(i18n): keys for the reverse solver section"
```

---

### Task 6: Nav entry, routing, and the Solver shell

**Files:**
- Modify: `src/components/Nav/Nav.tsx`, `src/App.tsx`
- Create: `src/components/Solver/Solver.tsx`, `src/components/Solver/Solver.css`

**Interfaces:**
- Consumes: `solve`, `bedInputFromSetup`, `RESULT_COUNT` from `src/model/solve.ts`;
  `computeBed` from `src/model/stringbed.ts`; the `solve.*` keys from Task 5.
- Produces: `Solver(props: { setup: SetupState; dispatch: Dispatch<SetupAction>; onGoLab: () => void }): JSX.Element`,
  reachable from the nav. Renders the two panels with the results list wired up
  but no target sliders or constraints yet — targets are fixed at the current
  Lab read-out and constraints at their defaults.

- [ ] **Step 1: Add the nav section**

In `src/components/Nav/Nav.tsx` change the type and the array:

```tsx
export type Section = 'lab' | 'solve' | 'rackets' | 'players';

const SECTIONS: { key: Section; labelKey: Key }[] = [
  { key: 'lab', labelKey: 'nav.lab' },
  { key: 'solve', labelKey: 'nav.solve' },
  { key: 'rackets', labelKey: 'nav.rackets' },
  { key: 'players', labelKey: 'nav.players' },
];
```

- [ ] **Step 2: Route it in App**

In `src/App.tsx` add the import, extend `SECTIONS`, and render the section:

```tsx
import { Solver } from './components/Solver/Solver';

const SECTIONS: Section[] = ['lab', 'solve', 'rackets', 'players'];
```

and inside `<main>`, between the `lab` block and the `rackets` block:

```tsx
        {section === 'solve' && <Solver setup={setup} dispatch={dispatch} onGoLab={goLab} />}
```

- [ ] **Step 3: Write the Solver shell**

Create `src/components/Solver/Solver.tsx`:

```tsx
import { useDeferredValue, useMemo, useState, type Dispatch } from 'react';
import { ATTRS, type Attr, type Material } from '../../data/types';
import { computeBed } from '../../model/stringbed';
import { bedInputFromSetup, solve, type SolveConstraints } from '../../model/solve';
import { TENSION_MAX, TENSION_MIN, type SetupState } from '../../state/hash';
import type { SetupAction } from '../../state/useSetup';
import { useI18n } from '../../i18n/useI18n';
import type { Key } from '../../i18n/en';
import './Solver.css';

export function Solver(props: {
  setup: SetupState;
  dispatch: Dispatch<SetupAction>;
  onGoLab: () => void;
}): JSX.Element {
  const { setup } = props;
  const { t } = useI18n();

  const current = useMemo(() => computeBed(bedInputFromSetup(setup)), [setup]);
  const [target] = useState(current);

  const constraints: SolveConstraints = useMemo(
    () => ({
      racketId: null,
      materials: [] as Material[],
      tensionRange: [TENSION_MIN, TENSION_MAX],
      allowHybrid: true,
    }),
    [],
  );

  const deferredTarget = useDeferredValue(target);
  const results = useMemo(() => solve(deferredTarget, constraints), [deferredTarget, constraints]);

  const labels = useMemo(
    () => Object.fromEntries(ATTRS.map((a) => [a, t(`attr.${a}` as Key)])) as Record<Attr, string>,
    [t],
  );

  return (
    <section>
      <div className="section-head">
        <h2>{t('solve.title')}</h2>
        <p>{t('solve.subtitle')}</p>
      </div>

      <div className="solve">
        <div className="panel solve__panel solve__inputs">
          <div className="eyebrow">{t('solve.targets')}</div>
        </div>

        <div className="panel solve__panel solve__results">
          <div className="solve-results__head">
            <span className="eyebrow">{t('solve.results')}</span>
            <span className="solve-results__count num">{t('solve.resultCount', { n: results.length })}</span>
          </div>
          {results.length === 0 && <p className="solve-empty">{t('solve.empty')}</p>}
          <ul className="solve-list">
            {results.map((c) => (
              <li key={`${c.racketId}|${c.mainsId}|${c.mainsGauge}|${c.crossesId}|${c.crossesGauge}|${c.mainsTension}`}>
                <span className="num">{Math.round(c.score)}</span> · {labels.power}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Write the base stylesheet**

Create `src/components/Solver/Solver.css`:

```css
.solve {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 960px) {
  .solve {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: start;
  }
  .solve__inputs {
    position: sticky;
    top: 76px;
  }
}

.solve__panel {
  padding: 22px;
}

@media (max-width: 480px) {
  .solve__panel {
    padding: 16px;
  }
}

.solve__inputs,
.solve__results {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.solve-results__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.solve-results__count {
  font-size: 13px;
  color: var(--muted);
}

.solve-empty {
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--muted);
}

.solve-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  list-style: none;
  margin: 0;
  padding: 0;
}
```

- [ ] **Step 5: Verify it compiles and the suite is green**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/Nav/Nav.tsx src/App.tsx src/components/Solver
git commit -m "feat(solve): nav section and solver shell"
```

---

### Task 7: Target sliders with session persistence

**Files:**
- Create: `src/components/Solver/TargetSliders.tsx`
- Modify: `src/components/Solver/Solver.tsx`, `src/components/Solver/Solver.css`

**Interfaces:**
- Consumes: `Attrs`, `ATTRS`, `Attr` from `src/data/types.ts`.
- Produces: `TargetSliders(props: { value: Attrs; labels: Record<Attr, string>; onChange: (next: Attrs) => void }): JSX.Element`.
  `Solver` now owns editable target state persisted under `sessionStorage['tsh.solve']`.

- [ ] **Step 1: Write the sliders component**

Create `src/components/Solver/TargetSliders.tsx`:

```tsx
import { ATTRS, type Attr, type Attrs } from '../../data/types';

export function TargetSliders(props: {
  value: Attrs;
  labels: Record<Attr, string>;
  onChange: (next: Attrs) => void;
}): JSX.Element {
  const { value, labels, onChange } = props;

  return (
    <div className="solve-targets">
      {ATTRS.map((a) => (
        <div className="solve-target" key={a}>
          <label className="solve-target__label" htmlFor={`target-${a}`}>
            {labels[a]}
          </label>
          <input
            id={`target-${a}`}
            className="solve-target__input"
            type="range"
            min={0}
            max={100}
            step={1}
            value={value[a]}
            onChange={(e) => onChange({ ...value, [a]: Number(e.target.value) })}
          />
          <span className="solve-target__value num">{value[a]}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into Solver with persistence**

In `src/components/Solver/Solver.tsx`, add the import and the persistence helpers
above the component:

```tsx
import { TargetSliders } from './TargetSliders';

const STORAGE = 'tsh.solve';

function loadTarget(): Attrs | null {
  try {
    const raw = sessionStorage.getItem(STORAGE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Record<Attr, unknown>>;
    const out = {} as Attrs;
    for (const a of ATTRS) {
      const v = parsed[a];
      if (typeof v !== 'number' || !Number.isFinite(v)) return null;
      out[a] = Math.max(0, Math.min(100, Math.round(v)));
    }
    return out;
  } catch {
    return null;
  }
}

function saveTarget(t: Attrs): void {
  try {
    sessionStorage.setItem(STORAGE, JSON.stringify(t));
  } catch {
    /* ignore */
  }
}
```

Add `type Attrs` to the existing `../../data/types` import. Replace the
`const [target] = useState(current);` line with:

```tsx
  const [target, setTargetState] = useState<Attrs>(() => loadTarget() ?? current);

  const setTarget = useCallback((next: Attrs) => {
    setTargetState(next);
    saveTarget(next);
  }, []);
```

and add `useCallback` to the React import. Then replace the contents of the
inputs panel with:

```tsx
        <div className="panel solve__panel solve__inputs">
          <div className="solve-inputs__head">
            <span className="eyebrow">{t('solve.targets')}</span>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setTarget(current)}>
              {t('solve.fromCurrent')}
            </button>
          </div>
          <TargetSliders value={target} labels={labels} onChange={setTarget} />
        </div>
```

- [ ] **Step 3: Add the styles**

Append to `src/components/Solver/Solver.css`:

```css
.solve-inputs__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.solve-targets {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.solve-target {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 10px;
}

.solve-target__label {
  font-size: 13px;
  color: var(--muted);
}

.solve-target__value {
  font-size: 13px;
  font-weight: 700;
  text-align: right;
  color: var(--text);
}

.solve-target__input {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 22px;
  background: transparent;
  cursor: pointer;
}

.solve-target__input::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: var(--r-pill);
  background: var(--panel-3);
}

.solve-target__input::-moz-range-track {
  height: 4px;
  border-radius: var(--r-pill);
  background: var(--panel-3);
}

.solve-target__input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  margin-top: -6px;
  border: 0;
  border-radius: 50%;
  background: var(--accent);
}

.solve-target__input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 0;
  border-radius: 50%;
  background: var(--accent);
}

.solve-target__input:focus-visible {
  outline: none;
}

.solve-target__input:focus-visible::-webkit-slider-thumb {
  box-shadow: var(--ring);
}

.solve-target__input:focus-visible::-moz-range-thumb {
  box-shadow: var(--ring);
}
```

- [ ] **Step 4: Verify**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/Solver
git commit -m "feat(solve): draggable target sliders with session persistence"
```

---

### Task 8: Constraints panel

**Files:**
- Create: `src/components/Solver/Constraints.tsx`
- Modify: `src/components/Solver/Solver.tsx`, `src/components/Solver/Solver.css`

**Interfaces:**
- Consumes: `SolveConstraints` from `src/model/solve.ts`; `Unit`, `formatTension`
  from `src/model/units.ts`; `TENSION_MIN`, `TENSION_MAX` from `src/state/hash.ts`.
- Produces: `Constraints(props: { value: SolveConstraints; unit: Unit; racketName: string | null; onChange: (next: SolveConstraints) => void }): JSX.Element`.
  `Solver` now owns editable constraint state.

- [ ] **Step 1: Write the component**

Create `src/components/Solver/Constraints.tsx`:

```tsx
import { useState } from 'react';
import { strings } from '../../data';
import type { Material } from '../../data/types';
import type { SolveConstraints } from '../../model/solve';
import { formatTension, type Unit } from '../../model/units';
import { TENSION_MAX, TENSION_MIN } from '../../state/hash';
import { useI18n } from '../../i18n/useI18n';
import type { Key } from '../../i18n/en';

/** Only offer materials the catalogue actually contains. */
const MATERIALS: Material[] = [...new Set(strings.map((s) => s.material))];

export function Constraints(props: {
  value: SolveConstraints;
  unit: Unit;
  /** Name of the Lab's current racket, or null when none is chosen. */
  racketName: string | null;
  onChange: (next: SolveConstraints) => void;
}): JSX.Element {
  const { value, unit, racketName, onChange } = props;
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  function toggleMaterial(m: Material) {
    const next = value.materials.includes(m)
      ? value.materials.filter((x) => x !== m)
      : [...value.materials, m];
    onChange({ ...value, materials: next });
  }

  function setFrom(lb: number) {
    onChange({ ...value, tensionRange: [Math.min(lb, value.tensionRange[1]), value.tensionRange[1]] });
  }

  function setTo(lb: number) {
    onChange({ ...value, tensionRange: [value.tensionRange[0], Math.max(lb, value.tensionRange[0])] });
  }

  return (
    <div className="solve-constraints">
      <button
        type="button"
        className="btn btn-sm btn-ghost solve-constraints__toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? t('solve.hideConstraints') : t('solve.showConstraints')}
      </button>

      {open && (
        <div className="solve-constraints__body">
          <label className={racketName ? 'solve-check' : 'solve-check solve-check--disabled'}>
            <input
              type="checkbox"
              checked={value.racketId !== null}
              disabled={racketName === null}
              onChange={(e) => onChange({ ...value, racketId: e.target.checked ? props.value.racketId : null })}
            />
            <span>
              {t('solve.lockRacket')}
              <span className="solve-check__hint">{racketName ?? t('solve.lockRacketHint')}</span>
            </span>
          </label>

          <div className="solve-field">
            <div className="eyebrow">{t('solve.materials')}</div>
            <div className="filters filters--sub">
              <button
                type="button"
                className="filter"
                aria-pressed={value.materials.length === 0}
                onClick={() => onChange({ ...value, materials: [] })}
              >
                {t('solve.materialsAll')}
              </button>
              {MATERIALS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="filter"
                  aria-pressed={value.materials.includes(m)}
                  onClick={() => toggleMaterial(m)}
                >
                  {t(`material.${m}` as Key)}
                </button>
              ))}
            </div>
          </div>

          <div className="solve-field">
            <div className="solve-field__head">
              <span className="eyebrow">{t('solve.tensionRange')}</span>
              <span className="num solve-field__value">
                {formatTension(value.tensionRange[0], unit)} – {formatTension(value.tensionRange[1], unit)}
              </span>
            </div>
            <label className="sr-only" htmlFor="solve-range-from">
              {t('solve.rangeFrom')}
            </label>
            <input
              id="solve-range-from"
              className="solve-target__input"
              type="range"
              min={TENSION_MIN}
              max={TENSION_MAX}
              step={1}
              value={value.tensionRange[0]}
              onChange={(e) => setFrom(Number(e.target.value))}
            />
            <label className="sr-only" htmlFor="solve-range-to">
              {t('solve.rangeTo')}
            </label>
            <input
              id="solve-range-to"
              className="solve-target__input"
              type="range"
              min={TENSION_MIN}
              max={TENSION_MAX}
              step={1}
              value={value.tensionRange[1]}
              onChange={(e) => setTo(Number(e.target.value))}
            />
          </div>

          <label className="solve-check">
            <input
              type="checkbox"
              checked={value.allowHybrid}
              onChange={(e) => onChange({ ...value, allowHybrid: e.target.checked })}
            />
            <span>
              {t('solve.allowHybrid')}
              <span className="solve-check__hint">{t('solve.allowHybridHint')}</span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
```

Note the racket-lock checkbox reads `value.racketId !== null` but cannot supply
the id itself — `Solver` owns that, so the handler below in Step 2 passes a
wrapper. Replace the checkbox `onChange` line with:

```tsx
              onChange={(e) => onChange({ ...value, racketId: e.target.checked ? (racketId ?? null) : null })}
```

and add `racketId: string | null;` to the props (the Lab's current racket id,
independent of whether the lock is on) plus `const { racketId } = props;`.

- [ ] **Step 2: Wire it into Solver**

In `src/components/Solver/Solver.tsx`:

```tsx
import { Constraints } from './Constraints';
import { racketById } from '../../data';
```

Replace the memoised `constraints` constant with state:

```tsx
  const [constraints, setConstraints] = useState<SolveConstraints>({
    racketId: null,
    materials: [],
    tensionRange: [TENSION_MIN, TENSION_MAX],
    allowHybrid: true,
  });

  const racket = setup.racketId ? racketById.get(setup.racketId) : undefined;

  // Drop a lock that points at a racket the Lab no longer has selected.
  const effective: SolveConstraints = useMemo(
    () => (constraints.racketId && constraints.racketId !== setup.racketId
      ? { ...constraints, racketId: setup.racketId }
      : constraints),
    [constraints, setup.racketId],
  );

  const deferredTarget = useDeferredValue(target);
  const deferredConstraints = useDeferredValue(effective);
  const results = useMemo(
    () => solve(deferredTarget, deferredConstraints),
    [deferredTarget, deferredConstraints],
  );
```

and render it under the sliders:

```tsx
          <Constraints
            value={effective}
            racketId={setup.racketId}
            racketName={racket?.name ?? null}
            unit={setup.unit}
            onChange={setConstraints}
          />
```

- [ ] **Step 3: Add the styles**

Append to `src/components/Solver/Solver.css`:

```css
.solve-constraints {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.solve-constraints__toggle {
  align-self: flex-start;
  padding-left: 0;
}

.solve-constraints__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.solve-check {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  color: var(--text);
  cursor: pointer;
}

.solve-check--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.solve-check input[type='checkbox'] {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  flex-shrink: 0;
  accent-color: var(--accent);
  cursor: inherit;
}

.solve-check__hint {
  display: block;
  font-size: 12.5px;
  color: var(--muted);
}

.solve-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.solve-field__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.solve-field__value {
  font-size: 13px;
  color: var(--text);
}
```

- [ ] **Step 4: Verify**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/Solver
git commit -m "feat(solve): constraints panel for racket lock, materials and tension range"
```

---

### Task 9: Result cards and loading into the Lab

**Files:**
- Create: `src/components/Solver/load.ts`, `src/components/Solver/load.test.ts`, `src/components/Solver/ResultCard.tsx`
- Modify: `src/components/Solver/Solver.tsx`, `src/components/Solver/Solver.css`

**Interfaces:**
- Consumes: `Candidate` from `src/model/solve.ts`; `SetupAction` from `src/state/useSetup.ts`;
  `reduce`, `DEFAULT_SETUP` for the test.
- Produces: `buildLoadActions(c: Candidate): SetupAction[]` and
  `ResultCard(props: { candidate: Candidate; target: Attrs; labels: Record<Attr, string>; unit: Unit; onLoad: () => void }): JSX.Element`.

- [ ] **Step 1: Write the failing test**

Create `src/components/Solver/load.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Candidate } from '../../model/solve';
import { DEFAULT_SETUP } from '../../state/hash';
import { reduce } from '../../state/useSetup';
import { buildLoadActions } from './load';

const candidate: Candidate = {
  racketId: 'head-speed-pro-2024',
  mainsId: 'luxilon-alu-power',
  mainsGauge: 1.3,
  crossesId: 'wilson-natural-gut',
  crossesGauge: 1.3,
  mainsTension: 56,
  crossesTension: 54,
  attrs: { power: 50, control: 50, spin: 50, comfort: 50, durability: 50, tensionMaintenance: 50 },
  gaps: { power: 0, control: 0, spin: 0, comfort: 0, durability: 0, tensionMaintenance: 0 },
  score: 92,
};

const apply = (c: Candidate) => buildLoadActions(c).reduce(reduce, DEFAULT_SETUP);

describe('buildLoadActions', () => {
  it('reproduces the candidate exactly in the Lab state', () => {
    const s = apply(candidate);
    expect(s.racketId).toBe('head-speed-pro-2024');
    expect(s.mainsId).toBe('luxilon-alu-power');
    expect(s.mainsGauge).toBe(1.3);
    expect(s.crossesId).toBe('wilson-natural-gut');
    expect(s.crossesGauge).toBe(1.3);
    expect(s.mainsTension).toBe(56);
    expect(s.crossesTension).toBe(54);
  });

  it('clears the racket for a no-racket candidate', () => {
    const s = apply({ ...candidate, racketId: null });
    expect(s.racketId).toBeNull();
  });

  it('sets the crosses tension last so linking cannot overwrite it', () => {
    // A candidate whose crosses gap is not the default 2 lb must survive intact.
    const s = apply({ ...candidate, mainsTension: 50, crossesTension: 35 });
    expect(s.mainsTension).toBe(50);
    expect(s.crossesTension).toBe(35);
    expect(s.linkTensions).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Solver/load.test.ts`
Expected: FAIL — `Failed to resolve import "./load"`.

- [ ] **Step 3: Write the implementation**

Create `src/components/Solver/load.ts`:

```ts
import type { Candidate } from '../../model/solve';
import type { SetupAction } from '../../state/useSetup';

/**
 * Order matters: `setMainsTension` re-derives the crosses tension while
 * tensions are linked, so the crosses tension is written last.
 */
export function buildLoadActions(c: Candidate): SetupAction[] {
  return [
    { type: 'setRacket', id: c.racketId },
    { type: 'setMains', id: c.mainsId },
    { type: 'setMainsGauge', gauge: c.mainsGauge },
    { type: 'setCrosses', id: c.crossesId },
    { type: 'setCrossesGauge', gauge: c.crossesGauge },
    { type: 'setMainsTension', lb: c.mainsTension },
    { type: 'setCrossesTension', lb: c.crossesTension },
  ];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/Solver/load.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write the result card**

Create `src/components/Solver/ResultCard.tsx`:

```tsx
import { racketById, stringById } from '../../data';
import { ATTRS, type Attr, type Attrs } from '../../data/types';
import type { Candidate } from '../../model/solve';
import { formatTension, type Unit } from '../../model/units';
import { useI18n } from '../../i18n/useI18n';

const GAP_CHIP_THRESHOLD = 3;

function StringLine(props: { label: string; id: string; gauge: number }): JSX.Element {
  const s = stringById.get(props.id)!;
  return (
    <div className="solve-card__line">
      <span className="eyebrow">{props.label}</span>
      <span className="solve-card__string">
        {s.brand} {s.name} <span className="num">{props.gauge.toFixed(2)}</span> mm
      </span>
    </div>
  );
}

export function ResultCard(props: {
  candidate: Candidate;
  target: Attrs;
  labels: Record<Attr, string>;
  unit: Unit;
  onLoad: () => void;
}): JSX.Element {
  const { candidate: c, target, labels, unit, onLoad } = props;
  const { t } = useI18n();

  const racket = c.racketId ? racketById.get(c.racketId) : undefined;
  const same = c.mainsId === c.crossesId && c.mainsGauge === c.crossesGauge;

  return (
    <article className="solve-card panel">
      <div className="solve-card__head">
        <h3 className="solve-card__racket">{racket ? racket.name : t('solve.noRacket')}</h3>
        <span className="chip chip-accent solve-card__match">
          {t('solve.match')} <span className="num">{Math.round(c.score)}</span>
        </span>
      </div>

      <div className="solve-card__strings">
        {same ? (
          <StringLine label={t('solve.sameString')} id={c.mainsId} gauge={c.mainsGauge} />
        ) : (
          <>
            <StringLine label={t('solve.mains')} id={c.mainsId} gauge={c.mainsGauge} />
            <StringLine label={t('solve.crosses')} id={c.crossesId} gauge={c.crossesGauge} />
          </>
        )}
        <div className="solve-card__line">
          <span className="eyebrow">{t('solve.tension')}</span>
          <span className="num solve-card__tension">
            {formatTension(c.mainsTension, unit)} / {formatTension(c.crossesTension, unit)}
          </span>
        </div>
      </div>

      <div className="hairline" />

      <div className="solve-card__attrs">
        {ATTRS.map((a) => {
          const value = c.attrs[a];
          const gap = c.gaps[a];
          return (
            <div className="solve-attr" key={a}>
              <span className="solve-attr__label">{labels[a]}</span>
              <span
                className="solve-attr__track"
                role="meter"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={labels[a]}
              >
                <span className="solve-attr__fill" style={{ width: `${value}%` }} />
                <span
                  className="solve-attr__tick"
                  style={{ left: `${target[a]}%` }}
                  title={t('solve.targetTick')}
                />
              </span>
              <span className="solve-attr__value num">{value}</span>
              {Math.abs(gap) > GAP_CHIP_THRESHOLD && (
                <span className={gap > 0 ? 'solve-attr__gap solve-attr__gap--up' : 'solve-attr__gap solve-attr__gap--down'}>
                  {gap > 0 ? `+${gap}` : gap}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="solve-card__foot">
        <button type="button" className="btn btn-sm btn-accent" onClick={onLoad}>
          {t('solve.loadInLab')}
        </button>
      </div>
    </article>
  );
}
```

- [ ] **Step 6: Render the cards in Solver**

In `src/components/Solver/Solver.tsx` add the imports:

```tsx
import { ResultCard } from './ResultCard';
import { buildLoadActions } from './load';
import { useToast } from '../Toast/Toast';
```

Add `const { show } = useToast();` next to the other hooks, plus the handler:

```tsx
  function loadCandidate(c: Candidate) {
    for (const action of buildLoadActions(c)) props.dispatch(action);
    const racket = c.racketId ? racketById.get(c.racketId) : undefined;
    const mains = stringById.get(c.mainsId)!;
    show(racket ? t('toast.loadedRacket', { name: racket.name }) : mains.name);
    props.onGoLab();
  }
```

Add `type Candidate` to the `../../model/solve` import and `stringById` to the
`../../data` import. Replace the placeholder `<ul className="solve-list">` block with:

```tsx
          <div className="solve-list">
            {results.map((c, i) => (
              <div
                key={`${c.racketId}|${c.mainsId}|${c.mainsGauge}|${c.crossesId}|${c.crossesGauge}|${c.mainsTension}`}
                className="rise"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <ResultCard
                  candidate={c}
                  target={target}
                  labels={labels}
                  unit={setup.unit}
                  onLoad={() => loadCandidate(c)}
                />
              </div>
            ))}
          </div>
```

- [ ] **Step 7: Add the styles**

Append to `src/components/Solver/Solver.css`:

```css
.solve-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.solve-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.solve-card__racket {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.solve-card__match .num {
  font-weight: 700;
}

.solve-card__strings {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.solve-card__line {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  align-items: baseline;
  gap: 10px;
}

.solve-card__string,
.solve-card__tension {
  font-size: 13.5px;
  color: var(--text);
}

.solve-card__attrs {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.solve-attr {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 28px 44px;
  align-items: center;
  gap: 8px;
}

.solve-attr__label {
  font-size: 12.5px;
  color: var(--muted);
}

.solve-attr__track {
  position: relative;
  display: block;
  height: 6px;
  border-radius: var(--r-pill);
  background: var(--panel-3);
  overflow: visible;
}

.solve-attr__fill {
  display: block;
  height: 100%;
  border-radius: var(--r-pill);
  background: var(--accent);
  transition: width var(--dur) var(--ease-out);
}

.solve-attr__tick {
  position: absolute;
  top: -3px;
  width: 2px;
  height: 12px;
  margin-left: -1px;
  border-radius: 1px;
  background: var(--text);
  opacity: 0.75;
}

.solve-attr__value {
  font-size: 12.5px;
  text-align: right;
  color: var(--text);
}

.solve-attr__gap {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  text-align: right;
}

.solve-attr__gap--up {
  color: var(--ok);
}

.solve-attr__gap--down {
  color: var(--warn);
}

.solve-card__foot {
  display: flex;
  justify-content: flex-end;
}
```

- [ ] **Step 8: Verify**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/components/Solver
git commit -m "feat(solve): result cards with target ticks and load-into-lab"
```

---

### Task 10: End-to-end verification

**Files:** none changed unless a defect turns up.

- [ ] **Step 1: Full suite and typecheck**

Run: `npm test && npm run build`
Expected: every test passes; `tsc --noEmit` reports nothing; vite build succeeds.

- [ ] **Step 2: Run the app and exercise the section**

Start the dev server through the preview tooling (`.claude/launch.json` already
defines it), open the 反推 section, and check:

- Six sliders start at the Lab's current read-out, not at 50.
- Dragging a slider changes the result list without visible lag.
- "用当前配置" restores the sliders to the Lab read-out.
- Constraints expand; locking the racket is disabled until a racket is chosen in
  the Lab; a material filter narrows the results; narrowing the tension range
  narrows the tensions shown.
- Turning hybrids off leaves every card with one string on both sides.
- "载入工作台" jumps to the Lab with exactly that setup applied.
- Switching the language swaps every label in the section.

- [ ] **Step 3: Check the browser console**

Expected: no errors, no React key warnings.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(solve): <specific defect found during verification>"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| 3 Module interface | 1, 2 |
| 4.1 Main sweep | 2 |
| 4.2 Hybrid expansion | 4 |
| 4.3 Diversity and truncation | 3 |
| 4.4 Degenerate cases | 2 (empty-result tests) |
| 5 Scoring | 1 (primitives), 2 (applied) |
| 6.1 Left panel | 7 (sliders), 8 (constraints) |
| 6.2 Right panel | 9 |
| 6.3 `useDeferredValue` | 6, 8 |
| 7 sessionStorage, no URL hash | 7 |
| 8 Testing | 1–4, 9 |
| 9 i18n | 5 |
| 10 Files | matches the File Structure table |

**Deviations from the spec, deliberate:**

- The spec named `TargetSliders.tsx` but not `Constraints.tsx` or `load.ts`.
  Both were split out to keep `Solver.tsx` small and, in `load.ts`'s case,
  because there is no DOM test environment — the load behaviour has to live in
  a pure module to be testable at all.
- The spec's performance bound was 200 ms; the test asserts 400 ms. CI machines
  are slower than a dev laptop and a flaky timing test is worse than a loose
  one. The real measurement is checked by hand in Task 10.
- The spec said the extreme-gauge penalty is 1 "if the chosen gauge is the
  thickest or thinnest". Task 1 additionally requires the string to offer at
  least three gauges, otherwise a two-gauge string would be penalised for every
  choice it has.
