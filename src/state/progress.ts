import { DailyState, initialDaily } from './streak';

export const HEARTS_PER_LEVEL = 3;
export const STARTING_HINTS = 3;

/** In-progress board, saved after every launch (PRD §6.1). Levels are deterministic, so ids are enough. */
export interface SavedGame {
  levelKey: string;
  remaining: number[];
  hearts: number;
  moves: number;
}

export type ThemePref = 'system' | 'light' | 'dark';

export interface Settings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  theme: ThemePref;
}

export interface Progress {
  version: 1;
  /** Next main level to play. */
  level: number;
  saved: SavedGame | null;
  dailySaved: SavedGame | null;
  hints: number;
  removeAds: boolean;
  settings: Settings;
  daily: DailyState;
}

export const initialProgress: Progress = {
  version: 1,
  level: 1,
  saved: null,
  dailySaved: null,
  hints: STARTING_HINTS,
  removeAds: false,
  settings: { sound: true, music: true, haptics: true, theme: 'system' },
  daily: initialDaily,
};

/** Fills fields added in later versions so old saves keep loading. */
export function migrate(raw: unknown): Progress {
  const p = (raw ?? {}) as Partial<Progress>;
  return {
    ...initialProgress,
    ...p,
    settings: { ...initialProgress.settings, ...p.settings },
    daily: { ...initialDaily, ...p.daily },
    version: 1,
  };
}
