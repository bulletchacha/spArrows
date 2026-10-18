/** Event names from PRD §11. */
export type AnalyticsEvent =
  | 'level_start'
  | 'arrow_launch'
  | 'heart_lost'
  | 'level_complete'
  | 'level_fail'
  | 'hint_used'
  | 'ad_shown'
  | 'ad_rewarded'
  | 'iap_purchase'
  | 'daily_start'
  | 'daily_complete'
  | 'streak_change'
  | 'session_start';

type Props = Record<string, string | number | boolean | undefined>;

/**
 * Analytics facade. Wire a provider (Firebase, Amplitude, PostHog…) into `send`;
 * call sites stay unchanged. Until then events are logged in development only.
 */
export function track(event: AnalyticsEvent, props: Props = {}) {
  send(event, props);
}

function send(event: AnalyticsEvent, props: Props) {
  if (__DEV__) console.log(`[analytics] ${event}`, props);
}
