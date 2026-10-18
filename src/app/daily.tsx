import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Header, Screen } from '../components/ui';
import { t } from '../i18n';
import { purchases } from '../services/purchases';
import { addDays, dateKey, diffDays, monthKey } from '../state/dates';
import { useProgress } from '../state/ProgressProvider';
import { canFixStreak, fixStreak, FIX_WINDOW_DAYS, TROPHY_DAYS } from '../state/streak';
import { Colors, useTheme } from '../theme/theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function DailyScreen() {
  const { progress, update } = useProgress();
  const { colors } = useTheme();
  const today = dateKey();
  const [month, setMonth] = useState(monthKey(today));
  const d = progress.daily;
  const doneToday = d.completed.includes(today);
  const fixable = canFixStreak(d, today);

  const fix = async () => {
    if (d.fixers <= 0) {
      if (!(await purchases.purchase('streak_fixer'))) return;
      update((p) => ({ ...p, daily: fixStreak({ ...p.daily, fixers: p.daily.fixers + 1 }, today) }));
    } else {
      update((p) => ({ ...p, daily: fixStreak(p.daily, today) }));
    }
  };

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const date = new Date(y, m - 1 + delta, 1);
    setMonth(monthKey(dateKey(date)));
  };

  return (
    <Screen>
      <Header title={t('daily.title')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.stats}>
          <Stat label={t('daily.streak')} value={`🔥 ${d.streak}`} colors={colors} />
          <Stat label={t('daily.best')} value={String(d.best)} colors={colors} />
        </View>

        {fixable && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={{ color: colors.ink, lineHeight: 20 }}>
              {t('daily.broken', { n: d.broken!.streak, days: FIX_WINDOW_DAYS - diffDays(d.broken!.date, today) + 1 })}
            </Text>
            <Button variant="primary" label={t('daily.fix')} badge={d.fixers || undefined} onPress={fix} />
          </View>
        )}

        {doneToday ? (
          <Text style={[styles.done, { color: colors.accent }]}>{t('daily.doneToday')}</Text>
        ) : (
          <Button big variant="primary" label={t('daily.play')} onPress={() => router.push({ pathname: '/play', params: { mode: 'daily' } })} />
        )}

        <Calendar month={month} today={today} completed={d.completed} frozen={d.frozen} colors={colors} onShift={shiftMonth} />

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>{t('daily.trophies')}</Text>
          <Text style={{ color: colors.muted }}>{t('daily.trophyRule', { n: TROPHY_DAYS })}</Text>
          {d.trophies.length === 0 ? (
            <Text style={{ color: colors.muted }}>{t('daily.noTrophies')}</Text>
          ) : (
            <View style={styles.trophies}>
              {d.trophies.map((m) => (
                <View key={m} style={styles.trophy}>
                  <Text style={styles.trophyIcon}>🏆</Text>
                  <Text style={{ color: colors.ink, fontSize: 12 }}>{formatMonth(m)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={{ color: colors.ink, fontWeight: '600' }}>{t('daily.freezers', { n: d.freezers })}</Text>
          <Text style={{ color: colors.muted }}>{t('daily.freezerInfo')}</Text>
          <Text style={{ color: colors.ink, fontWeight: '600', marginTop: 6 }}>{t('daily.fixers', { n: d.fixers })}</Text>
          <Button label={t('home.shop')} onPress={() => router.push('/shop')} style={{ marginTop: 6 }} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value, colors }: { label: string; value: string; colors: Colors }) {
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Text style={[styles.statValue, { color: colors.ink }]}>{value}</Text>
      <Text style={{ color: colors.muted }}>{label}</Text>
    </View>
  );
}

const formatMonth = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

interface CalendarProps {
  month: string;
  today: string;
  completed: string[];
  frozen: string[];
  colors: Colors;
  onShift: (delta: number) => void;
}

/** Month view: filled = completed, snowflake = covered by a freezer, outline = today (PRD §8 item 6). */
function Calendar({ month, today, completed, frozen, colors, onShift }: CalendarProps) {
  const first = `${month}-01`;
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Monday-first
  const done = new Set(completed);
  const iced = new Set(frozen);
  const cells: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i))];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={styles.calHeader}>
        <Button variant="ghost" label="‹" onPress={() => onShift(-1)} />
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>{formatMonth(month)}</Text>
        <Button variant="ghost" label="›" onPress={() => onShift(1)} disabled={month >= monthKey(today)} />
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((w, i) => (
          <Text key={`w${i}`} style={[styles.cell, styles.weekday, { color: colors.muted }]}>
            {w}
          </Text>
        ))}
        {cells.map((day, i) => {
          if (!day) return <View key={`e${i}`} style={styles.cell} />;
          const isDone = done.has(day);
          const isToday = day === today;
          return (
            <View key={day} style={styles.cell}>
              <View
                style={[
                  styles.day,
                  isDone && { backgroundColor: colors.accent },
                  isToday && !isDone && { borderWidth: 2, borderColor: colors.ink },
                ]}
              >
                <Text style={{ color: isDone ? colors.accentInk : day > today ? colors.dot : colors.ink, fontVariant: ['tabular-nums'] }}>
                  {iced.has(day) ? '❄' : Number(day.slice(8))}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  card: { padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  done: { textAlign: 'center', fontSize: 15, fontWeight: '600', paddingVertical: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  weekday: { aspectRatio: undefined, height: 24, textAlign: 'center', fontSize: 12 },
  day: { width: '80%', height: '80%', borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  trophies: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  trophy: { alignItems: 'center' },
  trophyIcon: { fontSize: 32 },
});
