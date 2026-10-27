import { describe, it, expect } from 'vitest';
import { racketById, stringById } from '../data';
import {
  BASE_CALENDAR_DAYS,
  BASE_PLAY_HOURS,
  CALENDAR_REFERENCE,
  CROSS_SLACK,
  KILLER,
  PLAY_REFERENCE,
  bedCalendarDaysLimit,
  bedPlayHoursLimit,
  calendarDaysLimit,
  playHoursLimit,
} from './wear';
import { strings } from '../data/strings';
import { CROSSES_WEIGHT, MAINS_WEIGHT } from './stringbed';

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

describe('the bed clocks', () => {
  const ps97 = r('wilson-pro-staff-97-v14');
  const bed = (mainsId: string, mainsGauge: number, crossesId: string, crossesGauge: number) => ({
    mains: s(mainsId),
    mainsGauge,
    crosses: s(crossesId),
    crossesGauge,
  });

  it('takes its cross slack from the bed weights', () => {
    expect(CROSS_SLACK).toBeCloseTo(MAINS_WEIGHT / CROSSES_WEIGHT, 10);
  });

  it('reads the mains alone on a full bed', () => {
    for (const x of strings) {
      const full = { mains: x, mainsGauge: x.defaultGauge, crosses: x, crossesGauge: x.defaultGauge };
      expect(bedPlayHoursLimit(full, ps97)).toBe(playHoursLimit(x, x.defaultGauge, ps97));
      expect(bedCalendarDaysLimit(full)).toBe(calendarDaysLimit(x));
    }
  });

  /** Every poly dies before every soft string, cross slack or not. */
  it('leaves every conventional hybrid on its poly mains', () => {
    const polys = strings.filter((x) => KILLER[x.material] === 'tension');
    const soft = strings.filter((x) => KILLER[x.material] === 'abrasion');
    for (const m of polys) {
      for (const c of soft) {
        const b = { mains: m, mainsGauge: m.defaultGauge, crosses: c, crossesGauge: c.defaultGauge };
        expect(bedPlayHoursLimit(b, ps97)).toBe(playHoursLimit(m, m.defaultGauge, ps97));
        expect(bedCalendarDaysLimit(b)).toBe(calendarDaysLimit(m));
      }
    }
  });

  /**
   * The Federer-style bed. Triax mains alone say 42 h and 183 d, but the poly
   * under them goes dead on its own clock, which does not stop because it is
   * strung sideways.
   */
  it('lets a poly cross under soft mains cut both clocks', () => {
    const b = bed('tecnifibre-triax', 1.28, 'yonex-poly-tour-pro', 1.25);
    const crossHours = playHoursLimit(s('yonex-poly-tour-pro'), 1.25, ps97);
    expect(bedPlayHoursLimit(b, ps97)).toBe(Math.round(crossHours * CROSS_SLACK));
    expect(bedPlayHoursLimit(b, ps97)).toBeLessThan(playHoursLimit(s('tecnifibre-triax'), 1.28, ps97));
    expect(bedCalendarDaysLimit(b)).toBe(Math.round(calendarDaysLimit(s('yonex-poly-tour-pro')) * CROSS_SLACK));
    expect(bedCalendarDaysLimit(b)).toBeLessThan(calendarDaysLimit(s('tecnifibre-triax')));
  });

  /** A dead cross costs the bed less than a dead main, so it gets slack, not a pass. */
  it('gives the cross more time than the same string would get as mains', () => {
    const b = bed('tecnifibre-triax', 1.28, 'luxilon-4g', 1.25);
    expect(bedPlayHoursLimit(b, ps97)).toBeGreaterThan(playHoursLimit(s('luxilon-4g'), 1.25, ps97));
    // 4G holds tension well enough to sit on the shelf as long as Triax.
    expect(bedCalendarDaysLimit(b)).toBe(calendarDaysLimit(s('tecnifibre-triax')));
  });

  it('falls back to the mains when the crosses are unknown', () => {
    const b = { mains: s('tecnifibre-triax'), mainsGauge: 1.28, crosses: undefined, crossesGauge: 1.25 };
    expect(bedPlayHoursLimit(b, ps97)).toBe(playHoursLimit(s('tecnifibre-triax'), 1.28, ps97));
    expect(bedCalendarDaysLimit(b)).toBe(calendarDaysLimit(s('tecnifibre-triax')));
  });
});
