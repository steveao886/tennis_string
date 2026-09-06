import { useEffect, useReducer, type Dispatch } from 'react';
import { stringById, racketById, type Player } from '../data';
import { DEFAULT_SETUP, LINK_GAP, clampTension, parseSetup, serializeSetup, type SetupState } from './hash';
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

const gaugeFor = (id: string, wanted?: number): number => {
  const s = stringById.get(id)!;
  return wanted !== undefined && s.gauges.includes(wanted) ? wanted : s.defaultGauge;
};

export function reduce(s: SetupState, a: SetupAction): SetupState {
  switch (a.type) {
    case 'setRacket':
      return { ...s, racketId: a.id && racketById.has(a.id) ? a.id : null };
    case 'setMains':
      return stringById.has(a.id) ? { ...s, mainsId: a.id, mainsGauge: gaugeFor(a.id, s.mainsGauge) } : s;
    case 'setCrosses':
      return stringById.has(a.id) ? { ...s, crossesId: a.id, crossesGauge: gaugeFor(a.id, s.crossesGauge) } : s;
    case 'setMainsGauge':
      return { ...s, mainsGauge: gaugeFor(s.mainsId, a.gauge) };
    case 'setCrossesGauge':
      return { ...s, crossesGauge: gaugeFor(s.crossesId, a.gauge) };
    case 'setMainsTension': {
      const m = clampTension(a.lb);
      return { ...s, mainsTension: m, crossesTension: s.linkTensions ? clampTension(m - LINK_GAP) : s.crossesTension };
    }
    case 'setCrossesTension':
      return { ...s, crossesTension: clampTension(a.lb), linkTensions: false };
    case 'setLinkTensions':
      return a.on ? { ...s, linkTensions: true, crossesTension: clampTension(s.mainsTension - LINK_GAP) } : { ...s, linkTensions: false };
    case 'setUnit':
      return { ...s, unit: a.unit };
    case 'loadPlayer': {
      const p = a.player;
      if (!stringById.has(a.mainsId) || !stringById.has(a.crossesId)) return s;
      return {
        ...s,
        racketId: p.racket.id && racketById.has(p.racket.id) ? p.racket.id : null,
        mainsId: a.mainsId,
        mainsGauge: gaugeFor(a.mainsId, p.mains.gauge),
        crossesId: a.crossesId,
        crossesGauge: gaugeFor(a.crossesId, p.crosses.gauge),
        mainsTension: clampTension(p.tension.mains),
        crossesTension: clampTension(p.tension.crosses),
        linkTensions: false,
      };
    }
    case 'reset':
      return { ...DEFAULT_SETUP, unit: s.unit };
  }
}

export function useSetup(): [SetupState, Dispatch<SetupAction>] {
  const [state, dispatch] = useReducer(reduce, undefined, () => parseSetup(typeof window !== 'undefined' ? window.location.hash : ''));
  useEffect(() => {
    const h = serializeSetup(state);
    if (window.location.hash !== h) history.replaceState(null, '', h);
  }, [state]);
  return [state, dispatch];
}
