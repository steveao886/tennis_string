import { shiftDay, todayISO, type BagRacket } from './bag';

/**
 * First-run contents. Dates are deliberately rough — the point of the page is
 * that the owner replaces them with the real ones.
 */
export function seedBag(): BagRacket[] {
  const today = todayISO();
  const ago = (days: number): string => shiftDay(today, -days);

  return [
    {
      id: 'seed_ps97',
      racketId: 'wilson-pro-staff-97-v14',
      nickname: '主拍 / Pro Staff',
      hoursPerWeek: 3,
      jobs: [
        {
          id: 'seed_ps97_j1',
          mainsId: 'luxilon-4g',
          mainsGauge: 1.25,
          crossesId: 'luxilon-4g',
          crossesGauge: 1.25,
          mainsTension: 52,
          crossesTension: 52,
          strungOn: ago(1095),
        },
      ],
    },
    {
      id: 'seed_clash98',
      racketId: 'wilson-clash-98-v2',
      nickname: '备用 / Clash 98',
      hoursPerWeek: 3,
      jobs: [
        {
          id: 'seed_clash98_j1',
          mainsId: 'babolat-rpm-blast',
          mainsGauge: 1.25,
          crossesId: 'babolat-rpm-blast',
          crossesGauge: 1.25,
          mainsTension: 52,
          crossesTension: 52,
          strungOn: ago(730),
        },
      ],
    },
    {
      id: 'seed_clash100',
      racketId: 'wilson-clash-100-v3',
      nickname: '老婆的 / Clash 100',
      hoursPerWeek: 2,
      jobs: [
        {
          id: 'seed_clash100_j1',
          mainsId: 'babolat-rpm-blast',
          mainsGauge: 1.25,
          crossesId: 'babolat-rpm-blast',
          crossesGauge: 1.25,
          mainsTension: 52,
          crossesTension: 52,
          strungOn: ago(45),
        },
      ],
    },
  ];
}
