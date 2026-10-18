/** Head direction of an arrow (PRD §5.2). */
export type Dir = 'U' | 'D' | 'L' | 'R';

/** [x, y], origin top-left. */
export type Cell = [number, number];

export interface Arrow {
  id: number;
  /** Ordered tail → head; consecutive cells are orthogonally adjacent. The last segment points along `head`. */
  cells: Cell[];
  head: Dir;
}

/** Level data format from PRD §7.4. */
export interface Level {
  id: number;
  /** Stable identifier used for saves: `main:<n>` or `daily:<YYYY-MM-DD>`. */
  key: string;
  width: number;
  height: number;
  arrows: Arrow[];
  difficulty?: number;
}

export const DIRS: Dir[] = ['U', 'R', 'D', 'L'];

export const DIR_DELTA: Record<Dir, Cell> = {
  U: [0, -1],
  D: [0, 1],
  L: [-1, 0],
  R: [1, 0],
};

export const OPPOSITE: Record<Dir, Dir> = { U: 'D', D: 'U', L: 'R', R: 'L' };
