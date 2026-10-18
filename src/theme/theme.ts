import { useColorScheme } from 'react-native';

import { useProgress } from '../state/ProgressProvider';

/** Minimalist palette (PRD §9): one neutral ink, a calm accent for hints, a semantic red for collisions. */
const light = {
  bg: '#F6F5F1',
  surface: '#FFFFFF',
  ink: '#1F2026',
  muted: '#6C6D75',
  dot: '#C9C7BE',
  line: '#E3E1DA',
  accent: '#2E7D5B',
  accentInk: '#FFFFFF',
  danger: '#D2463C',
  streak: '#E07A1F',
  scrim: 'rgba(20,20,24,0.45)',
};

const dark: typeof light = {
  bg: '#121317',
  surface: '#1C1D23',
  ink: '#ECEBE6',
  muted: '#9C9CA5',
  dot: '#3A3B44',
  line: '#2A2B33',
  accent: '#5CC08F',
  accentInk: '#0E1A14',
  danger: '#F06A5E',
  streak: '#F29A45',
  scrim: 'rgba(0,0,0,0.6)',
};

export type Colors = typeof light;

export function useTheme(): { colors: Colors; dark: boolean } {
  const system = useColorScheme();
  const pref = useProgress().progress.settings.theme;
  const isDark = pref === 'system' ? system === 'dark' : pref === 'dark';
  return { colors: isDark ? dark : light, dark: isDark };
}
