import type { Candidate } from '../../model/solve';
import type { SetupAction } from '../../state/useSetup';

/**
 * Order matters: `setMainsTension` re-derives the crosses tension while
 * tensions are linked, so the crosses tension is written last.
 */
export function buildLoadActions(c: Candidate): SetupAction[] {
  return [
    { type: 'setRacket', id: c.racketId },
    { type: 'setMains', id: c.mainsId },
    { type: 'setMainsGauge', gauge: c.mainsGauge },
    { type: 'setCrosses', id: c.crossesId },
    { type: 'setCrossesGauge', gauge: c.crossesGauge },
    { type: 'setMainsTension', lb: c.mainsTension },
    { type: 'setCrossesTension', lb: c.crossesTension },
  ];
}
