import { describe, it, expect } from 'vitest';
import type { Player } from '../../data';
import { guessMaterial, resolvePlayerStrings, resolveStringLabel } from './resolve';

function makePlayer(mains: Player['mains'], crosses: Player['crosses']): Player {
  return {
    id: 'test-player',
    name: 'Test Player',
    nameZh: '测试球员',
    country: 'US',
    tour: 'ATP',
    racket: { label: 'Test Racket' },
    mains,
    crosses,
    tension: { mains: 50, crosses: 50 },
    source: { label: 'Test Source', url: 'https://example.com' },
    verifiedOn: '2026-01-01',
  };
}

describe('guessMaterial', () => {
  it('detects multifilament from brand hint words', () => {
    expect(guessMaterial('Wilson NXT 16')).toBe('multifilament');
  });

  it('detects synthetic gut, not natural gut', () => {
    expect(guessMaterial('Babolat Syn Gut')).toBe('synthetic-gut');
  });
});

describe('resolveStringLabel', () => {
  it('matches an unambiguous brand + name label with no id', () => {
    expect(resolveStringLabel('Babolat RPM Blast').id).toBe('babolat-rpm-blast');
  });

  it('prefers the base ALU Power over the textured Rough variant', () => {
    expect(resolveStringLabel('Luxilon Alu Power').id).toBe('luxilon-alu-power');
  });

  it('still matches the Rough variant when the label says so', () => {
    expect(resolveStringLabel('Luxilon Alu Power Rough').id).toBe('luxilon-alu-power-rough');
  });

  it('substitutes a natural gut string for a generic "Natural Gut" label', () => {
    expect(resolveStringLabel('Natural Gut').material).toBe('natural-gut');
  });

  it('matches Babolat VS Touch despite the trailing "Natural Gut" wording', () => {
    expect(resolveStringLabel('Babolat VS Touch Natural Gut').id).toBe('babolat-vs-touch');
  });

  it('substitutes a Yonex poly for an unlisted Yonex poly label', () => {
    const s = resolveStringLabel('Yonex Poly Tour Fire');
    expect(s.brand).toBe('Yonex');
    expect(s.material).toBe('poly');
  });

  it('falls back to Luxilon Alu Power for a fully unknown label', () => {
    expect(resolveStringLabel('Something Unknown').id).toBe('luxilon-alu-power');
  });
});

describe('resolvePlayerStrings', () => {
  it('keeps known stringIds unchanged with no substitutions', () => {
    const p = makePlayer(
      { stringId: 'babolat-rpm-blast', label: 'Babolat RPM Blast', gauge: 1.3 },
      { stringId: 'babolat-rpm-blast', label: 'Babolat RPM Blast', gauge: 1.3 },
    );
    const r = resolvePlayerStrings(p);
    expect(r.mainsId).toBe('babolat-rpm-blast');
    expect(r.crossesId).toBe('babolat-rpm-blast');
    expect(r.substitutions).toHaveLength(0);
  });

  it('resolves an unlinked exact-ish label with no substitution', () => {
    const p = makePlayer({ label: 'Babolat RPM Blast' }, { label: 'Babolat RPM Blast' });
    const r = resolvePlayerStrings(p);
    expect(r.mainsId).toBe('babolat-rpm-blast');
    expect(r.crossesId).toBe('babolat-rpm-blast');
    expect(r.substitutions).toHaveLength(0);
  });

  it('flags substitutions for a generic Natural Gut label on both sides', () => {
    const p = makePlayer({ label: 'Natural Gut' }, { label: 'Natural Gut' });
    const r = resolvePlayerStrings(p);
    expect(r.substitutions).toHaveLength(2);
    expect(r.substitutions[0].wanted).toBe('Natural Gut');
  });

  it('flags no substitution when mains resolves exact-ish and crosses uses a known id', () => {
    const p = makePlayer(
      { label: 'Babolat VS Touch Natural Gut' },
      { stringId: 'luxilon-alu-power-rough', label: 'Luxilon Alu Power Rough 16L', gauge: 1.25 },
    );
    const r = resolvePlayerStrings(p);
    expect(r.mainsId).toBe('babolat-vs-touch');
    expect(r.crossesId).toBe('luxilon-alu-power-rough');
    expect(r.substitutions).toHaveLength(0);
  });
});
