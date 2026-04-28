import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, TextInput, Modal, Alert, ActivityIndicator, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useBooks, useCreateBook, useDeleteBook } from '../hooks/useBooks';
import { useBookSort } from '../hooks/useBookSort';
import { useAuthStore } from '../store/authStore';
import { shadow } from '../constants/shadows';
import { CARD_ACCENTS } from '../constants/colors';
import SortSheet from '../components/books/SortSheet';
import DraggableList from '../components/books/DraggableList';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) =>
  (n < 0 ? '-' : '+') + Math.abs(n).toLocaleString();

const getInitials = (str = '') =>
  str.split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '?';

const fmtLastEntry = (iso) => {
  if (!iso) return 'No entries yet';
  const d    = new Date(iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date}  ·  ${time}`;
};

// ── Icon Components (SVG-style via Views) ────────────────────────────────────

const SunIcon = ({ color, size = 18 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2, backgroundColor: color }} />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
      <View key={i} style={{
        position: 'absolute', width: 2, height: size * 0.22,
        backgroundColor: color, borderRadius: 1,
        top: size * 0.04,
        left: size / 2 - 1,
        transformOrigin: `1px ${size * 0.46}px`,
        transform: [{ rotate: `${deg}deg` }, { translateY: -size * 0.28 }],
      }} />
    ))}
  </View>
);

const MoonIcon = ({ color, size = 18 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.75, height: size * 0.75, borderRadius: size * 0.375,
      backgroundColor: color,
    }} />
    <View style={{
      position: 'absolute', right: 0, top: 0,
      width: size * 0.6, height: size * 0.6, borderRadius: size * 0.3,
      backgroundColor: 'transparent',
      borderWidth: size * 0.3,
      borderColor: 'transparent',
    }} />
  </View>
);

const BookIcon = ({ color, size = 20 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.72, height: size * 0.88, borderRadius: 2,
      borderWidth: 1.5, borderColor: color,
      justifyContent: 'center', alignItems: 'center', gap: 3,
    }}>
      {[0, 1, 2].map(i => (
        <View key={i} style={{ width: size * 0.4, height: 1.5, backgroundColor: color, borderRadius: 1 }} />
      ))}
    </View>
  </View>
);

const GearIcon = ({ color, size = 20 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.45, height: size * 0.45, borderRadius: size * 0.225,
      borderWidth: 2, borderColor: color,
    }} />
    <View style={{
      position: 'absolute', width: size * 0.8, height: 2.5,
      backgroundColor: color, borderRadius: 1,
    }} />
    <View style={{
      position: 'absolute', width: size * 0.8, height: 2.5,
      backgroundColor: color, borderRadius: 1,
      transform: [{ rotate: '60deg' }],
    }} />
    <View style={{
      position: 'absolute', width: size * 0.8, height: 2.5,
      backgroundColor: color, borderRadius: 1,
      transform: [{ rotate: '120deg' }],
    }} />
  </View>
);

const HelpIcon = ({ color, size = 20 }) => (
  <View style={{
    width: size, height: size, borderRadius: size / 2,
    borderWidth: 1.5, borderColor: color,
    alignItems: 'center', justifyContent: 'center',
  }}>
    <Text style={{ fontSize: size * 0.55, color, fontWeight: '700', lineHeight: size * 0.65 }}>?</Text>
  </View>
);

const DotsIcon = ({ color, size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
    {[0, 1, 2].map(i => (
      <View key={i} style={{ width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: color }} />
    ))}
  </View>
);

const PlusIcon = ({ color, size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ position: 'absolute', width: size, height: 2, backgroundColor: color, borderRadius: 1 }} />
    <View style={{ position: 'absolute', width: 2, height: size, backgroundColor: color, borderRadius: 1 }} />
  </View>
);

const XIcon = ({ color, size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ position: 'absolute', width: size, height: 2, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '45deg' }] }} />
    <View style={{ position: 'absolute', width: size, height: 2, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '-45deg' }] }} />
  </View>
);

// ── Sub-components ────────────────────────────────────────────────────────────

const StatItem = memo(({ label, value, dotColor, s }) => (
  <View style={s.statItem}>
    <Text style={s.statValue}>{value}</Text>
    <View style={s.statLabelRow}>
      <View style={[s.statDot, { backgroundColor: dotColor }]} />
      <Text style={s.statLabel}>{label}</Text>
    </View>
  </View>
));

const BookCard = memo(({ item, index, onPress, onDelete, C, s }) => {
  const balance = item.net_balance ?? 0;
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
  const bookInitials = getInitials(item.name);

  return (
    <TouchableOpacity style={s.bookCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[s.bookIconBox, { backgroundColor: accent + '18' }]}>
        <Text style={[s.bookInitials, { color: accent }]}>{bookInitials}</Text>
      </View>
      <View style={s.bookInfo}>
        <Text style={s.bookName} numberOfLines={1}>{item.name}</Text>
        <Text style={s.bookDate} numberOfLines={1}>
          {fmtLastEntry(item.last_entry_at)}
        </Text>
      </View>
      <View style={s.bookRight}>
        <View style={[s.balancePill, { backgroundColor: C.cardAlt }]}>
          <Text style={[s.balanceText, { color: C.text }]}>
            {fmt(balance)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onDelete}
          style={s.moreBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <DotsIcon color={C.textSubtle} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function BooksScreen() {
  const router = useRouter();
  const { C, Font, isDark, toggleTheme } = useTheme();
  const s = useMemo(() => makeStyles(C, Font), [C, Font]);

  const user = useAuthStore((st) => st.user);

  const { data: books = [], isLoading, isError, refetch } = useBooks();
  const createBook = useCreateBook();
  const deleteBook = useDeleteBook();

  const {
    sortMode, sortedBooks, showSort, setShowSort,
    handleSortSelect, setCustomBooks, sortLabel,
  } = useBookSort(books);

  const [showModal, setShowModal] = useState(false);
  const [newBookName, setNewBookName] = useState('');

  // Derive currency: show if all books share the same currency, otherwise hide
  const currency = useMemo(() => {
    if (!books.length) return '';
    const uniq = [...new Set(books.map(b => b.currency).filter(Boolean))];
    return uniq.length === 1 ? uniq[0] : '';
  }, [books]);

  const stats = useMemo(() => ({
    total:    books.reduce((acc, b) => acc + (b.net_balance ?? 0), 0),
    personal: books.length,
    shared:   0,
  }), [books]);

  const handleCreate = useCallback(async () => {
    if (!newBookName.trim()) return;
    try {
      await createBook.mutateAsync({ name: newBookName.trim() });
      setNewBookName('');
      setShowModal(false);
    } catch {
      Alert.alert('Error', 'Could not create book. Please try again.');
    }
  }, [newBookName, createBook]);

  const handleDelete = useCallback((id, name) => {
    Alert.alert('Delete Book', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteBook.mutate(id) },
    ]);
  }, [deleteBook]);

  const userInitials = useMemo(() => getInitials(user?.full_name ?? ''), [user]);
  const userName    = user?.full_name ?? '';

  const handleBookPress = useCallback((book) => {
    router.push({ pathname: '/(app)/books/[id]', params: { id: book.id, name: book.name } });
  }, [router]);

  const renderBook = useCallback(({ item, index }) => (
    <BookCard
      item={item}
      index={index}
      C={C}
      s={s}
      onPress={() => handleBookPress(item)}
      onDelete={() => handleDelete(item.id, item.name)}
    />
  ), [C, s, handleDelete, handleBookPress]);

  const ListHeader = useMemo(() => (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>Your Books</Text>
      <TouchableOpacity
        style={[s.sortBtn, sortMode !== 'updated' && s.sortBtnActive]}
        onPress={() => setShowSort(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[s.sortBtnText, sortMode !== 'updated' && s.sortBtnTextActive]}>
          {sortMode === 'updated' ? 'Sort  ≡' : `${sortLabel}  ≡`}
        </Text>
      </TouchableOpacity>
    </View>
  ), [s, sortMode, sortLabel, setShowSort]);

  const ListEmpty = useMemo(() => (
    <View style={s.empty}>
      <View style={s.emptyIconBox}>
        <BookIcon color={C.primary} size={36} />
      </View>
      <Text style={s.emptyTitle}>No books yet</Text>
      <Text style={s.emptySub}>Tap "Add New Book" to start{'\n'}tracking your cash flow</Text>
    </View>
  ), [s, C]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Header */}
      <View style={s.header}>

        {/* Top row */}
        <View style={s.headerTop}>
          <View style={s.headerLeft}>
            <View style={s.bizIconBox}>
              <Text style={s.bizIconText}>{userInitials.charAt(0)}</Text>
            </View>
            <View>
              <Text style={s.bizName} numberOfLines={1}>{userName || 'My Account'}</Text>
              <Text style={s.bizSub}>Personal Workspace ▾</Text>
            </View>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity onPress={toggleTheme} style={s.iconBtn} activeOpacity={0.8}>
              {isDark
                ? <SunIcon  color={C.onPrimary} size={18} />
                : <MoonIcon color={C.onPrimary} size={18} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.avatarCircle}
              onPress={() => router.push('/(app)/settings')}
              activeOpacity={0.8}
            >
              <Text style={s.avatarText}>{userInitials}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance */}
        <View style={s.balanceSection}>
          <Text style={s.balanceLabel}>TOTAL NET BALANCE</Text>
          <Text style={s.balanceAmount}>
            {currency ? <Text style={s.balanceCurrency}>{currency} </Text> : null}
            {isLoading ? '—' : stats.total.toLocaleString()}
          </Text>
          <View style={s.balanceUnderline} />
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <StatItem label="My Books"     value={isLoading ? '—' : stats.personal} dotColor={C.onPrimary}      s={s} />
          <View style={s.statDivider} />
          <StatItem label="Shared Books" value={stats.shared}                      dotColor={C.onPrimaryMuted} s={s} />
        </View>
      </View>

      {/* Section header — always visible */}
      {ListHeader}

      {/* Book List — loading / error / content */}
      {isLoading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingText}>Loading your books…</Text>
        </View>
      ) : isError ? (
        <View style={s.errorBox}>
          <Text style={s.errorTitle}>Couldn't load books</Text>
          <TouchableOpacity style={s.retryBtn} onPress={refetch}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : sortMode === 'custom' ? (
        <DraggableList
          books={sortedBooks}
          onReorder={setCustomBooks}
          onBookPress={handleBookPress}
          onBookDelete={handleDelete}
          listPaddingBottom={130}
          C={C}
          Font={Font}
        />
      ) : (
        <FlatList
          data={sortedBooks}
          keyExtractor={item => item.id}
          renderItem={renderBook}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={ListEmpty}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => setShowModal(true)} activeOpacity={0.85}>
        <PlusIcon color={C.onPrimary} size={16} />
        <Text style={s.fabText}>ADD NEW BOOK</Text>
      </TouchableOpacity>

      {/* Bottom Nav */}
      <View style={s.bottomNav}>
        {[
          { label: 'Cashbooks', Icon: BookIcon, active: true,  onPress: () => {} },
          { label: 'Help',      Icon: HelpIcon, active: false, onPress: () => {} },
          { label: 'Settings',  Icon: GearIcon, active: false, onPress: () => router.push('/(app)/settings') },
        ].map(tab => (
          <TouchableOpacity key={tab.label} style={s.navItem} onPress={tab.onPress}>
            <tab.Icon color={tab.active ? C.primary : C.textMuted} size={22} />
            <Text style={tab.active ? s.navLabelActive : s.navLabel}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sort Sheet */}
      <SortSheet
        visible={showSort}
        current={sortMode}
        onSelect={handleSortSelect}
        onClose={() => setShowSort(false)}
      />

      {/* Add Book Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => { setShowModal(false); setNewBookName(''); }}>
        <Pressable style={s.modalOverlay} onPress={() => { setShowModal(false); setNewBookName(''); }}>
          <Pressable style={s.modalBox} onPress={() => {}}>
            <View style={s.modalHandle} />
            <View style={s.modalTitleRow}>
              <Text style={s.modalTitle}>New Book</Text>
              <TouchableOpacity
                style={s.modalCloseBtn}
                onPress={() => { setShowModal(false); setNewBookName(''); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <XIcon color={C.textMuted} size={16} />
              </TouchableOpacity>
            </View>
            <Text style={s.modalSub}>Give it a clear, recognisable name</Text>
            <TextInput
              style={s.modalInput}
              placeholder="e.g. Business Expenses, Personal"
              placeholderTextColor={C.textSubtle}
              value={newBookName}
              onChangeText={setNewBookName}
              autoFocus
              maxLength={40}
            />
            <Text style={s.charCount}>{newBookName.length}/40</Text>
            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => { setShowModal(false); setNewBookName(''); }}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.createBtn, !newBookName.trim() && s.createBtnDisabled]}
                onPress={handleCreate}
                disabled={!newBookName.trim() || createBook.isPending}
              >
                <Text style={s.createBtnText}>{createBook.isPending ? 'Creating…' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (C, Font) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },

  // Header
  header: { backgroundColor: C.primary, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 },
  headerTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 24,
  },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  bizIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.onPrimaryIconBg, alignItems: 'center', justifyContent: 'center',
  },
  bizIconText: { fontSize: 17, fontFamily: Font.extraBold, color: C.onPrimary },
  bizName:     { fontSize: 15, fontFamily: Font.bold,      color: C.onPrimary, lineHeight: 22 },
  bizSub:      { fontSize: 12, fontFamily: Font.regular,   color: C.onPrimaryMuted, lineHeight: 18, marginTop: 1 },

  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.onPrimaryIconBg, alignItems: 'center', justifyContent: 'center',
  },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.onPrimaryIconBg,
    borderWidth: 2, borderColor: C.onPrimarySubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontFamily: Font.bold, color: C.onPrimary },

  // Balance
  balanceSection: { alignItems: 'center', marginBottom: 24 },
  balanceLabel: {
    fontSize: 10, fontFamily: Font.semiBold, color: C.onPrimaryMuted,
    letterSpacing: 1.4, marginBottom: 10,
  },
  balanceCurrency: { fontSize: 18, fontFamily: Font.medium, color: C.onPrimaryMuted },
  balanceAmount: {
    fontSize: 38, fontFamily: Font.extraBold, color: C.onPrimary,
    letterSpacing: -1, lineHeight: 46, marginBottom: 10,
  },
  balanceUnderline: {
    width: 48, height: 3, borderRadius: 2,
    backgroundColor: C.onPrimarySubtle,
  },

  // Stats
  statsRow:     { flexDirection: 'row', alignItems: 'center' },
  statItem:     { flex: 1, alignItems: 'center' },
  statValue:    { fontSize: 18, fontFamily: Font.bold, color: C.onPrimary, marginBottom: 4, lineHeight: 24 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statDot:      { width: 6, height: 6, borderRadius: 3 },
  statLabel:    { fontSize: 11, fontFamily: Font.medium, color: C.onPrimaryMuted, lineHeight: 16 },
  statDivider:  { width: 1, height: 32, backgroundColor: C.onPrimaryIconBg },

  // List
  listContent: { paddingBottom: 130 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10,
  },
  sectionTitle:     { fontSize: 15, fontFamily: Font.bold, color: C.text, lineHeight: 22 },
  sortBtn:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: C.primaryLight, borderWidth: 1, borderColor: C.primaryMid },
  sortBtnActive:    { backgroundColor: C.primary },
  sortBtnText:      { fontSize: 12, fontFamily: Font.semiBold, color: C.primary, lineHeight: 18 },
  sortBtnTextActive:{ color: C.onPrimary },

  // Loading
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 14, fontFamily: Font.regular, color: C.textMuted, lineHeight: 20 },

  // Error
  errorBox:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
  errorTitle: { fontSize: 15, fontFamily: Font.medium, color: C.textMuted, textAlign: 'center' },
  retryBtn:  { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12, minHeight: 44, justifyContent: 'center' },
  retryText: { color: C.onPrimary, fontFamily: Font.semiBold, fontSize: 14 },

  // Book Card
  bookCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, marginHorizontal: 16, marginBottom: 10,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
    minHeight: 72,
  },
  bookIconBox:  { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  bookInitials: { fontSize: 16, fontFamily: Font.extraBold },
  bookInfo:     { flex: 1, marginRight: 8 },
  bookName:     { fontSize: 14, fontFamily: Font.semiBold, color: C.text,     lineHeight: 20, marginBottom: 3 },
  bookDate:     { fontSize: 12, fontFamily: Font.regular,  color: C.textMuted, lineHeight: 18 },
  bookRight:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balancePill:  { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 64, alignItems: 'center' },
  balanceText:  { fontSize: 13, fontFamily: Font.bold, lineHeight: 18 },
  moreBtn:      { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  // Empty
  empty:        { alignItems: 'center', paddingTop: 70, paddingHorizontal: 40 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  emptyTitle: { fontSize: 17, fontFamily: Font.bold,    color: C.text,     lineHeight: 26, marginBottom: 8 },
  emptySub:   { fontSize: 13, fontFamily: Font.regular, color: C.textMuted, lineHeight: 20, textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute', bottom: 80, alignSelf: 'center',
    backgroundColor: C.primary, borderRadius: 32,
    paddingHorizontal: 28, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    minHeight: 52,
    ...shadow(C.primary, 2, 8, 0.25),
  },
  fabText: { color: C.onPrimary, fontFamily: Font.extraBold, fontSize: 13, letterSpacing: 0.8, lineHeight: 18 },

  // Bottom Nav
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', backgroundColor: C.card,
    borderTopWidth: 1, borderTopColor: C.border,
    paddingTop: 10, paddingBottom: 16,
    zIndex: 10, elevation: 10,
  },
  navItem:       { flex: 1, alignItems: 'center', gap: 4, minHeight: 44, justifyContent: 'center' },
  navLabel:      { fontSize: 11, fontFamily: Font.medium, color: C.textMuted, lineHeight: 16 },
  navLabelActive:{ fontSize: 11, fontFamily: Font.bold,   color: C.primary,   lineHeight: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingTop: 12,
  },
  modalHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 },
  modalTitleRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  modalTitle:     { fontSize: 20, fontFamily: Font.extraBold, color: C.text, lineHeight: 28 },
  modalCloseBtn:  { width: 32, height: 32, borderRadius: 16, backgroundColor: C.cardAlt, alignItems: 'center', justifyContent: 'center' },
  modalSub:       { fontSize: 13, fontFamily: Font.regular,   color: C.textMuted, lineHeight: 20, marginBottom: 20 },
  modalInput: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
    padding: 16, fontSize: 15, fontFamily: Font.regular,
    color: C.text, backgroundColor: C.background, marginBottom: 6,
    lineHeight: 22,
  },
  charCount:    { fontSize: 11, fontFamily: Font.regular, color: C.textSubtle, textAlign: 'right', marginBottom: 20, lineHeight: 16 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 14, paddingVertical: 15, alignItems: 'center', minHeight: 52,
  },
  cancelBtnText:     { fontFamily: Font.semiBold, fontSize: 15, color: C.textMuted, lineHeight: 22 },
  createBtn:         { flex: 1, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', minHeight: 52 },
  createBtnDisabled: { backgroundColor: C.border },
  createBtnText:     { fontFamily: Font.bold, fontSize: 15, color: C.onPrimary, lineHeight: 22 },
});
