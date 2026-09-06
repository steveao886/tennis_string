import { describe, it, expect } from 'vitest';
import { serializeSetup, parseSetup, DEFAULT_SETUP, type SetupState } from './hash';
import { reduce } from './useSetup';
import type { Player } from '../data';

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
    expect(parseSetup('#m=nope:1.25&x=luxilon-alu-power:1.25&t=52,50&u=lb')).toEqual(DEFAULT_SETUP);
    expect(parseSetup('')).toEqual(DEFAULT_SETUP);
    expect(parseSetup('#garbage')).toEqual(DEFAULT_SETUP);
  });
  it('clamps tensions to 35..70 and infers linkTensions from a 2 lb gap', () => {
    const p = parseSetup('#m=luxilon-alu-power:1.25&x=luxilon-alu-power:1.25&t=99,1&u=lb');
    expect(p.mainsTension).toBe(70);
    expect(p.crossesTension).toBe(35);
    expect(p.linkTensions).toBe(false);
    expect(parseSetup('#m=luxilon-alu-power:1.25&x=luxilon-alu-power:1.25&t=54,52&u=lb').linkTensions).toBe(true);
  });
  it('falls back to the default gauge when the gauge is not offered', () => {
    expect(parseSetup('#m=luxilon-alu-power-rough:1.15&x=luxilon-alu-power:1.25&t=52,50&u=lb').mainsGauge).toBe(1.25);
  });
});

describe('reduce', () => {
  it('moves crosses with mains when linked', () => {
    const s = reduce(DEFAULT_SETUP, { type: 'setMainsTension', lb: 60 });
    expect(s.mainsTension).toBe(60);
    expect(s.crossesTension).toBe(58);
  });
  it('unlinks when crosses are set directly', () => {
    const s = reduce(DEFAULT_SETUP, { type: 'setCrossesTension', lb: 45 });
    expect(s.crossesTension).toBe(45);
    expect(s.linkTensions).toBe(false);
  });
  it('re-linking snaps crosses to mains - 2', () => {
    const s = reduce({ ...DEFAULT_SETUP, linkTensions: false, mainsTension: 56, crossesTension: 40 }, { type: 'setLinkTensions', on: true });
    expect(s.crossesTension).toBe(54);
  });
  it('setMains falls back to the default gauge when the current gauge is not offered', () => {
    const s = reduce({ ...DEFAULT_SETUP, mainsGauge: 1.15 }, { type: 'setMains', id: 'luxilon-alu-power-rough' });
    expect(s.mainsId).toBe('luxilon-alu-power-rough');
    expect(s.mainsGauge).toBe(1.25);
  });
  it('ignores unknown string ids', () => {
    expect(reduce(DEFAULT_SETUP, { type: 'setMains', id: 'nope' })).toBe(DEFAULT_SETUP);
  });
  it('loadPlayer applies racket, strings, gauges and tensions and unlinks', () => {
    const p: Player = { id: 'x', name: 'X', nameZh: 'X', country: 'ES', tour: 'ATP', racket: { id: 'wilson-blade-98-18x20-v9', label: 'Blade' }, mains: { stringId: 'babolat-rpm-blast', label: 'RPM Blast', gauge: 1.3 }, crosses: { stringId: 'babolat-vs-touch', label: 'VS', gauge: 1.3 }, tension: { mains: 55, crosses: 53 }, source: { label: 's', url: 'https://x' }, verifiedOn: '2026-09-06' };
    const s = reduce(DEFAULT_SETUP, { type: 'loadPlayer', player: p, mainsId: 'babolat-rpm-blast', crossesId: 'babolat-vs-touch' });
    expect(s).toMatchObject({ racketId: 'wilson-blade-98-18x20-v9', mainsId: 'babolat-rpm-blast', mainsGauge: 1.3, crossesId: 'babolat-vs-touch', crossesGauge: 1.3, mainsTension: 55, crossesTension: 53, linkTensions: false });
  });
  it('reset keeps the unit', () => {
    expect(reduce({ ...DEFAULT_SETUP, unit: 'kg', mainsTension: 66 }, { type: 'reset' })).toEqual({ ...DEFAULT_SETUP, unit: 'kg' });
  });
});
