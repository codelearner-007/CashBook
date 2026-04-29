import React, { useMemo, useState, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  FlatList, ActivityIndicator,
} from 'react-native';
import SafeAreaView from '../components/ui/AppSafeAreaView';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useContactEntries, useContact } from '../hooks/useContacts';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt12h = (time) => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
};

function groupByDate(entries) {
  const map = new Map();
  for (const e of entries) {
    const key = e.entry_date;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }));
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ── Payment badge colors ──────────────────────────────────────────────────────

const PAYMENT_META = {
  cash:   { bg: null,       text: null },
  online: { bg: '#E8F5E9', text: '#1B5E20' },
  cheque: { bg: '#FFF8E1', text: '#F57F17' },
  other:  { bg: '#F3E5F5', text: '#7B1FA2' },
};

const PAYMENT_META_DARK = {
  cash:   { bg: null,       text: null },
  online: { bg: '#052E16', text: '#4ADE80' },
  cheque: { bg: '#2D1F00', text: '#FCD34D' },
  other:  { bg: '#2D0A45', text: '#C084FC' },
};

// ── EntryCard ─────────────────────────────────────────────────────────────────

const EntryCard = memo(({ item, C, Font, s, isDark }) => {
  const meta = isDark
    ? PAYMENT_META_DARK[item.payment_mode] ?? PAYMENT_META_DARK.cash
    : PAYMENT_META[item.payment_mode] ?? PAYMENT_META.cash;
  const badgeBg   = meta.bg   ?? (isDark ? C.primaryLight : C.primaryLight);
  const badgeText = meta.text ?? C.primary;

  return (
    <View style={s.entryCard}>
      <View style={[s.entryBadge, { backgroundColor: badgeBg }]}>
        <Text style={[s.entryBadgeText, { color: badgeText }]} numberOfLines={1}>
          {item.payment_mode
            ? item.payment_mode.charAt(0).toUpperCase() + item.payment_mode.slice(1)
            : 'Cash'}
        </Text>
      </View>
      <View style={s.entryMid}>
        <Text style={s.entryRemark} numberOfLines={1}>
          {item.remark || 'No remark'}
        </Text>
        {item.category ? (
          <Text style={s.entryCategory} numberOfLines={1}>{item.category}</Text>
        ) : null}
        <Text style={s.entryMeta}>Entry by You  ·  {fmt12h(item.entry_time)}</Text>
      </View>
      <Text
        style={[s.entryAmount, { color: item.type === 'in' ? C.cashIn : C.danger }]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {item.amount?.toLocaleString()}
      </Text>
    </View>
  );
});

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color, C, Font }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: 11, fontFamily: Font.regular, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</Text>
      <Text style={{ fontSize: 18, fontFamily: Font.bold, color }}>{value}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  customer: { label: 'Customer' },
  supplier: { label: 'Supplier' },
};

export default function ContactBalanceScreen() {
  const router = useRouter();
  const { id: bookId, contactId, contactName, contactType } = useLocalSearchParams();
  const { C, Font, isDark } = useTheme();
  const s = useMemo(() => makeStyles(C, Font), [C, Font]);

  const cfg = TYPE_CONFIG[contactType] || TYPE_CONFIG.customer;

  const [collapsed, setCollapsed] = useState({});

  const toggleDate = useCallback((date) => {
    setCollapsed(prev => ({ ...prev, [date]: !prev[date] }));
  }, []);

  const { data: entries = [], isLoading } = useContactEntries(bookId, contactId, contactType);
  const { data: contact } = useContact(bookId, contactId, contactType);

  const totalIn  = contact?.total_in  ?? entries.reduce((sum, e) => sum + (e.type === 'in'  ? e.amount : 0), 0);
  const totalOut = contact?.total_out ?? entries.reduce((sum, e) => sum + (e.type === 'out' ? e.amount : 0), 0);
  const balance  = totalIn - totalOut;

  const grouped = useMemo(() => groupByDate(entries), [entries]);

  const renderItem = useCallback(({ item: group }) => {
    const isCollapsed = !!collapsed[group.date];
    return (
      <View>
        <TouchableOpacity
          style={s.dateLabelRow}
          onPress={() => toggleDate(group.date)}
          activeOpacity={0.7}
        >
          <Text style={s.dateLabel}>{formatDate(group.date)}</Text>
          <View style={{ transform: [{ rotate: isCollapsed ? '0deg' : '180deg' }] }}>
            <Feather name="chevron-down" size={14} color={C.textMuted} />
          </View>
        </TouchableOpacity>
        {!isCollapsed && group.items.map((entry) => (
          <EntryCard
            key={entry.id}
            item={entry}
            C={C}
            Font={Font}
            s={s}
            isDark={isDark}
          />
        ))}
      </View>
    );
  }, [s, C, Font, isDark, collapsed, toggleDate]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: C.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { fontFamily: Font.bold }]} numberOfLines={1}>{contactName}</Text>
          <Text style={[s.headerSub, { fontFamily: Font.regular }]}>Balance Details · {cfg.label}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary */}
      <View style={[s.summaryBar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <SummaryCard label="Total In"  value={totalIn.toFixed(2)}  color={C.cashIn} C={C} Font={Font} />
        <View style={[s.summaryDivider, { backgroundColor: C.border }]} />
        <SummaryCard label="Total Out" value={totalOut.toFixed(2)} color={C.danger} C={C} Font={Font} />
        <View style={[s.summaryDivider, { backgroundColor: C.border }]} />
        <SummaryCard
          label="Net"
          value={(balance >= 0 ? '+' : '') + balance.toFixed(2)}
          color={balance >= 0 ? C.cashIn : C.danger}
          C={C} Font={Font}
        />
      </View>

      {/* Entry count row */}
      {!isLoading && entries.length > 0 && (
        <View style={s.entryCountRow}>
          <Feather name="list" size={12} color={C.textMuted} />
          <Text style={s.entryCountText}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}  ·  total
          </Text>
        </View>
      )}

      {/* Entry list */}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.primary} />
      ) : entries.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIconBox}>
            <Feather name="inbox" size={36} color={C.primary} />
          </View>
          <Text style={[s.emptyTitle, { color: C.text, fontFamily: Font.bold }]}>No entries yet</Text>
          <Text style={[s.emptySub, { color: C.textMuted, fontFamily: Font.regular }]}>
            Entries linked to this {cfg.label.toLowerCase()} will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={item => item.date}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <View style={s.onlyYou}>
              <Feather name="lock" size={13} color={C.textSubtle} />
              <Text style={s.onlyYouText}>Only you can see these entries</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (C, Font) => StyleSheet.create({
  safe: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14 },
  backBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 17, color: '#fff', lineHeight: 24 },
  headerSub:    { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },

  summaryBar:     { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, borderBottomWidth: 1 },
  summaryDivider: { width: 1, height: 40 },

  // Entry count
  entryCountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 2,
  },
  entryCountText: {
    fontSize: 12, fontFamily: Font.medium, color: C.textMuted, lineHeight: 18, flex: 1,
  },

  // List
  listContent: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 40 },
  dateLabelRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 2, marginBottom: 4, paddingVertical: 2,
  },
  dateLabel: {
    fontSize: 10, fontFamily: Font.semiBold, color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, lineHeight: 16,
  },

  // Entry Card
  entryCard: {
    backgroundColor: C.card, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 9,
    marginBottom: 6, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  entryBadge: {
    borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4,
    marginRight: 10, minWidth: 50, alignItems: 'center', justifyContent: 'center',
  },
  entryBadgeText: { fontSize: 10, fontFamily: Font.bold, lineHeight: 15 },
  entryMid:       { flex: 1, marginRight: 6 },
  entryRemark: {
    fontSize: 13, fontFamily: Font.semiBold, color: C.text,
    lineHeight: 19, marginBottom: 1,
  },
  entryCategory: {
    fontSize: 10, fontFamily: Font.regular, color: C.textMuted,
    lineHeight: 15, marginBottom: 1,
  },
  entryMeta:   { fontSize: 10, fontFamily: Font.regular, color: C.textMuted, lineHeight: 15 },
  entryAmount: { fontSize: 13, fontFamily: Font.medium, lineHeight: 19, minWidth: 66, textAlign: 'right' },

  // Footer
  onlyYou: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 6, gap: 6, paddingBottom: 8,
  },
  onlyYouText: {
    fontSize: 11, fontFamily: Font.regular, color: C.textSubtle, lineHeight: 16,
  },

  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 60 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, lineHeight: 24 },
  emptySub:   { fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 240 },
});
