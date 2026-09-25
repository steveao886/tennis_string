import { racketById, stringById } from '../data';
import type { Racket } from '../data/types';
import { calendarDaysLimit, playHoursLimit } from '../model/wear';
import { clampTension } from './hash';

/** One stringing of one racket. */
export interface StringJob {
  id: string;
  mainsId: string;
  mainsGauge: number;
  crossesId: string;
  crossesGauge: number;
  mainsTension: number; // lb
  crossesTension: number; // lb
  strungOn: string; // YYYY-MM-DD
  note?: string;
}

/** A racket the user owns, plus its stringing history (newest first). */
export interface BagRacket {
  id: string;
  racketId: string;
  nickname: string;
  hoursPerWeek: number;
  jobs: StringJob[];
}

export const BAG_STORAGE_KEY = 'tsh.bag';
export const BAG_VERSION = 1;
export const DEFAULT_HOURS_PER_WEEK = 3;
export const HOURS_PER_WEEK_MAX = 40;

/**
 * Two clocks kill a string bed, and they are not the same clock. Play hours
 * cover how the bed dies while it is being swung; calendar days cover the way a
 * string keeps stiffening in the bag whether or not anybody swings it.
 * `model/wear` works out both per string.
 */

const DAY_MS = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Epoch ms at UTC midnight, or null when the input is not a real calendar day. */
export function parseDay(s: unknown): number | null {
  if (typeof s !== 'string' || !DAY_RE.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d);
  return Number.isNaN(ms) || formatDay(ms) !== s ? null : ms;
}

export function formatDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** The viewer's local calendar day. Days are stored as UTC midnight, so build
 *  it from local parts — `Date.now()` would hand back yesterday or tomorrow
 *  for anyone whose offset has already rolled the UTC date over. */
export function todayISO(now: Date = new Date()): string {
  return formatDay(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function shiftDay(day: string, days: number): string {
  return formatDay((parseDay(day) ?? 0) + Math.round(days) * DAY_MS);
}

/** Whole days from `from` to `to`, floored at zero so a future date reads as brand new. */
export function daysBetween(from: string, to: string): number {
  const a = parseDay(from);
  const b = parseDay(to);
  if (a === null || b === null) return 0;
  return Math.max(0, Math.round((b - a) / DAY_MS));
}

export type DueClock = 'play' | 'calendar';
export type DueStatus = 'fresh' | 'due' | 'overdue';

export interface DueEstimate {
  playHours: number;
  playLimit: number;
  daysElapsed: number;
  dayLimit: number;
  lifeDays: number; // days from stringing until the binding clock runs out
  dueDate: string;
  binding: DueClock;
  status: DueStatus;
}

/**
 * Projects when a job needs replacing. Both clocks run from the stringing date;
 * whichever expires first is the binding one. The frame is optional because the
 * play clock only uses it to read the pattern.
 */
export function estimateDue(
  job: StringJob,
  hoursPerWeek: number,
  today: string,
  racket?: Racket,
): DueEstimate {
  const mains = stringById.get(job.mainsId);
  const playLimit = playHoursLimit(mains, job.mainsGauge, racket);
  const dayLimit = calendarDaysLimit(mains);
  const hours = Math.max(0, hoursPerWeek);

  const playDays = hours > 0 ? (playLimit / hours) * 7 : Infinity;
  const binding: DueClock = playDays <= dayLimit ? 'play' : 'calendar';
  const lifeDays = Math.round(Math.min(playDays, dayLimit));

  const daysElapsed = daysBetween(job.strungOn, today);
  const ratio = lifeDays > 0 ? daysElapsed / lifeDays : 0;

  return {
    playHours: (daysElapsed / 7) * hours,
    playLimit,
    daysElapsed,
    dayLimit,
    lifeDays,
    dueDate: shiftDay(job.strungOn, lifeDays),
    binding,
    status: ratio >= 1.5 ? 'overdue' : ratio >= 1 ? 'due' : 'fresh',
  };
}

export const latestJob = (r: BagRacket): StringJob | null => r.jobs[0] ?? null;

const byNewest = (a: StringJob, b: StringJob): number =>
  a.strungOn < b.strungOn ? 1 : a.strungOn > b.strungOn ? -1 : 0;

function sanitizeJob(raw: unknown): StringJob | null {
  if (!raw || typeof raw !== 'object') return null;
  const j = raw as Record<string, unknown>;
  const mains = typeof j.mainsId === 'string' ? stringById.get(j.mainsId) : undefined;
  const crosses = typeof j.crossesId === 'string' ? stringById.get(j.crossesId) : undefined;
  if (!mains || !crosses) return null;
  if (typeof j.id !== 'string' || !j.id) return null;
  if (parseDay(j.strungOn) === null) return null;

  const gauge = (v: unknown, s: typeof mains): number =>
    typeof v === 'number' && s.gauges.includes(v) ? v : s.defaultGauge;
  const tension = (v: unknown): number =>
    clampTension(typeof v === 'number' && Number.isFinite(v) ? v : 52);

  const job: StringJob = {
    id: j.id,
    mainsId: mains.id,
    mainsGauge: gauge(j.mainsGauge, mains),
    crossesId: crosses.id,
    crossesGauge: gauge(j.crossesGauge, crosses),
    mainsTension: tension(j.mainsTension),
    crossesTension: tension(j.crossesTension),
    strungOn: j.strungOn as string,
  };
  if (typeof j.note === 'string' && j.note) job.note = j.note;
  return job;
}

function sanitizeRacket(raw: unknown): BagRacket | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  if (typeof r.racketId !== 'string' || !racketById.has(r.racketId)) return null;

  const hours =
    typeof r.hoursPerWeek === 'number' && Number.isFinite(r.hoursPerWeek)
      ? r.hoursPerWeek
      : DEFAULT_HOURS_PER_WEEK;
  return {
    id: r.id,
    racketId: r.racketId,
    nickname: typeof r.nickname === 'string' && r.nickname ? r.nickname : racketById.get(r.racketId)!.name,
    hoursPerWeek: Math.min(HOURS_PER_WEEK_MAX, Math.max(0, hours)),
    jobs: (Array.isArray(r.jobs) ? r.jobs : [])
      .map(sanitizeJob)
      .filter((j): j is StringJob => j !== null)
      .sort(byNewest),
  };
}

/** The raw racket entries of a stored bag, or null when it is not one. */
function readEntries(raw: string | null): unknown[] | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const { v, rackets } = data as { v?: unknown; rackets?: unknown };
  if (v !== BAG_VERSION || !Array.isArray(rackets)) return null;
  return rackets;
}

const sanitizeAll = (entries: unknown[]): BagRacket[] =>
  entries.map(sanitizeRacket).filter((r): r is BagRacket => r !== null);

export function parseBag(raw: string | null): BagRacket[] {
  const entries = readEntries(raw);
  return entries ? sanitizeAll(entries) : [];
}

/**
 * The strict read for the bag file the dev server keeps in the repo. That file
 * gets edited by hand, and an id with a typo would be dropped quietly by
 * parseBag and then saved out of existence on the next write — so this also
 * counts every racket and job it could not read, and null means not a bag at all.
 */
export function parseBagFile(raw: string): { rackets: BagRacket[]; dropped: number } | null {
  const entries = readEntries(raw);
  if (!entries) return null;

  const rackets = sanitizeAll(entries);
  const jobsIn = (entry: unknown): number => {
    const jobs = (entry as { jobs?: unknown } | null)?.jobs;
    return Array.isArray(jobs) ? jobs.length : 0;
  };
  const found = entries.reduce<number>((n, e) => n + 1 + jobsIn(e), 0);
  const kept = rackets.reduce((n, r) => n + 1 + r.jobs.length, 0);
  return { rackets, dropped: found - kept };
}

export function serializeBag(rackets: BagRacket[]): string {
  return JSON.stringify({ v: BAG_VERSION, rackets });
}

/** True once the bag has been written at least once, so an emptied bag stays empty. */
export function hasStoredBag(): boolean {
  try {
    return localStorage.getItem(BAG_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function loadBag(): BagRacket[] {
  try {
    return parseBag(localStorage.getItem(BAG_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function saveBag(rackets: BagRacket[]): void {
  try {
    localStorage.setItem(BAG_STORAGE_KEY, serializeBag(rackets));
  } catch {
    /* ignore */
  }
}

export const addRacket = (list: BagRacket[], r: BagRacket): BagRacket[] => [...list, r];

export const removeRacket = (list: BagRacket[], id: string): BagRacket[] =>
  list.some((r) => r.id === id) ? list.filter((r) => r.id !== id) : list;

export const updateRacket = (
  list: BagRacket[],
  id: string,
  patch: Partial<Omit<BagRacket, 'id'>>,
): BagRacket[] => list.map((r) => (r.id === id ? { ...r, ...patch } : r));

export const addJob = (list: BagRacket[], racketId: string, job: StringJob): BagRacket[] =>
  list.map((r) => (r.id === racketId ? { ...r, jobs: [...r.jobs, job].sort(byNewest) } : r));

export const removeJob = (list: BagRacket[], racketId: string, jobId: string): BagRacket[] =>
  list.map((r) => (r.id === racketId ? { ...r, jobs: r.jobs.filter((j) => j.id !== jobId) } : r));

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
