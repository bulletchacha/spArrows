import { track } from './analytics';
import { confirmDialog } from './dialog';

/**
 * Ad facade (PRD §10): an interstitial on restart after losing all hearts, and
 * opt-in rewarded video. This is a development stand-in that simulates ads with a
 * dialog. Replace the two functions with an ad SDK (e.g. react-native-google-mobile-ads
 * plus UMP/ATT consent) — that needs a development build and ad unit ids.
 */
const INTERSTITIAL_MIN_GAP_MS = 60_000;
let lastInterstitial = 0;

const simulated = (title: string) =>
  confirmDialog(title, 'Test ad placeholder. No real ad SDK is connected yet.', 'Finish ad', 'Close');

export const ads = {
  /** Frequency-capped; resolves when the ad (if any) is dismissed. */
  async showInterstitial(placement: string): Promise<void> {
    if (Date.now() - lastInterstitial < INTERSTITIAL_MIN_GAP_MS) return;
    lastInterstitial = Date.now();
    track('ad_shown', { type: 'interstitial', placement });
    await simulated('Ad');
  },

  /** Resolves true when the player watched to the end and earned the reward. */
  async showRewarded(placement: string): Promise<boolean> {
    track('ad_shown', { type: 'rewarded', placement });
    const rewarded = await simulated('Rewarded ad');
    if (rewarded) track('ad_rewarded', { placement });
    return rewarded;
  },
};
