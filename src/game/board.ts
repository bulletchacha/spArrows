import { Arrow, Cell, DIR_DELTA, Level } from './types';

export const cellKey = (x: number, y: number) => `${x},${y}`;

function occupancy(arrows: Arrow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const a of arrows) for (const [x, y] of a.cells) map.set(cellKey(x, y), a.id);
  return map;
}

/** Cells the head enters, in order, until it leaves the board (PRD §5.3 step 2). */
export function exitRay(arrow: Arrow, width: number, height: number): Cell[] {
  const [dx, dy] = DIR_DELTA[arrow.head];
  let [x, y] = arrow.cells[arrow.cells.length - 1];
  const ray: Cell[] = [];
  for (;;) {
    x += dx;
    y += dy;
    if (x < 0 || y < 0 || x >= width || y >= height) return ray;
    ray.push([x, y]);
  }
}

export interface Blocker {
  arrowId: number;
  /** Free cells the head can travel before touching the blocker. */
  steps: number;
}

function blockerIn(arrow: Arrow, occ: Map<string, number>, width: number, height: number): Blocker | null {
  const ray = exitRay(arrow, width, height);
  for (let i = 0; i < ray.length; i++) {
    const id = occ.get(cellKey(ray[i][0], ray[i][1]));
    if (id !== undefined && id !== arrow.id) return { arrowId: id, steps: i };
  }
  return null;
}

/** The first arrow on the exit ray, or null if the path is clear. */
export function findBlocker(arrow: Arrow, arrows: Arrow[], width: number, height: number): Blocker | null {
  return blockerIn(arrow, occupancy(arrows), width, height);
}

/** Arrows that can be launched right now without a collision. */
export function launchable(level: Pick<Level, 'width' | 'height'>, arrows: Arrow[]): Arrow[] {
  const occ = occupancy(arrows);
  return arrows.filter((a) => !blockerIn(a, occ, level.width, level.height));
}

/**
 * Greedy solver (PRD §7.3). Launching only removes obstacles, so any order of
 * clear launches is safe: the level is solvable iff this clears the board.
 * Returns a removal order, or null if unsolvable.
 */
export function solve(level: Pick<Level, 'width' | 'height'>, arrows: Arrow[]): number[] | null {
  let remaining = arrows;
  const order: number[] = [];
  while (remaining.length) {
    const next = launchable(level, remaining);
    if (!next.length) return null;
    const ids = new Set(next.map((a) => a.id));
    order.push(...ids);
    remaining = remaining.filter((a) => !ids.has(a.id));
  }
  return order;
}

/**
 * Hint (PRD §5.6): a currently launchable arrow, preferring the one whose removal
 * frees the most other arrows. Any clear launch is safe, so this is never a losing move.
 */
export function hintArrow(level: Pick<Level, 'width' | 'height'>, arrows: Arrow[]): Arrow | null {
  const options = launchable(level, arrows);
  let best: Arrow | null = null;
  let bestScore = -1;
  for (const a of options) {
    const rest = arrows.filter((b) => b.id !== a.id);
    const score = launchable(level, rest).length;
    if (score > bestScore) {
      best = a;
      bestScore = score;
    }
  }
  return best;
}

export interface LevelStats {
  arrows: number;
  density: number;
  firstMoves: number;
  chainDepth: number;
  avgLength: number;
  bends: number;
  /** 0 (trivial) – 1 (hardest). */
  score: number;
}

const countBends = (a: Arrow) => {
  let bends = 0;
  for (let i = 2; i < a.cells.length; i++) {
    const [x0, y0] = a.cells[i - 2];
    const [x1, y1] = a.cells[i - 1];
    const [x2, y2] = a.cells[i];
    if (x1 - x0 !== x2 - x1 || y1 - y0 !== y2 - y1) bends++;
  }
  return bends;
};

/** Difficulty metrics from PRD §7.2. */
export function analyzeLevel(level: Level): LevelStats {
  const { arrows, width, height } = level;
  const occ = occupancy(arrows);
  const blockers = new Map<number, Set<number>>();
  for (const a of arrows) {
    const set = new Set<number>();
    for (const [x, y] of exitRay(a, width, height)) {
      const id = occ.get(cellKey(x, y));
      if (id !== undefined && id !== a.id) set.add(id);
    }
    blockers.set(a.id, set);
  }

  // Longest chain "A waits for B waits for C…". Solvable levels form a DAG.
  const depth = new Map<number, number>();
  const visit = (id: number, guard: Set<number>): number => {
    const known = depth.get(id);
    if (known !== undefined) return known;
    if (guard.has(id)) return 0;
    guard.add(id);
    let d = 1;
    for (const b of blockers.get(id) ?? []) d = Math.max(d, 1 + visit(b, guard));
    guard.delete(id);
    depth.set(id, d);
    return d;
  };
  let chainDepth = 0;
  for (const a of arrows) chainDepth = Math.max(chainDepth, visit(a.id, new Set()));

  const cells = arrows.reduce((n, a) => n + a.cells.length, 0);
  const bends = arrows.reduce((n, a) => n + countBends(a), 0);
  const firstMoves = launchable(level, arrows).length;
  const density = cells / (width * height);
  const n = Math.max(arrows.length, 1);

  const score =
    0.3 * density +
    0.3 * Math.min(chainDepth / 12, 1) +
    0.2 * (1 - firstMoves / n) +
    0.1 * Math.min(bends / n, 1) +
    0.1 * Math.min(arrows.length / 120, 1);

  return { arrows: arrows.length, density, firstMoves, chainDepth, avgLength: cells / n, bends, score };
}
