import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Screen } from '../components/ui';
import { t } from '../i18n';
import { dateKey } from '../state/dates';
import { useProgress } from '../state/ProgressProvider';
import { useTheme } from '../theme/theme';

export default function Home() {
  const { progress } = useProgress();
  const { colors } = useTheme();
  const today = dateKey();
  const dailyDone = progress.daily.completed.includes(today);
  const { streak } = progress.daily;

  return (
    <Screen style={styles.screen}>
      <View style={styles.hero}>
        <Text style={[styles.logo, { color: colors.ink }]}>{t('app.name')}</Text>
        <Text style={[styles.tagline, { color: colors.muted }]}>{t('app.tagline')}</Text>
      </View>

      <View style={styles.actions}>
        <Button
          big
          variant="primary"
          label={`${t('home.play')} · ${t('home.level', { n: progress.level })}`}
          onPress={() => router.push('/play')}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => (dailyDone ? router.push('/daily') : router.push({ pathname: '/play', params: { mode: 'daily' } }))}
          style={({ pressed }) => [styles.daily, { backgroundColor: colors.surface, borderColor: colors.line, opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.dailyTitle, { color: colors.ink }]}>{t('home.daily')}</Text>
            <Text style={{ color: dailyDone ? colors.accent : colors.muted }}>
              {dailyDone ? `✓ ${t('home.dailyDone')}` : t('home.dailyTodo')}
            </Text>
          </View>
          <View style={styles.flame} accessible accessibilityLabel={t('home.streak', { n: streak })}>
            <Text style={[styles.flameIcon, { color: streak ? colors.streak : colors.dot }]}>🔥</Text>
            <Text style={[styles.flameCount, { color: colors.ink }]}>{streak}</Text>
          </View>
        </Pressable>

        <View style={styles.row}>
          <Button label={t('home.trophies')} onPress={() => router.push('/daily')} style={styles.flex} />
          <Button label={t('home.shop')} onPress={() => router.push('/shop')} style={styles.flex} />
          <Button label={t('home.settings')} onPress={() => router.push('/settings')} style={styles.flex} />
        </View>

        {!progress.removeAds && <Button variant="ghost" label={t('home.removeAds')} onPress={() => router.push('/shop')} />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 20 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  logo: { fontSize: 48, fontWeight: '800', letterSpacing: -1 },
  tagline: { fontSize: 15, textAlign: 'center' },
  actions: { gap: 12, paddingBottom: 24 },
  daily: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  dailyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  flame: { alignItems: 'center', minWidth: 44 },
  flameIcon: { fontSize: 24 },
  flameCount: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1, paddingHorizontal: 8 },
});
