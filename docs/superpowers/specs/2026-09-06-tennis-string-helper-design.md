# Tennis String Helper — Design Spec

Date: 2026-09-06
Status: approved by user (verbal "OK"), building without further review gates.

## 1. Goal

A single-page web app that helps a tennis player reason about a string setup:
pick a racket, a mains string, a crosses string, gauges and tensions, and see
live how six playing attributes change. Browse Wilson/Head rackets and a
gallery of pro-player setups, each loadable into the lab with one click.
Bilingual (zh default, en). Deployed to GitHub Pages via GitHub Actions.

Out of scope: accounts, cloud save, comments, player photos or brand logos.

## 2. Sections

### 2.1 String Lab (home)

Left panel (inputs):
- Racket select (optional, grouped by brand). Shows a compact spec strip when chosen.
- Mains string: brand-grouped select; below it the material chip and one-line blurb.
- Mains gauge: select from the string's available gauges.
- Crosses string + gauge: same controls. A "same as mains" toggle copies mains to crosses.
- Mains tension slider, crosses tension slider. Range 35–70 lb (16–32 kg). Step 1 lb / 0.5 kg.
  Unit toggle lb/kg. The selected racket's recommended tension band is drawn on the track.
- "Link tensions" toggle keeps crosses = mains − 2 lb while dragging mains (default on).

Right panel (outputs):
- Radar chart, six axes, animated spring interpolation on change.
- Six attribute bars with numeric value and short label.
- Insight cards: 2–5 rule-generated sentences explaining the current setup.
- Share button: copies URL with state in hash.

### 2.2 Rackets

Grid of cards, filter chips by brand (All / Wilson / Head) and by family.
Each card: name, brand, head size, unstrung weight, balance, RA stiffness, string
pattern, beam, recommended tension range, six mini attribute bars, one-line
character blurb, "Use in Lab" button (sets racket and jumps to Lab).

### 2.3 Pro Setups

Grid of cards. Filter chips: All / ATP / WTA / Legends. Each card: initials
avatar, flag emoji, name, tour, racket (retail model + note if pro stock),
mains string + gauge, crosses string + gauge, tension mains/crosses in both
units, "Load in Lab" button, source link, verified date.
Disclaimer banner: pro setups vary by event, surface and conditions.

## 3. Data model (`src/data/types.ts`)

```ts
type Attr = 'power' | 'control' | 'spin' | 'comfort' | 'durability' | 'tensionMaintenance';
type Attrs = Record<Attr, number>;           // 0–100
type L10n = { zh: string; en: string };

interface TennisString {
  id: string;                                // e.g. 'luxilon-alu-power'
  brand: string;                             // 'Luxilon'
  name: string;                              // 'ALU Power'
  material: 'poly' | 'multifilament' | 'natural-gut' | 'synthetic-gut' | 'kevlar';
  shape: 'round' | 'shaped' | 'textured';
  gauges: number[];                          // mm, e.g. [1.20, 1.25, 1.30]
  defaultGauge: number;
  refTension: [number, number];              // lb, comfort zone
  attrs: Attrs;
  blurb: L10n;
}

interface Racket {
  id: string;                                // 'wilson-blade-98-16x19-v9'
  brand: 'Wilson' | 'Head';
  family: string;                            // 'Blade'
  name: string;                              // 'Blade 98 16x19 v9'
  headSize: number;                          // sq in
  weightUnstrung: number;                    // g
  balance: string;                           // '32.0 cm / 7 pts HL'
  stiffness: number;                         // RA
  pattern: [number, number];                 // [16, 19]
  beam: string;                              // '21 mm'
  recTension: [number, number];              // lb
  attrs: Attrs;
  blurb: L10n;
}

interface Player {
  id: string;
  name: string;
  nameZh: string;
  country: string;                           // ISO-2 for flag emoji
  tour: 'ATP' | 'WTA' | 'Legend';
  racket: { id?: string; label: string; note?: L10n };   // id when it exists in rackets.ts
  mains: { stringId?: string; label: string; gauge?: number };
  crosses: { stringId?: string; label: string; gauge?: number };
  tension: { mains: number; crosses: number };           // lb
  source: { label: string; url: string };
  verifiedOn: string;                        // 'YYYY-MM-DD'
  note?: L10n;
}
```

Loading a player into the lab: when `stringId`/`racket.id` exist use them; otherwise
fall back to the closest string by material in the same brand, and show a toast
"exact string not in catalogue, substituted X".

Target counts: ~45 strings across Luxilon, Babolat, Wilson, Head, Solinco,
Tecnifibre, Yonex, Kirschbaum, Volkl, Prince, Dunlop. ~20 rackets (Wilson: Pro
Staff 97 v14, RF01, Blade 98 16x19 v9, Blade 98 18x20 v9, Blade 100 v9, Clash 100
v3, Ultra 100 v4, Shift 99; Head: Speed MP, Speed Pro, Gravity MP, Gravity Pro,
Radical MP, Radical Pro, Prestige MP, Prestige Pro, Extreme MP, Extreme Tour,
Boom MP, Boom Pro). ~24 players: ~20 active ATP/WTA + Federer, Nadal, Murray,
Serena. Player specs are verified by web search at build time; entries without a
credible source are dropped.

Attribute ratings for strings and rackets are editorial estimates informed by
published reviews (Tennis Warehouse, Tennisnerd). The footer says so.

## 4. Model (`src/model/`)

`stringbed.ts` — `computeBed(input): Attrs`

Input: `{ mains, crosses, mainsGauge, crossesGauge, mainsTension, crossesTension, racket? }`.

1. Base = 0.6 × mains.attrs + 0.4 × crosses.attrs.
2. Effective tension T = 0.6 × mainsTension + 0.4 × crossesTension.
   Reference midpoint R = 0.6 × mid(mains.refTension) + 0.4 × mid(crosses.refTension).
   d = clamp((T − R) / 10, −1.5, 1.5). Tension effect via tanh(d):
   control += 14·tanh(d), power −= 12·tanh(d), comfort −= 10·tanh(d), spin −= 4·tanh(d),
   tensionMaintenance += 3·tanh(d) (higher tension loses more absolute lb, but the
   perceived retention over the playable window is slightly higher; keep small).
3. Gauge: g = weighted gauge (0.6/0.4). Δ = (1.25 − g) × 40 → spin += Δ, comfort += 0.5Δ,
   power += 0.5Δ, durability −= 1.5Δ.
4. Racket (if any): pattern openness o = (19 − crosses) + (16 − mains) → spin += 4o, control −= 3o;
   stiffness s = (RA − 65)/5 → power += 3s, comfort −= 3s; head h = (headSize − 98)/5 → power += 3h;
   weight w = (weightUnstrung − 300)/10 → power += 2w, control += 1.5w.
5. Clamp all to 0–100, round to integer.

`insights.ts` — `buildInsights(input, result): Insight[]` where `Insight = { id, text: L10n, tone: 'info'|'warn'|'tip' }`.
Rules (each produces one insight if triggered):
- mains tension outside mains.refTension (above → warn: harsh feel, consider −2..4 lb; below → tip: more power/comfort but less control).
- crosses tension outside crosses.refTension (same).
- hybrid poly/gut or poly/multi: explain which is mains and the resulting feel.
- full poly bed: remind about tension loss and restring frequency.
- crosses > mains: unusual, note it.
- |mains − crosses| ≥ 6: note large differential.
- racket tension band mismatch: effective tension outside racket.recTension.
- open pattern + shaped poly: spin machine tip.
- 18x20 + stiff poly high tension: control/comfort trade-off warn.
Max 5 insights shown, ordered warn → tip → info.

`units.ts` — `lbToKg`, `kgToLb`, `formatTension(lb, unit)`.

## 5. State (`src/state/useSetup.ts`)

Reducer with actions: setRacket, setMains, setCrosses, setMainsGauge, setCrossesGauge,
setMainsTension, setCrossesTension, setLinkTensions, setUnit, loadPlayer, setFromHash.
State serialised to URL hash as `#r=<racketId>&m=<stringId>:<gauge>&x=<stringId>:<gauge>&t=<mains>,<crosses>&u=lb|kg`.
On load: parse hash; if invalid, defaults (no racket, Luxilon ALU Power 1.25 / Luxilon ALU Power 1.25, 52/50 lb, unit lb).
Unit and language persist in localStorage; the rest lives in the hash.

## 6. i18n (`src/i18n/`)

`zh.ts`, `en.ts` export the same `Record<Key, string>` shape; a `keys` type derived
from `en` guarantees parity at compile time and a test checks runtime parity.
`useI18n()` returns `{ t, lang, setLang }`. Default zh; persisted in localStorage.
Data blurbs use `L10n` objects rendered via `l10n(obj, lang)`.

## 7. UI

- Single considered theme: deep charcoal ground, hard-court blue panel accents,
  optic-yellow accent (#DAFF3E family), warm off-white text. Display font
  (e.g. "Bricolage Grotesque" or "Syne") + body font ("Inter" or "IBM Plex Sans")
  via Google Fonts with system fallbacks. Noto Sans SC fallback for zh.
- Radar: hand-written SVG. Values animated with a small spring hook (`useSpringValues`).
- Sliders: native `<input type=range>` with custom track/thumb CSS, value bubble
  on the thumb, recommended band as a gradient layer beneath the track.
- Layout: max-width 1200 px; Lab is two columns ≥ 960 px, stacked below.
  Sticky top nav with section links and language toggle.
- Motion respects `prefers-reduced-motion`.
- No UI library. Dependencies: react, react-dom, vite, typescript, vitest, @testing-library not required.

## 8. Project structure

```
tennis_string/
  .github/workflows/deploy.yml
  index.html  package.json  vite.config.ts  tsconfig.json  .gitignore  README.md
  src/
    main.tsx  App.tsx
    styles/      tokens.css  global.css
    i18n/        zh.ts  en.ts  useI18n.tsx  l10n.ts
    data/        types.ts  strings.ts  rackets.ts  players.ts  index.ts
    model/       stringbed.ts  insights.ts  units.ts  (+ *.test.ts)
    state/       useSetup.ts  hash.ts  (+ hash.test.ts)
    components/  Nav.tsx  Lab/  Rackets/  Players/  Radar/  Slider/  Select/  AttrBars/  InsightList/  Toast/
    hooks/       useSpringValues.ts
  docs/superpowers/specs/, docs/superpowers/plans/
```

`vite.config.ts` sets `base: '/tennis_string/'`.

## 9. Testing

Vitest unit tests:
- model: raising tension raises control and lowers power monotonically; all
  outputs within 0–100; thinner gauge raises spin; racket 18x20 lowers spin vs 16x19.
- units: lb→kg→lb round trip within 0.05.
- data: every string/racket has all six attrs in 0–100, gauges non-empty and
  include defaultGauge, refTension ascending; every player `stringId`/`racket.id`
  that is set resolves; ids unique.
- i18n: zh and en have identical key sets.
- hash: serialise→parse round trip.

CI: `npm ci && npm test && npm run build` then deploy. Manual browser smoke test locally.

## 10. Deployment

- Public repo `steveao886/tennis_string` created with gh CLI.
- Workflow `deploy.yml`: on push to `main`, permissions `contents: read, pages: write, id-token: write`,
  jobs build (checkout, setup-node 22, npm ci, npm test, npm run build, upload-pages-artifact ./dist)
  and deploy (actions/deploy-pages). Uses the built-in GITHUB_TOKEN; no PAT.
- Pages source set to "GitHub Actions" via `gh api -X POST repos/.../pages -f build_type=workflow`.
- URL: https://steveao886.github.io/tennis_string/
