import { strings, stringById } from '../../data';
import type { Player, TennisString } from '../../data';

export interface Substitution {
  wanted: string;
  got: TennisString;
}

export interface Resolved {
  mainsId: string;
  crossesId: string;
  substitutions: Substitution[];
}

const MULTI_HINTS = /(multi|nxt|xcel|x-one|velocity|nrg|triax|rexis|vanquish|sensation)/;

export function guessMaterial(label: string): TennisString['material'] {
  const l = label.toLowerCase();
  const looksSynthetic = l.includes('syn'); // catches "synthetic" and "syn gut"
  if (l.includes('gut') && !looksSynthetic) return 'natural-gut';
  if (looksSynthetic) return 'synthetic-gut';
  if (MULTI_HINTS.test(l)) return 'multifilament';
  return 'poly';
}

function normalize(label: string): string {
  return label
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(string|tennis)\b/g, ' ')
    .replace(/\b\d+(\.\d+)?l?\b/g, ' ') // gauge suffixes: 16L, 17, 1.25, 125...
    .replace(/\s+/g, ' ')
    .trim();
}

const fullName = (s: TennisString): string => `${s.brand} ${s.name}`.toLowerCase();

function matchesLabel(norm: string, s: TennisString): boolean {
  const full = fullName(s);
  return norm === full || (norm.includes(s.brand.toLowerCase()) && norm.includes(s.name.toLowerCase()));
}

/** Catalogue match, or the best material-based substitute. */
export function resolveStringLabel(label: string): TennisString {
  const norm = normalize(label);
  let best: TennisString | null = null;
  for (const s of strings) {
    if (matchesLabel(norm, s) && (!best || fullName(s).length > fullName(best).length)) best = s;
  }
  if (best) return best;

  const material = guessMaterial(label);
  const candidates = strings.filter((s) => s.material === material);
  const byBrand = candidates.find((s) => norm.includes(s.brand.toLowerCase()));
  return byBrand ?? candidates[0] ?? stringById.get('luxilon-alu-power')!;
}

export function resolvePlayerStrings(p: Player): Resolved {
  const substitutions: Substitution[] = [];

  function resolveSide(side: { stringId?: string; label: string }): string {
    if (side.stringId && stringById.has(side.stringId)) return side.stringId;
    const got = resolveStringLabel(side.label);
    if (!matchesLabel(normalize(side.label), got)) substitutions.push({ wanted: side.label, got });
    return got.id;
  }

  return {
    mainsId: resolveSide(p.mains),
    crossesId: resolveSide(p.crosses),
    substitutions,
  };
}
