import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, Switch, Alert, Modal, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { shadow } from '../constants/shadows';
import { CARD_ACCENTS } from '../constants/colors';
import { useAuthStore } from '../store/authStore';
import {
  apiGetAllUsers, apiToggleUserStatus,
  apiGetBooks, apiCreateBook, apiDeleteBook,
} from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ── Helpers ───────────────────────────────────────────────────────────────────

const getInitials = (str = '') =>
  str.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const fmtBalance = (n) =>
  (n < 0 ? '-' : '+') + Math.abs(n).toLocaleString();

const fmtStorage = (mb) =>
  mb < 1 ? `${Math.round(mb * 1024)} KB` : `${mb.toFixed(1)} MB`;

// ── Icon Views ────────────────────────────────────────────────────────────────

const PeopleIcon = ({ color, size = 20 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.42, height: size * 0.42, borderRadius: size * 0.21, borderWidth: 1.5, borderColor: color, marginBottom: 1 }} />
    <View style={{ width: size * 0.65, height: size * 0.28, borderTopLeftRadius: size * 0.14, borderTopRightRadius: size * 0.14, borderWidth: 1.5, borderColor: color, borderBottomWidth: 0 }} />
  </View>
);

const BookIcon = ({ color, size = 20 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.72, height: size * 0.88, borderRadius: 2, borderWidth: 1.5, borderColor: color, justifyContent: 'center', alignItems: 'center', gap: 3 }}>
      {[0, 1, 2].map(i => (
        <View key={i} style={{ width: size * 0.4, height: 1.5, backgroundColor: color, borderRadius: 1 }} />
      ))}
    </View>
  </View>
);

const GearIcon = ({ color, size = 20 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.45, height: size * 0.45, borderRadius: size * 0.225, borderWidth: 2, borderColor: color }} />
    <View style={{ position: 'absolute', width: size * 0.8, height: 2.5, backgroundColor: color, borderRadius: 1 }} />
    <View style={{ position: 'absolute', width: size * 0.8, height: 2.5, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '60deg' }] }} />
    <View style={{ position: 'absolute', width: size * 0.8, height: 2.5, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '120deg' }] }} />
  </View>
);

const PlusIcon = ({ color, size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ position: 'absolute', width: size, height: 2, backgroundColor: color, borderRadius: 1 }} />
    <View style={{ position: 'absolute', width: 2, height: size, backgroundColor: color, borderRadius: 1 }} />
  </View>
);

const DotsIcon = ({ color, size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
    {[0, 1, 2].map(i => (
      <View key={i} style={{ width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: color }} />
    ))}
  </View>
);

const SunIcon = ({ color, size = 18 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2, backgroundColor: color }} />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
      <View key={i} style={{ position: 'absolute', width: 2, height: size * 0.22, backgroundColor: color, borderRadius: 1, top: size * 0.04, left: size / 2 - 1, transformOrigin: `1px ${size * 0.46}px`, transform: [{ rotate: `${deg}deg` }, { translateY: -size * 0.28 }] }} />
    ))}
  </View>
);

const MoonIcon = ({ color, size = 18 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.75, height: size * 0.75, borderRadius: size * 0.375, backgroundColor: color }} />
    <View style={{ position: 'absolute', right: 0, top: 0, width: size * 0.6, height: size * 0.6, borderRadius: size * 0.3, backgroundColor: 'transparent', borderWidth: size * 0.3, borderColor: 'transparent' }} />
  </View>
);

// ── User Row ──────────────────────────────────────────────────────────────────

const UserRow = memo(({ item, onToggle, C, s }) => {
  const initials = getInitials(item.full_name);

  return (
    <View style={s.userCard}>
      <View style={[s.userAvatar, { backgroundColor: item.is_active ? C.primaryLight : C.cardAlt }]}>
        <Text style={[s.userAvatarText, { color: item.is_active ? C.primary : C.textMuted }]}>
          {initials}
        </Text>
      </View>

      <View style={s.userInfo}>
        <View style={s.userNameRow}>
          <Text style={s.userName} numberOfLines={1}>{item.full_name}</Text>
          {!item.is_active && (
            <View style={s.inactiveBadge}>
              <Text style={s.inactiveBadgeText}>Inactive</Text>
            </View>
          )}
        </View>
        <Text style={s.userEmail} numberOfLines={1}>{item.email}</Text>
        <View style={s.userMeta}>
          <Text style={s.userMetaText}>{item.book_count} books</Text>
          <View style={s.userMetaDot} />
          <Text style={s.userMetaText}>{fmtStorage(item.storage_mb)}</Text>
          <View style={s.userMetaDot} />
          <Text style={s.userMetaText}>{item.entry_count} entries</Text>
        </View>
      </View>

      <Switch
        value={item.is_active}
        onValueChange={(val) => onToggle(item.id, val)}
        trackColor={{ false: C.border, true: C.primaryMid }}
        thumbColor={item.is_active ? C.primary : C.textSubtle}
      />
    </View>
  );
});

// ── Book Card (Admin's Books tab) ─────────────────────────────────────────────

const BookCard = memo(({ item, index, onPress, onDelete, C, s }) => {
  const balance = item.net_balance ?? 0;
  const accent  = CARD_ACCENTS[index % CARD_ACCENTS.length];

  return (
    <TouchableOpacity style={s.bookCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[s.bookIconBox, { backgroundColor: accent + '18' }]}>
        <Text style={[s.bookInitials, { color: accent }]}>{getInitials(item.name)}</Text>
      </View>
      <View style={s.bookInfo}>
        <Text style={s.bookName} numberOfLines={1}>{item.name}</Text>
        <Text style={s.bookDate}>
          {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      </View>
      <View style={s.bookRight}>
        <View style={[s.balancePill, { backgroundColor: C.cardAlt }]}>
          <Text style={[s.balanceText, { color: C.text }]}>{fmtBalance(balance)}</Text>
        </View>
        <TouchableOpacity onPress={onDelete} style={s.moreBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <DotsIcon color={C.textSubtle} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

// ── Stat Card ─────────────────────────────────────────────────────────────────

const StatCard = memo(({ label, value, sub, C, s }) => (
  <View style={s.statCard}>
    <Text style={s.statValue}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
    {sub ? <Text style={s.statSub}>{sub}</Text> : null}
  </View>
));

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router        = useRouter();
  const { C, Font, isDark, toggleTheme } = useTheme();
  const s             = useMemo(() => makeStyles(C, Font), [C, Font]);
  const user          = useAuthStore((s) => s.user);
  const clearUser     = useAuthStore((s) => s.clearUser);
  const qc            = useQueryClient();

  const [activeTab, setActiveTab]   = useState('users'); // 'users' | 'books'
  const [showAddBook, setShowAddBook] = useState(false);
  const [newBookName, setNewBookName] = useState('');

  // ── Users query ───────────────────────────────────────────────────────────
  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn:  apiGetAllUsers,
    // When Supabase is connected:
    // queryFn: () => api.get('/api/v1/admin/users').then(r => r.data),
  });

  // ── Admin's own books query ───────────────────────────────────────────────
  const { data: books = [], isLoading: booksLoading } = useQuery({
    queryKey: ['books'],
    queryFn:  apiGetBooks,
    // When Supabase is connected:
    // queryFn: () => api.get('/api/v1/books').then(r => r.data),
  });

  // ── Toggle user status ────────────────────────────────────────────────────
  const toggleUserMutation = useMutation({
    mutationFn: ({ userId, isActive }) => apiToggleUserStatus(userId, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    // When Supabase is connected:
    // mutationFn: ({ userId, isActive }) =>
    //   api.patch(`/api/v1/admin/users/${userId}/status`, { is_active: isActive }).then(r => r.data),
  });

  // ── Create book ───────────────────────────────────────────────────────────
  const createBookMutation = useMutation({
    mutationFn: (name) => apiCreateBook(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['books'] });
      setNewBookName('');
      setShowAddBook(false);
    },
  });

  // ── Delete book ───────────────────────────────────────────────────────────
  const deleteBookMutation = useMutation({
    mutationFn: (id) => apiDeleteBook(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books'] }),
  });

  const handleToggleUser = useCallback((userId, isActive) => {
    const label = isActive ? 'activate' : 'deactivate';
    Alert.alert(
      `${isActive ? 'Activate' : 'Deactivate'} User`,
      `Are you sure you want to ${label} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: isActive ? 'Activate' : 'Deactivate',
          style: isActive ? 'default' : 'destructive',
          onPress: () => toggleUserMutation.mutate({ userId, isActive }) },
      ],
    );
  }, [toggleUserMutation]);

  const handleDeleteBook = useCallback((id, name) => {
    Alert.alert('Delete Book', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteBookMutation.mutate(id) },
    ]);
  }, [deleteBookMutation]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => {
        clearUser();
        router.replace('/(auth)/login');
      }},
    ]);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalUsers   = allUsers.length;
    const activeUsers  = allUsers.filter(u => u.is_active).length;
    const totalBooks   = allUsers.reduce((s, u) => s + u.book_count, 0) + books.length;
    const totalStorage = allUsers.reduce((s, u) => s + u.storage_mb, 0);
    return { totalUsers, activeUsers, totalBooks, totalStorage };
  }, [allUsers, books]);

  const userInitials = useMemo(() => getInitials(user?.full_name ?? 'FA'), [user]);

  // ── Render ────────────────────────────────────────────────────────────────

  const renderUser = useCallback(({ item }) => (
    <UserRow item={item} onToggle={handleToggleUser} C={C} s={s} />
  ), [C, s, handleToggleUser]);

  const renderBook = useCallback(({ item, index }) => (
    <BookCard
      item={item} index={index} C={C} s={s}
      onPress={() => router.push({ pathname: '/(app)/books/[id]', params: { id: item.id, name: item.name } })}
      onDelete={() => handleDeleteBook(item.id, item.name)}
    />
  ), [C, s, handleDeleteBook]);

  const UsersEmpty = (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>No other users yet</Text>
      <Text style={s.emptySub}>Users will appear here once they sign up</Text>
    </View>
  );

  const BooksEmpty = (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>No books yet</Text>
      <Text style={s.emptySub}>Tap "Add New Book" to get started</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={s.headerLeft}>
            <View style={s.logoBox}>
              <Text style={s.logoText}>C</Text>
            </View>
            <View>
              <View style={s.adminLabelRow}>
                <Text style={s.headerTitle}>Dashboard</Text>
                <View style={s.adminBadge}>
                  <Text style={s.adminBadgeText}>SUPER ADMIN</Text>
                </View>
              </View>
              <Text style={s.headerSub}>CashBook Admin Panel</Text>
            </View>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity onPress={toggleTheme} style={s.iconBtn} activeOpacity={0.8}>
              {isDark
                ? <SunIcon  color={C.onPrimary} size={18} />
                : <MoonIcon color={C.onPrimary} size={18} />}
            </TouchableOpacity>
            <TouchableOpacity style={s.avatarCircle} onPress={handleLogout} activeOpacity={0.8}>
              <Text style={s.avatarText}>{userInitials}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <StatCard label="Total Users"   value={stats.totalUsers}           sub={`${stats.activeUsers} active`} C={C} s={s} />
          <View style={s.statDivider} />
          <StatCard label="Total Books"   value={stats.totalBooks}           sub={null} C={C} s={s} />
          <View style={s.statDivider} />
          <StatCard label="Storage Used"  value={fmtStorage(stats.totalStorage)} sub="all users" C={C} s={s} />
        </View>
      </View>

      {/* ── Tab Bar ────────────────────────────────────────────────────── */}
      <View style={s.tabBar}>
        {[
          { key: 'users', label: 'Users', Icon: PeopleIcon },
          { key: 'books', label: 'My Books', Icon: BookIcon },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tabItem, activeTab === tab.key && s.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <tab.Icon color={activeTab === tab.key ? C.primary : C.textMuted} size={18} />
            <Text style={activeTab === tab.key ? s.tabLabelActive : s.tabLabel}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Users Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <FlatList
          data={allUsers}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          ListHeaderComponent={
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>All Users</Text>
              <Text style={s.sectionSub}>{allUsers.length} registered</Text>
            </View>
          }
          ListEmptyComponent={usersLoading ? null : UsersEmpty}
        />
      )}

      {/* ── Books Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'books' && (
        <>
          <FlatList
            data={books}
            keyExtractor={item => item.id}
            renderItem={renderBook}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.listContent, { paddingBottom: 130 }]}
            ListHeaderComponent={
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Your Books</Text>
                <Text style={s.sectionSub}>{books.length} books</Text>
              </View>
            }
            ListEmptyComponent={booksLoading ? null : BooksEmpty}
          />
          <TouchableOpacity style={s.fab} onPress={() => setShowAddBook(true)} activeOpacity={0.85}>
            <PlusIcon color={C.onPrimary} size={16} />
            <Text style={s.fabText}>ADD NEW BOOK</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── Bottom Nav ─────────────────────────────────────────────────── */}
      <View style={s.bottomNav}>
        {[
          { label: 'Users',    Icon: PeopleIcon, tab: 'users' },
          { label: 'My Books', Icon: BookIcon,   tab: 'books' },
          { label: 'Settings', Icon: GearIcon,   tab: null,  onPress: () => router.push('/(app)/settings') },
        ].map(item => {
          const active = item.tab ? activeTab === item.tab : false;
          return (
            <TouchableOpacity
              key={item.label}
              style={s.navItem}
              onPress={item.onPress ?? (() => setActiveTab(item.tab))}
            >
              <item.Icon color={active ? C.primary : C.textMuted} size={22} />
              <Text style={active ? s.navLabelActive : s.navLabel}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Add Book Modal ─────────────────────────────────────────────── */}
      <Modal visible={showAddBook} transparent animationType="slide" onRequestClose={() => setShowAddBook(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>New Book</Text>
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
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowAddBook(false); setNewBookName(''); }}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.createBtn, !newBookName.trim() && s.createBtnDisabled]}
                onPress={() => createBookMutation.mutate(newBookName.trim())}
                disabled={!newBookName.trim() || createBookMutation.isPending}
              >
                <Text style={s.createBtnText}>{createBookMutation.isPending ? 'Creating...' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (C, Font) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },

  // Header
  header: { backgroundColor: C.primary, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.onPrimaryIconBg, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 20, fontFamily: Font.extraBold, color: C.onPrimary },
  adminLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontFamily: Font.extraBold, color: C.onPrimary, lineHeight: 24 },
  adminBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  adminBadgeText: { fontSize: 9, fontFamily: Font.bold, color: C.onPrimary, letterSpacing: 0.8 },
  headerSub: { fontSize: 12, fontFamily: Font.regular, color: C.onPrimaryMuted, lineHeight: 18, marginTop: 1 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.onPrimaryIconBg, alignItems: 'center', justifyContent: 'center' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.onPrimaryIconBg, borderWidth: 2, borderColor: C.onPrimarySubtle, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontFamily: Font.bold, color: C.onPrimary },

  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontFamily: Font.bold, color: C.onPrimary, lineHeight: 24, marginBottom: 2 },
  statLabel: { fontSize: 11, fontFamily: Font.medium, color: C.onPrimaryMuted, lineHeight: 16 },
  statSub:   { fontSize: 10, fontFamily: Font.regular, color: C.onPrimaryMuted, lineHeight: 14, marginTop: 1 },
  statDivider: { width: 1, height: 36, backgroundColor: C.onPrimaryIconBg },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 14,
  },
  tabItemActive: { borderBottomWidth: 2.5, borderBottomColor: C.primary },
  tabLabel:       { fontSize: 14, fontFamily: Font.medium, color: C.textMuted, lineHeight: 20 },
  tabLabelActive: { fontSize: 14, fontFamily: Font.bold,   color: C.primary,   lineHeight: 20 },

  // List
  listContent: { paddingBottom: 90 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontFamily: Font.bold,    color: C.text,     lineHeight: 22 },
  sectionSub:   { fontSize: 12, fontFamily: Font.regular, color: C.textMuted, lineHeight: 20 },

  // User card
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, marginHorizontal: 16, marginBottom: 10,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
    minHeight: 80,
  },
  userAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  userAvatarText: { fontSize: 16, fontFamily: Font.extraBold },
  userInfo: { flex: 1, marginRight: 10 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  userName: { fontSize: 14, fontFamily: Font.semiBold, color: C.text, lineHeight: 20, flexShrink: 1 },
  inactiveBadge: { backgroundColor: '#FEF2F2', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#FECACA' },
  inactiveBadgeText: { fontSize: 10, fontFamily: Font.bold, color: '#DC2626', lineHeight: 14 },
  userEmail: { fontSize: 12, fontFamily: Font.regular, color: C.textMuted, lineHeight: 18, marginBottom: 4 },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userMetaText: { fontSize: 11, fontFamily: Font.regular, color: C.textSubtle, lineHeight: 16 },
  userMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.textSubtle },

  // Book card
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
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontFamily: Font.bold,    color: C.text,     lineHeight: 26, marginBottom: 8 },
  emptySub:   { fontSize: 13, fontFamily: Font.regular, color: C.textMuted, lineHeight: 20, textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute', bottom: 80, alignSelf: 'center',
    backgroundColor: C.primary, borderRadius: 32,
    paddingHorizontal: 28, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52,
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
  navItem:        { flex: 1, alignItems: 'center', gap: 4, minHeight: 44, justifyContent: 'center' },
  navLabel:       { fontSize: 11, fontFamily: Font.medium, color: C.textMuted, lineHeight: 16 },
  navLabelActive: { fontSize: 11, fontFamily: Font.bold,   color: C.primary,   lineHeight: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  modalBox: { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 12 },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 },
  modalTitle:   { fontSize: 20, fontFamily: Font.extraBold, color: C.text,     lineHeight: 28, marginBottom: 4 },
  modalSub:     { fontSize: 13, fontFamily: Font.regular,   color: C.textMuted, lineHeight: 20, marginBottom: 20 },
  modalInput: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
    padding: 16, fontSize: 15, fontFamily: Font.regular,
    color: C.text, backgroundColor: C.background, marginBottom: 6, lineHeight: 22,
  },
  charCount:    { fontSize: 11, fontFamily: Font.regular, color: C.textSubtle, textAlign: 'right', marginBottom: 20, lineHeight: 16 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn:    { flex: 1, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingVertical: 15, alignItems: 'center', minHeight: 52 },
  cancelBtnText:     { fontFamily: Font.semiBold, fontSize: 15, color: C.textMuted, lineHeight: 22 },
  createBtn:         { flex: 1, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', minHeight: 52 },
  createBtnDisabled: { backgroundColor: C.border },
  createBtnText:     { fontFamily: Font.bold, fontSize: 15, color: C.onPrimary, lineHeight: 22 },
});
