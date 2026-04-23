import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';
import { apiGetEntries, apiGetSummary, apiDeleteEntry } from '../lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Icon Components (SVG-style via Views) ────────────────────────────────────

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

const FileTextIcon = ({ color, size = 18 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.7, height: size * 0.86, borderRadius: 2,
      borderWidth: 1.5, borderColor: color,
      justifyContent: 'center', alignItems: 'center', gap: 3,
    }}>
      {[0, 1, 2].map(i => (
        <View key={i} style={{
          width: i === 2 ? size * 0.28 : size * 0.4,
          height: 1.5, backgroundColor: color, borderRadius: 1,
          alignSelf: i === 2 ? 'flex-start' : 'center',
          marginLeft: i === 2 ? size * 0.1 : 0,
        }} />
      ))}
    </View>
  </View>
);

const DotsIcon = ({ color, size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
    {[0, 1, 2].map(i => (
      <View key={i} style={{ width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: color }} />
    ))}
  </View>
);

const SearchIcon = ({ color, size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.65, height: size * 0.65, borderRadius: size * 0.325,
      borderWidth: 1.8, borderColor: color,
    }} />
    <View style={{
      position: 'absolute', bottom: 0, right: 0,
      width: 2, height: size * 0.38, backgroundColor: color,
      borderRadius: 1, transform: [{ rotate: '-45deg' }, { translateY: -size * 0.04 }],
    }} />
  </View>
);

const LockIcon = ({ color, size = 14 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.64, height: size * 0.5, borderRadius: 2,
      borderWidth: 1.5, borderColor: color,
      position: 'absolute', bottom: 0,
    }} />
    <View style={{
      width: size * 0.36, height: size * 0.28, borderTopLeftRadius: size * 0.2,
      borderTopRightRadius: size * 0.2,
      borderWidth: 1.5, borderColor: color, borderBottomWidth: 0,
      position: 'absolute', top: 0,
    }} />
  </View>
);

const InboxIcon = ({ color, size = 40 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.82, height: size * 0.72, borderRadius: 6,
      borderWidth: 2, borderColor: color,
      justifyContent: 'flex-end', alignItems: 'center',
    }}>
      <View style={{
        width: '100%', height: size * 0.28,
        borderTopWidth: 2, borderTopColor: color,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
      }}>
        <View style={{ width: size * 0.2, height: size * 0.12, borderRadius: size * 0.06, borderWidth: 1.5, borderColor: color }} />
      </View>
    </View>
  </View>
);

const PlusIcon = ({ color, size = 14 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ position: 'absolute', width: size, height: 2, backgroundColor: color, borderRadius: 1 }} />
    <View style={{ position: 'absolute', width: 2, height: size, backgroundColor: color, borderRadius: 1 }} />
  </View>
);

const ChevronDownIcon = ({ color, size = 14 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.55, height: size * 0.55,
      borderRightWidth: 2, borderBottomWidth: 2,
      borderColor: color, borderRadius: 1,
      transform: [{ rotate: '45deg' }, { translateY: -size * 0.1 }],
    }} />
  </View>
);

const MinusIcon = ({ color, size = 14 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size, height: 2, backgroundColor: color, borderRadius: 1 }} />
  </View>
);

// ── Payment mode badge colors (index by mode) ─────────────────────────────────

const PAYMENT_META = {
  cash:   { bg: null, text: null },   // uses primary tint — resolved in component
  online: { bg: '#E8F5E9', text: '#1B5E20' },
  cheque: { bg: '#FFF8E1', text: '#F57F17' },
  other:  { bg: '#F3E5F5', text: '#7B1FA2' },
};

const PAYMENT_META_DARK = {
  cash:   { bg: null, text: null },
  online: { bg: '#052E16', text: '#4ADE80' },
  cheque: { bg: '#2D1F00', text: '#FCD34D' },
  other:  { bg: '#2D0A45', text: '#C084FC' },
};

// ── EntryCard ─────────────────────────────────────────────────────────────────

const EntryCard = memo(({ item, onPress, onLongPress, C, Font, s, isDark }) => {
  const meta = isDark ? PAYMENT_META_DARK[item.payment_mode] : PAYMENT_META[item.payment_mode];
  const badgeBg   = meta.bg   ?? (isDark ? C.primaryLight : C.primaryLight);
  const badgeText = meta.text ?? C.primary;

  return (
    <TouchableOpacity
      style={s.entryCard}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      <View style={[s.entryBadge, { backgroundColor: badgeBg }]}>
        <Text style={[s.entryBadgeText, { color: badgeText }]} numberOfLines={1}>
          {item.payment_mode.charAt(0).toUpperCase() + item.payment_mode.slice(1)}
        </Text>
      </View>
      <View style={s.entryMid}>
        <Text style={s.entryRemark} numberOfLines={1}>
          {item.remark || 'No remark'}
        </Text>
        {item.category ? (
          <Text style={s.entryCategory} numberOfLines={1}>{item.category}</Text>
        ) : null}
        <Text style={s.entryMeta}>Entry by You  ·  {item.entry_time}</Text>
      </View>
      <Text
        style={[s.entryAmount, { color: item.type === 'in' ? C.cashIn : C.cashOut }]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {item.type === 'in' ? '+' : '-'}{item.amount.toLocaleString()}
      </Text>
    </TouchableOpacity>
  );
});

// ── BalanceCard ───────────────────────────────────────────────────────────────

const BalanceCard = memo(({ summary, onViewReports, C, Font, s }) => {
  const netColor = summary.net_balance >= 0 ? C.cashIn : C.cashOut;
  return (
    <View style={s.balanceCard}>
      <View style={s.balanceRow}>
        <Text style={s.netLabel}>Net Balance</Text>
        <Text style={[s.netAmount, { color: netColor }]}>
          {summary.net_balance.toLocaleString()}
        </Text>
      </View>
      <View style={s.balanceDivider} />
      <View style={s.balanceSubRow}>
        <View style={s.balanceSub}>
          <Text style={s.subLabel}>Total In (+)</Text>
          <Text style={[s.subAmount, { color: C.cashIn }]}>
            {summary.total_in.toLocaleString()}
          </Text>
        </View>
        <View style={s.balanceSubDivider} />
        <View style={s.balanceSub}>
          <Text style={s.subLabel}>Total Out (-)</Text>
          <Text style={[s.subAmount, { color: C.cashOut }]}>
            {summary.total_out.toLocaleString()}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={s.viewReportsBtn} onPress={onViewReports} activeOpacity={0.7}>
        <Text style={s.viewReportsText}>VIEW REPORTS  ›</Text>
      </TouchableOpacity>
    </View>
  );
});

// ── Skeleton Loader ───────────────────────────────────────────────────────────

const SkeletonLine = memo(({ width, height = 14, C }) => (
  <View style={{ width, height, borderRadius: 6, backgroundColor: C.border, marginBottom: 4 }} />
));

const LoadingSkeleton = ({ C, s }) => (
  <View style={s.listContent}>
    {[1, 2, 3].map(g => (
      <View key={g}>
        <SkeletonLine width={100} height={11} C={C} />
        {[1, 2].map(i => (
          <View key={i} style={[s.entryCard, { marginBottom: 8 }]}>
            <View style={[s.entryBadge, { backgroundColor: C.border }]} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonLine width="70%" C={C} />
              <SkeletonLine width="40%" height={11} C={C} />
            </View>
            <SkeletonLine width={60} C={C} />
          </View>
        ))}
      </View>
    ))}
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function BookDetailScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams();
  const { C, Font, isDark } = useTheme();
  const s = useMemo(() => makeStyles(C, Font), [C, Font]);
  const qc = useQueryClient();

  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState('all');
  const [collapsed, setCollapsed]   = useState({});

  const toggleDate = useCallback((date) => {
    setCollapsed(prev => ({ ...prev, [date]: !prev[date] }));
  }, []);

  const {
    data: entries = [],
    isLoading: entriesLoading,
    isError: entriesError,
    refetch,
  } = useQuery({
    queryKey: ['entries', id],
    queryFn:  () => apiGetEntries(id),
    staleTime: 1000 * 60 * 2,
    enabled: !!id,
  });

  const {
    data: summary = { net_balance: 0, total_in: 0, total_out: 0 },
    isLoading: summaryLoading,
  } = useQuery({
    queryKey: ['summary', id],
    queryFn:  () => apiGetSummary(id),
    staleTime: 1000 * 60 * 2,
    enabled: !!id,
  });

  const deleteEntry = useMutation({
    mutationFn: (entryId) => apiDeleteEntry(id, entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries', id] });
      qc.invalidateQueries({ queryKey: ['summary', id] });
      qc.invalidateQueries({ queryKey: ['books'] });
    },
  });

  const isLoading = entriesLoading || summaryLoading;

  const filtered = useMemo(() => entries.filter((e) => {
    const matchType   = filterType === 'all' || e.type === filterType;
    const matchSearch = !search ||
      e.remark?.toLowerCase().includes(search.toLowerCase()) ||
      e.amount.toString().includes(search);
    return matchType && matchSearch;
  }), [entries, filterType, search]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const handleDelete = useCallback((entryId) => {
    Alert.alert('Delete Entry', 'Delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => deleteEntry.mutate(entryId),
      },
    ]);
  }, [deleteEntry]);

  const goToReports = useCallback(() => {
    router.push({ pathname: '/(app)/books/[id]/reports', params: { id } });
  }, [router, id]);

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
            <ChevronDownIcon color={C.textMuted} size={14} />
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
            onPress={() => router.push({
              pathname: '/(app)/books/[id]/entry-detail',
              params: { id, eid: entry.id },
            })}
            onLongPress={() => handleDelete(entry.id)}
          />
        ))}
      </View>
    );
  }, [s, C, Font, isDark, id, router, handleDelete, collapsed, toggleDate]);

  const ListEmpty = useMemo(() => (
    <View style={s.empty}>
      <View style={s.emptyIconBox}>
        <InboxIcon color={C.primary} size={36} />
      </View>
      <Text style={s.emptyTitle}>No entries yet</Text>
      <Text style={s.emptySub}>Add your first Cash In or Cash Out entry</Text>
    </View>
  ), [s, C]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={C.card}
      />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeftIcon color={C.text} size={22} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{name || 'Business Book'}</Text>
          <Text style={s.headerSub}>Add Member, Book Activity etc</Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity
            style={s.headerIconBtn}
            onPress={goToReports}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FileTextIcon color={C.textMuted} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.headerIconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <DotsIcon color={C.textMuted} size={18} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <SearchIcon color={C.textMuted} size={16} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by remark or amount"
          placeholderTextColor={C.textSubtle}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filters */}
      <View style={s.filterRow}>
        {['all', 'in', 'out'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, filterType === f && s.filterChipActive]}
            onPress={() => setFilterType(f)}
          >
            <Text style={[s.filterChipText, filterType === f && s.filterChipTextActive]}>
              {f === 'all' ? 'All' : f === 'in' ? 'Cash In' : 'Cash Out'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <>
          {/* Skeleton balance card */}
          <View style={[s.balanceCard, { gap: 10 }]}>
            <SkeletonLine width="50%" height={16} C={C} />
            <SkeletonLine width="100%" height={1} C={C} />
            <SkeletonLine width="70%" C={C} />
          </View>
          <LoadingSkeleton C={C} s={s} />
        </>
      ) : entriesError ? (
        <View style={s.errorBox}>
          <Text style={s.errorTitle}>Failed to load entries</Text>
          <TouchableOpacity style={s.retryBtn} onPress={refetch}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Balance Card */}
          <BalanceCard
            summary={summary}
            onViewReports={goToReports}
            C={C}
            Font={Font}
            s={s}
          />

          {/* Entry List */}
          <FlatList
            data={grouped}
            keyExtractor={(item) => item.date}
            renderItem={renderItem}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={ListEmpty}
          />
        </>
      )}

      {/* Only you */}
      <View style={s.onlyYou}>
        <LockIcon color={C.textSubtle} size={13} />
        <Text style={s.onlyYouText}>Only you can see these entries</Text>
      </View>

      {/* Action Buttons */}
      <View style={s.actionRow}>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: C.cashIn }]}
          onPress={() => router.push({
            pathname: '/(app)/books/[id]/add-entry',
            params: { id, type: 'in' },
          })}
          activeOpacity={0.85}
        >
          <PlusIcon color="#fff" size={13} />
          <Text style={s.actionBtnText}>CASH IN</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: C.cashOut }]}
          onPress={() => router.push({
            pathname: '/(app)/books/[id]/add-entry',
            params: { id, type: 'out' },
          })}
          activeOpacity={0.85}
        >
          <MinusIcon color="#fff" size={13} />
          <Text style={s.actionBtnText}>CASH OUT</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (C, Font) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
    minHeight: 56,
  },
  backBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    marginRight: 2,
  },
  headerCenter: { flex: 1, marginRight: 8 },
  headerTitle: {
    fontSize: 16, fontFamily: Font.bold, color: C.text,
    lineHeight: 22,
  },
  headerSub: {
    fontSize: 11, fontFamily: Font.regular, color: C.textMuted,
    lineHeight: 16, marginTop: 1,
  },
  headerRight:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  // Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card,
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: C.border, gap: 10,
    minHeight: 48,
  },
  searchInput: {
    flex: 1, fontSize: 14, fontFamily: Font.regular,
    color: C.text, lineHeight: 20,
  },

  // Filters
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16,
    marginTop: 10, gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    minHeight: 36,
  },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterChipText: {
    fontSize: 12, fontFamily: Font.semiBold, color: C.textMuted, lineHeight: 18,
  },
  filterChipTextActive: { color: '#fff' },

  // Balance Card
  balanceCard: {
    backgroundColor: C.card, marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  balanceRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  netLabel: {
    fontSize: 14, fontFamily: Font.semiBold, color: C.text, lineHeight: 20,
  },
  netAmount: { fontSize: 24, fontFamily: Font.extraBold, lineHeight: 30 },
  balanceDivider: { height: 1, backgroundColor: C.border, marginBottom: 12 },
  balanceSubRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  balanceSub: { flex: 1, alignItems: 'center' },
  subLabel: {
    fontSize: 11, fontFamily: Font.regular, color: C.textMuted,
    lineHeight: 16, marginBottom: 3,
  },
  subAmount: { fontSize: 15, fontFamily: Font.bold, lineHeight: 22 },
  balanceSubDivider: {
    width: 1, height: 36, backgroundColor: C.border, marginHorizontal: 20,
  },
  viewReportsBtn: { alignItems: 'center', paddingVertical: 4, minHeight: 32, justifyContent: 'center' },
  viewReportsText: {
    color: C.primary, fontFamily: Font.bold, fontSize: 13,
    letterSpacing: 0.3, lineHeight: 20,
  },

  // List
  listContent: { padding: 16, paddingBottom: 100 },
  dateLabelRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 4, marginBottom: 6, paddingVertical: 2,
  },
  dateLabel: {
    fontSize: 11, fontFamily: Font.semiBold, color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, lineHeight: 18,
  },

  // Entry Card
  entryCard: {
    backgroundColor: C.card, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 8, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
    minHeight: 68,
  },
  entryBadge: {
    borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5,
    marginRight: 12, minWidth: 54, alignItems: 'center',
    minHeight: 28, justifyContent: 'center',
  },
  entryBadgeText: { fontSize: 11, fontFamily: Font.bold, lineHeight: 16 },
  entryMid: { flex: 1, marginRight: 8 },
  entryRemark: {
    fontSize: 14, fontFamily: Font.semiBold, color: C.text,
    lineHeight: 20, marginBottom: 2,
  },
  entryCategory: {
    fontSize: 11, fontFamily: Font.regular, color: C.textMuted,
    lineHeight: 16, marginBottom: 2,
  },
  entryMeta: { fontSize: 11, fontFamily: Font.regular, color: C.textMuted, lineHeight: 16 },
  entryAmount: { fontSize: 15, fontFamily: Font.medium, lineHeight: 22, minWidth: 72, textAlign: 'right' },

  // Only You
  onlyYou: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 6, gap: 6, paddingBottom: 8,
  },
  onlyYouText: {
    fontSize: 11, fontFamily: Font.regular, color: C.textSubtle, lineHeight: 16,
  },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 16, fontFamily: Font.bold, color: C.text,
    lineHeight: 24, marginBottom: 8,
  },
  emptySub: {
    fontSize: 13, fontFamily: Font.regular, color: C.textMuted,
    lineHeight: 20, textAlign: 'center',
  },

  // Error
  errorBox: { alignItems: 'center', paddingTop: 60, gap: 16 },
  errorTitle: { fontSize: 15, fontFamily: Font.medium, color: C.textMuted },
  retryBtn: {
    backgroundColor: C.primary, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12, minHeight: 44, justifyContent: 'center',
  },
  retryText: { color: '#fff', fontFamily: Font.semiBold, fontSize: 14 },

  // Action Buttons
  actionRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12,
    gap: 12, backgroundColor: C.card,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  actionBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, minHeight: 52,
  },
  actionBtnText: {
    color: '#fff', fontFamily: Font.extraBold,
    fontSize: 13, letterSpacing: 0.8, lineHeight: 18,
  },
});
