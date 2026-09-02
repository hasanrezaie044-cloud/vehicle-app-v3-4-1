import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Service } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { radii } from '@/constants/theme';

interface ServiceTypeSelectorProps {
  value: Service['type'];
  onChange: (type: Service['type']) => void;
  style?: any;
}

const DESCRIPTIONS: Record<Service['type'], string> = {
  night: 'سرویس شب', holiday: 'روز تعطیل', request: 'درخواست ویژه',
  available: 'در اختیار', fixed: 'نرخ ثابت', mission: 'ماموریت',
};
const ICONS: Record<Service['type'], keyof typeof Ionicons.glyphMap> = {
  night: 'moon', holiday: 'sunny', request: 'call', available: 'time', fixed: 'car', mission: 'map',
};
const LABELS: Record<Service['type'], string> = {
  night: 'شب', holiday: 'تعطیل', request: 'درخواست', available: 'در اختیار', fixed: 'ثابت', mission: 'ماموریت',
};

export default function ServiceTypeSelector({ value, onChange, style }: ServiceTypeSelectorProps) {
  const { colors } = useTheme();
  const [showModal, setShowModal] = useState(false);

  const TYPE_COLOR: Record<Service['type'], { color: string; soft: string }> = {
    night: { color: colors.night, soft: colors.nightSoft },
    holiday: { color: colors.holiday, soft: colors.holidaySoft },
    request: { color: colors.request, soft: colors.requestSoft },
    available: { color: colors.available, soft: colors.availableSoft },
    fixed: { color: colors.fixed, soft: colors.fixedSoft },
    mission: { color: colors.mission, soft: colors.missionSoft },
  };

  const types = (Object.keys(LABELS) as Service['type'][]).map(key => ({
    key, label: LABELS[key], icon: ICONS[key], description: DESCRIPTIONS[key], ...TYPE_COLOR[key],
  }));
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
            <Text style={[styles.label, { color: colors.textMuted }]}>نوع سرویس</Text>
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
              <Text style={[styles.modalTitle, { color: colors.text }]}>انتخاب نوع سرویس</Text>
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
                        active && { borderColor: type.color, backgroundColor: type.soft, borderWidth: 2.5 },
                      ]}
                      onPress={() => { onChange(type.key); setShowModal(false); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.gridIcon, { backgroundColor: type.soft }]}>
                        <Ionicons name={type.icon} size={28} color={type.color} />
                      </View>
                      <Text style={[styles.gridLabel, { color: colors.text }]}>{type.label}</Text>
                      {active && (
                        <View style={[styles.checkmark, { backgroundColor: type.color }]}>
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
  iconWrapper: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  textWrapper: { flex: 1 },
  label: { fontSize: 12, marginBottom: 2, textAlign: 'right', writingDirection: 'rtl' },
  value: { fontSize: 16, fontWeight: '700', textAlign: 'right' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', flex: 1 },
  grid: { marginHorizontal: -8 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  gridItem: {
    width: '45%', marginHorizontal: 8, marginBottom: 16, borderRadius: radii.lg, borderWidth: 2,
    paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  gridIcon: { width: 56, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  gridLabel: { fontSize: 16, fontWeight: '700', marginBottom: 0 },
  checkmark: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
});
