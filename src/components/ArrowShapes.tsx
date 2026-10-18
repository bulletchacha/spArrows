import { memo, useEffect, useMemo } from 'react';
import Animated, { Easing, useAnimatedProps, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { G, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { Track, bodyPath, headPath } from '../game/geometry';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export const strokeFor = (cell: number) => Math.max(2, cell * 0.2);

interface StaticProps {
  track: Track;
  cell: number;
  color: string;
  emphasized?: boolean;
}

export const StaticArrow = memo(function StaticArrow({ track, cell, color, emphasized }: StaticProps) {
  const d = useMemo(() => bodyPath(track.xs, track.ys, 0, track.len, cell), [track, cell]);
  const head = useMemo(() => headPath(track.xs, track.ys, 0, track.len, cell), [track, cell]);
  const width = strokeFor(cell) * (emphasized ? 1.35 : 1);
  return (
    <G>
      <Path d={d} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d={head} fill={color} stroke={color} strokeWidth={width * 0.4} strokeLinejoin="round" />
    </G>
  );
});

export type Motion = { kind: 'launch' } | { kind: 'bounce'; steps: number };

interface MovingProps {
  track: Track;
  cell: number;
  color: string;
  motion: Motion;
  onDone: () => void;
}

/**
 * An arrow in motion. Launch: accelerates along its track until it has left the board.
 * Bounce: advances to the blocker, knocks against it, and returns (PRD §5.3, §8.1).
 * Reanimated skips these animations when the OS "reduce motion" setting is on.
 */
export function MovingArrow({ track, cell, color, motion, onDone }: MovingProps) {
  const t = useSharedValue(0);

  useEffect(() => {
    const done = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(onDone);
    };
    if (motion.kind === 'launch') {
      const dist = track.exitT;
      t.value = withTiming(dist, { duration: 160 + dist * 40, easing: Easing.in(Easing.quad) }, done);
    } else {
      const contact = motion.steps + 0.1;
      t.value = withSequence(
        withTiming(contact, { duration: 90 + contact * 45, easing: Easing.in(Easing.quad) }),
        withTiming(contact - 0.15, { duration: 50 }),
        withTiming(contact, { duration: 50 }),
        withTiming(0, { duration: 240, easing: Easing.out(Easing.cubic) }, done),
      );
    }
    // Runs once per mount; each motion gets a fresh component key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { xs, ys, len } = track;
  const bodyProps = useAnimatedProps(() => ({ d: bodyPath(xs, ys, t.value, len, cell) }));
  const headProps = useAnimatedProps(() => ({ d: headPath(xs, ys, t.value, len, cell) }));
  const width = strokeFor(cell);

  return (
    <G>
      <AnimatedPath animatedProps={bodyProps} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <AnimatedPath animatedProps={headProps} fill={color} stroke={color} strokeWidth={width * 0.4} strokeLinejoin="round" />
    </G>
  );
}
