import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { hasStoredBag, loadBag, parseBagFile, saveBag, serializeBag, type BagRacket } from './bag';
import { seedBag } from './bagSeed';
import { BAG_CHANGED_EVENT, fetchBagFile, putBagFile } from './bagSync';

/**
 * Where the bag file stands. `off` is the live site, which has no file; the
 * rest only happen under `npm run dev`. `unreadable` and `partial` hold every
 * write, because saving would overwrite whatever the page failed to read;
 * `failed` is a write that did not land, and the next change retries it.
 */
export type BagFileStatus =
  | { kind: 'off' }
  | { kind: 'loading' }
  | { kind: 'synced' }
  | { kind: 'unreadable' }
  | { kind: 'partial'; dropped: number }
  | { kind: 'failed' };

/**
 * On the live site the bag lives entirely in this browser's localStorage —
 * nothing is uploaded — and seeds only on a first ever visit, so deleting every
 * racket sticks.
 *
 * Under `npm run dev` the source of truth is `bag.local.json` in the repo
 * instead (see `vite/bagFile.ts`). localStorage is still written, as a cache.
 */
export function useBag(): [BagRacket[], Dispatch<SetStateAction<BagRacket[]>>, BagFileStatus] {
  const [rackets, setRackets] = useState<BagRacket[]>(() => {
    if (hasStoredBag()) return loadBag();
    const seeded = seedBag();
    saveBag(seeded);
    return seeded;
  });
  const [file, setFile] = useState<BagFileStatus>(() =>
    import.meta.env.DEV ? { kind: 'loading' } : { kind: 'off' },
  );

  // The file's contents as this page last saw them, so an unchanged bag is not written.
  const synced = useRef<string | null>(null);

  useEffect(() => {
    saveBag(rackets);
  }, [rackets]);

  // Nothing is written until the file has been read. Otherwise the first render
  // would push this browser's localStorage over whatever the file holds.
  const writable = file.kind === 'synced' || file.kind === 'failed';
  useEffect(() => {
    if (!import.meta.env.DEV || !writable) return;
    const body = serializeBag(rackets);
    if (body === synced.current) return;
    synced.current = body;
    putBagFile(body).then(
      () => setFile((f) => (f.kind === 'synced' ? f : { kind: 'synced' })),
      () => {
        synced.current = null;
        setFile({ kind: 'failed' });
      },
    );
  }, [rackets, writable]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let alive = true;

    const pull = async () => {
      let raw: string | null;
      try {
        raw = await fetchBagFile();
      } catch {
        // A read that failed is not a file that is missing: hold writes, never bootstrap.
        if (alive) setFile({ kind: 'unreadable' });
        return;
      }
      if (!alive) return;

      // First run: the file starts out as whatever this browser already had.
      if (raw === null) {
        synced.current = null;
        setFile({ kind: 'synced' });
        return;
      }

      const read = parseBagFile(raw);
      if (!read) {
        setFile({ kind: 'unreadable' });
      } else if (read.dropped > 0) {
        setFile({ kind: 'partial', dropped: read.dropped });
      } else {
        synced.current = serializeBag(read.rackets);
        setRackets(read.rackets);
        setFile({ kind: 'synced' });
      }
    };

    void pull();
    import.meta.hot?.on(BAG_CHANGED_EVENT, pull);
    return () => {
      alive = false;
      import.meta.hot?.off(BAG_CHANGED_EVENT, pull);
    };
  }, []);

  return [rackets, setRackets, file];
}
