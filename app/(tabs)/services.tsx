import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, Service } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { radii, spacing, serviceMeta } from '@/constants/theme';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

import JalaliDatePicker from '@/components/JalaliDatePicker';
import TimePicker from '@/components/TimePicker';
import ServiceTypeSelector from '@/components/ServiceTypeSelector';
import AutoSuggest from '@/components/AutoSuggest';
import FormattedNumberInput from '@/components/FormattedNumberInput';

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();
  const {
    services, addService, updateService, deleteService,
    calculateServiceIncome, rates, formatNumber, getTodayJalali,
    getSuggestions, addSuggestion,
  } = useApp();

  const TYPE_COLOR: Record<string, { color: string; soft: string }> = {
    night: { color: colors.night, soft: colors.nightSoft },
    holiday: { color: colors.holiday, soft: colors.holidaySoft },
    request: { color: colors.request, soft: colors.requestSoft },
    available: { color: colors.available, soft: colors.availableSoft },
    fixed: { color: colors.fixed, soft: colors.fixedSoft },
    mission: { color: colors.mission, soft: colors.missionSoft },
  };

  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const [editingId, setEditingId] = useState<string | null>(null);

  const [serviceType, setServiceType] = useState<Service['type']>('night');
  const [date, setDate] = useState(getTodayJalali());
  const [km, setKm] = useState('');
  const [hours, setHours] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [passengers, setPassengers] = useState('');
  const [requestNumber, setRequestNumber] = useState('');
  const [tollCount, setTollCount] = useState('');
  const [missionFood, setMissionFood] = useState('');
  const [missionToll, setMissionToll] = useState('');
  const [missionFine, setMissionFine] = useState('');

  const originSuggestions = getSuggestions('origin');
  const destinationSuggestions = getSuggestions('destination');
  const passengersSuggestions = getSuggestions('passengers');

  const frequentRoutes = useMemo(() => {
    const map: Record<string, { origin: string; destination: string; count: number; kmTotal: number; hoursTotal: number }> = {};
    services.forEach(service => {
      if (!service.origin || !service.destination) return;
      const key = `${service.origin}|||${service.destination}`;
      if (!map[key]) map[key] = { origin: service.origin, destination: service.destination, count: 0, kmTotal: 0, hoursTotal: 0 };
      map[key].count += 1;
      map[key].kmTotal += service.km || 0;
      map[key].hoursTotal += service.hours || 0;
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map(r => ({ ...r, km: Math.round(r.kmTotal / r.count), hours: Math.round(r.hoursTotal / r.count * 10) / 10 }));
  }, [services]);

  const calculatedIncome = useMemo(() => {
    return calculateServiceIncome(
      serviceType,
      parseFloat(km) || 0,
      parseFloat(hours) || 0,
      parseInt(tollCount) || 0,
      parseFloat(missionFood) || 0,
      parseFloat(missionToll) || 0,
      parseFloat(missionFine) || 0
    );
  }, [serviceType, km, hours, tollCount, missionFood, missionToll, missionFine, calculateServiceIncome]);

  const resetForm = useCallback(() => {
    setServiceType('night'); setDate(getTodayJalali()); setKm(''); setHours('');
    setStartTime(''); setEndTime(''); setOrigin(''); setDestination('');
    setPassengers(''); setRequestNumber(''); setTollCount('');
    setMissionFood(''); setMissionToll(''); setMissionFine('');
    setEditingId(null);
    if (editId) router.replace('/(tabs)/services');
  }, [getTodayJalali, editId, router]);

  useEffect(() => {
    if (!editId) return;
    const service = services.find(s => s.id === editId);
    if (service) {
      setServiceType(service.type); setDate(service.date);
      setKm(service.km ? service.km.toString() : ''); setHours(service.hours ? service.hours.toString() : '');
      setStartTime(service.startTime); setEndTime(service.endTime); setOrigin(service.origin); setDestination(service.destination);
      setPassengers(service.passengers); setRequestNumber(service.requestNumber); setTollCount(service.tollCount ? service.tollCount.toString() : '');
      setMissionFood(service.missionFood ? service.missionFood.toString() : ''); setMissionToll(service.missionToll ? service.missionToll.toString() : ''); setMissionFine(service.missionFine ? service.missionFine.toString() : '');
      setEditingId(service.id);
    }
  }, [editId, services]);

  const handleSubmit = useCallback(() => {
    if (!km && !hours && serviceType !== 'mission') {
      Alert.alert('خطا', 'لطفاً کیلومتر یا ساعت را وارد کنید');
      return;
    }
    const serviceData = {
      date, type: serviceType, carType: rates.defaultCarType,
      km: parseFloat(km) || 0, hours: parseFloat(hours) || 0,
      workHours: parseFloat(hours) || 0, startTime, endTime,
      origin, destination, passengers, requestNumber,
      tollCount: parseInt(tollCount) || 0,
      missionFood: parseFloat(missionFood) || 0,
      missionToll: parseFloat(missionToll) || 0,
      missionFine: parseFloat(missionFine) || 0,
      income: calculatedIncome,
    };
    if (editingId) {
      updateService(editingId, serviceData);
      setEditingId(null);
    } else {
      addService(serviceData);
    }
    if (origin) addSuggestion('origin', origin);
    if (destination) addSuggestion('destination', destination);
    if (passengers) addSuggestion('passengers', passengers);
    resetForm();
  }, [date, serviceType, rates.defaultCarType, km, hours, startTime, endTime, origin, destination, passengers, requestNumber, tollCount, missionFood, missionToll, missionFine, calculatedIncome, editingId, addService, updateService, resetForm, addSuggestion]);

  const handleEdit = useCallback((service: Service) => {
    setServiceType(service.type); setDate(service.date);
    setKm(service.km ? service.km.toString() : '');
    setHours(service.hours ? service.hours.toString() : '');
    setStartTime(service.startTime); setEndTime(service.endTime);
    setOrigin(service.origin); setDestination(service.destination);
    setPassengers(service.passengers); setRequestNumber(service.requestNumber);
    setTollCount(service.tollCount ? service.tollCount.toString() : '');
    setMissionFood(service.missionFood ? service.missionFood.toString() : '');
    setMissionToll(service.missionToll ? service.missionToll.toString() : '');
    setMissionFine(service.missionFine ? service.missionFine.toString() : '');
    setEditingId(service.id); setMode('form');
  }, []);

  const handleDelete = useCallback((id: string) => {
    Alert.alert('حذف سرویس', 'آیا از حذف این سرویس مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteService(id) },
    ]);
  }, [deleteService]);

  const showKm = ['night','holiday','request','fixed','mission'].includes(serviceType);
  const showHours = ['night','holiday','request','available','fixed','mission'].includes(serviceType);
  const showKmOrHourHint = ['night', 'holiday', 'request'].includes(serviceType);
  const showMission = serviceType === 'mission';
  const showRequestNumber = !['fixed','mission'].includes(serviceType);
  const topInset = Platform.OS === 'web' ? 20 : insets.top;

  const renderForm = () => (
    <KeyboardAwareScrollViewCompat
      style={styles.flex}
      contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + 100 }]}
      bottomOffset={40}
      showsVerticalScrollIndicator={false}
    >
        <View style={[styles.formHero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.formHeroIcon, { backgroundColor: colors.accentSoft }]}><Ionicons name="flash" size={20} color={colors.accent} /></View>
          <View style={{ flex: 1 }}><Text style={[styles.formHeroTitle, { color: colors.text }]}>ثبت سریع سرویس</Text><Text style={[styles.formHeroText, { color: colors.textMuted }]}>اطلاعات را وارد کنید؛ مبلغ خودکار محاسبه می‌شود.</Text></View>
        </View>
        <ServiceTypeSelector value={serviceType} onChange={setServiceType} style={styles.componentMargin} />
        {frequentRoutes.length > 0 && (
          <View style={[styles.quickPresetBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.quickPresetHeader}><Ionicons name="flash-outline" size={16} color={colors.accent} /><Text style={[styles.quickPresetTitle, { color: colors.text }]}>ثبت یک‌لمسی مسیر پرتکرار</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPresetScroll}>
              {frequentRoutes.map((route, i) => (
                <TouchableOpacity
                  key={`${route.origin}-${route.destination}-${i}`}
                  style={[styles.quickPreset, { backgroundColor: colors.accentSoft }]}
                  onPress={() => {
                    setOrigin(route.origin);
                    setDestination(route.destination);
                    if (route.km > 0) setKm(String(route.km));
                    if (route.hours > 0) setHours(String(route.hours));
                  }}
                >
                  <Text style={[styles.quickPresetText,{color:colors.accentText}]}>{route.origin} ← {route.destination}</Text>
                  <Text style={[styles.quickPresetMeta,{color:colors.textMuted}]}>{route.km} کیلومتر • {route.hours} ساعت • {route.count} بار</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        <JalaliDatePicker value={date} onSelect={setDate} label="تاریخ" />

        {showKmOrHourHint && (
          <View style={[styles.hintBox, { backgroundColor: colors.infoSoft }]}>
            <Ionicons name="information-circle" size={16} color={colors.info} />
            <Text style={[styles.hintText, { color: colors.info }]}>هرکدام از کیلومتر یا ساعت را وارد کنید، بر اساس همان محاسبه می‌شود</Text>
          </View>
        )}

        {showKm && (
          <>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>کیلومتر</Text>
            <FormattedNumberInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={km} onChangeText={setKm}
              placeholder="0" textAlign="right" />
          </>
        )}
        {showHours && (
          <>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>ساعت کارکرد</Text>
            <FormattedNumberInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={hours} onChangeText={setHours}
              placeholder="0" decimals={2} textAlign="right" />
          </>
        )}
        {showMission && (
          <>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>هزینه غذا (تومان)</Text>
            <FormattedNumberInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={missionFood} onChangeText={setMissionFood}
              placeholder="0" textAlign="right" />
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>هزینه عوارض ماموریت</Text>
            <FormattedNumberInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={missionToll} onChangeText={setMissionToll}
              placeholder="0" textAlign="right" />
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>هزینه جریمه</Text>
            <FormattedNumberInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={missionFine} onChangeText={setMissionFine}
              placeholder="0" textAlign="right" />
          </>
        )}

        <View style={styles.rowFields}>
          <View style={styles.halfField}>
            <TimePicker label="ساعت شروع" value={startTime} onChange={setStartTime} />
          </View>
          <View style={styles.halfField}>
            <TimePicker label="ساعت پایان" value={endTime} onChange={setEndTime} />
          </View>
        </View>

        <AutoSuggest label="مبدا" value={origin} onChange={setOrigin} suggestions={originSuggestions} placeholder="مبدا سفر" />
        <AutoSuggest label="مقصد" value={destination} onChange={setDestination} suggestions={destinationSuggestions} placeholder="مقصد سفر" />
        <AutoSuggest label="نام سرنشین / سرنشینان" value={passengers} onChange={setPassengers} suggestions={passengersSuggestions} placeholder="مثلاً آقای احمدی" />

        {showRequestNumber && (
          <>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>شماره درخواست</Text>
            <FormattedNumberInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={requestNumber} onChangeText={setRequestNumber}
              placeholder="شماره درخواست" textAlign="right" />
          </>
        )}

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>تعداد عوارضی</Text>
        <FormattedNumberInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={tollCount} onChangeText={setTollCount}
          placeholder="0" textAlign="right" />

        <View style={[styles.incomeDisplay, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
          <Text style={[styles.incomeLabel, { color: colors.accentText }]}>درآمد محاسبه‌شده</Text>
          <Text style={[styles.incomeValue, { color: colors.accentText }]}>{formatNumber(calculatedIncome)} تومان</Text>
        </View>

        <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.accent }]} onPress={handleSubmit} activeOpacity={0.85}>
          <Ionicons name={editingId ? 'checkmark-circle' : 'add-circle'} size={22} color={colors.textOnAccent} />
          <Text style={[styles.submitButtonText, { color: colors.textOnAccent }]}>{editingId ? 'ویرایش سرویس' : 'ثبت سرویس جدید'}</Text>
        </TouchableOpacity>

        {editingId && (
          <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.surfaceAlt }]} onPress={resetForm} activeOpacity={0.8}>
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>انصراف</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 40 }} />
      </KeyboardAwareScrollViewCompat>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: topInset }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{editingId ? 'ویرایش سرویس' : 'ثبت سرویس'}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>سرویس‌های ثبت‌شده را از تقویم مدیریت کنید</Text>
        </View>
        {editingId && (
          <TouchableOpacity onPress={resetForm} style={[styles.headerCancel, { backgroundColor: colors.surfaceAlt }]} activeOpacity={0.8}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {renderForm()}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 21, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  headerSubtitle: { fontSize: 11, marginTop: 2, textAlign: 'right', writingDirection: 'rtl' },
  headerCancel: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  formContent: { paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: 120 },
  formHero: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11, borderRadius: radii.lg, borderWidth: 1, padding: 14, marginBottom: 12 },
  formHeroIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  formHeroTitle: { fontSize: 15, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  formHeroText: { fontSize: 11.5, marginTop: 2, textAlign: 'right', writingDirection: 'rtl' },
  quickPresetBox: { borderRadius: radii.lg, borderWidth: 1, padding: 12, marginBottom: 12 },
  quickPresetHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, marginBottom: 8 },
  quickPresetTitle: { fontSize: 12.5, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  quickPresetScroll: { flexDirection: 'row-reverse', gap: 8 },
  quickPreset: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11 },
  quickPresetMeta: { fontSize: 9.5, fontWeight: '700', marginTop: 3, textAlign: 'right' },
  quickPresetText: { fontSize: 11.5, fontWeight: '800' },
  componentMargin: { marginBottom: 16 },
  hintBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: radii.sm, padding: 10, marginBottom: 4 },
  hintText: { flex: 1, fontSize: 11.5, textAlign: 'right', writingDirection: 'rtl', lineHeight: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', textAlign: 'right', marginBottom: 4, marginTop: 8, writingDirection: 'rtl' },
  input: { borderRadius: radii.sm, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, writingDirection: 'rtl' },
  rowFields: { flexDirection: 'row', gap: 12, marginTop: 4 },
  halfField: { flex: 1 },
  incomeDisplay: { borderRadius: radii.md, padding: 16, marginTop: 16, alignItems: 'center', borderWidth: 1 },
  incomeLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  incomeValue: { fontSize: 22, fontWeight: '800' },
  submitButton: { borderRadius: radii.md, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 8 },
  submitButtonText: { fontSize: 16, fontWeight: '700' },
  cancelButton: { borderRadius: radii.md, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  cancelButtonText: { fontSize: 14, fontWeight: '600' },
});
