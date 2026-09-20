import { describe, it, expect } from 'vitest';
import { racketById, stringById } from '../data';
import { BASE_CALENDAR_DAYS, BASE_PLAY_HOURS, CALENDAR_REFERENCE, KILLER, PLAY_REFERENCE, calendarDaysLimit, playHoursLimit } from './wear';
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
        attrs: { ...median.attrs, [KILLER[material] === 'tension' ? 'tensionMaintenance' : 'durability']: PLAY_REFERENCE[material] },
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

describe('calendarDaysLimit', () => {
  it('falls back to the poly base when the string is unknown', () => {
    expect(calendarDaysLimit(undefined)).toBe(BASE_CALENDAR_DAYS.poly);
  });

  it('leaves a string on its material reference at that material base', () => {
    const triax = s('tecnifibre-triax');
    const onReference = { ...triax, attrs: { ...triax.attrs, tensionMaintenance: CALENDAR_REFERENCE.multifilament } };
    expect(calendarDaysLimit(onReference)).toBe(BASE_CALENDAR_DAYS.multifilament);
  });

  /** In the bag it is the same pair again, and the gap is nearly two to one. */
  it('separates 4G from RPM Blast on the shelf too', () => {
    expect(calendarDaysLimit(s('luxilon-4g'))).toBeGreaterThan(calendarDaysLimit(s('babolat-rpm-blast')) * 1.5);
  });

  /**
   * Nothing saws in a bag, so the two inputs that decide how fast something
   * cuts have no business here. The contrast is the point: the play clock moves
   * on both, and the shelf life is left with the string alone.
   */
  it('is left unmoved by the gauge and pattern the play clock reads', () => {
    const triax = s('tecnifibre-triax');
    expect(playHoursLimit(triax, 1.33)).not.toBe(playHoursLimit(triax, 1.28));
    expect(playHoursLimit(triax, 1.28, r('wilson-blade-98-18x20-v9'))).not.toBe(
      playHoursLimit(triax, 1.28, r('wilson-blade-98-16x19-v9')),
    );
    expect(calendarDaysLimit(triax)).toBe(
      Math.round(BASE_CALENDAR_DAYS.multifilament * (triax.attrs.tensionMaintenance / CALENDAR_REFERENCE.multifilament)),
    );
  });

  it('barely moves the multifilaments, which really are stable on the shelf', () => {
    for (const x of strings.filter((y) => y.material === 'multifilament')) {
      const drift = Math.abs(calendarDaysLimit(x) - BASE_CALENDAR_DAYS.multifilament);
      expect(drift).toBeLessThan(BASE_CALENDAR_DAYS.multifilament * 0.15);
    }
  });

  it('keeps every string in the library inside a believable range', () => {
    for (const x of strings) {
      expect(calendarDaysLimit(x)).toBeGreaterThanOrEqual(60);
      expect(calendarDaysLimit(x)).toBeLessThanOrEqual(240);
    }
  });
});
