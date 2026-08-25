import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Maintenance } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { radii } from '@/constants/theme';

interface MaintenanceTypeSelectorProps {
  value: Maintenance['type'];
  onChange: (type: Maintenance['type']) => void;
  style?: any;
}

const MAINTENANCE_META: { key: Maintenance['type']; label: string; icon: keyof typeof Ionicons.glyphMap; description: string; colorKey: 'success' | 'danger' | 'textMuted' | 'info' | 'warning' | 'mission' }[] = [
  { key: 'oil-change', label: 'تعویض روغن', icon: 'water', description: 'تعویض روغن موتور', colorKey: 'success' },
  { key: 'repair', label: 'تعمیر موتور', icon: 'build', description: 'تعمیرات موتور', colorKey: 'danger' },
  { key: 'tire', label: 'تعویض لاستیک', icon: 'ellipse', description: 'تعویض یا تعمیر لاستیک', colorKey: 'textMuted' },
  { key: 'wash', label: 'شستشو', icon: 'water-outline', description: 'شستشو و تمیزکاری', colorKey: 'info' },
  { key: 'spark-plug', label: 'شمع', icon: 'flash', description: 'تعویض شمع‌ها', colorKey: 'warning' },
  { key: 'brake-pad', label: 'لنت', icon: 'square', description: 'تعویض لنت ترمز', colorKey: 'mission' },
  { key: 'other', label: 'سایر', icon: 'construct', description: 'سایر خدمات', colorKey: 'textMuted' },
];

export default function MaintenanceTypeSelector({ value, onChange, style }: MaintenanceTypeSelectorProps) {
  const { colors } = useTheme();
  const [showModal, setShowModal] = useState(false);

  const softMap: Record<string, string> = {
    success: colors.successSoft, danger: colors.dangerSoft, textMuted: colors.surfaceAlt,
    info: colors.infoSoft, warning: colors.warningSoft, mission: colors.missionSoft,
  };
  const colorMap: Record<string, string> = {
    success: colors.success, danger: colors.danger, textMuted: colors.textMuted,
    info: colors.info, warning: colors.warning, mission: colors.mission,
  };

  const types = MAINTENANCE_META.map(t => ({ ...t, color: colorMap[t.colorKey], soft: softMap[t.colorKey] }));
  const currentType = types.find(t => t.key === value);

  return (
    <>
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        <View style={styles.content}>
          {currentType && (
            <View style={[styles.iconWrapper, { backgroundColor: currentType.soft }]}>
              <Ionicons name={currentType.icon} size={20} color={currentType.color} />
            </View>
          )}
          <View style={styles.textWrapper}>
            <Text style={[styles.label, { color: colors.textMuted }]}>نوع تعمیر</Text>
            <Text style={[styles.value, { color: currentType?.color }]}>{currentType?.label}</Text>
          </View>
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>انتخاب نوع تعمیر</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.grid} showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
              <View style={styles.gridContainer}>
                {types.map((type) => {
                  const active = value === type.key;
                  return (
                    <TouchableOpacity
                      key={type.key}
                      style={[
                        styles.gridItem,
                        { backgroundColor: colors.surfaceAlt, borderColor: colors.borderSoft },
                        active && { borderColor: type.color, backgroundColor: type.soft },
                      ]}
                      onPress={() => { onChange(type.key); setShowModal(false); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.gridIcon, { backgroundColor: type.soft }]}>
                        <Ionicons name={type.icon} size={26} color={type.color} />
                      </View>
                      <Text style={[styles.gridLabel, { color: colors.text }]}>{type.label}</Text>
                      <Text style={[styles.gridDescription, { color: colors.textMuted }]}>{type.description}</Text>
                      {active && (
                        <View style={[styles.checkmark, { backgroundColor: type.color, borderColor: colors.surface }]}>
                          <Ionicons name="checkmark" size={16} color="#ffffff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 12, minHeight: 50,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrapper: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  textWrapper: { flex: 1 },
  label: { fontSize: 12, marginBottom: 2, textAlign: 'right', writingDirection: 'rtl' },
  value: { fontSize: 15, fontWeight: '700', textAlign: 'right' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 12, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', flex: 1 },
  grid: { maxHeight: '90%' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 24 },
  gridItem: { width: '48%', borderRadius: radii.md, padding: 12, marginBottom: 12, borderWidth: 2, alignItems: 'center', position: 'relative' },
  gridIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  gridLabel: { fontSize: 13, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  gridDescription: { fontSize: 11, textAlign: 'center' },
  checkmark: { position: 'absolute', top: -8, left: -8, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
});
