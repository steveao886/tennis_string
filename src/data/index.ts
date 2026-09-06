import { strings } from './strings';
import { rackets } from './rackets';
import type { TennisString, Racket } from './types';

export * from './types';
export { strings, rackets };

export const stringById: ReadonlyMap<string, TennisString> = new Map(strings.map((s) => [s.id, s]));
export const racketById: ReadonlyMap<string, Racket> = new Map(rackets.map((r) => [r.id, r]));

export const stringBrands: string[] = [...new Set(strings.map((s) => s.brand))];
export const racketFamilies = (brand: Racket['brand']): string[] =>
  [...new Set(rackets.filter((r) => r.brand === brand).map((r) => r.family))];
