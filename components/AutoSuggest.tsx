import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { radii } from '@/constants/theme';

interface AutoSuggestProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  suggestions: string[];
  placeholder?: string;
}

export default function AutoSuggest({ label, value, onChange, suggestions, placeholder }: AutoSuggestProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const query = value.trim().toLowerCase();
  const filtered = suggestions.filter(s => !query || (s !== value && s.toLowerCase().includes(query))).slice(0, 6);

  const handleSelect = useCallback((s: string) => { onChange(s); setFocused(false); }, [onChange]);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        {suggestions.length > 0 && <View style={[styles.suggestionBadge, { backgroundColor: colors.accentSoft }]}><Ionicons name="sparkles" size={11} color={colors.accent} /><Text style={[styles.suggestionBadgeText, { color: colors.accent }]}>پیشنهاد</Text></View>}
      </View>
      <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: focused ? colors.accent : colors.border }]}>
        <Ionicons name="location-outline" size={18} color={focused ? colors.accent : colors.textMuted} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={(t) => { onChange(t); setFocused(true); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 250)}
          returnKeyType="done"
          placeholder={placeholder || label}
          placeholderTextColor={colors.textMuted}
          textAlign="right"
        />
        {value.length > 0 && <TouchableOpacity onPress={() => onChange('')} style={styles.clearBtn} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.textMuted} /></TouchableOpacity>}
      </View>
      {focused && filtered.length > 0 && (
        <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.accent, shadowColor: colors.shadow }]}>
          <Text style={[styles.dropdownTitle, { color: colors.textMuted }]}>انتخاب سریع از موارد قبلی</Text>
          {filtered.map((item, i) => (
            <TouchableOpacity key={`${item}-${i}`} style={[styles.dropdownItem, { borderBottomColor: colors.borderSoft }]} onPress={() => handleSelect(item)} activeOpacity={0.7}>
              <Ionicons name="arrow-down-circle-outline" size={19} color={colors.accent} />
              <Text style={[styles.dropdownText, { color: colors.text }]} numberOfLines={1}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 10, position: 'relative', zIndex: 100 },
  labelRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, marginTop: 8 },
  label: { fontSize: 13, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  suggestionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  suggestionBadgeText: { fontSize: 10, fontWeight: '800' },
  inputWrapper: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: radii.md, borderWidth: 1.2, paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 10, fontSize: 15, writingDirection: 'rtl' },
  clearBtn: { paddingHorizontal: 2 },
  dropdown: { marginTop: 5, borderRadius: 14, borderWidth: 1.2, overflow: 'hidden', elevation: 10, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 10 },
  dropdownTitle: { textAlign: 'right', writingDirection: 'rtl', fontSize: 10.5, paddingHorizontal: 12, paddingVertical: 8 },
  dropdownItem: { minHeight: 44, flexDirection: 'row-reverse', alignItems: 'center', gap: 9, paddingHorizontal: 12, borderTopWidth: 1 },
  dropdownText: { flex: 1, fontSize: 14, textAlign: 'right', writingDirection: 'rtl', fontWeight: '600' },
});
