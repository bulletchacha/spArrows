import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Header, Screen } from '../components/ui';
import { StringKey, t } from '../i18n';
import { IS_TEST_STORE, PRODUCTS, ProductId, purchases } from '../services/purchases';
import { confirmDialog } from '../services/dialog';
import { Progress } from '../state/progress';
import { useProgress } from '../state/ProgressProvider';
import { useTheme } from '../theme/theme';

/** What each product grants. Heart refills are applied in-level, so they aren't sold here. */
const GRANTS: Partial<Record<ProductId, (p: Progress) => Progress>> = {
  remove_ads: (p) => ({ ...p, removeAds: true }),
  hints_10: (p) => ({ ...p, hints: p.hints + 10 }),
  streak_freezer: (p) => ({ ...p, daily: { ...p.daily, freezers: p.daily.freezers + 1 } }),
  streak_fixer: (p) => ({ ...p, daily: { ...p.daily, fixers: p.daily.fixers + 1 } }),
};

export default function ShopScreen() {
  const { progress, update } = useProgress();
  const { colors } = useTheme();

  const buy = async (id: ProductId) => {
    const grant = GRANTS[id];
    if (grant && (await purchases.purchase(id))) update(grant);
  };

  const restore = async () => {
    const owned = await purchases.restore();
    if (owned.includes('remove_ads')) update((p) => ({ ...p, removeAds: true }));
    await confirmDialog(t('shop.restored'), '', 'OK');
  };

  return (
    <Screen>
      <Header title={t('shop.title')} />
      <ScrollView contentContainerStyle={styles.content}>
        {IS_TEST_STORE && <Text style={[styles.test, { color: colors.streak, borderColor: colors.streak }]}>{t('shop.testStore')}</Text>}
        <Text style={{ color: colors.muted }}>{t('shop.hintsOwned', { n: progress.hints })}</Text>
        {(Object.keys(PRODUCTS) as ProductId[]).map((id) => {
          const owned = id === 'remove_ads' && progress.removeAds;
          const inLevelOnly = !GRANTS[id];
          return (
            <View key={id} style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.name, { color: colors.ink }]}>{t(`shop.${id}` as StringKey)}</Text>
                <Text style={{ color: colors.muted, lineHeight: 19 }}>{t(`shop.${id}.desc` as StringKey)}</Text>
              </View>
              <Button
                variant={owned || inLevelOnly ? 'ghost' : 'primary'}
                label={owned ? t('shop.owned') : inLevelOnly ? t('shop.inLevel') : PRODUCTS[id].price}
                disabled={owned || inLevelOnly}
                onPress={() => buy(id)}
              />
            </View>
          );
        })}
        <Button variant="ghost" label={t('shop.restore')} onPress={restore} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  test: { borderWidth: 1, borderRadius: 10, padding: 10, textAlign: 'center', fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  name: { fontSize: 16, fontWeight: '700' },
});
