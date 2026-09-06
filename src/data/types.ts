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

export interface Racket {
  id: string;
  brand: 'Wilson' | 'Head';
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
