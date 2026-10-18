import { analyzeLevel } from './board';
import { GenParams, generateLevel } from './generator';
import { hashString, mulberry32 } from './rng';
import { Level } from './types';

/** After this level, levels are drawn from a pool of hard configurations (PRD §6.1). */
export const RANDOM_POOL_START = 500;
/** Every Nth level is an easier "breather" (PRD §7.2). */
const BREATHER_EVERY = 7;

/** Handcrafted tutorial levels (PRD §8 item 9). Callouts live in i18n under `tutorial.<n>`. */
const TUTORIAL: Omit<Level, 'key'>[] = [
  {
    id: 1,
    width: 4,
    height: 5,
    arrows: [
      { id: 0, cells: [[1, 3], [1, 2]], head: 'U' },
      { id: 1, cells: [[2, 1], [3, 1]], head: 'R' },
    ],
  },
  {
    id: 2,
    width: 5,
    height: 5,
    arrows: [
      { id: 0, cells: [[0, 2], [1, 2]], head: 'R' },
      { id: 1, cells: [[3, 3], [3, 2]], head: 'U' },
      { id: 2, cells: [[2, 4], [1, 4]], head: 'L' },
    ],
  },
  {
    id: 3,
    width: 5,
    height: 6,
    arrows: [
      { id: 0, cells: [[0, 1], [1, 1], [2, 1]], head: 'R' },
      { id: 1, cells: [[3, 3], [3, 2], [3, 1]], head: 'U' },
      { id: 2, cells: [[1, 4], [2, 4]], head: 'R' },
      { id: 3, cells: [[4, 5], [4, 4]], head: 'U' },
      { id: 4, cells: [[1, 2], [1, 3]], head: 'D' },
    ],
  },
];

export const TUTORIAL_COUNT = TUTORIAL.length;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Difficulty ramp: board size, fill, arrow length and bends all grow with n (PRD §6.1). */
export function paramsForLevel(n: number): GenParams {
  const breather = n % BREATHER_EVERY === 0;
  const k = breather ? Math.max(n - 15, 4) : n;
  const width = clamp(Math.round(4 + Math.sqrt(k) * 1.3), 5, 30);
  const height = clamp(Math.round(width * 1.3), 6, 36);
  return {
    width,
    height,
    fill: clamp(0.4 + k / 600, 0.4, 0.78),
    minLen: 2,
    maxLen: clamp(2 + Math.floor(k / 25), 2, 9),
    // Levels up to 20 introduce straight arrows only (PRD §5.2 recommendation).
    bendChance: k <= 20 ? 0 : clamp(0.15 + k / 800, 0.15, 0.5),
  };
}

export function getLevel(n: number): Level {
  const key = `main:${n}`;
  if (n <= TUTORIAL.length) return { ...TUTORIAL[n - 1], key };

  let paramsLevel = n;
  if (n > RANDOM_POOL_START) {
    // Random selection from the hard band, stable per level number.
    const rng = mulberry32(hashString(`pool:${n}`));
    paramsLevel = RANDOM_POOL_START - 100 + Math.floor(rng() * 100);
  }
  const level = generateLevel(paramsForLevel(paramsLevel), hashString(key), n, key);
  level.difficulty = analyzeLevel(level).score;
  return level;
}

/** One level per calendar day, the same for every player (PRD §6.3). */
export function getDailyLevel(dateKey: string): Level {
  const key = `daily:${dateKey}`;
  const rng = mulberry32(hashString(`daily-band:${dateKey}`));
  const level = generateLevel(paramsForLevel(60 + Math.floor(rng() * 120)), hashString(key), 0, key);
  level.difficulty = analyzeLevel(level).score;
  return level;
}

export function getLevelByKey(key: string): Level {
  const [kind, value] = key.split(':');
  return kind === 'daily' ? getDailyLevel(value) : getLevel(Number(value));
}
