import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import SafeAreaView from '../components/ui/AppSafeAreaView';
import { useTheme } from '../hooks/useTheme';
import { apiGetEntries } from '../lib/api';
import { supabase } from '../lib/supabase';

const FILTERS = ['This Month', 'Last Month', 'Last 3 Months', 'All Time', 'Custom'];
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

const fmtDate = (d) => d.toISOString().split('T')[0];

function getPresetRange(filter) {
  const today = new Date();
  if (filter === 'This Month') {
    return {
      from: fmtDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: fmtDate(today),
    };
  }
  if (filter === 'Last Month') {
    return {
      from: fmtDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: fmtDate(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
  }
  if (filter === 'Last 3 Months') {
    return {
      from: fmtDate(new Date(today.getFullYear(), today.getMonth() - 2, 1)),
      to: fmtDate(today),
    };
  }
  return { from: null, to: null };
}

function displayDateRange(from, to) {
  if (!from && !to) return 'All entries';
  const opts = { month: 'short', day: 'numeric', year: 'numeric' };
  const d1 = from ? new Date(from + 'T00:00:00').toLocaleDateString('en-US', opts) : 'Beginning';
  const d2 = to   ? new Date(to   + 'T00:00:00').toLocaleDateString('en-US', opts) : 'Today';
  return `${d1} – ${d2}`;
}

export default function ReportsScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams();
  const { C, Font } = useTheme();

  const [activeFilter, setActiveFilter] = useState('This Month');
  const [customFrom, setCustomFrom]     = useState(null);
  const [customTo, setCustomTo]         = useState(null);
  const [pickerFor, setPickerFor]       = useState(null); // 'from' | 'to' | null
  const [exportingPDF, setExportingPDF]     = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const { from: dateFrom, to: dateTo } = useMemo(() => {
    if (activeFilter === 'Custom') return { from: customFrom, to: customTo };
    return getPresetRange(activeFilter);
  }, [activeFilter, customFrom, customTo]);

  const rangeLabel = useMemo(() => displayDateRange(dateFrom, dateTo), [dateFrom, dateTo]);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['report-entries', id, dateFrom, dateTo],
    queryFn: () => apiGetEntries(id, {
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo   ? { date_to:   dateTo   } : {}),
    }),
    staleTime: 2 * 60 * 1000,
  });

  const summary = useMemo(() => {
    let total_in = 0, total_out = 0;
    for (const e of entries) {
      const amt = parseFloat(e.amount) || 0;
      if (e.type === 'in') total_in  += amt;
      else                  total_out += amt;
    }
    return { total_in, total_out, net_balance: total_in - total_out };
  }, [entries]);

  const maxBar = Math.max(summary.total_in, summary.total_out, 1);
  const BAR_H  = 90; // px height of full bar

  const handleExport = async (type) => {
    const setLoading = type === 'pdf' ? setExportingPDF : setExportingExcel;
    setLoading(true);
    try {
      const { data: sd } = await supabase.auth.getSession();
      const token = sd.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo)   params.append('date_to',   dateTo);
      const qs  = params.toString();
      const ext = type === 'pdf' ? 'pdf' : 'xlsx';
      const safeName = (name || id || 'report').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename  = `cashbook-${safeName}-${Date.now()}.${ext}`;
      const localUri  = `${FileSystem.cacheDirectory}${filename}`;
      const url = `${BASE_URL}/api/v1/books/${id}/report/${type}${qs ? '?' + qs : ''}`;

      const result = await FileSystem.downloadAsync(url, localUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (result.status !== 200) {
        throw new Error(`Server returned ${result.status}. Make sure the backend is running.`);
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: type === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Share CashBook Report',
          UTI: type === 'pdf'
            ? 'com.adobe.pdf'
            : 'org.openxmlformats.spreadsheetml.sheet',
        });
      } else {
        Alert.alert('File Saved', `Report saved:\n${result.uri}`);
      }
    } catch (err) {
      Alert.alert('Export Failed', err.message || 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const busy = exportingPDF || exportingExcel;
  const s = makeStyles(C, Font);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Reports</Text>
          {!!name && <Text style={s.headerSub} numberOfLines={1}>{name}</Text>}
        </View>
        <View style={s.headerBtns}>
          <TouchableOpacity
            style={s.headerExportBtn}
            onPress={() => handleExport('pdf')}
            disabled={busy}
          >
            {exportingPDF
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.headerExportText}>PDF</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={s.headerExportBtn}
            onPress={() => handleExport('excel')}
            disabled={busy}
          >
            {exportingExcel
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.headerExportText}>XLS</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Date filter chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.filtersScroll}
          contentContainerStyle={s.filtersContent}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[s.chip, activeFilter === f && s.chipActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[s.chipText, activeFilter === f && s.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Custom date pickers ── */}
        {activeFilter === 'Custom' && (
          <View style={s.customRow}>
            <TouchableOpacity style={s.datePickerBtn} onPress={() => setPickerFor('from')}>
              <Text style={s.datePickerLabel}>From</Text>
              <Text style={[s.datePickerVal, !customFrom && { color: C.textSubtle }]}>
                {customFrom || 'Select date'}
              </Text>
            </TouchableOpacity>
            <Text style={s.dateArrow}>→</Text>
            <TouchableOpacity style={s.datePickerBtn} onPress={() => setPickerFor('to')}>
              <Text style={s.datePickerLabel}>To</Text>
              <Text style={[s.datePickerVal, !customTo && { color: C.textSubtle }]}>
                {customTo || 'Select date'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <DateTimePickerModal
          isVisible={pickerFor !== null}
          mode="date"
          date={
            pickerFor === 'from' && customFrom ? new Date(customFrom + 'T00:00:00') :
            pickerFor === 'to'   && customTo   ? new Date(customTo   + 'T00:00:00') :
            new Date()
          }
          onConfirm={(date) => {
            if (pickerFor === 'from') setCustomFrom(fmtDate(date));
            else                       setCustomTo(fmtDate(date));
            setPickerFor(null);
          }}
          onCancel={() => setPickerFor(null)}
        />

        {/* ── Date range label ── */}
        <View style={s.rangeRow}>
          <Text style={s.rangeIcon}>📅</Text>
          <Text style={s.rangeText}>{rangeLabel}</Text>
          {isLoading && <ActivityIndicator size="small" color={C.primary} style={{ marginLeft: 8 }} />}
        </View>

        {/* ── Combined summary + chart ── */}
        <View style={s.chartCard}>
          <View style={s.chartHeader}>
            <Text style={s.chartTitle}>Financial Summary</Text>
            <Text style={s.chartSub}>{entries.length} transactions</Text>
          </View>

          <View style={s.chartBars}>
            {[
              { label: 'Income',   value: summary.total_in,                    color: C.cashIn,  bg: C.cashInLight,  icon: '↑' },
              { label: 'Expenses', value: summary.total_out,                   color: C.cashOut, bg: C.cashOutLight, icon: '↓' },
              { label: 'Net',      value: Math.abs(summary.net_balance),
                color: summary.net_balance >= 0 ? C.cashIn : C.cashOut,
                bg:    summary.net_balance >= 0 ? C.cashInLight : C.cashOutLight,
                icon:  summary.net_balance >= 0 ? '↑' : '↓' },
            ].map(({ label, value, color, bg, icon }, i) => (
              <React.Fragment key={label}>
                {i > 0 && <View style={s.barSep} />}
                <View style={s.barGroup}>
                  {/* Amount */}
                  <Text style={[s.barAmount, { color }]}>
                    {value > 0 ? value.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
                  </Text>
                  {/* Label */}
                  <Text style={s.barLabel}>{label}</Text>
                  {/* Bar */}
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { height: (value / maxBar) * BAR_H, backgroundColor: color }]} />
                  </View>
                  {/* Icon tag */}
                  <View style={[s.barTag, { backgroundColor: bg }]}>
                    <Text style={[s.barTagText, { color }]}>{icon}</Text>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── Recent entries ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Recent Entries</Text>

          {!isLoading && entries.length === 0 && (
            <Text style={s.emptyText}>No entries for this period</Text>
          )}

          {entries.slice(0, 8).map((e) => {
            const isIn = e.type === 'in';
            return (
              <View key={e.id} style={s.entryRow}>
                <View style={[s.entryDot, {
                  backgroundColor: isIn ? C.cashInLight : C.cashOutLight,
                }]}>
                  <Text style={{ fontSize: 11, color: isIn ? C.cashIn : C.cashOut, fontFamily: Font.bold }}>
                    {isIn ? '↑' : '↓'}
                  </Text>
                </View>
                <View style={s.entryInfo}>
                  <Text style={s.entryRemark} numberOfLines={1}>{e.remark || 'No remark'}</Text>
                  <Text style={s.entryMeta} numberOfLines={1}>
                    {e.entry_date}
                    {e.category      ? `  ·  ${e.category}`      : ''}
                    {e.payment_mode  ? `  ·  ${e.payment_mode}`  : ''}
                    {e.contact_name  ? `  ·  ${e.contact_name}`  : ''}
                  </Text>
                </View>
                <Text style={[s.entryAmt, { color: isIn ? C.cashIn : C.cashOut }]}>
                  {isIn ? '+' : '-'}{parseFloat(e.amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </Text>
              </View>
            );
          })}

          {entries.length > 8 && (
            <Text style={s.moreText}>+{entries.length - 8} more entries included in export</Text>
          )}
        </View>

        {/* ── Export section ── */}
        <View style={s.exportSection}>
          <Text style={s.exportTitle}>Export Report</Text>
          <Text style={s.exportSub}>
            {entries.length} entries  ·  {rangeLabel}
          </Text>

          {/* PDF button */}
          <TouchableOpacity
            style={[s.exportBtn, { borderColor: C.cashOut }, busy && s.exportBtnDisabled]}
            onPress={() => handleExport('pdf')}
            disabled={busy}
            activeOpacity={0.75}
          >
            <View style={[s.exportIconWrap, { backgroundColor: C.cashOutLight }]}>
              {exportingPDF
                ? <ActivityIndicator size="small" color={C.cashOut} />
                : <Text style={s.exportEmoji}>📄</Text>}
            </View>
            <View style={s.exportBtnBody}>
              <Text style={[s.exportBtnTitle, { color: C.cashOut }]}>Export as PDF</Text>
              <Text style={s.exportBtnSub}>A4 formatted report · Print · Share</Text>
            </View>
            <Text style={[s.exportChevron, { color: C.cashOut }]}>›</Text>
          </TouchableOpacity>

          {/* Excel button */}
          <TouchableOpacity
            style={[s.exportBtn, { borderColor: C.cashIn }, busy && s.exportBtnDisabled]}
            onPress={() => handleExport('excel')}
            disabled={busy}
            activeOpacity={0.75}
          >
            <View style={[s.exportIconWrap, { backgroundColor: C.cashInLight }]}>
              {exportingExcel
                ? <ActivityIndicator size="small" color={C.cashIn} />
                : <Text style={s.exportEmoji}>📊</Text>}
            </View>
            <View style={s.exportBtnBody}>
              <Text style={[s.exportBtnTitle, { color: C.cashIn }]}>Export as Excel</Text>
              <Text style={s.exportBtnSub}>Spreadsheet · Filter · Analyse · Edit</Text>
            </View>
            <Text style={[s.exportChevron, { color: C.cashIn }]}>›</Text>
          </TouchableOpacity>

          {/* Share hint */}
          <View style={[s.shareHint, { backgroundColor: C.primaryLight, borderColor: C.primaryMid }]}>
            <Text style={[s.shareHintText, { color: C.textMuted }]}>
              After export, share to WhatsApp, Email, Google Drive, Dropbox, save to Files — any app that handles PDF or Excel.
            </Text>
          </View>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C, Font) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 12,
  },
  backBtn:     { padding: 6, marginRight: 6 },
  backIcon:    { fontSize: 28, color: C.onPrimary, lineHeight: 30 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, color: C.onPrimary, fontFamily: Font.bold },
  headerSub:   { fontSize: 12, color: C.onPrimaryMuted, fontFamily: Font.regular, marginTop: 1 },
  headerBtns:  { flexDirection: 'row', gap: 8 },
  headerExportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
  },
  headerExportText: { fontSize: 12, fontFamily: Font.bold, color: '#fff', letterSpacing: 0.4 },

  // ── Filters ───────────────────────────────────────────────────────────────
  scroll:          { flex: 1 },
  filtersScroll:   { marginTop: 14 },
  filtersContent:  { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
  },
  chipActive:     { backgroundColor: C.primary, borderColor: C.primary },
  chipText:       { fontSize: 13, fontFamily: Font.semiBold, color: C.textMuted },
  chipTextActive: { color: C.onPrimary },

  // ── Custom date range ─────────────────────────────────────────────────────
  customRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12, gap: 8,
  },
  datePickerBtn: {
    flex: 1, backgroundColor: C.card, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: C.border,
  },
  datePickerLabel: { fontSize: 10, color: C.textMuted, fontFamily: Font.medium, marginBottom: 4 },
  datePickerVal:   { fontSize: 13, color: C.text, fontFamily: Font.semiBold },
  dateArrow:       { fontSize: 16, color: C.textMuted },

  // ── Range label ───────────────────────────────────────────────────────────
  rangeRow:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 10, marginBottom: 14 },
  rangeIcon: { fontSize: 13, marginRight: 6 },
  rangeText: { fontSize: 12, color: C.textMuted, fontFamily: Font.medium, flex: 1 },

  // ── Combined summary + chart ──────────────────────────────────────────────
  chartCard: {
    backgroundColor: C.card, marginHorizontal: 16, borderRadius: 16,
    padding: 20, marginBottom: 14,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  chartTitle:  { fontSize: 14, fontFamily: Font.bold, color: C.text },
  chartSub:    { fontSize: 11, color: C.textMuted, fontFamily: Font.regular },
  chartBars:   { flexDirection: 'row', alignItems: 'flex-end' },
  barGroup:    { flex: 1, alignItems: 'center' },
  barAmount:   { fontSize: 13, fontFamily: Font.extraBold, textAlign: 'center', marginBottom: 4 },
  barLabel:    { fontSize: 10, color: C.textMuted, fontFamily: Font.medium, marginBottom: 10 },
  barTrack: {
    width: 40, height: 90, backgroundColor: C.cardAlt,
    borderRadius: 10, overflow: 'hidden', justifyContent: 'flex-end',
  },
  barFill:    { width: '100%', borderRadius: 10, minHeight: 4 },
  barTag: {
    marginTop: 8, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  barTagText: { fontSize: 11, fontFamily: Font.bold },
  barSep:     { width: 1, height: 90, backgroundColor: C.border, marginHorizontal: 4, alignSelf: 'flex-end' },

  // ── Entries preview ───────────────────────────────────────────────────────
  section: {
    backgroundColor: C.card, marginHorizontal: 16, borderRadius: 16,
    padding: 16, marginBottom: 14,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: 14, fontFamily: Font.bold, color: C.text, marginBottom: 12 },
  emptyText: {
    fontSize: 13, color: C.textMuted, fontFamily: Font.regular,
    textAlign: 'center', paddingVertical: 20,
  },
  entryRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  entryDot: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  entryInfo:   { flex: 1, marginRight: 8 },
  entryRemark: { fontSize: 13, fontFamily: Font.semiBold, color: C.text },
  entryMeta:   { fontSize: 10, color: C.textMuted, fontFamily: Font.regular, marginTop: 2 },
  entryAmt:    { fontSize: 14, fontFamily: Font.extraBold },
  moreText:    { fontSize: 11, color: C.textMuted, fontFamily: Font.regular, textAlign: 'center', marginTop: 10 },

  // ── Export ────────────────────────────────────────────────────────────────
  exportSection: { marginHorizontal: 16 },
  exportTitle:   { fontSize: 16, fontFamily: Font.bold, color: C.text, marginBottom: 4 },
  exportSub:     { fontSize: 12, color: C.textMuted, fontFamily: Font.regular, marginBottom: 16 },

  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.card, borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1.5,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  exportBtnDisabled: { opacity: 0.6 },
  exportIconWrap: {
    width: 46, height: 46, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  exportEmoji:   { fontSize: 24 },
  exportBtnBody: { flex: 1 },
  exportBtnTitle: { fontSize: 14, fontFamily: Font.bold, marginBottom: 2 },
  exportBtnSub:   { fontSize: 11, color: C.textMuted, fontFamily: Font.regular },
  exportChevron:  { fontSize: 24, lineHeight: 26 },

  shareHint: {
    borderRadius: 12, padding: 12, marginTop: 6,
    borderWidth: 1,
  },
  shareHintText: { fontSize: 11, fontFamily: Font.regular, lineHeight: 17 },
});
