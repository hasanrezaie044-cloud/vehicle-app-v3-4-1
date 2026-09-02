import { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, spacing } from '@/constants/theme';
import { EmptyState } from './ui/UI';
import { KeyboardAwareScrollViewCompat } from './KeyboardAwareScrollViewCompat';

export default function PersonnelModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { personnel, addPersonnel, updatePersonnel, deletePersonnel } = useApp();
  const safePersonnel = Array.isArray(personnel) ? personnel : [];

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [phone, setPhone] = useState('');

  const resetForm = () => { setEditId(null); setName(''); setCode(''); setCostCenter(''); setPhone(''); setShowForm(false); };

  const handleEdit = (id: string) => {
    const p = safePersonnel.find(x => x.id === id);
    if (!p) return;
    setEditId(id); setName(p.name); setCode(p.personnelCode); setCostCenter(p.costCenter); setPhone(p.phone);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('خطا', 'نام سرنشین را وارد کنید'); return; }
    if (costCenter && !/^\d+$/.test(costCenter.trim())) { Alert.alert('خطا', 'مرکز هزینه باید فقط عدد باشد'); return; }
    const payload = { name: name.trim(), personnelCode: code.trim(), costCenter: costCenter.trim(), phone: phone.trim() };
    if (editId) updatePersonnel(editId, payload);
    else addPersonnel(payload);
    resetForm();
  };

  const handleDelete = (id: string) => {
    Alert.alert('حذف', 'آیا از حذف این مورد مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deletePersonnel(id) },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.header, { borderBottomColor: colors.borderSoft }]}>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>شناسنامه کارکنان</Text>
            <TouchableOpacity onPress={() => { resetForm(); setShowForm(true); }} hitSlop={8}>
              <Ionicons name="add-circle" size={26} color={colors.accent} />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 60 }]}
            bottomOffset={40}
            showsVerticalScrollIndicator={false}
          >
              <View style={[styles.statsCard, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.accentText }]}>{safePersonnel.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>تعداد کارکنان</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.accentText }]}>{safePersonnel.filter(p => !!p.personnelCode).length}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>کد ثبت‌شده</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.accentText }]}>{safePersonnel.filter(p => !!p.phone).length}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>شماره ثبت‌شده</Text>
                </View>
              </View>

              {showForm && (
                <View style={[styles.formCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>نام سرنشین</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    value={name} onChangeText={setName} placeholder="نام و نام خانوادگی" placeholderTextColor={colors.textMuted} textAlign="right" />

                  <Text style={[styles.label, { color: colors.textSecondary }]}>کد پرسنلی</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    value={code} onChangeText={t => setCode(t.replace(/[^0-9]/g, ''))} placeholder="کد پرسنلی" placeholderTextColor={colors.textMuted} textAlign="right" keyboardType="number-pad" />

                  <Text style={[styles.label, { color: colors.textSecondary }]}>مرکز هزینه (فقط عدد)</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    value={costCenter} onChangeText={t => setCostCenter(t.replace(/[^0-9]/g, ''))} placeholder="مثلاً 1023" placeholderTextColor={colors.textMuted}
                    textAlign="right" keyboardType="number-pad" />

                  <Text style={[styles.label, { color: colors.textSecondary }]}>شماره موبایل</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    value={phone} onChangeText={t => setPhone(t.replace(/[^0-9]/g, ''))} placeholder="09xxxxxxxxx" placeholderTextColor={colors.textMuted}
                    textAlign="right" keyboardType="phone-pad" />

                  <View style={styles.formActions}>
                    <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={handleSave}>
                      <Text style={[styles.saveBtnText, { color: colors.textOnAccent }]}>{editId ? 'ذخیره تغییرات' : 'افزودن'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={resetForm}>
                      <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>انصراف</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {safePersonnel.length === 0 && !showForm ? (
                <EmptyState icon="people-outline" title="هنوز سرنشینی ثبت نشده است" subtitle="با دکمه + یک سرنشین جدید اضافه کنید" />
              ) : (
                safePersonnel.map(p => (
                  <View key={p.id} style={[styles.personCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                    <View style={styles.personRow}>
                      <View style={[styles.personIcon, { backgroundColor: colors.accentSoft }]}>
                        <Ionicons name="person" size={18} color={colors.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.personName, { color: colors.text }]}>{p.name}</Text>
                        <Text style={[styles.personMeta, { color: colors.textMuted }]}>
                          {p.personnelCode ? `کد: ${p.personnelCode}` : ''}{p.costCenter ? `   مرکز هزینه: ${p.costCenter}` : ''}
                        </Text>
                        {p.phone ? <Text style={[styles.personMeta, { color: colors.textMuted }]}>موبایل: {p.phone}</Text> : null}
                      </View>
                      <TouchableOpacity onPress={() => handleEdit(p.id)} hitSlop={8} style={styles.iconBtn}>
                        <Ionicons name="create-outline" size={19} color={colors.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(p.id)} hitSlop={8} style={styles.iconBtn}>
                        <Ionicons name="trash-outline" size={19} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
          </KeyboardAwareScrollViewCompat>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', minHeight: '55%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: '800', writingDirection: 'rtl' },
  body: { padding: spacing.lg, paddingBottom: 32 },
  statsCard: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-around', borderRadius: radii.lg, borderWidth: 1, paddingVertical: 14, marginBottom: 12 },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 10.5, fontWeight: '600' },
  statDivider: { width: 1, height: 30 },
  formCard: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', textAlign: 'right', marginBottom: 6, marginTop: 8, writingDirection: 'rtl' },
  input: { borderRadius: radii.sm, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, borderWidth: 1, textAlign: 'right', writingDirection: 'rtl' },
  formActions: { flexDirection: 'row-reverse', gap: 10, marginTop: 16 },
  saveBtn: { flex: 1, borderRadius: radii.md, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { fontSize: 14.5, fontWeight: '700' },
  cancelBtn: { flex: 1, borderRadius: radii.md, paddingVertical: 13, alignItems: 'center', borderWidth: 1 },
  cancelBtnText: { fontSize: 14.5, fontWeight: '700' },
  personCard: { borderRadius: radii.md, borderWidth: 1, padding: 12, marginBottom: 10 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  personIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  personName: { fontSize: 14.5, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  personMeta: { fontSize: 12, textAlign: 'right', writingDirection: 'rtl', marginTop: 2 },
  iconBtn: { padding: 4 },
});
