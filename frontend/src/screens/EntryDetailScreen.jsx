import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';
import { apiGetEntries, apiDeleteEntry } from '../lib/api';

// ── Icons ─────────────────────────────────────────────────────────────────────

const ChevronLeftIcon = ({ color, size = 20 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.45, height: size * 0.45,
      borderLeftWidth: 2.5, borderBottomWidth: 2.5,
      borderColor: color, borderRadius: 1,
      transform: [{ rotate: '45deg' }, { translateX: size * 0.08 }],
    }} />
  </View>
);

const TrashIcon = ({ color, size = 18 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.6, height: size * 0.7, borderWidth: 1.5, borderColor: color, borderRadius: 2, position: 'absolute', bottom: 0 }} />
    <View style={{ width: size * 0.8, height: 1.5, backgroundColor: color, borderRadius: 1, position: 'absolute', top: size * 0.15 }} />
    <View style={{ width: size * 0.3, height: size * 0.18, borderWidth: 1.5, borderColor: color, borderRadius: 2, position: 'absolute', top: 0 }} />
  </View>
);

const PencilIcon = ({ color, size = 18 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.55, height: size * 0.85, borderRadius: 2,
      borderWidth: 1.5, borderColor: color,
      transform: [{ rotate: '-45deg' }],
    }} />
    <View style={{
      position: 'absolute', bottom: 0, left: size * 0.08,
      width: size * 0.32, height: size * 0.32,
      borderLeftWidth: 1.5, borderBottomWidth: 1.5,
      borderColor: color,
      transform: [{ rotate: '-45deg' }],
    }} />
  </View>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const PAYMENT_LABELS = { cash: 'Cash', online: 'Online', cheque: 'Cheque', other: 'Other' };

// ── Row Component ─────────────────────────────────────────────────────────────

const DetailRow = ({ label, value, C, Font }) => (
  <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
    <Text style={{ fontSize: 13, fontFamily: Font.regular, color: C.textMuted, lineHeight: 18 }}>{label}</Text>
    <Text style={{ fontSize: 14, fontFamily: Font.medium, color: C.text, lineHeight: 20, textAlign: 'right', flex: 1 }} numberOfLines={2}>{value || '—'}</Text>
  </View>
);

// ── Screen ────────────────────────────────────────────────────────────────────

export default function EntryDetailScreen() {
  const router = useRouter();
  const { id, eid } = useLocalSearchParams();
  const { C, Font, isDark } = useTheme();
  const s = useMemo(() => makeStyles(C, Font), [C, Font]);
  const qc = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['entries', id],
    queryFn: () => apiGetEntries(id),
    staleTime: 1000 * 60 * 2,
    enabled: !!id,
  });

  const entry = entries.find(e => e.id === eid);

  const deleteEntry = useMutation({
    mutationFn: () => apiDeleteEntry(id, eid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries', id] });
      qc.invalidateQueries({ queryKey: ['summary', id] });
      qc.invalidateQueries({ queryKey: ['books'] });
      router.back();
    },
  });

  const handleDelete = () => {
    Alert.alert('Delete Entry', 'Delete this entry? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEntry.mutate() },
    ]);
  };

  const isIn      = entry?.type === 'in';
  const typeColor = isIn ? C.cashIn : C.cashOut;
  const typeBg    = isIn ? (isDark ? C.cashInLight : '#DCFCE7') : (isDark ? C.cashOutLight : '#FEE2E2');

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.card} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.headerBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeftIcon color={C.text} size={22} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Entry Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading || !entry ? (
        <View style={s.loadingBox}>
          <Text style={s.loadingText}>{isLoading ? 'Loading…' : 'Entry not found.'}</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

            {/* Amount hero */}
            <View style={[s.amountCard, { backgroundColor: typeBg }]}>
              <View style={[s.typePill, { backgroundColor: typeColor }]}>
                <Text style={s.typePillText}>{isIn ? 'Cash In' : 'Cash Out'}</Text>
              </View>
              <Text style={[s.amountText, { color: typeColor }]}>
                {isIn ? '+' : '-'}{entry.amount.toLocaleString()}
              </Text>
              <Text style={s.amountDate}>{formatDate(entry.entry_date)}  ·  {entry.entry_time}</Text>
            </View>

            {/* Details card */}
            <View style={s.detailCard}>
              <DetailRow label="Remark"       value={entry.remark}                       C={C} Font={Font} />
              <DetailRow label="Category"     value={entry.category}                     C={C} Font={Font} />
              <DetailRow label="Payment Mode" value={PAYMENT_LABELS[entry.payment_mode]} C={C} Font={Font} />
              <DetailRow label="Contact"      value={entry.contact_name}                 C={C} Font={Font} />
              <DetailRow label="Date"         value={formatDate(entry.entry_date)}       C={C} Font={Font} />
              <DetailRow label="Time"         value={entry.entry_time}                   C={C} Font={Font} />
              <View style={{ paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontFamily: Font.regular, color: C.textMuted }}>Entry by</Text>
                <Text style={{ fontSize: 14, fontFamily: Font.medium, color: C.text }}>You</Text>
              </View>
            </View>

          </ScrollView>

          {/* Bottom Buttons */}
          <View style={s.bottomBar}>
            <TouchableOpacity
              style={[s.editBtn, { borderColor: typeColor }]}
              onPress={() => router.push({ pathname: '/(app)/books/[id]/edit-entry', params: { id, eid } })}
              activeOpacity={0.8}
            >
              <PencilIcon color={typeColor} size={16} />
              <Text style={[s.actionBtnText, { color: typeColor }]}>Edit Entry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.deleteBtn}
              onPress={handleDelete}
              activeOpacity={0.8}
            >
              <TrashIcon color={C.cashOut} size={16} />
              <Text style={[s.actionBtnText, { color: C.cashOut }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (C, Font) => StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
    minHeight: 56,
  },
  headerBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontFamily: Font.bold, color: C.text, lineHeight: 22, marginLeft: 4 },

  bottomBar: {
    flexDirection: 'row', gap: 12,
    padding: 16, backgroundColor: C.card,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1.5, borderRadius: 14,
    paddingVertical: 14, minHeight: 52,
  },
  deleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1.5, borderColor: C.cashOut, borderRadius: 14,
    paddingVertical: 14, minHeight: 52,
  },
  actionBtnText: { fontSize: 14, fontFamily: Font.bold, lineHeight: 20 },

  loadingBox:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, fontFamily: Font.regular, color: C.textMuted },

  content: { padding: 16, gap: 12 },

  amountCard: {
    borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: C.border,
  },
  typePill: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
  },
  typePillText: { fontSize: 12, fontFamily: Font.semiBold, color: '#fff', lineHeight: 18 },
  amountText:   { fontSize: 36, fontFamily: Font.extraBold, lineHeight: 44, letterSpacing: -0.5 },
  amountDate:   { fontSize: 13, fontFamily: Font.regular, color: C.textMuted, lineHeight: 20 },

  detailCard: {
    backgroundColor: C.card, borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1, borderColor: C.border,
  },
});
