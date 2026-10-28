import { describe, it, expect } from 'vitest';
import { ATTRS } from './types';
import { strings } from './strings';
import { community } from './community';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const THREAD_RE = /^https:\/\/www\.reddit\.com\/r\/[A-Za-z0-9_]+\/comments\/[a-z0-9]+\//;
const byId = new Map(strings.map((s) => [s.id, s]));

describe('community feedback', () => {
  it('covers every string in the catalogue exactly once', () => {
    const ids = community.map((c) => c.stringId);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(strings.map((s) => s.id).sort());
  });

  it('says something about every string it has threads for', () => {
    for (const c of community) {
      expect(c.checkedOn).toMatch(DAY_RE);
      if (c.coverage !== 'thin') expect(c.claims.length, c.stringId).toBeGreaterThan(0);
    }
  });

  /** The label on the page is only honest if the counts behind it hold up. */
  it('backs every weight with the counts it promises', () => {
    for (const c of community) {
      for (const k of c.claims) {
        const where = `${c.stringId}: ${k.text.en}`;
        if (k.weight === 'consensus') expect(k.people, where).toBeGreaterThanOrEqual(3);
        if (k.weight === 'upvoted') expect(k.topScore, where).toBeGreaterThanOrEqual(20);
        if (k.weight === 'minority') expect(k.people, where).toBeLessThanOrEqual(2);
        if (k.weight === 'disputed') expect(k.people, where).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('writes every claim and conflict in both languages, briefly', () => {
    for (const c of community) {
      for (const { text } of [...c.claims, ...c.conflicts]) {
        expect(text.zh.length, text.en).toBeGreaterThan(0);
        expect(text.zh.length, text.zh).toBeLessThanOrEqual(60);
        expect(text.en.length, text.en).toBeGreaterThan(0);
        expect(text.en.length, text.en).toBeLessThanOrEqual(160);
      }
    }
  });

  /** A conflict quotes our score, so it goes stale the moment the score moves. */
  it('quotes the score a conflict is about as it stands today', () => {
    for (const c of community) {
      for (const k of c.conflicts) {
        expect(ATTRS).toContain(k.attr);
        expect(k.ours, `${c.stringId}.${k.attr}`).toBe(byId.get(c.stringId)!.attrs[k.attr]);
      }
    }
  });

  it('links only to Reddit threads', () => {
    for (const c of community) {
      expect(c.sources.length).toBeLessThanOrEqual(6);
      if (c.claims.length > 0) expect(c.sources.length, c.stringId).toBeGreaterThan(0);
      for (const s of c.sources) {
        expect(s.url, c.stringId).toMatch(THREAD_RE);
        expect(s.date, s.url).toMatch(DAY_RE);
        expect(s.title.length, s.url).toBeGreaterThan(0);
      }
    }
  });
});
