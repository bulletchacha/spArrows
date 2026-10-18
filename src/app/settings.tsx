import { Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Header, Screen } from '../components/ui';
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL } from '../config';
import { t } from '../i18n';
import { purchases } from '../services/purchases';
import { Settings, ThemePref } from '../state/progress';
import { useProgress } from '../state/ProgressProvider';
import { useTheme } from '../theme/theme';

const THEMES: ThemePref[] = ['system', 'light', 'dark'];

export default function SettingsScreen() {
  const { progress, update } = useProgress();
  const { colors } = useTheme();
  const s = progress.settings;
  const set = (patch: Partial<Settings>) => update((p) => ({ ...p, settings: { ...p.settings, ...patch } }));

  const toggle = (label: string, key: 'sound' | 'music' | 'haptics') => (
    <View style={[styles.row, { borderColor: colors.line }]}>
      <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={s[key]}
        onValueChange={(v) => set({ [key]: v })}
        trackColor={{ true: colors.accent, false: colors.dot }}
      />
    </View>
  );

  const restore = async () => {
    const owned = await purchases.restore();
    if (owned.includes('remove_ads')) update((p) => ({ ...p, removeAds: true }));
  };

  return (
    <Screen>
      <Header title={t('settings.title')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          {toggle(t('settings.sound'), 'sound')}
          {toggle(t('settings.music'), 'music')}
          {toggle(t('settings.haptics'), 'haptics')}
          <View style={styles.themeRow}>
            <Text style={[styles.label, { color: colors.ink }]}>{t('settings.theme')}</Text>
            <View style={styles.segment}>
              {THEMES.map((th) => (
                <Button
                  key={th}
                  variant={s.theme === th ? 'primary' : 'secondary'}
                  label={t(`settings.theme.${th}`)}
                  onPress={() => set({ theme: th })}
                  style={styles.segmentButton}
                />
              ))}
            </View>
          </View>
        </View>

        <Text style={{ color: colors.muted, paddingHorizontal: 4 }}>{t('settings.reduceMotion')}</Text>

        <Button label={t('shop.restore')} onPress={restore} />
        {PRIVACY_POLICY_URL ? <Button variant="ghost" label={t('settings.privacy')} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} /> : null}
        {SUPPORT_EMAIL ? <Button variant="ghost" label={t('settings.support')} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { fontSize: 16 },
  themeRow: { paddingVertical: 14, gap: 10 },
  segment: { flexDirection: 'row', gap: 8 },
  segmentButton: { flex: 1, paddingHorizontal: 4, minHeight: 44 },
});
