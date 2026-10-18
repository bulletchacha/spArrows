import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { audio } from '../services/audio';
import { haptics } from '../services/haptics';
import { dateKey } from './dates';
import { Progress, initialProgress, migrate } from './progress';
import { reconcileStreak } from './streak';

const STORAGE_KEY = 'sparrows.progress';

interface ProgressContextValue {
  progress: Progress;
  update: (fn: (p: Progress) => Progress) => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const writeQueue = useRef(Promise.resolve());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => (json ? migrate(JSON.parse(json)) : initialProgress))
      .catch(() => initialProgress)
      .then((p) => setProgress({ ...p, daily: reconcileStreak(p.daily, dateKey()) }));
  }, []);

  // Persist every change, serialized so an older write never lands after a newer one.
  useEffect(() => {
    if (!progress) return;
    const json = JSON.stringify(progress);
    writeQueue.current = writeQueue.current.then(() => AsyncStorage.setItem(STORAGE_KEY, json)).catch(() => {});
  }, [progress]);

  const settings = progress?.settings;
  useEffect(() => {
    if (!settings) return;
    audio.configure(settings.sound, settings.music);
    haptics.enabled = settings.haptics;
  }, [settings]);

  const update = useCallback((fn: (p: Progress) => Progress) => setProgress((p) => (p ? fn(p) : p)), []);

  // Hold rendering until the save is loaded so screens never flash default state.
  if (!progress) return null;
  return <ProgressContext.Provider value={{ progress, update }}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
}
