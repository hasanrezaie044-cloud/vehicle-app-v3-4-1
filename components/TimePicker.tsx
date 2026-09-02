import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { radii } from '@/constants/theme';

interface TimePickerProps { value: string; onChange: (time: string) => void; label: string; style?: any; }
const pad = (n: number) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export default function TimePicker({ value, onChange, label, style }: TimePickerProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const initial = useMemo(() => { const [h,m] = (value || '00:00').split(':').map(Number); return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 }; }, [value]);
  const [hour, setHour] = useState(initial.h);
  const [minute, setMinute] = useState(initial.m);
  useEffect(() => { if (!open) { setHour(initial.h); setMinute(initial.m); } }, [initial.h, initial.m, open]);
  const confirm = () => { onChange(`${pad(hour)}:${pad(minute)}`); setOpen(false); };
  return <>
    <TouchableOpacity style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }, style]} onPress={() => setOpen(true)} activeOpacity={0.75}>
      <View style={[styles.timeIcon, { backgroundColor: colors.accentSoft }]}><Ionicons name="time-outline" size={19} color={colors.accent} /></View>
      <View style={styles.fieldText}><Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.value, { color: colors.text }]}>{value || '--:--'}</Text></View>
      <Ionicons name="chevron-down" size={17} color={colors.textMuted} />
    </TouchableOpacity>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 14) }]}>
          <View style={styles.header}><TouchableOpacity onPress={() => setOpen(false)}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity><Text style={[styles.title,{color:colors.text}]}>انتخاب {label}</Text><TouchableOpacity onPress={confirm}><Ionicons name="checkmark-circle" size={27} color={colors.accent} /></TouchableOpacity></View>
          <View style={[styles.preview,{backgroundColor:colors.accentSoft}]}><Text style={[styles.previewText,{color:colors.accentText}]}>{pad(hour)}:{pad(minute)}</Text><Text style={[styles.previewHint,{color:colors.textMuted}]}>ساعت و دقیقه را مستقیم انتخاب کنید</Text></View>
          <View style={styles.block}><Text style={[styles.blockTitle,{color:colors.text}]}>ساعت</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{HOURS.map(h=><TouchableOpacity key={h} onPress={()=>setHour(h)} style={[styles.chip,{backgroundColor:hour===h?colors.accent:colors.surfaceAlt,borderColor:hour===h?colors.accent:colors.border}]}><Text style={[styles.chipText,{color:hour===h?colors.textOnAccent:colors.text}]}>{pad(h)}</Text></TouchableOpacity>)}</ScrollView></View>
          <View style={styles.block}><Text style={[styles.blockTitle,{color:colors.text}]}>دقیقه</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{MINUTES.map(m=><TouchableOpacity key={m} onPress={()=>setMinute(m)} style={[styles.chip,{backgroundColor:minute===m?colors.accent:colors.surfaceAlt,borderColor:minute===m?colors.accent:colors.border}]}><Text style={[styles.chipText,{color:minute===m?colors.textOnAccent:colors.text}]}>{pad(m)}</Text></TouchableOpacity>)}</ScrollView></View>
          <TouchableOpacity style={[styles.confirm,{backgroundColor:colors.accent}]} onPress={confirm}><Text style={[styles.confirmText,{color:colors.textOnAccent}]}>ثبت ساعت {pad(hour)}:{pad(minute)}</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  </>;
}
const styles=StyleSheet.create({field:{minHeight:62,borderWidth:1.1,borderRadius:radii.lg,paddingHorizontal:10,flexDirection:'row-reverse',alignItems:'center',gap:9},timeIcon:{width:38,height:38,borderRadius:11,alignItems:'center',justifyContent:'center'},fieldText:{flex:1,alignItems:'flex-end'},label:{fontSize:10.5,textAlign:'right',writingDirection:'rtl'},value:{fontSize:19,fontWeight:'900',marginTop:2},overlay:{flex:1,justifyContent:'flex-end'},sheet:{borderTopLeftRadius:28,borderTopRightRadius:28,padding:18,maxHeight:'92%'},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},title:{fontSize:18,fontWeight:'900'},preview:{borderRadius:18,paddingVertical:15,alignItems:'center',marginBottom:14},previewText:{fontSize:36,fontWeight:'900',letterSpacing:2},previewHint:{fontSize:11,marginTop:3},block:{marginBottom:12},blockTitle:{fontSize:13,fontWeight:'800',textAlign:'right',writingDirection:'rtl',marginBottom:7},chips:{gap:7,paddingBottom:3,flexDirection:'row-reverse'},chip:{width:48,height:42,borderRadius:12,borderWidth:1,alignItems:'center',justifyContent:'center'},chipText:{fontSize:14,fontWeight:'800'},confirm:{borderRadius:15,paddingVertical:14,alignItems:'center',marginTop:4},confirmText:{fontSize:15,fontWeight:'900'}});
