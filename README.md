# String Lab · 网球穿线助手

**Live: https://steveao886.github.io/tennis_string/**

选竖线、横线、线径、磅数和球拍，六维雷达图（力量 / 控制 / 旋转 / 舒适 / 耐久 / 保磅性）实时变化，并给出这套配置的文字解读。附 Wilson / Head / Yonex / Babolat 球拍库和职业球员的真实穿线配置，一键载入工作台。中英双语。

Pick mains, crosses, gauges, tensions and a frame; a six-axis radar (power / control / spin / comfort / durability / tension hold) updates live with plain-language insights. Includes a Wilson / Head / Yonex / Babolat racket catalogue and web-sourced pro-player setups you can load with one click. Bilingual zh / en.

## Run locally

```bash
npm install
npm run dev
```

`npm test` runs the Vitest suite (model behaviour, data integrity, i18n parity, URL-hash round trip). `npm run build` type-checks and builds to `dist/`.

Under `npm run dev`, the 我的球拍 / My Rackets page reads and writes `bag.local.json` in the repo root instead of browser storage, and reloads it when the file is edited by hand (`vite/bagFile.ts`). The file is gitignored. The built site has no file and keeps using localStorage.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes `dist/` to GitHub Pages using the built-in `GITHUB_TOKEN`. No personal access token is needed.

## Data

- `src/data/strings.ts` — string catalogue. Attribute ratings (0–100) are editorial estimates informed by published reviews (Tennis Warehouse, Tennisnerd), not lab measurements.
- `src/data/rackets.ts` — Wilson, Head, Yonex and Babolat frames with retail specs and what each frame adds to the string bed.
- `src/data/players.ts` — pro setups. Every entry carries the source URL it was checked against and the check date. Pro setups change with events, surfaces and weather; treat them as starting points.

To add an entry, append an object to the relevant array and run `npm test`; the integrity tests will tell you if anything is missing or out of range.

## Model

`src/model/stringbed.ts` blends mains (60 %) and crosses (40 %), applies a saturating tension effect relative to each string's comfort zone, a gauge correction, and frame modifiers for pattern openness, stiffness, head size and weight. `src/model/insights.ts` generates the bilingual explanations from a small rule set.
