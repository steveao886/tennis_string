import { describe, it, expect } from 'vitest';
import { racketById, stringById } from '../data';
import { BASE_PLAY_HOURS, calendarDaysLimit, playHoursLimit } from '../model/wear';
import {
  BAG_VERSION,
  addJob,
  addRacket,
  daysBetween,
  estimateDue,
  formatDay,
  latestJob,
  parseBag,
  parseDay,
  removeJob,
  removeRacket,
  serializeBag,
  shiftDay,
  todayISO,
  updateRacket,
  type BagRacket,
  type StringJob,
} from './bag';

const job = (over: Partial<StringJob> = {}): StringJob => ({
  id: 'j1',
  mainsId: 'babolat-rpm-blast',
  mainsGauge: 1.25,
  crossesId: 'babolat-rpm-blast',
  crossesGauge: 1.25,
  mainsTension: 52,
  crossesTension: 52,
  strungOn: '2026-01-01',
  ...over,
});

const racket = (over: Partial<BagRacket> = {}): BagRacket => ({
  id: 'r1',
  racketId: 'wilson-clash-98-v2',
  nickname: '主拍',
  hoursPerWeek: 3,
  jobs: [job()],
  ...over,
});

describe('date helpers', () => {
  it('parses and formats YYYY-MM-DD without timezone drift', () => {
    expect(formatDay(parseDay('2026-03-09')!)).toBe('2026-03-09');
  });

  it('rejects malformed dates', () => {
    expect(parseDay('nope')).toBeNull();
    expect(parseDay('2026-13-01')).toBeNull();
    expect(parseDay('')).toBeNull();
  });

  it('counts whole days between two dates', () => {
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0);
    expect(daysBetween('2026-01-01', '2026-03-02')).toBe(60);
  });

  it('never reports negative elapsed days for future stringings', () => {
    expect(daysBetween('2026-06-01', '2026-01-01')).toBe(0);
  });

  it('shifts a day by a whole number of days', () => {
    expect(shiftDay('2026-01-01', 35)).toBe('2026-02-05');
  });

  it('reads today from local parts, not the UTC instant', () => {
    // 23:30 local on the 7th is already the 8th in UTC for western offsets,
    // and the stringing date the user means is still the 7th.
    const late = new Date(2026, 8, 7, 23, 30);
    expect(todayISO(late)).toBe('2026-09-07');
  });
});

describe('estimateDue', () => {
  it('binds to the play clock when the player hits often', () => {
    // RPM Blast: 13 h limit / 3 h per week => 30 days, well inside the 90 day calendar limit
    const e = estimateDue(job(), 3, '2026-01-15');
    expect(e.binding).toBe('play');
    expect(e.playLimit).toBe(playHoursLimit(stringById.get('babolat-rpm-blast'), 1.25));
    expect(e.dayLimit).toBe(calendarDaysLimit(stringById.get('babolat-rpm-blast')));
    expect(e.dueDate).toBe('2026-01-31');
    expect(e.status).toBe('fresh');
  });

  it('binds to the calendar clock when the racket mostly sits in the bag', () => {
    // RPM Blast: 13 h limit / 1 h per week => 91 days, past its 81 day calendar limit
    const e = estimateDue(job(), 1, '2026-01-15');
    expect(e.binding).toBe('calendar');
    expect(e.dueDate).toBe('2026-03-23');
  });

  it('gives soft strings a longer life on both clocks', () => {
    const soft = job({ mainsId: 'tecnifibre-triax', crossesId: 'tecnifibre-triax', mainsGauge: 1.28, crossesGauge: 1.28 });
    const e = estimateDue(soft, 3, '2026-01-15');
    expect(e.playLimit).toBe(42);
    expect(e.dayLimit).toBe(183);
    expect(e.dueDate).toBe('2026-04-09'); // 42 / 3 * 7 = 98 days
  });

  it('moves the play clock with gauge and pattern but never the calendar clock', () => {
    const thin = job({ mainsId: 'tecnifibre-triax', crossesId: 'tecnifibre-triax', mainsGauge: 1.28, crossesGauge: 1.28 });
    const thick = job({ mainsId: 'tecnifibre-triax', crossesId: 'tecnifibre-triax', mainsGauge: 1.33, crossesGauge: 1.33 });
    const a = estimateDue(thin, 3, '2026-01-15', racketById.get('wilson-pro-staff-97-v14'));
    const b = estimateDue(thick, 3, '2026-01-15', racketById.get('wilson-blade-98-18x20-v9'));
    expect(b.playLimit).toBeGreaterThan(a.playLimit);
    expect(b.dayLimit).toBe(a.dayLimit); // nothing cuts in a bag
  });

  it('shortens the play clock on an open pattern and stretches it on a dense one', () => {
    const soft = job({ mainsId: 'tecnifibre-triax', crossesId: 'tecnifibre-triax', mainsGauge: 1.28, crossesGauge: 1.28 });
    const open = estimateDue(soft, 3, '2026-01-15', racketById.get('wilson-pro-staff-97-v14'));
    const dense = estimateDue(soft, 3, '2026-01-15', racketById.get('wilson-blade-98-18x20-v9'));
    expect(dense.playLimit).toBeGreaterThan(open.playLimit);
  });

  it('accumulates play hours from elapsed weeks', () => {
    const e = estimateDue(job(), 4, '2026-01-29'); // 28 days = 4 weeks
    expect(e.daysElapsed).toBe(28);
    expect(e.playHours).toBeCloseTo(16);
  });

  it('reports fresh, due and overdue against the binding clock', () => {
    // play clock binds at 30 days
    expect(estimateDue(job(), 3, '2026-01-30').status).toBe('fresh'); // 29 days
    expect(estimateDue(job(), 3, '2026-01-31').status).toBe('due'); // 30 days
    expect(estimateDue(job(), 3, '2026-02-14').status).toBe('due'); // 44 days, < 1.5x
    expect(estimateDue(job(), 3, '2026-02-15').status).toBe('overdue'); // 45 days, > 1.5x
  });

  it('falls back to the calendar clock when hours per week is zero', () => {
    const e = estimateDue(job(), 0, '2026-01-15');
    expect(e.binding).toBe('calendar');
    expect(e.playHours).toBe(0);
    expect(e.dueDate).toBe('2026-03-23');
  });

  it('treats an unknown mains string as poly', () => {
    const e = estimateDue(job({ mainsId: 'does-not-exist' }), 3, '2026-01-15');
    expect(e.playLimit).toBe(BASE_PLAY_HOURS.poly);
  });
});

describe('bag storage', () => {
  it('round-trips through serialize and parse', () => {
    const list = [racket()];
    expect(parseBag(serializeBag(list))).toEqual(list);
  });

  it('returns an empty bag for missing or broken payloads', () => {
    expect(parseBag(null)).toEqual([]);
    expect(parseBag('not json')).toEqual([]);
    expect(parseBag('{"v":1}')).toEqual([]);
    expect(parseBag(JSON.stringify({ v: BAG_VERSION + 1, rackets: [racket()] }))).toEqual([]);
  });

  it('drops rackets whose frame is not in the library', () => {
    const bad = racket({ id: 'r2', racketId: 'not-a-racket' });
    expect(parseBag(JSON.stringify({ v: BAG_VERSION, rackets: [racket(), bad] }))).toHaveLength(1);
  });

  it('drops jobs with unknown strings or bad dates but keeps the racket', () => {
    const r = racket({
      jobs: [job(), job({ id: 'j2', mainsId: 'ghost-string' }), job({ id: 'j3', strungOn: 'yesterday' })],
    });
    const out = parseBag(JSON.stringify({ v: BAG_VERSION, rackets: [r] }));
    expect(out[0].jobs.map((j) => j.id)).toEqual(['j1']);
  });

  it('clamps stored tensions and repairs gauges', () => {
    const r = racket({ jobs: [job({ mainsTension: 900, crossesTension: 2, mainsGauge: 9 })] });
    const out = parseBag(JSON.stringify({ v: BAG_VERSION, rackets: [r] }));
    expect(out[0].jobs[0].mainsTension).toBe(70);
    expect(out[0].jobs[0].crossesTension).toBe(35);
    expect(out[0].jobs[0].mainsGauge).toBe(1.25); // RPM Blast default
  });
});

describe('bag mutations', () => {
  it('adds and removes rackets', () => {
    const list = addRacket([], racket());
    expect(list).toHaveLength(1);
    expect(removeRacket(list, 'r1')).toEqual([]);
    expect(removeRacket(list, 'nope')).toEqual(list);
  });

  it('patches a racket without touching the others', () => {
    const list = [racket(), racket({ id: 'r2', nickname: '备用' })];
    const out = updateRacket(list, 'r2', { hoursPerWeek: 6 });
    expect(out[1].hoursPerWeek).toBe(6);
    expect(out[0]).toBe(list[0]);
  });

  it('keeps jobs sorted newest first', () => {
    const list = addJob([racket({ jobs: [] })], 'r1', job({ id: 'old', strungOn: '2025-01-01' }));
    const out = addJob(list, 'r1', job({ id: 'new', strungOn: '2026-06-01' }));
    expect(out[0].jobs.map((j) => j.id)).toEqual(['new', 'old']);
    expect(latestJob(out[0])!.id).toBe('new');
  });

  it('removes a single job', () => {
    const list = addJob([racket()], 'r1', job({ id: 'j2', strungOn: '2026-05-01' }));
    expect(removeJob(list, 'r1', 'j2')[0].jobs.map((j) => j.id)).toEqual(['j1']);
  });

  it('reports no latest job for an unstrung racket', () => {
    expect(latestJob(racket({ jobs: [] }))).toBeNull();
  });
});
