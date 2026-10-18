import { router } from 'expo-router';
import { ReactNode, useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '../i18n';
import { audio } from '../services/audio';
import { Colors, useTheme } from '../theme/theme';

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  return <SafeAreaView style={[{ flex: 1, backgroundColor: colors.bg }, style]}>{children}</SafeAreaView>;
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  badge?: string | number;
  disabled?: boolean;
  style?: ViewStyle;
  big?: boolean;
}

export function Button({ label, onPress, variant = 'secondary', badge, disabled, style, big }: ButtonProps) {
  const { colors } = useTheme();
  const bg = variant === 'primary' ? colors.ink : variant === 'secondary' ? colors.surface : 'transparent';
  const fg = variant === 'primary' ? colors.bg : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge !== undefined ? `${label}, ${badge}` : label}
      disabled={disabled}
      onPress={() => {
        audio.play('tap');
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        big && styles.buttonBig,
        { backgroundColor: bg, borderColor: colors.line, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        variant === 'secondary' && styles.buttonBorder,
        style,
      ]}
    >
      <Text style={[styles.buttonText, big && styles.buttonTextBig, { color: fg }]}>{label}</Text>
      {badge !== undefined && (
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <Text style={[styles.badgeText, { color: colors.accentInk }]}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Header({ title, right }: { title: string; right?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('back')}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        hitSlop={12}
        style={styles.headerSide}
      >
        <Text style={[styles.headerBack, { color: colors.ink }]}>‹</Text>
      </Pressable>
      <Text accessibilityRole="header" style={[styles.headerTitle, { color: colors.ink }]}>
        {title}
      </Text>
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export function Sheet({ visible, title, body, children }: { visible: boolean; title: string; body?: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text accessibilityRole="header" style={[styles.sheetTitle, { color: colors.ink }]}>
            {title}
          </Text>
          {body ? <Text style={[styles.sheetBody, { color: colors.muted }]}>{body}</Text> : null}
          <View style={{ gap: 10 }}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

/** Hearts with a small break animation when one is lost (PRD §6.2). */
export function Hearts({ count, max, colors }: { count: number; max: number; colors: Colors }) {
  return (
    <View
      style={styles.hearts}
      accessible
      accessibilityLabel={t('game.hearts', { n: count, max })}
    >
      {Array.from({ length: max }, (_, i) => (
        <Heart key={i} full={i < count} colors={colors} />
      ))}
    </View>
  );
}

function Heart({ full, colors }: { full: boolean; colors: Colors }) {
  const scale = useSharedValue(1);
  const wasFull = useRef(full);
  useEffect(() => {
    if (wasFull.current && !full) {
      scale.value = withSequence(withTiming(1.5, { duration: 120 }), withTiming(0.8, { duration: 120 }), withTiming(1, { duration: 160 }));
    }
    wasFull.current = full;
  }, [full, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.Text style={[styles.heart, { color: full ? colors.danger : colors.dot }, style]}>{full ? '♥' : '♡'}</Animated.Text>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonBorder: { borderWidth: StyleSheet.hairlineWidth },
  buttonBig: { minHeight: 64, borderRadius: 18 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  buttonTextBig: { fontSize: 20, fontWeight: '700' },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52 },
  headerSide: { width: 64, justifyContent: 'center' },
  headerBack: { fontSize: 34, lineHeight: 38, fontWeight: '300' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  scrim: { flex: 1, justifyContent: 'flex-end' },
  sheet: { padding: 24, paddingBottom: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 12 },
  sheetTitle: { fontSize: 22, fontWeight: '700' },
  sheetBody: { fontSize: 15, lineHeight: 21, marginBottom: 8 },
  hearts: { flexDirection: 'row', gap: 4 },
  heart: { fontSize: 22 },
});
