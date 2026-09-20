import { describe, it, expect } from 'vitest';
import { racketById, stringById } from '../data';
import { BASE_PLAY_HOURS, KILLER, REFERENCE_ATTR, playHoursLimit } from './wear';
import { strings } from '../data/strings';

const s = (id: string) => stringById.get(id)!;
const r = (id: string) => racketById.get(id)!;

describe('playHoursLimit', () => {
  it('falls back to the poly base when the string is unknown', () => {
    expect(playHoursLimit(undefined, 1.25)).toBe(BASE_PLAY_HOURS.poly);
  });

  it('leaves a material whose attribute sits on the reference at its base hours', () => {
    for (const material of Object.keys(BASE_PLAY_HOURS) as (keyof typeof BASE_PLAY_HOURS)[]) {
      const median = strings.find((x) => x.material === material);
      if (!median) continue;
      const onReference = {
        ...median,
        attrs: { ...median.attrs, [KILLER[material] === 'tension' ? 'tensionMaintenance' : 'durability']: REFERENCE_ATTR[material] },
      };
      expect(playHoursLimit(onReference, 1.25)).toBe(BASE_PLAY_HOURS[material]);
    }
  });

  /**
   * The pair a flat per-material table could not tell apart: both polys, both
   * durable, and the one that holds tension lasts close to twice as long.
   */
  it('separates 4G from RPM Blast, which durability alone cannot', () => {
    const fourG = playHoursLimit(s('luxilon-4g'), 1.25);
    const blast = playHoursLimit(s('babolat-rpm-blast'), 1.25);
    expect(fourG).toBeGreaterThan(blast * 1.5);
    // Durability would have called it almost a tie.
    expect(s('luxilon-4g').attrs.durability - s('babolat-rpm-blast').attrs.durability).toBeLessThan(15);
  });

  it('separates Triax from NXT, which tension maintenance alone cannot', () => {
    expect(playHoursLimit(s('tecnifibre-triax'), 1.28)).toBeGreaterThan(playHoursLimit(s('wilson-nxt'), 1.28));
    expect(Math.abs(s('tecnifibre-triax').attrs.tensionMaintenance - s('wilson-nxt').attrs.tensionMaintenance)).toBeLessThan(10);
  });

  it('gives a thicker gauge more hours', () => {
    expect(playHoursLimit(s('tecnifibre-triax'), 1.33)).toBeGreaterThan(playHoursLimit(s('tecnifibre-triax'), 1.28));
  });

  it('gives a dense pattern more hours than an open one', () => {
    const dense = playHoursLimit(s('tecnifibre-triax'), 1.28, r('wilson-blade-98-18x20-v9'));
    const open = playHoursLimit(s('tecnifibre-triax'), 1.28, r('wilson-blade-98-16x19-v9'));
    expect(dense).toBeGreaterThan(open);
  });

  it('treats 16x19 as the neutral pattern, so the base calibration still holds', () => {
    const bare = playHoursLimit(s('tecnifibre-triax'), 1.28);
    expect(playHoursLimit(s('tecnifibre-triax'), 1.28, r('wilson-pro-staff-97-v14'))).toBe(bare);
  });

  it('keeps every string in the library inside a believable range', () => {
    for (const x of strings) {
      const h = playHoursLimit(x, x.defaultGauge);
      expect(h).toBeGreaterThanOrEqual(8);
      expect(h).toBeLessThanOrEqual(60);
    }
  });
});
