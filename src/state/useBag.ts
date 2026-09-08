import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { hasStoredBag, loadBag, saveBag, type BagRacket } from './bag';
import { seedBag } from './bagSeed';

/**
 * The bag lives entirely in this browser's localStorage — nothing is uploaded.
 * Seeds only on a first ever visit, so deleting every racket sticks.
 */
export function useBag(): [BagRacket[], Dispatch<SetStateAction<BagRacket[]>>] {
  const [rackets, setRackets] = useState<BagRacket[]>(() => {
    if (hasStoredBag()) return loadBag();
    const seeded = seedBag();
    saveBag(seeded);
    return seeded;
  });

  useEffect(() => {
    saveBag(rackets);
  }, [rackets]);

  return [rackets, setRackets];
}
