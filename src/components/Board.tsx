import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { buildTrack, Track } from '../game/geometry';
import { Arrow } from '../game/types';
import { Colors } from '../theme/theme';
import { Motion, MovingArrow, StaticArrow } from './ArrowShapes';

export interface Mover {
  key: string;
  arrow: Arrow;
  motion: Motion;
}

interface Props {
  width: number;
  height: number;
  /** Every arrow in the level, used to precompute tracks. */
  allArrows: Arrow[];
  /** Arrows at rest. */
  arrows: Arrow[];
  /** Arrows currently launching or bouncing (drawn on top, not tappable). */
  movers: Mover[];
  hintId: number | null;
  flashId: number | null;
  colors: Colors;
  onTapArrow: (arrow: Arrow) => void;
  onMoverDone: (key: string) => void;
}

const MAX_CELL = 60;
/** Cell size the player can zoom up to on large boards. */
const ZOOM_CELL = 56;
/** PRD §13: 44 dp minimum touch target. */
const TOUCH_RADIUS = 22;
/** PRD §5.7: tap vs drag threshold. */
const DRAG_THRESHOLD = 8;

/** Keeps the board on screen: centered when it fits, edge-to-edge scrollable when it doesn't. */
function clampOffset(t: number, s: number, size: number, view: number): number {
  'worklet';
  const half = (s * size) / 2;
  const minC = Math.min(view / 2, view - half);
  const maxC = Math.max(view / 2, half);
  return Math.min(Math.max(t + size / 2, minC), maxC) - size / 2;
}

export function Board({ width, height, allArrows, arrows, movers, hintId, flashId, colors, onTapArrow, onMoverDone }: Props) {
  const [view, setView] = useState({ w: 0, h: 0 });
  const cell = view.w ? Math.min(Math.floor(Math.min(view.w / width, view.h / height)), MAX_CELL) : 0;
  const bw = cell * width;
  const bh = cell * height;
  const maxScale = cell ? Math.max(1, ZOOM_CELL / cell) : 1;

  // Board transform: screen = t + c + s * (b - c), with c the board center.
  const s = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const dims = useSharedValue({ bw: 0, bh: 0, vw: 0, vh: 0, maxScale: 1 });
  const start = useSharedValue({ s: 1, tx: 0, ty: 0, fx: 0, fy: 0 });
  const pinching = useSharedValue(false);

  useEffect(() => {
    dims.set({ bw, bh, vw: view.w, vh: view.h, maxScale });
    s.set(1);
    tx.set((view.w - bw) / 2);
    ty.set((view.h - bh) / 2);
  }, [bw, bh, view.w, view.h, maxScale, dims, s, tx, ty]);

  // Hit-testing runs on the JS thread against the latest arrows.
  const onTap = useCallback(
    (bx: number, by: number, scale: number) => {
      if (!cell) return;
      const radius = Math.max(0.72, TOUCH_RADIUS / (cell * scale));
      const fx = bx / cell - 0.5;
      const fy = by / cell - 0.5;
      let best: Arrow | null = null;
      let bestDist = Infinity;
      for (const a of arrows) {
        for (const [x, y] of a.cells) {
          const d = Math.hypot(x - fx, y - fy);
          if (d < bestDist) {
            bestDist = d;
            best = a;
          }
        }
      }
      if (best && bestDist <= radius) onTapArrow(best);
    },
    [arrows, cell, onTapArrow],
  );

  // Rebuilt when the tap handler changes; transform state lives in shared values, so pan/zoom is unaffected.
  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDistance(DRAG_THRESHOLD)
      .onEnd((e, success) => {
        'worklet';
        if (!success) return;
        const { bw: w, bh: h } = dims.get();
        const scale = s.get();
        const bx = (e.x - tx.get() - w / 2) / scale + w / 2;
        const by = (e.y - ty.get() - h / 2) / scale + h / 2;
        scheduleOnRN(onTap, bx, by, scale);
      });

    const pinch = Gesture.Pinch()
      .onStart((e) => {
        'worklet';
        pinching.set(true);
        start.set({ s: s.get(), tx: tx.get(), ty: ty.get(), fx: e.focalX, fy: e.focalY });
      })
      .onUpdate((e) => {
        'worklet';
        const d = dims.get();
        const st = start.get();
        const next = Math.min(Math.max(st.s * e.scale, 1), d.maxScale);
        // Board point that was under the fingers when the pinch began…
        const bx = (st.fx - st.tx - d.bw / 2) / st.s + d.bw / 2;
        const by = (st.fy - st.ty - d.bh / 2) / st.s + d.bh / 2;
        // …stays under the (moving) focal point.
        s.set(next);
        tx.set(clampOffset(e.focalX - d.bw / 2 - next * (bx - d.bw / 2), next, d.bw, d.vw));
        ty.set(clampOffset(e.focalY - d.bh / 2 - next * (by - d.bh / 2), next, d.bh, d.vh));
      })
      .onFinalize(() => {
        'worklet';
        pinching.set(false);
      });

    const pan = Gesture.Pan()
      .minDistance(DRAG_THRESHOLD)
      .onStart((e) => {
        'worklet';
        start.set({ ...start.get(), tx: tx.get() - e.translationX, ty: ty.get() - e.translationY });
      })
      .onUpdate((e) => {
        'worklet';
        const d = dims.get();
        if (pinching.get()) {
          // Re-base so panning continues smoothly once the pinch ends.
          start.set({ ...start.get(), tx: tx.get() - e.translationX, ty: ty.get() - e.translationY });
          return;
        }
        tx.set(clampOffset(start.get().tx + e.translationX, s.get(), d.bw, d.vw));
        ty.set(clampOffset(start.get().ty + e.translationY, s.get(), d.bh, d.vh));
      });

    return Gesture.Race(Gesture.Simultaneous(pinch, pan), tap);
  }, [dims, onTap, pinching, s, start, tx, ty]);

  const boardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: s.get() }],
  }));

  const dots = useMemo(() => {
    if (!cell) return '';
    const r = Math.max(1.2, cell * 0.06);
    let d = '';
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const cx = (x + 0.5) * cell;
        const cy = (y + 0.5) * cell;
        d += `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
      }
    return d;
  }, [cell, width, height]);

  // Tracks depend only on an arrow's cells and the board size, so build them once per level.
  const tracks = useMemo(
    () => new Map<number, Track>(allArrows.map((a) => [a.id, buildTrack(a, width, height)])),
    [allArrows, width, height],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setView({ w, h });
  };

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.viewport} onLayout={onLayout} collapsable={false}>
        {cell > 0 && (
          <Animated.View style={[{ width: bw, height: bh }, styles.board, boardStyle]}>
            <Svg width={bw} height={bh}>
              <Path d={dots} fill={colors.dot} />
              {arrows.map((a) => (
                <StaticArrow
                  key={a.id}
                  track={tracks.get(a.id)!}
                  cell={cell}
                  color={a.id === flashId ? colors.danger : a.id === hintId ? colors.accent : colors.ink}
                  emphasized={a.id === hintId || a.id === flashId}
                />
              ))}
              {movers.map((m) => (
                <MovingArrow
                  key={m.key}
                  track={tracks.get(m.arrow.id)!}
                  cell={cell}
                  color={colors.ink}
                  motion={m.motion}
                  onDone={() => onMoverDone(m.key)}
                />
              ))}
            </Svg>
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
}


const styles = StyleSheet.create({
  viewport: { flex: 1, alignSelf: 'stretch', overflow: 'hidden' },
  board: { position: 'absolute', left: 0, top: 0 },
});
