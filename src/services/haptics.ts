import * as Haptics from 'expo-haptics';

export const haptics = {
  enabled: true,
  /** Light tick on a clean launch (PRD §8.1). */
  launch() {
    if (this.enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** Heavier hit on a collision. */
  bounce() {
    if (this.enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
  success() {
    if (this.enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};
