import { cellKey, exitRay, solve } from './board';
import { Rng, mulberry32, randInt } from './rng';
import { Arrow, Cell, DIRS, DIR_DELTA, Dir, Level, OPPOSITE } from './types';

export interface GenParams {
  width: number;
  height: number;
  /** Target fraction of cells covered by arrows. */
  fill: number;
  minLen: number;
  maxLen: number;
  /** Chance per body step to turn instead of continuing straight. 0 = straight arrows only. */
  bendChance: number;
}

const TURNS: Record<Dir, Dir[]> = { U: ['L', 'R'], D: ['L', 'R'], L: ['U', 'D'], R: ['U', 'D'] };

function shuffle<T>(rng: Rng, items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Grows a body backwards from the head by random walk. Returns tail → head, or null if too short. */
function growBody(rng: Rng, p: GenParams, head: Cell, headDir: Dir, len: number, taken: Set<string>): Cell[] | null {
  const body: Cell[] = [head];
  const own = new Set([cellKey(...head)]);
  // Walking away from the head; the first step must be straight back so the last segment points along headDir.
  let walk = OPPOSITE[headDir];

  for (let i = 1; i < len; i++) {
    const straight = walk;
    const options = i === 1 ? [straight] : rng() < p.bendChance ? [...shuffle(rng, TURNS[walk]), straight] : [straight, ...shuffle(rng, TURNS[walk])];
    const [cx, cy] = body[body.length - 1];
    let placed = false;
    for (const d of options) {
      const [dx, dy] = DIR_DELTA[d];
      const nx = cx + dx;
      const ny = cy + dy;
      const k = cellKey(nx, ny);
      if (nx < 0 || ny < 0 || nx >= p.width || ny >= p.height || taken.has(k) || own.has(k)) continue;
      body.push([nx, ny]);
      own.add(k);
      walk = d;
      placed = true;
      break;
    }
    if (!placed) break;
  }

  return body.length >= p.minLen ? body.reverse() : null;
}

/**
 * Reverse-construction generator (PRD §7.1): an arrow is placed only if its exit ray
 * is clear of every arrow placed before it, so launching in reverse insertion order
 * always clears the board.
 */
export function generateLevel(p: GenParams, seed: number, id: number, key: string): Level {
  for (let attempt = 0; ; attempt++) {
    const rng = mulberry32(seed + attempt * 7919);
    const arrows: Arrow[] = [];
    const taken = new Set<string>();
    const target = p.width * p.height * p.fill;
    let covered = 0;
    let tries = p.width * p.height * 30;

    while (covered < target && tries-- > 0) {
      const head: Cell = [randInt(rng, 0, p.width - 1), randInt(rng, 0, p.height - 1)];
      if (taken.has(cellKey(...head))) continue;
      const headDir = DIRS[randInt(rng, 0, 3)];
      const cells = growBody(rng, p, head, headDir, randInt(rng, p.minLen, p.maxLen), taken);
      if (!cells) continue;

      const candidate: Arrow = { id: arrows.length, cells, head: headDir };
      const own = new Set(cells.map((c) => cellKey(...c)));
      // The ray must not cross an existing arrow (solvability) or the arrow's own body (PRD §7.3).
      if (exitRay(candidate, p.width, p.height).some(([x, y]) => taken.has(cellKey(x, y)) || own.has(cellKey(x, y)))) continue;

      arrows.push(candidate);
      for (const k of own) taken.add(k);
      covered += cells.length;
    }

    const level: Level = { id, key, width: p.width, height: p.height, arrows };
    // Construction guarantees solvability; the check guards against generator bugs.
    if (arrows.length >= 2 && solve(level, arrows)) return level;
    if (attempt > 20) throw new Error(`Could not generate a solvable level for ${key}`);
  }
}
