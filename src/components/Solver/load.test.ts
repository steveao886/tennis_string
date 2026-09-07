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
