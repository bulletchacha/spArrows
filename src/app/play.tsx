import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Board } from '../components/Board';
import { Button, Hearts, Screen, Sheet } from '../components/ui';
import { TUTORIAL_COUNT } from '../game/levels';
import { useGame } from '../game/useGame';
import { StringKey, t } from '../i18n';
import { ads } from '../services/ads';
import { PRODUCTS, purchases } from '../services/purchases';
import { dateKey } from '../state/dates';
import { HEARTS_PER_LEVEL } from '../state/progress';
import { useProgress } from '../state/ProgressProvider';
import { useTheme } from '../theme/theme';

export default function PlayScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { progress } = useProgress();
  // Fixed for the lifetime of a board, so finishing a level doesn't swap it out from under the player.
  const [levelKey, setLevelKey] = useState(() => (mode === 'daily' ? `daily:${dateKey()}` : `main:${progress.level}`));
  const nextLevel = () => setLevelKey(`main:${Number(levelKey.split(':')[1]) + 1}`);
  return <Game key={levelKey} levelKey={levelKey} onNext={nextLevel} />;
}

function Game({ levelKey, onNext }: { levelKey: string; onNext: () => void }) {
  const game = useGame(levelKey);
  const { progress, update } = useProgress();
  const { colors } = useTheme();
  const [noHints, setNoHints] = useState(false);

  const quit = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const hint = () => {
    if (!game.requestHint()) setNoHints(true);
  };

  const restartAfterLoss = async () => {
    if (!progress.removeAds) await ads.showInterstitial('restart_after_fail');
    game.restart();
  };

  const refillWithAd = async () => {
    if (await ads.showRewarded('refill_hearts')) game.refillHearts();
  };

  const refillWithPurchase = async () => {
    if (await purchases.purchase('refill_hearts')) game.refillHearts();
  };

  const hintWithAd = async () => {
    setNoHints(false);
    if (await ads.showRewarded('hint')) update((p) => ({ ...p, hints: p.hints + 1 }));
  };

  // Web/desktop shortcuts (PRD §5.7).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') hint();
      if (e.key === 'Escape') quit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const { level, isDaily } = game;
  const title = isDaily ? t('game.daily', { date: levelKey.slice('daily:'.length) }) : t('game.level', { n: level.id });
  const tutorial = !isDaily && level.id <= TUTORIAL_COUNT ? t(`tutorial.${level.id}` as StringKey) : null;

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('game.menu')} onPress={quit} hitSlop={12} style={styles.menu}>
          <Text style={[styles.menuIcon, { color: colors.ink }]}>‹</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
        <Hearts count={game.hearts} max={HEARTS_PER_LEVEL} colors={colors} />
      </View>

      {tutorial && (
        <Text style={[styles.tutorial, { color: colors.muted }]} accessibilityLiveRegion="polite">
          {tutorial}
        </Text>
      )}

      <Board
        width={level.width}
        height={level.height}
        allArrows={level.arrows}
        arrows={game.arrows}
        movers={game.movers}
        hintId={game.hintId}
        flashId={game.flashId}
        colors={colors}
        onTapArrow={game.tap}
        onMoverDone={game.onMoverDone}
      />

      <View style={styles.bottom}>
        <Button label={t('game.hint')} badge={game.hints} onPress={hint} style={styles.flex} />
        <Button label={t('game.restart')} onPress={game.restart} style={styles.flex} />
      </View>

      <Sheet visible={game.won} title={isDaily ? t('game.clearedDaily') : t('game.cleared')}>
        {isDaily ? (
          <Button variant="primary" label={t('game.home')} onPress={quit} />
        ) : (
          <>
            <Button variant="primary" label={t('game.next')} onPress={onNext} />
            <Button variant="ghost" label={t('game.home')} onPress={quit} />
          </>
        )}
      </Sheet>

      <Sheet visible={game.lost} title={t('game.outOfHearts')} body={t('game.outOfHeartsBody')}>
        <Button variant="primary" label={t('game.restart')} onPress={restartAfterLoss} />
        <Button label={t('game.refillAd')} onPress={refillWithAd} />
        <Button label={t('game.refillBuy', { price: PRODUCTS.refill_hearts.price })} onPress={refillWithPurchase} />
        <Button variant="ghost" label={t('game.quit')} onPress={quit} />
      </Sheet>

      <Sheet visible={noHints} title={t('game.noHints')} body={t('game.noHintsBody')}>
        <Button variant="primary" label={t('game.hintAd')} onPress={hintWithAd} />
        <Button
          label={t('game.toShop')}
          onPress={() => {
            setNoHints(false);
            router.push('/shop');
          }}
        />
        <Button variant="ghost" label={t('game.close')} onPress={() => setNoHints(false)} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56, gap: 12 },
  menu: { width: 44, height: 44, justifyContent: 'center' },
  menuIcon: { fontSize: 34, lineHeight: 38, fontWeight: '300' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  tutorial: { textAlign: 'center', fontSize: 15, lineHeight: 21, paddingHorizontal: 32, paddingBottom: 8 },
  bottom: { flexDirection: 'row', gap: 12, padding: 16 },
  flex: { flex: 1 },
});
