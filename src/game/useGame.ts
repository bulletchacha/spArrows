import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Mover } from '../components/Board';
import { audio } from '../services/audio';
import { track } from '../services/analytics';
import { haptics } from '../services/haptics';
import { HEARTS_PER_LEVEL, Progress, SavedGame } from '../state/progress';
import { useProgress } from '../state/ProgressProvider';
import { completeDaily } from '../state/streak';
import { findBlocker, hintArrow } from './board';
import { getLevelByKey } from './levels';
import { Arrow } from './types';

const FLASH_MS = 450;

const savedFor = (p: Progress, key: string) => {
  const s = key.startsWith('daily:') ? p.dailySaved : p.saved;
  return s?.levelKey === key ? s : null;
};

export function useGame(levelKey: string) {
  const { progress, update } = useProgress();
  const level = useMemo(() => getLevelByKey(levelKey), [levelKey]);
  const isDaily = levelKey.startsWith('daily:');

  const initial = useMemo(() => savedFor(progress, levelKey), [levelKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const [remaining, setRemaining] = useState<Set<number>>(
    () => new Set(initial?.remaining ?? level.arrows.map((a) => a.id)),
  );
  const [hearts, setHearts] = useState(initial?.hearts ?? HEARTS_PER_LEVEL);
  const [moves, setMoves] = useState(initial?.moves ?? 0);
  const [movers, setMovers] = useState<Mover[]>([]);
  const [hintId, setHintId] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);
  const moverSeq = useRef(0);
  const completed = useRef(false);

  const arrows = useMemo(() => level.arrows.filter((a) => remaining.has(a.id)), [level, remaining]);
  const bouncingIds = useMemo(
    () => new Set(movers.filter((m) => m.motion.kind === 'bounce').map((m) => m.arrow.id)),
    [movers],
  );
  const restingArrows = useMemo(() => arrows.filter((a) => !bouncingIds.has(a.id)), [arrows, bouncingIds]);
  const launching = movers.some((m) => m.motion.kind === 'launch');

  const won = arrows.length === 0 && !launching;
  const lost = hearts <= 0 && movers.length === 0;

  useEffect(() => {
    track(isDaily ? 'daily_start' : 'level_start', { level: levelKey, resumed: !!initial });
  }, [levelKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave after every move (PRD §6.1: quit and resume restores board, hearts, hints).
  useEffect(() => {
    if (completed.current) return;
    const saved: SavedGame = { levelKey, remaining: [...remaining], hearts, moves };
    update((p) => (isDaily ? { ...p, dailySaved: saved } : { ...p, saved }));
  }, [remaining, hearts, moves, levelKey, isDaily, update]);

  useEffect(() => {
    if (!won || completed.current) return;
    completed.current = true;
    audio.play('chime');
    haptics.success();
    if (isDaily) {
      const date = levelKey.slice('daily:'.length);
      update((p) => {
        const daily = completeDaily(p.daily, date);
        if (daily.streak !== p.daily.streak) track('streak_change', { streak: daily.streak });
        return { ...p, daily, dailySaved: null };
      });
      track('daily_complete', { date, moves });
    } else {
      update((p) => ({ ...p, level: Math.max(p.level, level.id + 1), saved: null }));
      track('level_complete', { level: level.id, moves, hearts });
    }
  }, [won]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = useCallback(
    (arrow: Arrow) => {
      if (hearts <= 0 || won || bouncingIds.has(arrow.id) || !remaining.has(arrow.id)) return;
      setHintId(null);
      setMoves((m) => m + 1);
      const key = `m${moverSeq.current++}`;
      const blocker = findBlocker(arrow, arrows, level.width, level.height);

      if (!blocker) {
        audio.play('whoosh');
        haptics.launch();
        track('arrow_launch', { level: levelKey, result: 'cleared' });
        setRemaining((r) => {
          const next = new Set(r);
          next.delete(arrow.id);
          return next;
        });
        setMovers((ms) => [...ms, { key, arrow, motion: { kind: 'launch' } }]);
        return;
      }

      audio.play('bounce');
      haptics.bounce();
      track('arrow_launch', { level: levelKey, result: 'bounced' });
      track('heart_lost', { level: levelKey, hearts: hearts - 1 });
      setTimeout(() => audio.play('heart'), 180);
      setMovers((ms) => [...ms, { key, arrow, motion: { kind: 'bounce', steps: blocker.steps } }]);
      setFlashId(blocker.arrowId);
      setTimeout(() => setFlashId((id) => (id === blocker.arrowId ? null : id)), FLASH_MS);
      setHearts(hearts - 1);
      if (hearts - 1 === 0) track('level_fail', { level: levelKey, moves: moves + 1 });
    },
    [arrows, bouncingIds, hearts, level, levelKey, moves, remaining, won],
  );

  const onMoverDone = useCallback((key: string) => setMovers((ms) => ms.filter((m) => m.key !== key)), []);

  /** Returns false when the player has no hints left. */
  const requestHint = useCallback((): boolean => {
    if (progress.hints <= 0) return false;
    const a = hintArrow(level, arrows);
    if (!a) return true;
    setHintId(a.id);
    update((p) => ({ ...p, hints: p.hints - 1 }));
    track('hint_used', { level: levelKey, hintsLeft: progress.hints - 1 });
    return true;
  }, [arrows, level, levelKey, progress.hints, update]);

  const restart = useCallback(() => {
    completed.current = false;
    setRemaining(new Set(level.arrows.map((a) => a.id)));
    setHearts(HEARTS_PER_LEVEL);
    setMoves(0);
    setMovers([]);
    setHintId(null);
    track(isDaily ? 'daily_start' : 'level_start', { level: levelKey, restart: true });
  }, [isDaily, level, levelKey]);

  const refillHearts = useCallback(() => setHearts(HEARTS_PER_LEVEL), []);

  return {
    level,
    isDaily,
    arrows: restingArrows,
    movers,
    hearts,
    moves,
    hintId,
    flashId,
    won,
    lost,
    hints: progress.hints,
    tap,
    onMoverDone,
    requestHint,
    restart,
    refillHearts,
  };
}
