/**
 * Build-time level validation (PRD §7.3). Generates levels 1..N plus a range of
 * daily levels, proves each is solvable, checks structural rules, and prints the
 * difficulty curve.
 *
 *   npm run validate-levels            # levels 1..1000, 60 days
 *   npm run validate-levels -- 2000    # levels 1..2000
 */
import { analyzeLevel, cellKey, exitRay, solve } from '../src/game/board';
import { getDailyLevel, getLevel } from '../src/game/levels';
import { DIR_DELTA, Level } from '../src/game/types';

const count = Number(process.argv[2] ?? 1000);
const problems: string[] = [];

function check(level: Level) {
  const seen = new Set<string>();
  for (const a of level.arrows) {
    for (const [x, y] of a.cells) {
      const k = cellKey(x, y);
      if (seen.has(k)) problems.push(`${level.key}: arrows overlap at ${k}`);
      if (x < 0 || y < 0 || x >= level.width || y >= level.height) problems.push(`${level.key}: arrow ${a.id} off board`);
      seen.add(k);
    }
    for (let i = 1; i < a.cells.length; i++) {
      const [x0, y0] = a.cells[i - 1];
      const [x1, y1] = a.cells[i];
      if (Math.abs(x1 - x0) + Math.abs(y1 - y0) !== 1) problems.push(`${level.key}: arrow ${a.id} not contiguous`);
    }
    const n = a.cells.length;
    if (n >= 2) {
      const [dx, dy] = DIR_DELTA[a.head];
      if (a.cells[n - 1][0] - a.cells[n - 2][0] !== dx || a.cells[n - 1][1] - a.cells[n - 2][1] !== dy)
        problems.push(`${level.key}: arrow ${a.id} head does not continue its last segment`);
    }
    const own = new Set(a.cells.map(([x, y]) => cellKey(x, y)));
    if (exitRay(a, level.width, level.height).some(([x, y]) => own.has(cellKey(x, y))))
      problems.push(`${level.key}: arrow ${a.id} points into its own body`);
  }
  if (!solve(level, level.arrows)) problems.push(`${level.key}: UNSOLVABLE`);
}

const started = Date.now();
const buckets = new Map<number, number[]>();
for (let n = 1; n <= count; n++) {
  const level = getLevel(n);
  check(level);
  const bucket = Math.floor((n - 1) / 100);
  buckets.set(bucket, [...(buckets.get(bucket) ?? []), analyzeLevel(level).score]);
}
const today = new Date();
for (let d = 0; d < 60; d++) {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d);
  check(getDailyLevel(date.toISOString().slice(0, 10)));
}

console.log(`Validated ${count} levels + 60 daily levels in ${((Date.now() - started) / 1000).toFixed(1)}s`);
console.log('levels      avg difficulty  min    max');
for (const [b, scores] of buckets) {
  const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
  console.log(
    `${String(b * 100 + 1).padStart(5)}-${String(b * 100 + scores.length).padEnd(5)}  ${avg.toFixed(3).padStart(8)}       ${Math.min(...scores).toFixed(3)}  ${Math.max(...scores).toFixed(3)}`,
  );
}
for (const n of [1, 2, 3, 4, 10, 21, 50, 100, 300, 500]) {
  const l = getLevel(n);
  const s = analyzeLevel(l);
  console.log(`level ${n}: ${l.width}x${l.height}, ${s.arrows} arrows, first moves ${s.firstMoves}, chain ${s.chainDepth}, bends ${s.bends}`);
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n` + problems.slice(0, 50).join('\n'));
  process.exit(1);
}
console.log('\nAll levels valid.');
