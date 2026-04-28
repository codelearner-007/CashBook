import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ScrollView, Switch,
} from 'react-native';
import SafeAreaView from '../components/ui/AppSafeAreaView';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useBookFieldsStore } from '../store/bookFieldsStore';
import { PAYMENT_MODES } from '../constants/categories';

const MODE_ICONS = {
  cash:   'dollar-sign',
  online: 'wifi',
  cheque: 'file-text',
  other:  'more-horizontal',
};

export default function PaymentModeSettingsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { C, Font } = useTheme();
  const s = makeStyles(C, Font);

  const { getFields, setField } = useBookFieldsStore();
  const showField = getFields(id).showPaymentMode;
  const setShowField = (val) => setField(id, 'showPaymentMode', val);

  const [modes, setModes] = useState(
    PAYMENT_MODES.map(m => ({ ...m, enabled: true }))
  );

  const toggle = (value) => {
    setModes(prev => prev.map(m => m.value === value ? { ...m, enabled: !m.enabled } : m));
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Payment Mode</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Show Field Toggle */}
        <View style={[s.toggleCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={s.toggleLeft}>
            <View style={[s.iconBox, { backgroundColor: C.primaryLight }]}>
              <Feather name="eye" size={18} color={C.primary} />
            </View>
            <View>
              <Text style={s.toggleLabel}>Show Payment Mode Field</Text>
              <Text style={s.toggleSub}>Display on entry form</Text>
            </View>
          </View>
          <Switch
            value={showField}
            onValueChange={setShowField}
            trackColor={{ false: C.border, true: C.primary }}
            thumbColor="#fff"
          />
        </View>

        <Text style={s.sectionLabel}>PAYMENT MODES</Text>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {modes.map((mode, idx) => (
            <View key={mode.value}>
              <View style={[s.row, { opacity: mode.enabled ? 1 : 0.45 }]}>
                <View style={[s.iconBox, { backgroundColor: C.primaryLight }]}>
                  <Feather name={MODE_ICONS[mode.value]} size={18} color={C.primary} />
                </View>
                <Text style={s.rowLabel}>{mode.label}</Text>
                <Switch
                  value={mode.enabled}
                  onValueChange={() => toggle(mode.value)}
                  trackColor={{ false: C.border, true: C.primary }}
                  thumbColor="#fff"
                />
              </View>
              {idx < modes.length - 1 && <View style={[s.divider, { backgroundColor: C.border }]} />}
            </View>
          ))}
        </View>

        <Text style={s.hint}>
          Disabled modes won't appear in the entry form. At least one mode must be active.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C, Font) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: {
    backgroundColor: C.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 14,
  },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: Font.bold, color: '#fff' },

  content: { padding: 16, paddingTop: 24, paddingBottom: 40 },

  toggleCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, borderWidth: 1,
    padding: 14, gap: 12, marginBottom: 24,
  },
  toggleLeft:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleLabel: { fontSize: 15, fontFamily: Font.semiBold, color: C.text },
  toggleSub:   { fontSize: 12, fontFamily: Font.regular, color: C.textMuted },

  sectionLabel: {
    fontSize: 11, fontFamily: Font.semiBold, color: C.textMuted,
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 8, marginLeft: 2,
  },
  card:    { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  row:     { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  divider: { height: 1, marginHorizontal: 16 },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: Font.medium, color: C.text },

  hint: {
    fontSize: 12, fontFamily: Font.regular, color: C.textMuted,
    lineHeight: 18, textAlign: 'center', paddingHorizontal: 8,
  },
});
