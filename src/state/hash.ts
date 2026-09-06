import { stringById, racketById } from '../data';
import type { Unit } from '../model/units';

export interface SetupState {
  racketId: string | null;
  mainsId: string;
  mainsGauge: number;
  crossesId: string;
  crossesGauge: number;
  mainsTension: number; // lb
  crossesTension: number; // lb
  linkTensions: boolean;
  unit: Unit;
}

export const TENSION_MIN = 35;
export const TENSION_MAX = 70;
export const LINK_GAP = 2;
export const DEFAULT_SETUP: SetupState = {
  racketId: null,
  mainsId: 'luxilon-alu-power',
  mainsGauge: 1.25,
  crossesId: 'luxilon-alu-power',
  crossesGauge: 1.25,
  mainsTension: 52,
  crossesTension: 50,
  linkTensions: true,
  unit: 'lb',
};

export const clampTension = (v: number): number => Math.min(TENSION_MAX, Math.max(TENSION_MIN, Math.round(v)));

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
  const mainsTension = Number.isFinite(tm) ? clampTension(tm) : DEFAULT_SETUP.mainsTension;
  const crossesTension = Number.isFinite(tc) ? clampTension(tc) : DEFAULT_SETUP.crossesTension;
  const unit: Unit = p.get('u') === 'kg' ? 'kg' : 'lb';
  const linkTensions = p.get('l') === '0' ? false : mainsTension - crossesTension === LINK_GAP;
  return { racketId, mainsId: m.id, mainsGauge: m.gauge, crossesId: x.id, crossesGauge: x.gauge, mainsTension, crossesTension, linkTensions, unit };
}
