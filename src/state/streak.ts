import { addDays, diffDays, monthKey } from './dates';

/** Daily days completed in a month to earn that month's trophy. PRD §6.3 leaves this TBD. */
export const TROPHY_DAYS = 20;
/** How many days after a break a Streak Fixer can still restore it. */
export const FIX_WINDOW_DAYS = 3;

export interface DailyState {
  completed: string[];
  /** Days covered by a Streak Freezer. */
  frozen: string[];
  streak: number;
  best: number;
  /** Last day that counts toward the streak (completed or frozen). */
  lastCounted: string | null;
  freezers: number;
  fixers: number;
  broken: { streak: number; date: string } | null;
  /** Month keys (`YYYY-MM`) with a trophy. */
  trophies: string[];
}

export const initialDaily: DailyState = {
  completed: [],
  frozen: [],
  streak: 0,
  best: 0,
  lastCounted: null,
  freezers: 0,
  fixers: 0,
  broken: null,
  trophies: [],
};

/** Applies missed days: spends freezers to cover them, otherwise breaks the streak. */
export function reconcileStreak(s: DailyState, today: string): DailyState {
  if (!s.lastCounted || s.streak === 0) return s;
  const missed = diffDays(s.lastCounted, today) - 1;
  if (missed <= 0) return s;

  if (s.freezers >= missed) {
    const frozen = Array.from({ length: missed }, (_, i) => addDays(s.lastCounted!, i + 1));
    return { ...s, freezers: s.freezers - missed, frozen: [...s.frozen, ...frozen], lastCounted: addDays(today, -1) };
  }
  return { ...s, broken: { streak: s.streak, date: today }, streak: 0, lastCounted: null };
}

export function completeDaily(s: DailyState, today: string): DailyState {
  s = reconcileStreak(s, today);
  if (s.completed.includes(today)) return s;

  const continues = s.lastCounted !== null && diffDays(s.lastCounted, today) === 1;
  const streak = continues ? s.streak + 1 : 1;
  const completed = [...s.completed, today];

  const month = monthKey(today);
  const inMonth = completed.filter((d) => monthKey(d) === month).length;
  const trophies = inMonth >= TROPHY_DAYS && !s.trophies.includes(month) ? [...s.trophies, month] : s.trophies;

  return { ...s, completed, streak, best: Math.max(s.best, streak), lastCounted: today, trophies };
}

export function canFixStreak(s: DailyState, today: string): boolean {
  return !!s.broken && diffDays(s.broken.date, today) <= FIX_WINDOW_DAYS;
}

/** Spends a Streak Fixer: the broken streak is restored and joined with any progress since. */
export function fixStreak(s: DailyState, today: string): DailyState {
  if (!canFixStreak(s, today) || s.fixers <= 0) return s;
  const streak = s.broken!.streak + s.streak;
  return {
    ...s,
    fixers: s.fixers - 1,
    streak,
    best: Math.max(s.best, streak),
    broken: null,
    lastCounted: s.lastCounted ?? addDays(today, -1),
  };
}
