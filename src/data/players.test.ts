import { describe, it, expect } from 'vitest';
import { players } from './players';
import { strings } from './strings';
import { rackets } from './rackets';

const stringIds = new Set(strings.map((s) => s.id));
const racketIds = new Set(rackets.map((r) => r.id));

describe('players', () => {
  it('has ≥18 players, unique ids, resolvable references, sources', () => {
    expect(players.length).toBeGreaterThanOrEqual(18);
    expect(new Set(players.map((p) => p.id)).size).toBe(players.length);
    for (const p of players) {
      expect(p.id).toMatch(/^[a-z0-9-]+$/);
      expect(p.country).toMatch(/^[A-Z]{2}$/);
      expect(['ATP', 'WTA', 'Legend']).toContain(p.tour);
      if (p.mains.stringId) expect(stringIds.has(p.mains.stringId), `${p.id} mains`).toBe(true);
      if (p.crosses.stringId) expect(stringIds.has(p.crosses.stringId), `${p.id} crosses`).toBe(true);
      if (p.racket.id) expect(racketIds.has(p.racket.id), `${p.id} racket`).toBe(true);
      expect(p.tension.mains).toBeGreaterThanOrEqual(35);
      expect(p.tension.mains).toBeLessThanOrEqual(75);
      expect(p.tension.crosses).toBeGreaterThanOrEqual(35);
      expect(p.tension.crosses).toBeLessThanOrEqual(75);
      expect(p.source.url).toMatch(/^https?:\/\//);
      expect(p.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.nameZh.length).toBeGreaterThan(0);
    }
  });
  it('includes Federer and Nadal', () => {
    expect(players.map((p) => p.id)).toEqual(expect.arrayContaining(['roger-federer', 'rafael-nadal']));
  });
});
