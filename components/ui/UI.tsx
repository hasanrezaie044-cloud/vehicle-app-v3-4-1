import React, { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, spacing } from '@/constants/theme';

// --- Card ---
export function Card({ children, style, padded = true }: { children: ReactNode; style?: ViewStyle; padded?: boolean }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[
      styles.card,
      {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        padding: padded ? spacing.lg : 0,
        shadowColor: colors.shadow,
        shadowOpacity: isDark ? 0 : 1,
      },
      style,
    ]}>
      {children}
    </View>
  );
}

// --- Section header (title + optional action) ---
export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

// --- Screen top header with big title ---
export function ScreenHeader({ title, subtitle, icon, right }: { title: string; subtitle?: string; icon?: keyof typeof Ionicons.glyphMap; right?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.screenHeader}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {icon ? (
          <View style={[styles.headerIconWrap, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name={icon} size={20} color={colors.accent} />
          </View>
        ) : null}
        <View>
          <Text style={[styles.screenTitle, { color: colors.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.screenSubtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
        </View>
      </View>
      {right}
    </View>
  );
}

// --- Button ---
interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  size?: 'md' | 'sm';
  style?: ViewStyle;
}
export function Button({ label, onPress, variant = 'primary', icon, disabled, loading, size = 'md', style }: ButtonProps) {
  const { colors } = useTheme();
  const bg = {
    primary: colors.accent,
    secondary: colors.surfaceAlt,
    ghost: 'transparent',
    danger: colors.danger,
  }[variant];
  const fg = {
    primary: colors.textOnAccent,
    secondary: colors.text,
    ghost: colors.accent,
    danger: '#FFFFFF',
  }[variant];
  const border = variant === 'ghost' ? { borderWidth: 1.5, borderColor: colors.accent } : variant === 'secondary' ? { borderWidth: 1, borderColor: colors.border } : {};

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        border,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1, paddingVertical: size === 'sm' ? 10 : 14 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} size="small" /> : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={fg} /> : null}
          <Text style={[styles.buttonLabel, { color: fg, fontSize: size === 'sm' ? 13.5 : 15 }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

// --- Badge / chip ---
export function Badge({ label, color, soft, icon }: { label: string; color: string; soft: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.badge, { backgroundColor: soft }]}>
      {icon ? <Ionicons name={icon} size={12} color={color} /> : null}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// --- Stat tile ---
export function StatTile({ label, value, icon, color, soft, onPress }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; color: string; soft: string; onPress?: () => void }) {
  const { colors } = useTheme();
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} style={({ pressed }: any) => [
      styles.statTile,
      { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
    ]}>
      <View style={[styles.statIconWrap, { backgroundColor: soft }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]} numberOfLines={1}>{label}</Text>
    </Wrapper>
  );
}

// --- Empty state ---
export function EmptyState({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name={icon} size={30} color={colors.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

// --- Segmented control ---
export function Segmented<T extends string>({ options, value, onChange }: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surfaceAlt }]}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.segmentedItem, active && { backgroundColor: colors.surface, shadowColor: colors.shadow }]}
          >
            <Text style={[styles.segmentedLabel, { color: active ? colors.text : colors.textMuted, fontWeight: active ? '700' : '500' }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 1,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: 16.5, fontWeight: '700', writingDirection: 'rtl', textAlign: 'right' },
  sectionSubtitle: { fontSize: 12.5, marginTop: 2, writingDirection: 'rtl', textAlign: 'right' },
  screenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  headerIconWrap: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { fontSize: 21, fontWeight: '800', writingDirection: 'rtl', textAlign: 'right' },
  screenSubtitle: { fontSize: 12.5, marginTop: 2, writingDirection: 'rtl', textAlign: 'right' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radii.md, paddingHorizontal: 18 },
  buttonLabel: { fontWeight: '700', writingDirection: 'rtl' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radii.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11.5, fontWeight: '700', writingDirection: 'rtl' },
  statTile: { flex: 1, borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, alignItems: 'flex-end', gap: 6 },
  statIconWrap: { width: 34, height: 34, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 16, fontWeight: '800', writingDirection: 'rtl' },
  statLabel: { fontSize: 11.5, writingDirection: 'rtl' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 14.5, fontWeight: '700', writingDirection: 'rtl' },
  emptySubtitle: { fontSize: 12.5, writingDirection: 'rtl', textAlign: 'center', paddingHorizontal: 30 },
  segmented: { flexDirection: 'row', borderRadius: radii.md, padding: 4, gap: 4 },
  segmentedItem: { flex: 1, paddingVertical: 8, borderRadius: radii.sm, alignItems: 'center', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 1 },
  segmentedLabel: { fontSize: 13, writingDirection: 'rtl' },
});
