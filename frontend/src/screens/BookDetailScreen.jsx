import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, TextInput, Alert, ActivityIndicator,
  Modal, Pressable, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { apiGetEntries, apiGetSummary, apiDeleteEntry } from '../lib/api';
import { PAYMENT_MODES, CATEGORIES } from '../constants/categories';

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

function matchesDatePeriod(entryDate, period) {
  const d     = new Date(entryDate + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (period === 'today')     return d.toDateString() === today.toDateString();
  if (period === 'yesterday') { const y = new Date(today); y.setDate(today.getDate() - 1); return d.toDateString() === y.toDateString(); }
  if (period === 'week')      { const w = new Date(today); w.setDate(today.getDate() - 6); return d >= w; }
  if (period === 'month')     return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  return true;
}

const DATE_LABELS = { today: 'Today', yesterday: 'Yesterday', week: 'This Week', month: 'This Month' };
const PAYMENT_LABEL = { cash: 'Cash', online: 'Online', cheque: 'Cheque', other: 'Other' };

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ── Icons (Feather via @expo/vector-icons) ────────────────────────────────────

const ChevronLeftIcon = ({ color, size = 20 }) => <Feather name="chevron-left" size={size} color={color} />;
const FileTextIcon    = ({ color, size = 18 }) => <Feather name="file-text"    size={size} color={color} />;
const DotsIcon        = ({ color, size = 18 }) => <Feather name="more-vertical" size={size} color={color} />;
const SearchIcon      = ({ color, size = 16 }) => <Feather name="search"       size={size} color={color} />;
const LockIcon        = ({ color, size = 14 }) => <Feather name="lock"         size={size} color={color} />;
const InboxIcon       = ({ color, size = 40 }) => <Feather name="inbox"        size={size} color={color} />;
const PlusIcon        = ({ color, size = 14 }) => <Feather name="plus"         size={size} color={color} />;
const MinusIcon       = ({ color, size = 14 }) => <Feather name="minus"        size={size} color={color} />;
const ChevronDownIcon = ({ color, size = 14 }) => <Feather name="chevron-down" size={size} color={color} />;
const UserPlusIcon    = ({ color, size = 20 }) => <Feather name="user-plus"    size={size} color={color} />;

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

  const [search, setSearch]               = useState('');
  const [filterDate, setFilterDate]       = useState(null);
  const [filterType, setFilterType]       = useState(null);
  const [filterContact, setFilterContact] = useState(null);
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterPayment, setFilterPayment] = useState(null);
  const [activePicker, setActivePicker]   = useState(null);
  const [collapsed, setCollapsed]         = useState({});
  const [menuVisible, setMenuVisible]     = useState(false);

  const clearFilter = useCallback((key) => {
    if (key === 'date')     setFilterDate(null);
    if (key === 'type')     setFilterType(null);
    if (key === 'contact')  setFilterContact(null);
    if (key === 'category') setFilterCategory(null);
    if (key === 'payment')  setFilterPayment(null);
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilterDate(null); setFilterType(null); setFilterContact(null);
    setFilterCategory(null); setFilterPayment(null);
  }, []);

  const applyFilter = useCallback((key, val) => {
    clearFilter(key);
    if (key === 'date')     setFilterDate(val);
    if (key === 'type')     setFilterType(val);
    if (key === 'contact')  setFilterContact(val);
    if (key === 'category') setFilterCategory(val);
    if (key === 'payment')  setFilterPayment(val);
    setActivePicker(null);
  }, [clearFilter]);

  const activeFilterCount = [filterDate, filterType, filterContact, filterCategory, filterPayment]
    .filter(Boolean).length;

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
    if (filterType    && e.type         !== filterType)    return false;
    if (filterPayment && e.payment_mode !== filterPayment) return false;
    if (filterCategory && e.category    !== filterCategory) return false;
    if (filterContact  && e.contact_name !== filterContact) return false;
    if (filterDate && !matchesDatePeriod(e.entry_date, filterDate)) return false;
    if (search) {
      const q = search.toLowerCase();
      const hit = e.remark?.toLowerCase().includes(q) ||
        e.amount.toString().includes(q) ||
        e.contact_name?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  }), [entries, filterType, filterPayment, filterCategory, filterContact, filterDate, search]);

  const bookContacts = useMemo(() =>
    [...new Set(entries.map(e => e.contact_name).filter(Boolean))],
  [entries]);

  const bookCategories = useMemo(() =>
    [...new Set(entries.map(e => e.category).filter(Boolean))],
  [entries]);

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

  const goToBookSettings = useCallback(() => {
    setMenuVisible(false);
    router.push({ pathname: '/(app)/books/[id]/book-settings', params: { id, name } });
  }, [router, id, name]);

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
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <UserPlusIcon color={C.textMuted} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.headerIconBtn}
            onPress={() => setMenuVisible(true)}
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

      {/* ── Filter Chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterScroll}
        style={s.filterBar}
      >
        {/* ALL chip */}
        <TouchableOpacity
          style={[s.fChip, activeFilterCount === 0 && s.fChipActive]}
          onPress={clearAllFilters}
          activeOpacity={0.8}
        >
          <Feather name="layers" size={13} color={activeFilterCount === 0 ? '#fff' : C.textMuted} />
          <Text style={[s.fChipLabel, { color: activeFilterCount === 0 ? '#fff' : C.textMuted }]}>All</Text>
        </TouchableOpacity>

        {[
          { key: 'date',     label: 'Date',       icon: 'calendar',    display: filterDate     ? DATE_LABELS[filterDate] : null },
          { key: 'type',     label: 'Entry Type', icon: 'repeat',      display: filterType === 'in' ? 'Cash In' : filterType === 'out' ? 'Cash Out' : null },
          { key: 'members',  label: 'Members',    icon: 'users',       display: null },
          { key: 'contact',  label: 'Contact',    icon: 'user',        display: filterContact },
          { key: 'category', label: 'Category',   icon: 'tag',         display: filterCategory },
          { key: 'payment',  label: 'Payment',    icon: 'credit-card', display: filterPayment ? PAYMENT_LABEL[filterPayment] : null },
        ].map(({ key, label, icon, display }) => {
          const active = !!display;
          return (
            <TouchableOpacity
              key={key}
              style={[s.fChip, active && s.fChipActive]}
              onPress={() => setActivePicker(key)}
              activeOpacity={0.8}
            >
              <Feather name={icon} size={13} color={active ? '#fff' : C.textMuted} />
              <Text style={[s.fChipLabel, { color: active ? '#fff' : C.textMuted }]} numberOfLines={1}>
                {display || label}
              </Text>
              {active ? (
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation?.(); clearFilter(key); }}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Feather name="x" size={13} color="rgba(255,255,255,0.85)" />
                </TouchableOpacity>
              ) : (
                <Feather name="chevron-down" size={11} color={C.textSubtle} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Active count strip — always rendered to keep layout stable ── */}
      <TouchableOpacity
        style={[s.clearAllBar, { backgroundColor: C.primaryLight, opacity: activeFilterCount > 0 ? 1 : 0 }]}
        onPress={clearAllFilters}
        activeOpacity={0.7}
        disabled={activeFilterCount === 0}
      >
        <Feather name="sliders" size={11} color={C.primary} />
        <Text style={[s.clearAllText, { color: C.primary }]}>
          {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
        </Text>
        <Text style={[s.clearAllText, { color: C.textMuted }]}>·</Text>
        <Text style={[s.clearAllText, { color: C.primary, textDecorationLine: 'underline' }]}>
          Clear all
        </Text>
      </TouchableOpacity>

      {/* ── Filter Picker Modal ── */}
      <Modal
        visible={!!activePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setActivePicker(null)}
      >
        <Pressable style={s.pickerOverlay} onPress={() => setActivePicker(null)}>
          <Pressable style={[s.pickerSheet, { backgroundColor: C.card }]} onPress={() => {}}>
            <View style={[s.pickerHandle, { backgroundColor: C.border }]} />
            <View style={s.pickerHeader}>
              <Text style={[s.pickerTitle, { color: C.text, fontFamily: Font.bold }]}>
                {activePicker === 'date'     ? 'Filter by Date'
                : activePicker === 'type'    ? 'Entry Type'
                : activePicker === 'members' ? 'Members'
                : activePicker === 'contact' ? 'Filter by Contact'
                : activePicker === 'category'? 'Filter by Category'
                : activePicker === 'payment' ? 'Payment Method'
                : ''}
              </Text>
              <TouchableOpacity onPress={() => setActivePicker(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {/* DATE picker */}
            {activePicker === 'date' && (
              <View style={s.pickerGrid}>
                {[
                  { key: 'today',     label: 'Today',     icon: 'sun'       },
                  { key: 'yesterday', label: 'Yesterday', icon: 'moon'      },
                  { key: 'week',      label: 'This Week',  icon: 'calendar'  },
                  { key: 'month',     label: 'This Month', icon: 'clock'     },
                ].map(({ key, label, icon }) => (
                  <TouchableOpacity
                    key={key}
                    style={[s.pickerGridItem, { borderColor: filterDate === key ? C.primary : C.border, backgroundColor: filterDate === key ? C.primaryLight : C.card }]}
                    onPress={() => applyFilter('date', key)}
                    activeOpacity={0.75}
                  >
                    <Feather name={icon} size={20} color={filterDate === key ? C.primary : C.textMuted} />
                    <Text style={[s.pickerGridLabel, { color: filterDate === key ? C.primary : C.text, fontFamily: filterDate === key ? Font.bold : Font.medium }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* TYPE picker */}
            {activePicker === 'type' && (
              <View style={s.typePickerRow}>
                <TouchableOpacity
                  style={[s.typePickerBtn, { borderColor: filterType === 'in' ? C.cashIn : C.border, backgroundColor: filterType === 'in' ? C.cashInLight : C.card }]}
                  onPress={() => applyFilter('type', 'in')}
                  activeOpacity={0.8}
                >
                  <Feather name="arrow-up-circle" size={28} color={filterType === 'in' ? C.cashIn : C.textMuted} />
                  <Text style={[s.typePickerLabel, { color: filterType === 'in' ? C.cashIn : C.text, fontFamily: Font.bold }]}>Cash In</Text>
                  <Text style={[s.typePickerSub, { color: C.textMuted }]}>Income entries</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.typePickerBtn, { borderColor: filterType === 'out' ? C.cashOut : C.border, backgroundColor: filterType === 'out' ? C.cashOutLight : C.card }]}
                  onPress={() => applyFilter('type', 'out')}
                  activeOpacity={0.8}
                >
                  <Feather name="arrow-down-circle" size={28} color={filterType === 'out' ? C.cashOut : C.textMuted} />
                  <Text style={[s.typePickerLabel, { color: filterType === 'out' ? C.cashOut : C.text, fontFamily: Font.bold }]}>Cash Out</Text>
                  <Text style={[s.typePickerSub, { color: C.textMuted }]}>Expense entries</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* MEMBERS picker (pending) */}
            {activePicker === 'members' && (
              <View style={s.pickerEmpty}>
                <Feather name="users" size={40} color={C.textSubtle} />
                <Text style={[s.pickerEmptyTitle, { color: C.text, fontFamily: Font.semiBold }]}>Members Coming Soon</Text>
                <Text style={[s.pickerEmptySub, { color: C.textMuted }]}>Add members to filter entries by who recorded them.</Text>
              </View>
            )}

            {/* CONTACT picker */}
            {activePicker === 'contact' && (
              bookContacts.length === 0 ? (
                <View style={s.pickerEmpty}>
                  <Feather name="user-x" size={40} color={C.textSubtle} />
                  <Text style={[s.pickerEmptyTitle, { color: C.text, fontFamily: Font.semiBold }]}>No contacts in entries</Text>
                  <Text style={[s.pickerEmptySub, { color: C.textMuted }]}>Add a contact when creating an entry to filter by it.</Text>
                </View>
              ) : (
                <ScrollView style={s.pickerList} showsVerticalScrollIndicator={false}>
                  {bookContacts.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[s.pickerRow, { borderBottomColor: C.border }, filterContact === c && { backgroundColor: C.primaryLight }]}
                      onPress={() => applyFilter('contact', c)}
                      activeOpacity={0.75}
                    >
                      <View style={[s.contactAvatar, { backgroundColor: C.primaryLight }]}>
                        <Text style={[s.contactAvatarText, { color: C.primary, fontFamily: Font.bold }]}>{c.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={[s.pickerRowLabel, { color: C.text, fontFamily: filterContact === c ? Font.semiBold : Font.regular }]}>{c}</Text>
                      {filterContact === c && <Feather name="check" size={16} color={C.primary} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )
            )}

            {/* CATEGORY picker */}
            {activePicker === 'category' && (
              <ScrollView style={s.pickerList} showsVerticalScrollIndicator={false}>
                {(bookCategories.length > 0 ? bookCategories : CATEGORIES).map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[s.pickerRow, { borderBottomColor: C.border }, filterCategory === cat && { backgroundColor: C.primaryLight }]}
                    onPress={() => applyFilter('category', cat)}
                    activeOpacity={0.75}
                  >
                    <View style={[s.catDot, { backgroundColor: C.primaryMid }]}>
                      <Feather name="tag" size={13} color={C.primary} />
                    </View>
                    <Text style={[s.pickerRowLabel, { color: C.text, fontFamily: filterCategory === cat ? Font.semiBold : Font.regular }]}>{cat}</Text>
                    {filterCategory === cat && <Feather name="check" size={16} color={C.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* PAYMENT picker */}
            {activePicker === 'payment' && (
              <View style={s.pickerGrid}>
                {[
                  { value: 'cash',   label: 'Cash',   icon: 'dollar-sign'    },
                  { value: 'online', label: 'Online', icon: 'wifi'           },
                  { value: 'cheque', label: 'Cheque', icon: 'file-text'      },
                  { value: 'other',  label: 'Other',  icon: 'more-horizontal'},
                ].map(({ value, label, icon }) => (
                  <TouchableOpacity
                    key={value}
                    style={[s.pickerGridItem, { borderColor: filterPayment === value ? C.primary : C.border, backgroundColor: filterPayment === value ? C.primaryLight : C.card }]}
                    onPress={() => applyFilter('payment', value)}
                    activeOpacity={0.75}
                  >
                    <Feather name={icon} size={20} color={filterPayment === value ? C.primary : C.textMuted} />
                    <Text style={[s.pickerGridLabel, { color: filterPayment === value ? C.primary : C.text, fontFamily: filterPayment === value ? Font.bold : Font.medium }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

          </Pressable>
        </Pressable>
      </Modal>

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

          {/* Entry Count */}
          <View style={s.entryCountRow}>
            <Feather name="list" size={12} color={C.textMuted} />
            <Text style={s.entryCountText}>
              {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
              {activeFilterCount > 0 || search ? '  ·  filtered' : '  ·  total'}
            </Text>
          </View>

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

      {/* Dots Dropdown Menu */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={s.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={[s.menuCard, { backgroundColor: C.card, borderColor: C.border }]}>
            {[
              { label: 'Book Settings', icon: 'settings', onPress: goToBookSettings },
              { label: 'Test-ABC',      icon: 'zap',      onPress: () => setMenuVisible(false) },
            ].map((item, idx, arr) => (
              <View key={item.label}>
                <TouchableOpacity
                  style={s.menuItem}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <Feather name={item.icon} size={16} color={C.textMuted} />
                  <Text style={[s.menuItemText, { color: C.text, fontFamily: Font.medium }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
                {idx < arr.length - 1 && <View style={[s.menuDivider, { backgroundColor: C.border }]} />}
              </View>
            ))}
          </View>
        </Pressable>
      </Modal>

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
    marginHorizontal: 16, marginTop: 8,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: C.border, gap: 10,
    minHeight: 44,
  },
  searchInput: {
    flex: 1, fontSize: 14, fontFamily: Font.regular,
    color: C.text, lineHeight: 20,
  },

  // ── Filter chips bar ──
  filterBar: { marginTop: 10 },
  filterScroll: {
    paddingHorizontal: 16, paddingVertical: 4, gap: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  fChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
    backgroundColor: C.card, borderColor: C.border,
    maxWidth: 160,
  },
  fChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  fChipLabel: { fontSize: 12, fontFamily: Font.semiBold, lineHeight: 16, flexShrink: 1 },

  // ── Active strip ──
  clearAllBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, marginHorizontal: 16, marginTop: 4, height: 24, borderRadius: 8,
  },
  clearAllText: { fontSize: 12, fontFamily: Font.semiBold, lineHeight: 18 },

  // ── Picker modal ──
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  pickerSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingBottom: 36, paddingHorizontal: 20,
    maxHeight: '70%',
  },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  pickerTitle:  { fontSize: 17, lineHeight: 24 },

  // Grid picker (date, payment)
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  pickerGridItem: {
    width: '47%', borderRadius: 16, borderWidth: 1.5,
    paddingVertical: 18, alignItems: 'center', gap: 8,
  },
  pickerGridLabel: { fontSize: 13, lineHeight: 18 },

  // Type picker
  typePickerRow: { flexDirection: 'row', gap: 12 },
  typePickerBtn: {
    flex: 1, borderRadius: 16, borderWidth: 1.5,
    paddingVertical: 20, alignItems: 'center', gap: 6,
  },
  typePickerLabel: { fontSize: 15, lineHeight: 22 },
  typePickerSub:   { fontSize: 11, fontFamily: Font.regular, lineHeight: 16 },

  // List picker (contact, category)
  pickerList: { maxHeight: 300 },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1,
  },
  pickerRowLabel: { flex: 1, fontSize: 15, lineHeight: 22 },
  contactAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  contactAvatarText: { fontSize: 15 },
  catDot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // Empty state (members, no contacts)
  pickerEmpty: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  pickerEmptyTitle: { fontSize: 15, lineHeight: 22 },
  pickerEmptySub: { fontSize: 13, fontFamily: Font.regular, lineHeight: 20, textAlign: 'center', paddingHorizontal: 20 },

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

  // Entry count row
  entryCountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 2,
  },
  entryCountText: {
    fontSize: 12, fontFamily: Font.medium, color: C.textMuted, lineHeight: 18,
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

  // Dropdown menu
  menuOverlay: {
    flex: 1,
  },
  menuCard: {
    position: 'absolute', top: 56, right: 8,
    borderRadius: 14, borderWidth: 1,
    minWidth: 180,
    shadowColor: '#000', shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  menuItemText: { fontSize: 14, lineHeight: 20 },
  menuDivider: { height: 1, marginHorizontal: 0 },

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
