import { exitRay } from './board';
import { Arrow, DIR_DELTA } from './types';

/**
 * The track an arrow slides along: its body (tail → head), then its exit ray,
 * then a few cells past the board edge. The arrow is drawn as a "snake" whose
 * tail sits at track position `t` and head at `t + len - 1` (PRD §5.3: head
 * first, body following).
 */
export interface Track {
  xs: number[];
  ys: number[];
  len: number;
  /** Clear cells between the head and the board edge. */
  rayLength: number;
  /** Value of `t` at which the whole arrow has left the board. */
  exitT: number;
}

export function buildTrack(arrow: Arrow, width: number, height: number): Track {
  const ray = exitRay(arrow, width, height);
  const cells = [...arrow.cells, ...ray];
  const [dx, dy] = DIR_DELTA[arrow.head];
  let [x, y] = cells[cells.length - 1];
  for (let i = 0; i < arrow.cells.length + 2; i++) {
    x += dx;
    y += dy;
    cells.push([x, y]);
  }
  return {
    xs: cells.map((c) => c[0]),
    ys: cells.map((c) => c[1]),
    len: arrow.cells.length,
    rayLength: ray.length,
    exitT: arrow.cells.length + ray.length,
  };
}

function pointAt(xs: number[], ys: number[], s: number): [number, number] {
  'worklet';
  const i = Math.max(0, Math.min(Math.floor(s), xs.length - 2));
  const f = s - i;
  return [xs[i] + (xs[i + 1] - xs[i]) * f, ys[i] + (ys[i + 1] - ys[i]) * f];
}

/** SVG path for the body polyline at track offset t (pixel units). */
export function bodyPath(xs: number[], ys: number[], t: number, len: number, cell: number): string {
  'worklet';
  const s1 = t + len - 1;
  const p0 = pointAt(xs, ys, t);
  let d = `M${(p0[0] + 0.5) * cell} ${(p0[1] + 0.5) * cell}`;
  for (let k = Math.floor(t) + 1; k < s1; k++) d += ` L${(xs[k] + 0.5) * cell} ${(ys[k] + 0.5) * cell}`;
  const p1 = pointAt(xs, ys, s1);
  return `${d} L${(p1[0] + 0.5) * cell} ${(p1[1] + 0.5) * cell}`;
}

/** SVG path for the arrowhead triangle at track offset t. */
export function headPath(xs: number[], ys: number[], t: number, len: number, cell: number): string {
  'worklet';
  const s1 = t + len - 1;
  const i = Math.max(0, Math.min(Math.ceil(s1) - 1, xs.length - 2));
  const dx = xs[i + 1] - xs[i];
  const dy = ys[i + 1] - ys[i];
  const p = pointAt(xs, ys, s1);
  const cx = (p[0] + 0.5) * cell;
  const cy = (p[1] + 0.5) * cell;
  const tip = 0.4 * cell;
  const back = 0.06 * cell;
  const half = 0.28 * cell;
  const bx = cx - dx * back;
  const by = cy - dy * back;
  return `M${cx + dx * tip} ${cy + dy * tip} L${bx - dy * half} ${by + dx * half} L${bx + dy * half} ${by - dx * half} Z`;
}
