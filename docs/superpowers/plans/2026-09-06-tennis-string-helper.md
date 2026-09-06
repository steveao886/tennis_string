# Tennis String Helper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a bilingual (zh/en) single-page tennis stringing helper with a live string-bed attribute model, Wilson/Head racket catalogue and pro-player setups, deployed to GitHub Pages.

**Architecture:** Vite + React 18 + TypeScript, no UI library. Pure data modules (`src/data`), a pure computation model (`src/model`), a reducer-based setup state synced to the URL hash (`src/state`), and presentational components (`src/components`). Vitest covers model, data integrity, i18n parity and hash round-trip. GitHub Actions builds and deploys `dist/` to Pages.

**Tech Stack:** react, react-dom, vite, typescript, vitest, @vitejs/plugin-react. Google Fonts (Bricolage Grotesque, Inter, Noto Sans SC).

Spec: `docs/superpowers/specs/2026-09-06-tennis-string-helper-design.md` (read it first).

Repo root: `C:\Users\gaosi\repos\tennis_string`. Windows; use PowerShell or Git Bash. `npm` and `git` are on PATH.

---

## File map

| File | Responsibility |
|---|---|
| `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx` | scaffold (Task 0) |
| `src/data/types.ts` | shared types (Task 0) |
| `src/data/strings.ts` | ~47 strings catalogue (Task 1) |
| `src/data/rackets.ts` | 20 Wilson/Head rackets (Task 2) |
| `src/data/players.ts` | ~24 pro setups, web-verified (Task 3) |
| `src/data/index.ts` | re-exports + lookup maps `stringById`, `racketById` (Task 1 creates, Task 2/3 extend) |
| `src/data/data.test.ts` | integrity tests (Task 1 creates, Tasks 2/3 extend) |
| `src/model/units.ts`, `stringbed.ts`, `insights.ts` + tests | computation (Task 4) |
| `src/i18n/en.ts`, `zh.ts`, `l10n.ts`, `useI18n.tsx` + test | i18n (Task 5) |
| `src/state/hash.ts`, `useSetup.ts` + test | setup state (Task 6) |
| `src/styles/tokens.css`, `global.css` | design tokens (Task 7) |
| `src/hooks/useSpringValues.ts` | animation (Task 7) |
| `src/components/Radar/`, `Slider/`, `Select/`, `AttrBars/`, `InsightList/`, `Toast/`, `Nav/` | shared UI (Task 7) |
| `src/components/Lab/Lab.tsx` | lab section (Task 8) |
| `src/components/Rackets/Rackets.tsx` | rackets section (Task 9) |
| `src/components/Players/Players.tsx` | players section (Task 10) |
| `src/App.tsx` | assembly (Task 11) |
| `.github/workflows/deploy.yml`, `README.md` | deploy (Task 12) |

Task dependency: 0 → {1, 2, 3, 4, 5, 6 in parallel} → 7 → {8, 9, 10 in parallel} → 11 → 12.

---

### Task 0: Scaffold

**Files:** create `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `src/data/types.ts`.

- [ ] **Step 1: package.json**

```json
{
  "name": "tennis-string-helper",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/tennis_string/',
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
```
Add `/// <reference types="vitest" />` at the top of the file so the `test` key type-checks.

- [ ] **Step 3: tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 4: index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>String Lab · 网球穿线助手</title>
    <meta name="description" content="Tennis stringing helper: strings, tensions, rackets and pro setups." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%23d8ff3e'/><path d='M20 20 Q50 50 20 80 M80 20 Q50 50 80 80' stroke='%230f1115' stroke-width='6' fill='none'/></svg>" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: src/main.tsx, src/App.tsx (stub), src/vite-env.d.ts**

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```
```tsx
// src/App.tsx (stub, replaced in Task 11)
export default function App() {
  return <main style={{ padding: 32 }}>String Lab scaffold OK</main>;
}
```
`src/vite-env.d.ts`: `/// <reference types="vite/client" />`.
Create empty `src/styles/tokens.css` and `src/styles/global.css` so the imports resolve (Task 7 fills them).

- [ ] **Step 6: src/data/types.ts**

```ts
export type Attr = 'power' | 'control' | 'spin' | 'comfort' | 'durability' | 'tensionMaintenance';
export const ATTRS: readonly Attr[] = ['power', 'control', 'spin', 'comfort', 'durability', 'tensionMaintenance'] as const;
export type Attrs = Record<Attr, number>; // 0–100
export type L10n = { zh: string; en: string };
export type Material = 'poly' | 'multifilament' | 'natural-gut' | 'synthetic-gut' | 'kevlar';
export type Shape = 'round' | 'shaped' | 'textured';

export interface TennisString {
  id: string;
  brand: string;
  name: string;
  material: Material;
  shape: Shape;
  gauges: number[];          // mm ascending
  defaultGauge: number;
  refTension: [number, number]; // lb, comfort zone
  attrs: Attrs;
  blurb: L10n;
}

export interface Racket {
  id: string;
  brand: 'Wilson' | 'Head';
  family: string;
  name: string;
  headSize: number;          // sq in
  weightUnstrung: number;    // g
  balance: string;           // e.g. '32.0 cm / 7 pts HL'
  stiffness: number;         // RA
  pattern: [number, number]; // [mains, crosses]
  beam: string;              // e.g. '21 mm'
  recTension: [number, number]; // lb
  attrs: Attrs;
  blurb: L10n;
}

export interface Player {
  id: string;
  name: string;
  nameZh: string;
  country: string;           // ISO 3166-1 alpha-2, uppercase
  tour: 'ATP' | 'WTA' | 'Legend';
  racket: { id?: string; label: string; note?: L10n };
  mains: { stringId?: string; label: string; gauge?: number };
  crosses: { stringId?: string; label: string; gauge?: number };
  tension: { mains: number; crosses: number }; // lb
  source: { label: string; url: string };
  verifiedOn: string;        // YYYY-MM-DD
  note?: L10n;
}
```

- [ ] **Step 7: install, verify, commit**

Run: `npm install` then `npm run build`. Expected: `dist/` produced, no TS errors.
Run: `npm test`. Expected: "No test files found" exit 0 (vitest 2 returns exit 1 with no tests: pass `--passWithNoTests` in the script: `"test": "vitest run --passWithNoTests"`).

```bash
git add -A && git commit -m "chore: scaffold vite react ts app"
```

---

### Task 1: Strings catalogue

**Files:** create `src/data/strings.ts`, `src/data/index.ts`, `src/data/data.test.ts`.

- [ ] **Step 1: Write failing integrity test** `src/data/data.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { ATTRS } from './types';
import { strings } from './strings';

describe('strings catalogue', () => {
  it('has at least 40 entries with unique ids', () => {
    expect(strings.length).toBeGreaterThanOrEqual(40);
    expect(new Set(strings.map((s) => s.id)).size).toBe(strings.length);
  });
  it('every string is well formed', () => {
    for (const s of strings) {
      expect(s.id).toMatch(/^[a-z0-9-]+$/);
      expect(s.gauges.length).toBeGreaterThan(0);
      expect([...s.gauges]).toEqual([...s.gauges].sort((a, b) => a - b));
      expect(s.gauges).toContain(s.defaultGauge);
      expect(s.refTension[0]).toBeLessThan(s.refTension[1]);
      for (const a of ATTRS) {
        expect(s.attrs[a]).toBeGreaterThanOrEqual(0);
        expect(s.attrs[a]).toBeLessThanOrEqual(100);
      }
      expect(s.blurb.zh.length).toBeGreaterThan(4);
      expect(s.blurb.en.length).toBeGreaterThan(4);
    }
  });
  it('contains the ids other modules rely on', () => {
    const ids = new Set(strings.map((s) => s.id));
    for (const id of ['luxilon-alu-power', 'luxilon-alu-power-rough', 'luxilon-4g', 'babolat-rpm-blast', 'babolat-vs-touch', 'wilson-natural-gut', 'head-hawk-touch', 'head-lynx-tour', 'solinco-hyper-g', 'tecnifibre-razor-code', 'yonex-poly-tour-pro'])
      expect(ids.has(id), id).toBe(true);
  });
});
```

Run: `npm test`. Expected: FAIL (module `./strings` not found).

- [ ] **Step 2: Write `src/data/strings.ts`**

Export `export const strings: TennisString[] = [ ... ]`. Include **exactly these ids** (add more if you like, keep ≥ 40 total). Use the archetype baselines below for `attrs`, then nudge ±10 per string using what you know from Tennis Warehouse / Tennisnerd reviews. `refTension` is in lb. Blurbs: one sentence each, zh and en, concrete (who it suits, what it feels like).

Archetype baselines (power/control/spin/comfort/durability/tensionMaintenance):
- stiff control poly (ALU Power, 4G, Big Banger, Confidential, Poly Tour Strike, Explosive Tour): 40/85/70/35/80/55 (4G: tensionMaintenance 78)
- shaped spin poly (RPM Blast, Hyper-G, Tour Bite, Black Code, Lynx Tour, Poly Tour Rev, Cyclone, Mach-10, Revolve Spin, RPM Hurricane): 45/80/90/40/70/45
- soft/arm-friendly poly (Element, Hawk Touch, Poly Tour Pro, Razor Soft, Sonic Pro, Hyper-G Soft, Pro Line Evolution, Ice Code, RPM Power): 55/72/70/60/65/50
- round all-round poly (Hawk, Lynx, Razor Code, Revolve, ALU Power Rough → spin 82): 48/78/72/45/75/52
- natural gut (Luxilon, Babolat VS Touch, Wilson, Head): 90/60/45/95/55/90
- multifilament (NXT, Sensation, Xcel, Velocity MLT, X-One Biphase, NRG2, Vanquish, Rexis, Triax): 80/55/45/85/45/70
- synthetic gut (Babolat Syn Gut, Wilson Syn Gut Power, Prince Syn Gut Duraflex): 65/60/45/65/55/60

Required entries (id — brand — name — material — shape — gauges — default — refTension):
1. luxilon-alu-power — Luxilon — ALU Power — poly — round — [1.15,1.20,1.25,1.30] — 1.25 — [48,58]
2. luxilon-alu-power-rough — Luxilon — ALU Power Rough — poly — textured — [1.25] — 1.25 — [48,58]
3. luxilon-4g — Luxilon — 4G — poly — round — [1.25,1.30] — 1.25 — [48,58]
4. luxilon-element — Luxilon — Element — poly — round — [1.25,1.30] — 1.25 — [45,55]
5. luxilon-big-banger-original — Luxilon — Big Banger Original — poly — round — [1.30] — 1.30 — [48,58]
6. luxilon-natural-gut — Luxilon — Natural Gut — natural-gut — round — [1.25,1.30] — 1.30 — [50,62]
7. babolat-rpm-blast — Babolat — RPM Blast — poly — shaped — [1.20,1.25,1.30,1.35] — 1.25 — [48,58]
8. babolat-rpm-rough — Babolat — RPM Rough — poly — textured — [1.25,1.30] — 1.25 — [48,58]
9. babolat-rpm-power — Babolat — RPM Power — poly — round — [1.25,1.30] — 1.25 — [46,56]
10. babolat-rpm-hurricane — Babolat — RPM Hurricane — poly — shaped — [1.25,1.30] — 1.25 — [48,58]
11. babolat-vs-touch — Babolat — VS Touch — natural-gut — round — [1.25,1.30] — 1.30 — [50,62]
12. babolat-xcel — Babolat — Xcel — multifilament — round — [1.25,1.30] — 1.30 — [50,62]
13. babolat-syn-gut — Babolat — Synthetic Gut — synthetic-gut — round — [1.25,1.30] — 1.30 — [50,62]
14. wilson-natural-gut — Wilson — Natural Gut — natural-gut — round — [1.25,1.30] — 1.30 — [50,62]
15. wilson-nxt — Wilson — NXT — multifilament — round — [1.24,1.30] — 1.30 — [50,62]
16. wilson-sensation — Wilson — Sensation — multifilament — round — [1.25,1.30] — 1.30 — [50,62]
17. wilson-revolve — Wilson — Revolve — poly — round — [1.20,1.25,1.30] — 1.25 — [48,58]
18. wilson-revolve-spin — Wilson — Revolve Spin — poly — shaped — [1.25,1.30] — 1.25 — [48,58]
19. wilson-syn-gut-power — Wilson — Synthetic Gut Power — synthetic-gut — round — [1.25,1.30] — 1.30 — [50,62]
20. head-hawk — Head — Hawk — poly — round — [1.20,1.25,1.30] — 1.25 — [48,58]
21. head-hawk-touch — Head — Hawk Touch — poly — round — [1.20,1.25,1.30] — 1.25 — [46,56]
22. head-lynx — Head — Lynx — poly — round — [1.20,1.25,1.30] — 1.25 — [48,58]
23. head-lynx-tour — Head — Lynx Tour — poly — shaped — [1.20,1.25,1.30] — 1.25 — [48,58]
24. head-sonic-pro — Head — Sonic Pro — poly — round — [1.25,1.30] — 1.25 — [46,56]
25. head-velocity-mlt — Head — Velocity MLT — multifilament — round — [1.25,1.30] — 1.25 — [50,62]
26. head-natural-gut — Head — Natural Gut — natural-gut — round — [1.25,1.30] — 1.30 — [50,62]
27. solinco-hyper-g — Solinco — Hyper-G — poly — shaped — [1.10,1.15,1.20,1.25,1.30] — 1.20 — [46,56]
28. solinco-hyper-g-soft — Solinco — Hyper-G Soft — poly — shaped — [1.15,1.20,1.25,1.30] — 1.20 — [45,55]
29. solinco-tour-bite — Solinco — Tour Bite — poly — shaped — [1.10,1.15,1.20,1.25,1.30] — 1.20 — [46,56]
30. solinco-confidential — Solinco — Confidential — poly — shaped — [1.15,1.20,1.25,1.30] — 1.20 — [46,56]
31. solinco-mach-10 — Solinco — Mach-10 — poly — shaped — [1.20,1.25] — 1.20 — [46,56]
32. solinco-vanquish — Solinco — Vanquish — multifilament — round — [1.25,1.30] — 1.30 — [50,62]
33. tecnifibre-black-code — Tecnifibre — Black Code — poly — shaped — [1.18,1.24,1.28] — 1.24 — [48,58]
34. tecnifibre-razor-code — Tecnifibre — Razor Code — poly — round — [1.20,1.25,1.30] — 1.25 — [48,58]
35. tecnifibre-razor-soft — Tecnifibre — Razor Soft — poly — round — [1.20,1.25,1.30] — 1.25 — [46,56]
36. tecnifibre-ice-code — Tecnifibre — Ice Code — poly — round — [1.20,1.25,1.30] — 1.25 — [46,56]
37. tecnifibre-x-one-biphase — Tecnifibre — X-One Biphase — multifilament — round — [1.18,1.24,1.30] — 1.24 — [50,62]
38. tecnifibre-nrg2 — Tecnifibre — NRG2 — multifilament — round — [1.24,1.32] — 1.24 — [50,62]
39. tecnifibre-triax — Tecnifibre — Triax — multifilament — round — [1.28,1.33] — 1.28 — [50,60]
40. yonex-poly-tour-pro — Yonex — Poly Tour Pro — poly — round — [1.15,1.20,1.25,1.30] — 1.25 — [46,56]
41. yonex-poly-tour-rev — Yonex — Poly Tour Rev — poly — shaped — [1.20,1.25] — 1.25 — [46,56]
42. yonex-poly-tour-strike — Yonex — Poly Tour Strike — poly — round — [1.20,1.25,1.30] — 1.25 — [48,58]
43. yonex-rexis — Yonex — Rexis — multifilament — round — [1.25,1.30] — 1.30 — [50,62]
44. kirschbaum-pro-line-evolution — Kirschbaum — Pro Line Evolution — poly — round — [1.20,1.25,1.30] — 1.25 — [46,56]
45. volkl-cyclone — Volkl — Cyclone — poly — shaped — [1.15,1.20,1.25,1.30] — 1.25 — [46,56]
46. prince-syn-gut-duraflex — Prince — Synthetic Gut Duraflex — synthetic-gut — round — [1.25,1.30] — 1.30 — [50,62]
47. dunlop-explosive-tour — Dunlop — Explosive Tour — poly — round — [1.25,1.30] — 1.25 — [48,58]

- [ ] **Step 3: Write `src/data/index.ts`**

```ts
import { strings } from './strings';
import type { TennisString } from './types';
export * from './types';
export { strings };
export const stringById: ReadonlyMap<string, TennisString> = new Map(strings.map((s) => [s.id, s]));
export const stringBrands: string[] = [...new Set(strings.map((s) => s.brand))];
```
(Tasks 2 and 3 append rackets/players exports here.)

- [ ] **Step 4: Run `npm test`** → PASS. Run `npx tsc --noEmit` → clean.
- [ ] **Step 5: Commit** `git add src/data && git commit -m "feat(data): strings catalogue"`

---

### Task 2: Rackets catalogue

**Files:** create `src/data/rackets.ts`; modify `src/data/index.ts`, `src/data/data.test.ts`.

- [ ] **Step 1: Add failing test** (append to `data.test.ts`)

```ts
import { rackets } from './rackets';
describe('rackets catalogue', () => {
  it('has 20 well-formed Wilson/Head rackets with unique ids', () => {
    expect(rackets.length).toBeGreaterThanOrEqual(18);
    expect(new Set(rackets.map((r) => r.id)).size).toBe(rackets.length);
    for (const r of rackets) {
      expect(['Wilson', 'Head']).toContain(r.brand);
      expect(r.headSize).toBeGreaterThanOrEqual(95);
      expect(r.headSize).toBeLessThanOrEqual(104);
      expect(r.weightUnstrung).toBeGreaterThanOrEqual(280);
      expect(r.weightUnstrung).toBeLessThanOrEqual(330);
      expect(r.stiffness).toBeGreaterThanOrEqual(50);
      expect(r.stiffness).toBeLessThanOrEqual(75);
      expect(r.pattern[0]).toBeGreaterThanOrEqual(16);
      expect(r.recTension[0]).toBeLessThan(r.recTension[1]);
      for (const a of ATTRS) { expect(r.attrs[a]).toBeGreaterThanOrEqual(0); expect(r.attrs[a]).toBeLessThanOrEqual(100); }
      expect(r.blurb.zh.length).toBeGreaterThan(4);
      expect(r.blurb.en.length).toBeGreaterThan(4);
    }
  });
});
```
Run: `npm test` → FAIL (module not found).

- [ ] **Step 2: Write `src/data/rackets.ts`** — `export const rackets: Racket[]` with exactly these ids. Use retail specs as published by Tennis Warehouse (unstrung weight, RA). `attrs` for rackets mean "what the frame adds": power, control, spin, comfort, durability (≈ stability/plow-through here), tensionMaintenance (≈ how forgiving the frame is of tension changes; keep 50–70). Balance strings like `'32.0 cm / 7 pts HL'`.

| id | family | name | head | wt g | RA | pattern | beam | recTension |
|---|---|---|---|---|---|---|---|---|
| wilson-pro-staff-97-v14 | Pro Staff | Pro Staff 97 v14 | 97 | 315 | 66 | 16x19 | 21.5 mm | [50,60] |
| wilson-rf01-pro | RF | RF 01 Pro | 97 | 315 | 65 | 16x19 | 21.5 mm | [50,60] |
| wilson-blade-98-16x19-v9 | Blade | Blade 98 16x19 v9 | 98 | 305 | 62 | 16x19 | 21 mm | [50,60] |
| wilson-blade-98-18x20-v9 | Blade | Blade 98 18x20 v9 | 98 | 305 | 62 | 18x20 | 21 mm | [50,60] |
| wilson-blade-100-v9 | Blade | Blade 100 v9 | 100 | 300 | 64 | 16x19 | 22 mm | [50,60] |
| wilson-clash-100-v3 | Clash | Clash 100 v3 | 100 | 295 | 55 | 16x19 | 24.5 mm | [48,58] |
| wilson-ultra-100-v4 | Ultra | Ultra 100 v4 | 100 | 300 | 70 | 16x19 | 26 mm | [50,60] |
| wilson-shift-99-v1 | Shift | Shift 99 v1 | 99 | 300 | 64 | 16x20 | 23 mm | [50,60] |
| head-speed-mp-2024 | Speed | Speed MP 2024 | 100 | 300 | 62 | 16x19 | 23 mm | [48,57] |
| head-speed-pro-2024 | Speed | Speed Pro 2024 | 100 | 310 | 62 | 18x20 | 23 mm | [48,57] |
| head-gravity-mp-2025 | Gravity | Gravity MP 2025 | 100 | 295 | 60 | 16x20 | 22 mm | [48,57] |
| head-gravity-pro-2025 | Gravity | Gravity Pro 2025 | 100 | 315 | 60 | 18x20 | 20 mm | [48,57] |
| head-radical-mp-2025 | Radical | Radical MP 2025 | 98 | 300 | 62 | 16x19 | 22 mm | [48,57] |
| head-radical-pro-2025 | Radical | Radical Pro 2025 | 98 | 315 | 62 | 16x19 | 22 mm | [48,57] |
| head-prestige-mp-2023 | Prestige | Prestige MP 2023 | 98 | 320 | 61 | 18x20 | 21 mm | [48,57] |
| head-prestige-pro-2023 | Prestige | Prestige Pro 2023 | 98 | 320 | 62 | 16x19 | 21 mm | [48,57] |
| head-extreme-mp-2024 | Extreme | Extreme MP 2024 | 100 | 300 | 65 | 16x19 | 23 mm | [48,57] |
| head-extreme-tour-2024 | Extreme | Extreme Tour 2024 | 98 | 305 | 62 | 16x19 | 22 mm | [48,57] |
| head-boom-mp-2024 | Boom | Boom MP 2024 | 100 | 295 | 66 | 16x19 | 23.5 mm | [48,57] |
| head-boom-pro-2024 | Boom | Boom Pro 2024 | 98 | 310 | 63 | 16x19 | 22 mm | [48,57] |

Attribute guidance: Pro Staff/RF: control 88 power 55 spin 60 comfort 60 durability 85. Blade 98 16x19: control 82 power 55 spin 68 comfort 70. Blade 18x20: control 90 spin 55. Clash: comfort 95 power 70 control 55 spin 70. Ultra: power 85 control 60 comfort 45. Speed MP: balanced 70s, Speed Pro control 85. Gravity: comfort 80 control 80. Radical: balanced. Prestige: control 92 comfort 75 power 45. Extreme: spin 90 power 75. Boom: power 80 spin 78 comfort 65.

- [ ] **Step 3: Extend `src/data/index.ts`**

```ts
import { rackets } from './rackets';
import type { Racket } from './types';
export { rackets };
export const racketById: ReadonlyMap<string, Racket> = new Map(rackets.map((r) => [r.id, r]));
export const racketFamilies = (brand: Racket['brand']): string[] => [...new Set(rackets.filter((r) => r.brand === brand).map((r) => r.family))];
```

- [ ] **Step 4: `npm test` → PASS; `npx tsc --noEmit` clean.**
- [ ] **Step 5: Commit** `git add src/data && git commit -m "feat(data): wilson/head racket catalogue"`

---

### Task 3: Pro player setups (web-verified)

**Files:** create `src/data/players.ts`; modify `src/data/index.ts`, `src/data/data.test.ts`.

This task REQUIRES web search. For each candidate player search e.g. `"<name> racquet strings tension" tennisnerd` or `site:tennisnerd.net <name>` and `site:tenniswarehouse.com <name> string`. Accept a player only if you find a page that states string + tension. Prefer tennisnerd.net, tenniswarehouse.com (Improve Your Game / "What the pros play"), tennis-warehouse learning center, brand interviews, peRFect Tennis. Record the URL you actually found. If two sources disagree, use the most recent and mention the range in `note`. Tension in lb (convert kg × 2.2046, round to integer).

Candidates (aim to keep ≥ 18): ATP: Carlos Alcaraz, Jannik Sinner, Novak Djokovic, Alexander Zverev, Daniil Medvedev, Holger Rune, Casper Ruud, Stefanos Tsitsipas, Taylor Fritz, Andrey Rublev, Alex de Minaur, Grigor Dimitrov, Lorenzo Musetti, Jack Draper, Ben Shelton, Félix Auger-Aliassime, Nick Kyrgios, Tommy Paul, Hubert Hurkacz. WTA: Iga Świątek, Aryna Sabalenka, Coco Gauff, Elena Rybakina, Zheng Qinwen (郑钦文). Legends (tour 'Legend'): Roger Federer, Rafael Nadal, Andy Murray, Serena Williams.

`nameZh` examples: 阿尔卡拉斯, 辛纳, 德约科维奇, 兹维列夫, 梅德韦杰夫, 鲁内, 鲁德, 西西帕斯, 弗里茨, 卢布列夫, 德米纳尔, 迪米特洛夫, 穆塞蒂, 德雷珀, 谢尔顿, 奥热-阿利亚西姆, 克耶高斯, 保罗, 胡尔卡奇, 斯瓦泰克, 萨巴伦卡, 高芙, 莱巴金娜, 郑钦文, 费德勒, 纳达尔, 穆雷, 小威廉姆斯.

Id linking rules: set `mains.stringId` / `crosses.stringId` only when the string exists in `src/data/strings.ts` (read that file for the id list). Set `racket.id` only for Wilson/Head rackets in `src/data/rackets.ts` and only when the retail model matches (e.g. Federer → `wilson-rf01-pro` is NOT correct historically; use label `Wilson Pro Staff RF97 Autograph` with no id and a note). Djokovic → label `Head Speed Pro` id `head-speed-pro-2024` with note that it is a paint job over a PT113B pro stock. Always fill `label`.

- [ ] **Step 1: Add failing test** (append to `data.test.ts`)

```ts
import { players } from './players';
import { stringById, racketById } from './index';
describe('players', () => {
  it('has ≥18 players, unique ids, resolvable references, sources', () => {
    expect(players.length).toBeGreaterThanOrEqual(18);
    expect(new Set(players.map((p) => p.id)).size).toBe(players.length);
    for (const p of players) {
      expect(p.country).toMatch(/^[A-Z]{2}$/);
      expect(['ATP', 'WTA', 'Legend']).toContain(p.tour);
      if (p.mains.stringId) expect(stringById.has(p.mains.stringId), `${p.id} mains`).toBe(true);
      if (p.crosses.stringId) expect(stringById.has(p.crosses.stringId), `${p.id} crosses`).toBe(true);
      if (p.racket.id) expect(racketById.has(p.racket.id), `${p.id} racket`).toBe(true);
      expect(p.tension.mains).toBeGreaterThanOrEqual(35);
      expect(p.tension.mains).toBeLessThanOrEqual(75);
      expect(p.tension.crosses).toBeGreaterThanOrEqual(35);
      expect(p.tension.crosses).toBeLessThanOrEqual(75);
      expect(p.source.url).toMatch(/^https?:\/\//);
      expect(p.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it('includes Federer and Nadal', () => {
    expect(players.map((p) => p.id)).toEqual(expect.arrayContaining(['roger-federer', 'rafael-nadal']));
  });
});
```

- [ ] **Step 2: Write `src/data/players.ts`** (`export const players: Player[]`), ordered: ATP by ranking-ish, then WTA, then Legends. `verifiedOn` = today's date.
- [ ] **Step 3: Extend `src/data/index.ts`**: `import { players } from './players'; export { players };`
- [ ] **Step 4: `npm test` → PASS; `npx tsc --noEmit` clean.**
- [ ] **Step 5: Commit** `git add src/data && git commit -m "feat(data): pro player setups with sources"`

---

### Task 4: Model (units, stringbed, insights) — TDD

**Files:** create `src/model/units.ts`, `units.test.ts`, `stringbed.ts`, `stringbed.test.ts`, `insights.ts`, `insights.test.ts`.

- [ ] **Step 1: units test**

```ts
import { describe, it, expect } from 'vitest';
import { lbToKg, kgToLb, formatTension } from './units';
describe('units', () => {
  it('round-trips', () => { expect(kgToLb(lbToKg(55))).toBeCloseTo(55, 5); });
  it('formats', () => {
    expect(formatTension(55, 'lb')).toBe('55 lb');
    expect(formatTension(55, 'kg')).toBe('25.0 kg');
    expect(formatTension(52, 'kg')).toBe('23.5 kg');
  });
});
```

- [ ] **Step 2: units impl**

```ts
export type Unit = 'lb' | 'kg';
const K = 0.45359237;
export const lbToKg = (lb: number): number => lb * K;
export const kgToLb = (kg: number): number => kg / K;
export const roundHalf = (v: number): number => Math.round(v * 2) / 2;
export function formatTension(lb: number, unit: Unit): string {
  return unit === 'lb' ? `${Math.round(lb)} lb` : `${roundHalf(lbToKg(lb)).toFixed(1)} kg`;
}
```
Run `npm test` → PASS.

- [ ] **Step 3: stringbed test**

```ts
import { describe, it, expect } from 'vitest';
import { computeBed, type BedInput } from './stringbed';
import { ATTRS, type TennisString, type Racket } from '../data/types';

const poly: TennisString = { id: 'p', brand: 'X', name: 'P', material: 'poly', shape: 'round', gauges: [1.25], defaultGauge: 1.25, refTension: [48, 58], attrs: { power: 40, control: 85, spin: 70, comfort: 35, durability: 80, tensionMaintenance: 55 }, blurb: { zh: '测试', en: 'test' } };
const gut: TennisString = { ...poly, id: 'g', material: 'natural-gut', refTension: [50, 62], attrs: { power: 90, control: 60, spin: 45, comfort: 95, durability: 55, tensionMaintenance: 90 } };
const r1619: Racket = { id: 'r', brand: 'Head', family: 'F', name: 'R', headSize: 98, weightUnstrung: 300, balance: '', stiffness: 65, pattern: [16, 19], beam: '', recTension: [48, 57], attrs: { power: 50, control: 50, spin: 50, comfort: 50, durability: 50, tensionMaintenance: 50 }, blurb: { zh: '测试', en: 'test' } };
const r1820: Racket = { ...r1619, pattern: [18, 20] };
const base = (o: Partial<BedInput> = {}): BedInput => ({ mains: poly, crosses: poly, mainsGauge: 1.25, crossesGauge: 1.25, mainsTension: 53, crossesTension: 53, ...o });

describe('computeBed', () => {
  it('returns each attr as an integer in 0..100', () => {
    for (const t of [35, 53, 70]) {
      const r = computeBed(base({ mainsTension: t, crossesTension: t }));
      for (const a of ATTRS) { expect(Number.isInteger(r[a])).toBe(true); expect(r[a]).toBeGreaterThanOrEqual(0); expect(r[a]).toBeLessThanOrEqual(100); }
    }
  });
  it('at reference tension and default gauge with no racket, returns the blended string attrs', () => {
    const r = computeBed(base({ mains: poly, crosses: gut, mainsTension: 53, crossesTension: 56 }));
    // 0.6*poly + 0.4*gut, T = 0.6*53+0.4*56 = 54.2 ; R = 0.6*53 + 0.4*56 = 54.2 → no tension effect
    expect(r.power).toBe(Math.round(0.6 * 40 + 0.4 * 90));
    expect(r.comfort).toBe(Math.round(0.6 * 35 + 0.4 * 95));
  });
  it('raising tension raises control and lowers power/comfort monotonically', () => {
    let prev = computeBed(base({ mainsTension: 40, crossesTension: 40 }));
    for (let t = 42; t <= 66; t += 2) {
      const cur = computeBed(base({ mainsTension: t, crossesTension: t }));
      expect(cur.control).toBeGreaterThanOrEqual(prev.control);
      expect(cur.power).toBeLessThanOrEqual(prev.power);
      expect(cur.comfort).toBeLessThanOrEqual(prev.comfort);
      prev = cur;
    }
    expect(computeBed(base({ mainsTension: 66, crossesTension: 66 })).control).toBeGreaterThan(computeBed(base({ mainsTension: 40, crossesTension: 40 })).control);
  });
  it('thinner gauge raises spin and lowers durability', () => {
    const thin = computeBed(base({ mainsGauge: 1.15, crossesGauge: 1.15 }));
    const thick = computeBed(base({ mainsGauge: 1.35, crossesGauge: 1.35 }));
    expect(thin.spin).toBeGreaterThan(thick.spin);
    expect(thin.durability).toBeLessThan(thick.durability);
  });
  it('18x20 frame lowers spin and raises control vs 16x19', () => {
    const open = computeBed(base({ racket: r1619 }));
    const dense = computeBed(base({ racket: r1820 }));
    expect(dense.spin).toBeLessThan(open.spin);
    expect(dense.control).toBeGreaterThan(open.control);
  });
  it('stiffer frame adds power and removes comfort', () => {
    const soft = computeBed(base({ racket: { ...r1619, stiffness: 55 } }));
    const stiff = computeBed(base({ racket: { ...r1619, stiffness: 72 } }));
    expect(stiff.power).toBeGreaterThan(soft.power);
    expect(stiff.comfort).toBeLessThan(soft.comfort);
  });
});
```

- [ ] **Step 4: stringbed impl**

```ts
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
```
Run `npm test` → PASS.

- [ ] **Step 5: insights test**

```ts
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
```

- [ ] **Step 6: insights impl**

```ts
import type { L10n } from '../data/types';
import { effectiveTension, type BedInput } from './stringbed';

export type Tone = 'warn' | 'tip' | 'info';
export interface Insight { id: string; tone: Tone; text: L10n }

const isPoly = (m: string) => m === 'poly';
const isSoft = (m: string) => m === 'natural-gut' || m === 'multifilament';
const order: Record<Tone, number> = { warn: 0, tip: 1, info: 2 };

export function buildInsights(i: BedInput): Insight[] {
  const out: Insight[] = [];
  const { mains, crosses, mainsTension: mt, crossesTension: ct, racket } = i;

  if (mt > mains.refTension[1]) out.push({ id: 'mains-high', tone: 'warn', text: {
    zh: `竖线 ${mt} 磅已高于 ${mains.name} 的舒适区（${mains.refTension[0]}–${mains.refTension[1]} 磅）：控制更锐，但手感更硬、力量下降。建议降 2–4 磅试试。`,
    en: `Mains at ${mt} lb sit above ${mains.name}'s comfort zone (${mains.refTension[0]}–${mains.refTension[1]} lb): crisper control, harsher feel, less free power. Try dropping 2–4 lb.` } });
  else if (mt < mains.refTension[0]) out.push({ id: 'mains-low', tone: 'tip', text: {
    zh: `竖线 ${mt} 磅低于 ${mains.name} 的常用区间（${mains.refTension[0]}–${mains.refTension[1]} 磅）：更多弹力和舒适，但控制和线床稳定性会打折。`,
    en: `Mains at ${mt} lb are below ${mains.name}'s usual range (${mains.refTension[0]}–${mains.refTension[1]} lb): more pop and comfort, less control and string-bed stability.` } });

  if (ct > crosses.refTension[1]) out.push({ id: 'crosses-high', tone: 'warn', text: {
    zh: `横线 ${ct} 磅高于 ${crosses.name} 的舒适区（${crosses.refTension[0]}–${crosses.refTension[1]} 磅），线床会偏硬。`,
    en: `Crosses at ${ct} lb are above ${crosses.name}'s comfort zone (${crosses.refTension[0]}–${crosses.refTension[1]} lb); the bed will feel boardy.` } });
  else if (ct < crosses.refTension[0]) out.push({ id: 'crosses-low', tone: 'tip', text: {
    zh: `横线 ${ct} 磅低于 ${crosses.name} 的常用区间，会让线床更软、更有弹力。`,
    en: `Crosses at ${ct} lb are below ${crosses.name}'s usual range, softening the bed and adding pop.` } });

  if (ct > mt) out.push({ id: 'crosses-tighter', tone: 'info', text: {
    zh: '横线磅数高于竖线并不常见：通常横线低 2–4 磅让线床更圆润，你这样穿会更硬更直接。',
    en: 'Crosses tighter than mains is unusual: crosses are normally 2–4 lb lower for a rounder feel. This bed will play firmer and more direct.' } });
  else if (mt - ct >= 6) out.push({ id: 'big-differential', tone: 'info', text: {
    zh: `竖横磅差 ${mt - ct} 磅偏大：线床更软、甜区感觉更大，但竖线会更容易走线。`,
    en: `A ${mt - ct} lb mains/crosses differential is on the large side: softer bed and a bigger-feeling sweet spot, but the mains will move more.` } });

  if (isPoly(mains.material) && isPoly(crosses.material)) out.push({ id: 'full-poly', tone: 'info', text: {
    zh: '全聚酯线床：控制和旋转最强，但掉磅快，手感一般 10–15 小时后明显变差，建议按时换线。',
    en: 'Full poly bed: maximum control and spin, but tension drops fast; feel usually goes off after 10–15 hours, so restring on schedule.' } });
  else if (isPoly(mains.material) && isSoft(crosses.material)) out.push({ id: 'hybrid-poly-gut', tone: 'info', text: {
    zh: `竖线聚酯、横线${crosses.material === 'natural-gut' ? '天然肠' : '多芯'}：竖线主导，保留旋转和控制，横线补回舒适和弹力，是职业球员最常见的混穿方式。`,
    en: `Poly mains with ${crosses.material === 'natural-gut' ? 'natural gut' : 'multifilament'} crosses: mains dominate, keeping spin and control while the crosses give back comfort and pop. The most common pro hybrid.` } });
  else if (isSoft(mains.material) && isPoly(crosses.material)) out.push({ id: 'hybrid-gut-poly', tone: 'info', text: {
    zh: `竖线${mains.material === 'natural-gut' ? '天然肠' : '多芯'}、横线聚酯：费德勒式混穿，手感和力量最大化，聚酯横线负责收一点控制和耐久。`,
    en: `${mains.material === 'natural-gut' ? 'Gut' : 'Multi'} mains with poly crosses: the Federer-style hybrid, maximising feel and power while the poly crosses add some control and durability.` } });

  if (racket) {
    const T = effectiveTension(i);
    if (T > racket.recTension[1] || T < racket.recTension[0]) out.push({ id: 'racket-band', tone: 'warn', text: {
      zh: `当前有效磅数约 ${Math.round(T)} 磅，超出 ${racket.name} 的推荐区间 ${racket.recTension[0]}–${racket.recTension[1]} 磅。`,
      en: `Effective tension is about ${Math.round(T)} lb, outside ${racket.name}'s recommended ${racket.recTension[0]}–${racket.recTension[1]} lb band.` } });
    const open = racket.pattern[0] === 16 && racket.pattern[1] <= 19;
    if (open && (mains.shape !== 'round')) out.push({ id: 'spin-combo', tone: 'tip', text: {
      zh: `${racket.name} 的开放线床配 ${mains.name} 这类多棱/纹理线，是旋转最大化的组合。`,
      en: `${racket.name}'s open pattern with a shaped/textured mains like ${mains.name} is a spin-maximising combination.` } });
    if (racket.pattern[0] === 18 && isPoly(mains.material) && mt >= 56) out.push({ id: 'dense-stiff-high', tone: 'warn', text: {
      zh: '18x20 密线床 + 聚酯 + 高磅：控制极好，但对手臂不友好。若有肘部不适，先降磅或换软一点的聚酯。',
      en: '18x20 pattern + poly + high tension: superb control but hard on the arm. If your elbow complains, drop tension or move to a softer poly first.' } });
  }

  return out.sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 5);
}
```
Run `npm test` → PASS. `npx tsc --noEmit` clean.

- [ ] **Step 7: Commit** `git add src/model && git commit -m "feat(model): string bed model, units and insights"`

---

### Task 5: i18n

**Files:** create `src/i18n/en.ts`, `src/i18n/zh.ts`, `src/i18n/l10n.ts`, `src/i18n/useI18n.tsx`, `src/i18n/i18n.test.ts`.

- [ ] **Step 1: test**

```ts
import { describe, it, expect } from 'vitest';
import { en } from './en';
import { zh } from './zh';
describe('i18n parity', () => {
  it('zh and en have identical keys and no empty values', () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
    for (const k of Object.keys(en)) { expect((en as Record<string, string>)[k].length).toBeGreaterThan(0); expect((zh as Record<string, string>)[k].length).toBeGreaterThan(0); }
  });
});
```

- [ ] **Step 2: `en.ts`** — `export const en = { ... } as const; export type Key = keyof typeof en;` with exactly these keys (values are the English UI copy; write good copy):

```
nav.lab, nav.rackets, nav.players, nav.langToggle ("中文" in en file, "EN" in zh file — the toggle shows the OTHER language)
hero.title ("String Lab"), hero.subtitle (one line: what the app does)
lab.racket, lab.racketNone ("No racket / string bed only"), lab.mains, lab.crosses, lab.gauge, lab.sameAsMains, lab.linkTensions, lab.linkTensionsHint ("crosses follow mains −2 lb"), lab.mainsTension, lab.crossesTension, lab.recBand ("recommended for this racket"), lab.effective ("Effective tension"), lab.share, lab.shareCopied, lab.reset, lab.insights, lab.noInsights, lab.attributes
attr.power, attr.control, attr.spin, attr.comfort, attr.durability, attr.tensionMaintenance
material.poly, material.multifilament, material.natural-gut, material.synthetic-gut, material.kevlar
shape.round, shape.shaped, shape.textured
rackets.title, rackets.subtitle, rackets.all, rackets.useInLab, rackets.headSize, rackets.weight, rackets.balance, rackets.stiffness, rackets.pattern, rackets.beam, rackets.recTension, rackets.inUse ("In lab")
players.title, players.subtitle, players.all, players.atp, players.wta, players.legends, players.loadInLab, players.source, players.verifiedOn, players.disclaimer, players.racket, players.mains, players.crosses, players.tension, players.substituted ("{name} isn't in the catalogue; loaded the closest {sub} instead")
toast.loadedPlayer ("Loaded {name}'s setup"), toast.loadedRacket ("Using {name}")
footer.disclaimer ("Ratings are editorial estimates based on published reviews, not lab data."), footer.source ("Source on GitHub")
unit.lb, unit.kg
```

- [ ] **Step 3: `zh.ts`** — `import type { Key } from './en'; export const zh: Record<Key, string> = { ... }` with natural Chinese copy (not machine-literal). E.g. `hero.subtitle`: '选线、选磅、选拍，看六维手感实时变化；再对照球星的真实穿法。'

- [ ] **Step 4: `l10n.ts`**

```ts
import type { L10n } from '../data/types';
export type Lang = 'zh' | 'en';
export const pick = (o: L10n, lang: Lang): string => o[lang];
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
```

- [ ] **Step 5: `useI18n.tsx`**

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type Key } from './en';
import { zh } from './zh';
import { fill, type Lang } from './l10n';

const dict: Record<Lang, Record<Key, string>> = { en, zh };
const STORAGE = 'tsh.lang';
interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (k: Key, vars?: Record<string, string | number>) => string }
const I18nContext = createContext<Ctx | null>(null);

function initialLang(): Lang {
  try { const s = localStorage.getItem(STORAGE); if (s === 'en' || s === 'zh') return s; } catch { /* ignore */ }
  return 'zh';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = useCallback((l: Lang) => { setLangState(l); try { localStorage.setItem(STORAGE, l); } catch { /* ignore */ } }, []);
  useEffect(() => { document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'; }, [lang]);
  const t = useCallback((k: Key, vars?: Record<string, string | number>) => (vars ? fill(dict[lang][k], vars) : dict[lang][k]), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18nContext);
  if (!c) throw new Error('useI18n outside I18nProvider');
  return c;
}
```

- [ ] **Step 6: `npm test` PASS, `npx tsc --noEmit` clean. Commit** `git add src/i18n && git commit -m "feat(i18n): zh/en dictionaries and provider"`

---

### Task 6: Setup state + URL hash

**Files:** create `src/state/hash.ts`, `src/state/hash.test.ts`, `src/state/useSetup.ts`.

- [ ] **Step 1: hash test**

```ts
import { describe, it, expect } from 'vitest';
import { serializeSetup, parseSetup, DEFAULT_SETUP, type SetupState } from './hash';

describe('hash', () => {
  it('round-trips a full state', () => {
    const s: SetupState = { racketId: 'wilson-blade-98-16x19-v9', mainsId: 'luxilon-alu-power', mainsGauge: 1.25, crossesId: 'babolat-vs-touch', crossesGauge: 1.3, mainsTension: 55, crossesTension: 52, linkTensions: false, unit: 'kg' };
    expect(parseSetup(serializeSetup(s))).toEqual(s);
  });
  it('round-trips with no racket', () => {
    const s: SetupState = { ...DEFAULT_SETUP, racketId: null };
    expect(parseSetup(serializeSetup(s))).toEqual(s);
  });
  it('falls back to defaults for unknown ids or garbage', () => {
    expect(parseSetup('#m=nope:1.25&x=luxilon-alu-power:1.25&t=52,50&u=lb')).toEqual({ ...DEFAULT_SETUP, linkTensions: true });
    expect(parseSetup('')).toEqual(DEFAULT_SETUP);
    expect(parseSetup('#garbage')).toEqual(DEFAULT_SETUP);
  });
  it('clamps tensions to 35..70 and infers linkTensions from a 2 lb gap', () => {
    const p = parseSetup('#m=luxilon-alu-power:1.25&x=luxilon-alu-power:1.25&t=99,1&u=lb');
    expect(p.mainsTension).toBe(70); expect(p.crossesTension).toBe(35); expect(p.linkTensions).toBe(false);
    expect(parseSetup('#m=luxilon-alu-power:1.25&x=luxilon-alu-power:1.25&t=54,52&u=lb').linkTensions).toBe(true);
  });
});
```

- [ ] **Step 2: hash impl**

```ts
import { stringById, racketById } from '../data';
import type { Unit } from '../model/units';

export interface SetupState {
  racketId: string | null;
  mainsId: string; mainsGauge: number;
  crossesId: string; crossesGauge: number;
  mainsTension: number; crossesTension: number; // lb
  linkTensions: boolean;
  unit: Unit;
}
export const TENSION_MIN = 35;
export const TENSION_MAX = 70;
export const LINK_GAP = 2;
export const DEFAULT_SETUP: SetupState = { racketId: null, mainsId: 'luxilon-alu-power', mainsGauge: 1.25, crossesId: 'luxilon-alu-power', crossesGauge: 1.25, mainsTension: 52, crossesTension: 50, linkTensions: true, unit: 'lb' };

const clamp = (v: number) => Math.min(TENSION_MAX, Math.max(TENSION_MIN, v));

export function serializeSetup(s: SetupState): string {
  const p = new URLSearchParams();
  if (s.racketId) p.set('r', s.racketId);
  p.set('m', `${s.mainsId}:${s.mainsGauge}`);
  p.set('x', `${s.crossesId}:${s.crossesGauge}`);
  p.set('t', `${s.mainsTension},${s.crossesTension}`);
  p.set('u', s.unit);
  if (!s.linkTensions) p.set('l', '0');
  return `#${p.toString()}`;
}

function parseStringRef(v: string | null): { id: string; gauge: number } | null {
  if (!v) return null;
  const [id, g] = v.split(':');
  const str = stringById.get(id);
  if (!str) return null;
  const gauge = Number(g);
  return { id, gauge: str.gauges.includes(gauge) ? gauge : str.defaultGauge };
}

export function parseSetup(hash: string): SetupState {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw.includes('=')) return DEFAULT_SETUP;
  const p = new URLSearchParams(raw);
  const m = parseStringRef(p.get('m'));
  const x = parseStringRef(p.get('x'));
  if (!m || !x) return DEFAULT_SETUP;
  const r = p.get('r');
  const racketId = r && racketById.has(r) ? r : null;
  const [tm, tc] = (p.get('t') ?? '').split(',').map(Number);
  const mainsTension = Number.isFinite(tm) ? clamp(Math.round(tm)) : DEFAULT_SETUP.mainsTension;
  const crossesTension = Number.isFinite(tc) ? clamp(Math.round(tc)) : DEFAULT_SETUP.crossesTension;
  const unit: Unit = p.get('u') === 'kg' ? 'kg' : 'lb';
  const linkTensions = p.get('l') === '0' ? false : mainsTension - crossesTension === LINK_GAP;
  return { racketId, mainsId: m.id, mainsGauge: m.gauge, crossesId: x.id, crossesGauge: x.gauge, mainsTension, crossesTension, linkTensions, unit };
}
```
Note: the "unknown id" test expects `{...DEFAULT_SETUP, linkTensions: true}` which equals DEFAULT_SETUP; fine.
Run `npm test` → PASS.

- [ ] **Step 3: `useSetup.ts`**

```ts
import { useEffect, useReducer } from 'react';
import { stringById, racketById, type Player } from '../data';
import { DEFAULT_SETUP, LINK_GAP, TENSION_MAX, TENSION_MIN, parseSetup, serializeSetup, type SetupState } from './hash';
import type { Unit } from '../model/units';

export type SetupAction =
  | { type: 'setRacket'; id: string | null }
  | { type: 'setMains'; id: string }
  | { type: 'setCrosses'; id: string }
  | { type: 'setMainsGauge'; gauge: number }
  | { type: 'setCrossesGauge'; gauge: number }
  | { type: 'setMainsTension'; lb: number }
  | { type: 'setCrossesTension'; lb: number }
  | { type: 'setLinkTensions'; on: boolean }
  | { type: 'setUnit'; unit: Unit }
  | { type: 'loadPlayer'; player: Player; mainsId: string; crossesId: string }
  | { type: 'reset' };

const clamp = (v: number) => Math.min(TENSION_MAX, Math.max(TENSION_MIN, Math.round(v)));
const gaugeFor = (id: string, wanted?: number) => { const s = stringById.get(id)!; return wanted && s.gauges.includes(wanted) ? wanted : s.defaultGauge; };

export function reduce(s: SetupState, a: SetupAction): SetupState {
  switch (a.type) {
    case 'setRacket': return { ...s, racketId: a.id && racketById.has(a.id) ? a.id : null };
    case 'setMains': return stringById.has(a.id) ? { ...s, mainsId: a.id, mainsGauge: gaugeFor(a.id, s.mainsGauge) } : s;
    case 'setCrosses': return stringById.has(a.id) ? { ...s, crossesId: a.id, crossesGauge: gaugeFor(a.id, s.crossesGauge) } : s;
    case 'setMainsGauge': return { ...s, mainsGauge: gaugeFor(s.mainsId, a.gauge) };
    case 'setCrossesGauge': return { ...s, crossesGauge: gaugeFor(s.crossesId, a.gauge) };
    case 'setMainsTension': { const m = clamp(a.lb); return { ...s, mainsTension: m, crossesTension: s.linkTensions ? clamp(m - LINK_GAP) : s.crossesTension }; }
    case 'setCrossesTension': return { ...s, crossesTension: clamp(a.lb), linkTensions: false };
    case 'setLinkTensions': return a.on ? { ...s, linkTensions: true, crossesTension: clamp(s.mainsTension - LINK_GAP) } : { ...s, linkTensions: false };
    case 'setUnit': return { ...s, unit: a.unit };
    case 'loadPlayer': {
      const p = a.player;
      return { ...s, racketId: p.racket.id && racketById.has(p.racket.id) ? p.racket.id : null, mainsId: a.mainsId, mainsGauge: gaugeFor(a.mainsId, p.mains.gauge), crossesId: a.crossesId, crossesGauge: gaugeFor(a.crossesId, p.crosses.gauge), mainsTension: clamp(p.tension.mains), crossesTension: clamp(p.tension.crosses), linkTensions: false };
    }
    case 'reset': return { ...DEFAULT_SETUP, unit: s.unit };
  }
}

export function useSetup(): [SetupState, React.Dispatch<SetupAction>] {
  const [state, dispatch] = useReducer(reduce, undefined, () => parseSetup(typeof window !== 'undefined' ? window.location.hash : ''));
  useEffect(() => {
    const h = serializeSetup(state);
    if (window.location.hash !== h) history.replaceState(null, '', h);
  }, [state]);
  return [state, dispatch];
}
```
Add a `reduce` test to `hash.test.ts` (same file is fine) checking: `setMainsTension` with link on moves crosses by −2; `setCrossesTension` turns link off; `setMains` to a string without the current gauge falls back to its default.

- [ ] **Step 4: `npm test` PASS, `npx tsc --noEmit` clean. Commit** `git add src/state && git commit -m "feat(state): setup reducer with url hash sync"`

---

### Task 7: Design system + shared components

**Files:** `src/styles/tokens.css`, `src/styles/global.css`, `src/hooks/useSpringValues.ts`, `src/components/Radar/Radar.tsx`, `src/components/Slider/TensionSlider.tsx`, `src/components/Select/Select.tsx`, `src/components/AttrBars/AttrBars.tsx`, `src/components/InsightList/InsightList.tsx`, `src/components/Toast/Toast.tsx`, `src/components/Nav/Nav.tsx`, one `.css` next to each component.

Design direction (commit to it, no generic "AI dashboard" look):
- Ground `#0f1115`, panels `#171a21` / `#1e2230`, hairlines `#2a2f3d`, text `#f3efe6`, muted `#9aa1b3`, accent optic yellow `#d8ff3e` (ink on accent `#1a2200`), hard-court blue `#2f6fd6`, clay `#c8643c`, warn `#ffb454`, ok `#5fd38d`.
- Display font `"Bricolage Grotesque"` (weights 500/700/800, tight letter-spacing on headings), body `"Inter"`, zh fallback `"Noto Sans SC"`. Font stacks end with `system-ui, sans-serif`.
- Panels have 1 px hairline borders, 16 px radius, subtle inner top highlight. No drop-shadow soup.
- Background: very faint court-line motif (two thin diagonal lines via `linear-gradient`) at 4 % opacity, fixed.
- `@media (prefers-reduced-motion: reduce)` disables transitions and the spring.
- Focus rings visible (accent, 2 px offset). Touch targets ≥ 40 px.

Components (props are the contract; later tasks depend on them):

```ts
// hooks/useSpringValues.ts — returns animated copy of `target`; snaps immediately under reduced motion
export function useSpringValues(target: number[], opts?: { stiffness?: number; damping?: number }): number[];

// Radar — 6-axis SVG, viewBox 0 0 320 320, grid rings at 25/50/75/100, axis labels outside ring, value chip near each vertex.
export function Radar(props: { values: Attrs; labels: Record<Attr, string>; className?: string }): JSX.Element;

// TensionSlider — native <input type=range min=35 max=70 step=1> styled; shows value bubble in current unit;
// `band` draws recommended range on the track; `onChange` always receives lb.
export function TensionSlider(props: { id: string; label: string; valueLb: number; unit: Unit; band?: [number, number] | null; onChange: (lb: number) => void }): JSX.Element;

// Select — styled native <select> with optional <optgroup>s
export function Select<T extends string | number>(props: { id: string; label: string; value: T; onChange: (v: T) => void; groups: Array<{ label: string; options: Array<{ value: T; label: string }> }>; hint?: string }): JSX.Element;

// AttrBars — six horizontal bars with label + integer value, animated width via CSS transition
export function AttrBars(props: { values: Attrs; labels: Record<Attr, string> }): JSX.Element;

// InsightList — cards with tone-coloured left rule; empty state text
export function InsightList(props: { insights: Insight[]; lang: Lang; emptyText: string }): JSX.Element;

// Toast — provider + hook
export function ToastProvider(props: { children: ReactNode }): JSX.Element;
export function useToast(): { show: (msg: string) => void };

// Nav — sticky top bar: wordmark ("String Lab" + small 网球穿线助手), three section buttons, language toggle
export type Section = 'lab' | 'rackets' | 'players';
export function Nav(props: { section: Section; onSelect: (s: Section) => void }): JSX.Element; // uses useI18n internally
```

`useSpringValues` implementation sketch: keep `pos`/`vel` refs, rAF loop integrating `acc = stiffness*(target-pos) - damping*vel` with dt clamped to 32 ms; stop when all |vel|<0.01 and |target-pos|<0.05; `matchMedia('(prefers-reduced-motion: reduce)')` → return target directly.

- [ ] **Step 1:** write tokens.css + global.css (reset, typography, `.panel`, `.btn`, `.btn-accent`, `.chip`, `.hairline`, container `.wrap { max-width: 1200px; margin: 0 auto; padding: 0 20px }`).
- [ ] **Step 2:** write the hook and each component with its CSS. Keep each file < 200 lines.
- [ ] **Step 3:** temporarily render a kitchen-sink in `App.tsx` (Radar with sample values, two sliders, a select, bars, insights, toast button, nav) and eyeball with `npm run dev`. Then restore the stub (Task 11 rewrites App anyway).
- [ ] **Step 4:** `npx tsc --noEmit` clean, `npm run build` ok. Commit `git add src && git commit -m "feat(ui): design tokens and shared components"`.

---

### Task 8: Lab section

**Files:** `src/components/Lab/Lab.tsx`, `Lab.css`.

Props: `{ setup: SetupState; dispatch: Dispatch<SetupAction> }`. Uses `useI18n`, `useToast`, data lookups, `computeBed`, `buildInsights`, `formatTension`.

Layout ≥ 960 px: grid `minmax(0, 5fr) minmax(0, 7fr)` with 24 px gap. Left "Inputs" panel, right "Read-out" panel. Below 960 px: read-out first (radar), then inputs.

Left panel contents, in order:
1. Racket `Select` (groups: Wilson, Head; first option value `''` → label `t('lab.racketNone')`). When a racket is chosen show a spec strip: `98 in² · 305 g · RA 62 · 16x19 · 50–60 lb`.
2. Mains: `Select` grouped by brand (option label `name`, hint below = material chip + shape chip + blurb). Gauge `Select` (options from `string.gauges`, label like `1.25 mm`).
3. Crosses: same, plus a checkbox `lab.sameAsMains` that, when checked, mirrors mains id+gauge into crosses on every mains change (keep checkbox state local; dispatch `setCrosses`/`setCrossesGauge`).
4. Tensions: unit segmented toggle (lb | kg) → `setUnit`; `TensionSlider` mains and crosses with `band` = racket.recTension or null; link checkbox `lab.linkTensions` with hint.
5. Row: `Reset` button (dispatch reset) and `Share` button (copies `location.href` via `navigator.clipboard.writeText`, toast `lab.shareCopied`).

Right panel contents: header row with `hero.title`-style label "Read-out" and effective tension `lab.effective: 54 lb / 24.5 kg`; `Radar`; `AttrBars`; `InsightList`.

Radar `labels` come from `t('attr.*')`. Compute `bed = useMemo(() => computeBed(input), [input])`.

- [ ] Implement, wire into a temporary App to check, `npx tsc --noEmit` clean, commit `feat(ui): string lab section`.

---

### Task 9: Rackets section

**Files:** `src/components/Rackets/Rackets.tsx`, `Rackets.css`.

Props: `{ setup: SetupState; dispatch: Dispatch<SetupAction>; onGoLab: () => void }`.

Header: `rackets.title`, `rackets.subtitle`. Filter chips row 1: All / Wilson / Head. Row 2 (only when a brand is selected): families from `racketFamilies(brand)`. Grid `repeat(auto-fill, minmax(280px, 1fr))`.

Card: brand eyebrow (Wilson in hard-court blue, Head in clay), name as display heading, spec grid (2 columns: head size, weight, balance, RA, pattern, beam, rec tension), six mini bars (reuse `AttrBars` in a compact variant via a `compact` prop → add that prop in AttrBars), blurb, button `rackets.useInLab` (dispatch setRacket, toast `toast.loadedRacket`, call `onGoLab`). If `setup.racketId === r.id` show `rackets.inUse` badge and highlight border with accent.

- [ ] Implement, check, `npx tsc --noEmit`, commit `feat(ui): rackets section`.

---

### Task 10: Players section

**Files:** `src/components/Players/Players.tsx`, `Players.css`, `src/components/Players/resolve.ts`, `resolve.test.ts`.

`resolve.ts`:
```ts
import { strings, stringById, type Player, type TennisString } from '../../data';
export interface Resolved { mainsId: string; crossesId: string; substitutions: Array<{ wanted: string; got: TennisString }> }
// Choose stringId when present; else the first catalogue string with same brand (label startsWith brand) and same material guessed from label
// (contains 'gut' → natural-gut, 'nxt'|'multi'|'xcel'|'x-one' → multifilament, else poly); else fallback 'luxilon-alu-power'.
export function resolvePlayerStrings(p: Player): Resolved;
```
Test: player with ids → no substitutions; player with label `Babolat RPM Blast` and no id → got `babolat-rpm-blast` when it exists; unknown → luxilon-alu-power with a substitution entry.

Props: `{ dispatch: Dispatch<SetupAction>; onGoLab: () => void }`.

Header + disclaimer banner (`players.disclaimer`, warn tone). Filter chips: All / ATP / WTA / Legends. Grid `repeat(auto-fill, minmax(300px, 1fr))`.

Card: avatar circle with initials (deterministic hue from name), flag emoji from ISO code (`String.fromCodePoint(...[...cc].map(c => 0x1f1e6 + c.charCodeAt(0) - 65))`), name (`lang === 'zh' ? `${nameZh} · ${name}` : name`), tour chip. Rows: racket label (+ note), mains `label 1.25`, crosses, tension `55 / 52 lb (25.0 / 23.5 kg)`. Footer: `players.source` link (target _blank rel noopener), `players.verifiedOn` date, button `players.loadInLab` → `resolvePlayerStrings`, dispatch `loadPlayer`, toast (`toast.loadedPlayer`, plus `players.substituted` per substitution), `onGoLab()`.

- [ ] Implement, test, `npx tsc --noEmit`, commit `feat(ui): pro player setups section`.

---

### Task 11: App assembly

**Files:** rewrite `src/App.tsx`; `src/App.css`.

```tsx
// structure
<I18nProvider><ToastProvider>
  <Nav section onSelect />
  <main className="wrap">
    {section === 'lab' && <><Hero/><Lab setup dispatch /></>}
    {section === 'rackets' && <Rackets setup dispatch onGoLab />}
    {section === 'players' && <Players dispatch onGoLab />}
  </main>
  <footer>… footer.disclaimer · footer.source (link to repo)</footer>
</ToastProvider></I18nProvider>
```
`Hero`: title `hero.title` (display, large), subtitle `hero.subtitle`. Section state persists in `sessionStorage` key `tsh.section`. `onGoLab` sets section to lab and `window.scrollTo({ top: 0, behavior: 'smooth' })`.
Also render a tiny "language" and "unit" persistence sanity: switching language re-renders all copy including insights (they read `lang` via `pick`).

- [ ] Run `npm run dev`, walk through: change strings/tension → radar moves; pick racket in Rackets → lab shows band; load player → lab populated, toast shown; share → URL hash changes; reload with hash → state restored; toggle language.
- [ ] `npm test`, `npm run build` clean. Commit `feat: assemble app`.

---

### Task 12: Deploy

**Files:** `.github/workflows/deploy.yml`, `README.md`.

```yaml
name: Deploy to GitHub Pages
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

README: what it is (zh + en short), live URL, `npm install && npm run dev`, data disclaimer, how to add a string/racket/player.

- [ ] Commit. `gh repo create steveao886/tennis_string --public --source . --remote origin --push`.
- [ ] `gh api -X POST repos/steveao886/tennis_string/pages -f build_type=workflow` (if 409 already exists, `-X PUT` with same body).
- [ ] `gh run watch` until deploy green; open `https://steveao886.github.io/tennis_string/` and smoke test.
