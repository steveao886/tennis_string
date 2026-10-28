export type Attr = 'power' | 'control' | 'spin' | 'comfort' | 'durability' | 'tensionMaintenance';
export const ATTRS: readonly Attr[] = ['power', 'control', 'spin', 'comfort', 'durability', 'tensionMaintenance'] as const;
export type Attrs = Record<Attr, number>; // 0–100
export type L10n = { zh: string; en: string };
export type Material = 'poly' | 'multifilament' | 'natural-gut' | 'synthetic-gut' | 'kevlar';
export type Shape = 'round' | 'shaped' | 'textured';

export interface TennisString {
  id: string;
  brand: string;
  name: string;
  material: Material;
  shape: Shape;
  gauges: number[]; // mm ascending
  defaultGauge: number;
  refTension: [number, number]; // lb, comfort zone
  attrs: Attrs;
  blurb: L10n;
}

/**
 * What players report about a string on Reddit, kept apart from `attrs` on
 * purpose: the scores stay editorial, and this sits next to them for the reader
 * to weigh. Weight says how far to trust a claim — `consensus` is three or more
 * people with no real pushback, `upvoted` is a single comment at 20+ points.
 */
export type ClaimWeight = 'consensus' | 'upvoted' | 'disputed' | 'minority';
export type ClaimTone = 'praise' | 'complaint' | 'neutral';
export type Coverage = 'rich' | 'some' | 'thin';

export interface CommunityClaim {
  tone: ClaimTone;
  weight: ClaimWeight;
  text: L10n;
  people: number; // distinct users making the point
  topScore: number; // best upvote count among them
}

/** A place where the community clearly contradicts one of our scores. */
export interface CommunityConflict {
  attr: Attr;
  ours: number;
  text: L10n;
}

export interface CommunitySource {
  url: string;
  title: string;
  // Absent when the thread was only seen as a search excerpt.
  score?: number;
  comments?: number;
  date: string; // YYYY-MM-DD
}

export interface CommunityTake {
  stringId: string;
  threads: number;
  coverage: Coverage;
  checkedOn: string; // YYYY-MM-DD
  /** Set when Gemini compiled the take: it counted people itself and rarely saw upvotes. */
  via?: 'gemini';
  claims: CommunityClaim[];
  conflicts: CommunityConflict[];
  sources: CommunitySource[];
}

export const RACKET_BRANDS = ['Wilson', 'Head', 'Yonex', 'Babolat'] as const;
export type RacketBrand = (typeof RACKET_BRANDS)[number];

export interface Racket {
  id: string;
  brand: RacketBrand;
  family: string;
  name: string;
  headSize: number; // sq in
  weightUnstrung: number; // g
  balance: string; // e.g. '32.0 cm / 7 pts HL'
  stiffness: number; // RA
  pattern: [number, number]; // [mains, crosses]
  beam: string; // e.g. '21 mm'
  recTension: [number, number]; // lb
  attrs: Attrs;
  blurb: L10n;
}

export interface Player {
  id: string;
  name: string;
  nameZh: string;
  country: string; // ISO 3166-1 alpha-2, uppercase
  tour: 'ATP' | 'WTA' | 'Legend';
  racket: { id?: string; label: string; note?: L10n };
  mains: { stringId?: string; label: string; gauge?: number };
  crosses: { stringId?: string; label: string; gauge?: number };
  tension: { mains: number; crosses: number }; // lb
  source: { label: string; url: string };
  verifiedOn: string; // YYYY-MM-DD
  note?: L10n;
}
