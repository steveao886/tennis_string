# Reverse Solver — Design Spec

Date: 2026-09-06
Status: approved by user in brainstorming session.
Builds on: `2026-09-06-tennis-string-helper-design.md`

## 1. Goal

Invert the String Lab. Instead of "pick a setup, see the feel", the user drags
six target attribute sliders and gets back a ranked list of concrete setups —
racket, mains string + gauge, crosses string + gauge, tensions — that land
closest to those targets. One click loads a result into the Lab for fine
tuning.

Out of scope: price/budget constraints (no price data exists), player-style
presets ("play like Nadal"), saving or comparing shortlists.

## 2. Decisions taken during brainstorming

| Question | Decision |
|---|---|
| How do the six attributes participate? | All six always count. Sliders start at the current Lab setup's computed read-out, so the user adjusts from their own present feel rather than from a blank 50. |
| Search space | Same-string mains/crosses as the main sweep, plus a bounded hybrid expansion. Not the full 47×47 cross product. |
| Constraints | Lock current racket, material filter, tension range — all three. |
| Placement | New nav section (工作台 / 反推 / 球拍 / 球星). |
| Scoring | Weighted distance plus light realism penalties. |
| Algorithm | Full brute-force enumeration. No closed-form inversion, no worker, no precomputed index. |

### 2.1 Why brute force

The space is small. 23 rackets (22 plus "no racket") × 122 string-gauge pairs ×
36 integer tensions is roughly 100k calls to `computeBed()`, about 20–40 ms
synchronously. With the racket locked it drops to ~4k.

Closed-form inversion is possible — tension enters `computeBed` only through
`d = tanh(...)` and the five affected attributes are linear in `d`, making the
objective quadratic in `d` — but it buys speed we do not need at the cost of
coupling the solver to the model's exact algebra. Any future edit to
`computeBed` would silently invalidate the solver. Enumeration stays correct by
construction.

## 3. Module: `src/model/solve.ts`

Pure, no React imports, unit-testable in isolation.

```ts
import type { Attrs, Material } from '../data/types';

export interface SolveConstraints {
  racketId: string | null;         // locked racket; null = search all + "no racket"
  materials: Material[];           // empty = unrestricted
  tensionRange: [number, number];  // lb, mains tension bounds
  allowHybrid: boolean;
}

export interface Candidate {
  racketId: string | null;
  mainsId: string;
  mainsGauge: number;
  crossesId: string;
  crossesGauge: number;
  mainsTension: number;            // lb
  crossesTension: number;          // lb
  attrs: Attrs;                    // the setup's actual read-out
  gaps: Attrs;                     // actual minus target, per attribute
  score: number;                   // 0–100 match quality
}

export function solve(target: Attrs, c: SolveConstraints): Candidate[];
```

One function in, one array out. The UI knows nothing about how the search
works, so the algorithm can be replaced without touching a component.

## 4. Algorithm

### 4.1 Stage 1 — main sweep

- **Rackets**: the locked racket alone, or `undefined` plus all 22.
- **Strings**: every (string, gauge) pair whose material passes the material
  filter — 122 pairs unfiltered. Mains and crosses are the same string and the
  same gauge in this stage.
- **Tension**: integer mains tension across the requested range intersected
  with `[TENSION_MIN, TENSION_MAX]`. Crosses tension is mains minus `LINK_GAP`
  (2 lb), reusing the Lab's existing convention so the sweep stays
  one-dimensional. Crosses tension is clamped to `TENSION_MIN` if the
  subtraction would fall below it.

Each combination is scored (section 5). Keep a running top-K, K = 40.

### 4.2 Stage 2 — hybrid expansion

Skipped when `allowHybrid` is false.

Take the stage-1 candidates whose mains string is `poly`. For each, pair it
with every non-poly string (multifilament / synthetic-gut / natural-gut — 16 in
the current data) that passes the material filter, across that string's gauges,
and re-sweep tension. This is the poly-mains / soft-crosses pattern that
hybrids actually use in practice; searching all 47×47 pairs would mostly
produce combinations nobody strings.

Approximate cost: 40 × 16 × ~2.6 gauges × 36 tensions, about 60k further calls.

Hybrid candidates join the same ranked pool as stage-1 candidates.

### 4.3 Stage 3 — diversity and truncation

Walk the pool best-first, admitting a candidate only if it would not exceed
**2 entries sharing the same racket** or **2 entries sharing the same mains
string**. Return the first 8 admitted.

Without this the top eight are typically one string at eight adjacent tensions.

### 4.4 Degenerate cases

If the material filter and tension range together admit nothing, `solve`
returns an empty array; the UI shows an explanatory empty state rather than an
error.

## 5. Scoring

```
distance = sqrt( sum over 6 attrs of (actual[a] - target[a])^2 / 6 )
score    = clamp(0, 100, 100 - distance - penalty)
```

Realism penalties, deliberately small so they only separate near-ties:

- **Tension outside the racket's `recTension` band**: 0.3 per lb of deviation,
  capped at 6. Not applied when no racket is selected.
- **Extreme gauge**: 1 if the chosen gauge is the thickest or the thinnest
  option that string offers.

`score` is rounded for display ("匹配度 87"). `gaps` holds the per-attribute
difference, rounded, feeding the `力量 +6 / 控制 −3` chips.

## 6. UI: `src/components/Solver/`

`Nav` gains a `solve` section between `lab` and `rackets`, so the order reads
工作台 / 反推 / 球拍 / 球星. `App.tsx` renders `<Solver setup dispatch onGoLab />`,
matching how `Rackets` and `Players` are already wired.

Two panels, reusing the existing `panel` / `eyebrow` / `chip` / `btn` classes.

### 6.1 Left panel — 我想要的手感

- Six sliders, 0–100, step 1, one per attribute.
- Initial values: `computeBed()` of the current Lab setup. A "用当前配置重置"
  button restores them.
- Constraint block, collapsed by default:
  - 锁定当前球拍 — toggle; disabled with an explanatory hint when the Lab has no
    racket selected.
  - 材质 — multi-select chips over the materials present in the data.
  - 磅数区间 — two sliders bounding mains tension, defaulting to the full
    35–70 lb range, displayed in the Lab's current lb/kg unit.
  - 允许混穿 — toggle, default on.

### 6.2 Right panel — 匹配结果

Up to 8 cards. Each card carries:

- Match badge showing `score`.
- Racket name, or "不选球拍" when `racketId` is null.
- Mains string + gauge and crosses string + gauge, collapsed to a single line
  when they are identical.
- Both tensions, formatted through the existing `formatTension` in the user's
  current unit.
- Six mini attribute bars: bar length is the actual value, a tick mark on the
  track shows the target. A `力量 +6` style chip appears next to any attribute
  whose gap exceeds ±3.
- "载入工作台" button — dispatches `setRacket` / `setMains` / `setMainsGauge` /
  `setCrosses` / `setCrossesGauge` / `setMainsTension` / `setCrossesTension`,
  then calls `onGoLab()`.

### 6.3 Responsiveness

Recompute through `useDeferredValue` on the target vector rather than a
debounce timer: dragging stays at full frame rate and the search lands behind
it. React 18 native, no timers to clean up.

## 7. State and URL

Target values and constraints are **not** written to the URL hash. The hash's
current meaning is "one concrete string setup", and mixing solver intent into
it would corrupt the semantics of every shared link. Targets persist in
`sessionStorage` under `tsh.solve`, the same treatment `section` already gets,
with a try/catch fallback to in-memory state.

Sharing still means sharing a setup: load a result into the Lab, then share
from there.

## 8. Testing (`src/model/solve.test.ts`)

- **Round trip**, the load-bearing test: compute `attrs` for a known setup, use
  it as the target, and assert the top result's `attrs` deep-equal the target
  and its `score` is at least 99. Asserting on the read-out rather than on the
  exact ids is deliberate — several setups can produce identical rounded
  attributes, and any of them is a correct answer. A failure here means the
  solver has drifted out of sync with `computeBed`.
- Locked racket: every result's `racketId` equals the locked id.
- Material filter: every result's mains and crosses materials are in the set.
- Tension range: every result's mains tension is inside the range.
- Diversity: no racket and no mains string appears three times.
- Empty result: an impossible constraint set returns an empty array rather than
  throwing.
- Performance: unlocked racket with hybrids enabled completes under 200 ms.

Component-level behaviour — the load button dispatching the right actions — is
covered by a `Solver` test in the style of the existing `resolve.test.ts`.

## 9. i18n

Roughly 25 new keys under `solve.*`, added to both `en.ts` and `zh.ts`. The
existing `i18n.test.ts` parity test catches any omission automatically.

## 10. Files

New:

- `src/model/solve.ts`
- `src/model/solve.test.ts`
- `src/components/Solver/Solver.tsx`
- `src/components/Solver/Solver.css`
- `src/components/Solver/ResultCard.tsx`
- `src/components/Solver/TargetSliders.tsx`

Modified:

- `src/components/Nav/Nav.tsx` — add the `solve` section
- `src/App.tsx` — route the section, extend `SECTIONS`
- `src/i18n/en.ts`, `src/i18n/zh.ts` — new keys
