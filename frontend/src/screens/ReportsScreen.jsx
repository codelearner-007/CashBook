import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/colors';
import { apiGetSummary, apiGetEntries } from '../lib/api';

const FILTERS = ['This Month', 'Last Month', 'Last 3 Months', 'Custom'];

export default function ReportsScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams();
  const [summary, setSummary] = useState({ net_balance: 0, total_in: 0, total_out: 0 });
  const [activeFilter, setActiveFilter] = useState('This Month');
  const [topEntries, setTopEntries] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [s, entries] = await Promise.all([apiGetSummary(id), apiGetEntries(id)]);
    setSummary(s);
    setTopEntries(entries.slice(0, 5));
  };

  const handleExportPDF = () => {
    // TODO: call api /books/{id}/report/pdf and download
    alert('PDF export will be available when backend is connected.');
  };

  const handleExportExcel = () => {
    // TODO: call api /books/{id}/report/excel and download
    alert('Excel export will be available when backend is connected.');
  };

  const netColor = summary.net_balance >= 0 ? Colors.cashIn : Colors.cashOut;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.card} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={styles.exportBtns}>
          <TouchableOpacity style={styles.exportBtnPDF} onPress={handleExportPDF}>
            <Text style={styles.exportBtnText}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtnExcel} onPress={handleExportExcel}>
            <Text style={styles.exportBtnText}>XLS</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Date Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContent}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Date Range */}
        <Text style={styles.dateRange}>12 Sept – 12 October 2026</Text>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderTopColor: Colors.cashIn }]}>
            <Text style={styles.summaryCardLabel}>Income</Text>
            <Text style={[styles.summaryCardAmount, { color: Colors.cashIn }]}>
              {summary.total_in.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.summaryCard, { borderTopColor: Colors.cashOut }]}>
            <Text style={styles.summaryCardLabel}>Expenses</Text>
            <Text style={[styles.summaryCardAmount, { color: Colors.cashOut }]}>
              {summary.total_out.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.summaryCard, { borderTopColor: Colors.primary }]}>
            <Text style={styles.summaryCardLabel}>Net Balance</Text>
            <Text style={[styles.summaryCardAmount, { color: netColor }]}>
              {summary.net_balance.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Visual Bar Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Income vs Expense</Text>
          <View style={styles.chartBars}>
            <View style={styles.chartBarGroup}>
              <View style={[styles.bar, {
                height: Math.min(120, (summary.total_in / (summary.total_in + summary.total_out + 1)) * 120),
                backgroundColor: Colors.cashIn
              }]} />
              <Text style={styles.barLabel}>In</Text>
            </View>
            <View style={styles.chartBarGroup}>
              <View style={[styles.bar, {
                height: Math.min(120, (summary.total_out / (summary.total_in + summary.total_out + 1)) * 120),
                backgroundColor: Colors.cashOut
              }]} />
              <Text style={styles.barLabel}>Out</Text>
            </View>
          </View>
        </View>

        {/* Recent Entries Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Entries</Text>
          {topEntries.map((e) => (
            <View key={e.id} style={styles.entryRow}>
              <View>
                <Text style={styles.entryRemark}>{e.remark || 'No remark'}</Text>
                <Text style={styles.entryDate}>{e.entry_date}</Text>
              </View>
              <Text style={[styles.entryAmount, { color: e.type === 'in' ? Colors.cashIn : Colors.cashOut }]}>
                {e.type === 'in' ? '+' : '-'}{e.amount.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        {/* Export Buttons */}
        <View style={styles.exportSection}>
          <Text style={styles.exportSectionTitle}>Export Report</Text>
          <TouchableOpacity style={styles.exportFullBtn} onPress={handleExportPDF}>
            <Text style={styles.exportFullIcon}>📄</Text>
            <View>
              <Text style={styles.exportFullTitle}>Download PDF</Text>
              <Text style={styles.exportFullSub}>Formatted report ready to share</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.exportFullBtn, { borderColor: Colors.cashIn }]} onPress={handleExportExcel}>
            <Text style={styles.exportFullIcon}>📊</Text>
            <View>
              <Text style={[styles.exportFullTitle, { color: Colors.cashIn }]}>Download Excel</Text>
              <Text style={styles.exportFullSub}>Spreadsheet for detailed analysis</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    paddingHorizontal: 12, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4, marginRight: 4 },
  backIcon: { fontSize: 28, color: Colors.text, fontWeight: '300' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: Colors.text },
  exportBtns: { flexDirection: 'row', gap: 8 },
  exportBtnPDF: { backgroundColor: '#FFEBEE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  exportBtnExcel: { backgroundColor: Colors.cashInLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  exportBtnText: { fontSize: 12, fontWeight: '700', color: Colors.text },

  scroll: { flex: 1 },
  filtersScroll: { marginTop: 12 },
  filtersContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  filterTextActive: { color: '#fff' },

  dateRange: { fontSize: 12, color: Colors.textMuted, marginHorizontal: 16, marginTop: 10, marginBottom: 14 },

  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 14 },
  summaryCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 12,
    padding: 12, borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  summaryCardLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 4 },
  summaryCardAmount: { fontSize: 14, fontWeight: '800' },

  chartCard: {
    backgroundColor: Colors.card, marginHorizontal: 16, borderRadius: 16,
    padding: 20, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  chartTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 20 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 24, height: 130 },
  chartBarGroup: { alignItems: 'center', flex: 1 },
  bar: { width: '60%', borderRadius: 6, minHeight: 4 },
  barLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 6, fontWeight: '600' },

  section: { backgroundColor: Colors.card, marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: 14 },
  entryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  entryRemark: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  entryDate: { fontSize: 11, color: Colors.textMuted },
  entryAmount: { fontSize: 14, fontWeight: '800' },

  exportSection: { marginHorizontal: 16 },
  exportSectionTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  exportFullBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.card, borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1.5, borderColor: Colors.primary,
  },
  exportFullIcon: { fontSize: 28 },
  exportFullTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 2 },
  exportFullSub: { fontSize: 12, color: Colors.textMuted },
});
