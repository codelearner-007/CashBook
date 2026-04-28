import React, { useMemo, useCallback, memo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Switch, Alert, Modal, Pressable, Image, TextInput,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import SafeAreaView from '../components/ui/AppSafeAreaView';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import Toast from '../lib/toast';
import { apiGetAllUsers, apiToggleUserStatus, apiGetBooks } from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ── Helpers ───────────────────────────────────────────────────────────────────

const getInitials = (str = '') =>
  str.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const fmtStorage = (mb) =>
  mb < 1 ? `${Math.round(mb * 1024)} KB` : `${mb.toFixed(1)} MB`;

// ── Icons ─────────────────────────────────────────────────────────────────────

const SunIcon = ({ color, size = 18 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2, backgroundColor: color }} />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
      <View key={i} style={{
        position: 'absolute', width: 2, height: size * 0.22,
        backgroundColor: color, borderRadius: 1,
        top: size * 0.04, left: size / 2 - 1,
        transformOrigin: `1px ${size * 0.46}px`,
        transform: [{ rotate: `${deg}deg` }, { translateY: -size * 0.28 }],
      }} />
    ))}
  </View>
);

const MoonIcon = ({ color, size = 18 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.75, height: size * 0.75, borderRadius: size * 0.375, backgroundColor: color }} />
    <View style={{ position: 'absolute', right: 0, top: 0, width: size * 0.6, height: size * 0.6, borderRadius: size * 0.3, backgroundColor: 'transparent', borderWidth: size * 0.3, borderColor: 'transparent' }} />
  </View>
);

const XIcon = ({ color, size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ position: 'absolute', width: size, height: 2, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '45deg' }] }} />
    <View style={{ position: 'absolute', width: size, height: 2, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '-45deg' }] }} />
  </View>
);

// ── User Row ──────────────────────────────────────────────────────────────────

const UserRow = memo(({ item, onViewBooks, C, s }) => {
  const initials = getInitials(item.full_name);
  return (
    <TouchableOpacity style={s.userCard} onPress={onViewBooks} activeOpacity={0.7}>
      <View style={[s.userAvatar, { backgroundColor: item.is_active ? C.primaryLight : C.cardAlt, overflow: 'hidden' }]}>
        {item.avatar_url
          ? <ExpoImage source={{ uri: item.avatar_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          : <Text style={[s.userAvatarText, { color: item.is_active ? C.primary : C.textMuted }]}>{initials}</Text>
        }
      </View>
      <View style={s.userInfo}>
        <Text style={s.userName} numberOfLines={1}>{item.full_name}</Text>
        <Text style={s.userEmail} numberOfLines={1}>{item.email}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ── Stat Card ─────────────────────────────────────────────────────────────────

const StatCard = memo(({ label, value, sub, s }) => (
  <View style={s.statCard}>
    <Text style={s.statValue}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
    {sub ? <Text style={s.statSub}>{sub}</Text> : null}
  </View>
));

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AdminUsersScreen() {
  const router    = useRouter();
  const { C, Font, isDark, toggleTheme } = useTheme();
  const s         = useMemo(() => makeStyles(C, Font), [C, Font]);
  const user = useAuthStore((st) => st.user);
  const qc   = useQueryClient();
  const { data: adminProfile } = useProfile();
  const updateProfile = useUpdateProfile();

  const handleThemeToggle = useCallback(() => {
    const next = !isDark;
    toggleTheme();
    updateProfile.mutate(
      { is_dark_mode: next },
      {
        onError: () => {
          toggleTheme();
          Toast.show({ type: 'error', text1: 'Could not save theme preference.' });
        },
      },
    );
  }, [isDark, toggleTheme, updateProfile]);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: allUsers = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn:  apiGetAllUsers,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 10000,
  });

  const { data: books = [], refetch: refetchBooks } = useQuery({
    queryKey: ['books'],
    queryFn:  apiGetBooks,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  useFocusEffect(
    useCallback(() => {
      refetchUsers();
      refetchBooks();
    }, [refetchUsers, refetchBooks])
  );

  const toggleUserMutation = useMutation({
    mutationFn: ({ userId, isActive }) => apiToggleUserStatus(userId, isActive),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const selectedUser = useMemo(
    () => allUsers.find(u => u.id === selectedUserId) ?? null,
    [allUsers, selectedUserId],
  );

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(
      u => u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q),
    );
  }, [allUsers, searchQuery]);

  const handleViewBooks = useCallback((userId) => {
    setSelectedUserId(userId);
  }, []);

  const handleToggleUser = useCallback((userId, isActive) => {
    Alert.alert(
      isActive ? 'Activate User' : 'Deactivate User',
      `Are you sure you want to ${isActive ? 'activate' : 'deactivate'} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isActive ? 'Activate' : 'Deactivate',
          style: isActive ? 'default' : 'destructive',
          onPress: () => toggleUserMutation.mutate({ userId, isActive }),
        },
      ],
    );
  }, [toggleUserMutation]);

  const goToProfile = useCallback(() => {
    router.push('/(app)/dashboard/profile');
  }, [router]);

  const stats = useMemo(() => {
    const totalUsers   = allUsers.length;
    const activeUsers  = allUsers.filter(u => u.is_active).length;
    const totalBooks   = allUsers.reduce((acc, u) => acc + u.book_count, 0) + books.length;
    const totalStorage = allUsers.reduce((acc, u) => acc + u.storage_mb, 0);
    return { totalUsers, activeUsers, totalBooks, totalStorage };
  }, [allUsers, books]);

  const adminInitials = useMemo(() => getInitials(user?.full_name ?? 'AD'), [user]);

  const renderUser = useCallback(({ item }) => (
    <UserRow
      item={item}
      onViewBooks={() => handleViewBooks(item.id)}
      C={C}
      s={s}
    />
  ), [C, s, handleViewBooks]);

  const ListHeader = (
    <View>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>All Users</Text>
        <View style={s.sectionBadge}>
          <Text style={s.sectionBadgeText}>{allUsers.length} registered</Text>
        </View>
      </View>
      <View style={s.searchBar}>
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or email…"
          placeholderTextColor={C.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        <View style={s.searchBtn}>
          {/* magnifier circle */}
          <View style={{ width: 13, height: 13, borderRadius: 6.5, borderWidth: 2.5, borderColor: '#fff' }} />
          {/* handle */}
          <View style={{
            position: 'absolute', bottom: 5, right: 5,
            width: 6, height: 2.5, borderRadius: 1.5,
            backgroundColor: '#fff',
            transform: [{ rotate: '45deg' }],
          }} />
        </View>
      </View>
    </View>
  );

  const ListEmpty = !usersLoading && (
    <View style={s.empty}>
      <View style={s.emptyIconBox}>
        <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 36 * 0.42, height: 36 * 0.42, borderRadius: 36 * 0.21, borderWidth: 2, borderColor: C.primary, marginBottom: 2 }} />
          <View style={{ width: 36 * 0.65, height: 36 * 0.28, borderTopLeftRadius: 36 * 0.14, borderTopRightRadius: 36 * 0.14, borderWidth: 2, borderColor: C.primary, borderBottomWidth: 0 }} />
        </View>
      </View>
      <Text style={s.emptyTitle}>No users yet</Text>
      <Text style={s.emptySub}>Users will appear here{'\n'}once they sign up</Text>
    </View>
  );

  return (
    <SafeAreaView applyTop={false} style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerTop}>

          {/* Left — avatar + brand + badge */}
          <View style={s.headerLeft}>
            <TouchableOpacity
              onPress={goToProfile}
              activeOpacity={0.8}
              style={s.avatarCircle}
            >
              {adminProfile?.avatar_url
                ? <Image source={{ uri: adminProfile.avatar_url }} style={s.avatarImg} />
                : <Text style={s.avatarText}>{adminInitials}</Text>
              }
            </TouchableOpacity>
            <View style={s.brandBlock}>
              <Text style={s.brandLabel}>CASHBOOK</Text>
              <Text style={s.headerTitle}>Dashboard</Text>
              <View style={s.adminBadge}>
                <Text style={s.adminBadgeStar}>✦ </Text>
                <Text style={s.adminBadgeText}>SUPER ADMIN</Text>
              </View>
            </View>
          </View>

          {/* Right — theme toggle only */}
          <View style={s.headerActions}>
            <TouchableOpacity onPress={handleThemeToggle} style={s.iconBtn} activeOpacity={0.8}>
              {isDark
                ? <SunIcon  color={C.onPrimary} size={18} />
                : <MoonIcon color={C.onPrimary} size={18} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Divider */}
        <View style={s.headerDivider} />

        {/* Stats */}
        <View style={s.statsRow}>
          <StatCard label="Total Users"  value={stats.totalUsers}               sub={`${stats.activeUsers} active`} s={s} />
          <View style={s.statDivider} />
          <StatCard label="Total Books"  value={stats.totalBooks}               sub={null} s={s} />
          <View style={s.statDivider} />
          <StatCard label="Storage"      value={fmtStorage(stats.totalStorage)} sub="all users" s={s} />
        </View>
      </View>

      {/* ── Users List ───────────────────────────────────────────────────── */}
      <FlatList
        data={filteredUsers}
        keyExtractor={item => item.id}
        renderItem={renderUser}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
      />

      {/* ── User Books Modal ─────────────────────────────────────────────── */}
      {selectedUserId != null && selectedUser && (
        <Modal
          visible
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedUserId(null)}
        >
          <Pressable style={s.modalOverlay} onPress={() => setSelectedUserId(null)}>
            <Pressable style={s.modalBox} onPress={() => {}}>
              <View style={s.modalHandle} />

              {/* Header */}
              <View style={s.modalHeader}>
                <View style={s.modalHeaderLeft}>
                  <Text style={s.modalTitle} numberOfLines={1}>
                    {selectedUser.full_name}
                  </Text>
                  <Text style={s.modalSubtitle} numberOfLines={1}>
                    {selectedUser.email}
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.modalCloseBtn}
                  onPress={() => setSelectedUserId(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <XIcon color={C.textMuted} size={16} />
                </TouchableOpacity>
              </View>

              {/* Stats badges */}
              <View style={s.modalBadgeRow}>
                <View style={s.modalBadge}>
                  <Text style={s.modalBadgeText}>{selectedUser.book_count} books</Text>
                </View>
                <View style={s.modalBadge}>
                  <Text style={s.modalBadgeText}>{selectedUser.entry_count} entries</Text>
                </View>
                <View style={s.modalBadge}>
                  <Text style={s.modalBadgeText}>{fmtStorage(selectedUser.storage_mb)}</Text>
                </View>
              </View>

              {/* Active toggle */}
              <View style={s.modalToggleRow}>
                <View>
                  <Text style={s.modalToggleLabel}>Account Status</Text>
                  <Text style={s.modalToggleSub}>
                    {selectedUser.is_active ? 'User is currently active' : 'User is currently inactive'}
                  </Text>
                </View>
                <Switch
                  value={selectedUser.is_active}
                  onValueChange={(val) => handleToggleUser(selectedUser.id, val)}
                  trackColor={{ false: C.border, true: C.primaryMid }}
                  thumbColor={selectedUser.is_active ? C.primary : C.textSubtle}
                />
              </View>

            </Pressable>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (C, Font) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },

  // Header
  header:        { backgroundColor: C.primary, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Avatar circle (header left)
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.onPrimaryIconBg, borderWidth: 2, borderColor: C.onPrimarySubtle, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg:    { width: 44, height: 44, borderRadius: 22 },
  avatarText:   { fontSize: 14, fontFamily: Font.bold, color: C.onPrimary },

  // Brand block
  brandBlock:  {},
  brandLabel:  { fontSize: 9, fontFamily: Font.bold, color: C.onPrimaryMuted, letterSpacing: 1.8, marginBottom: 1 },
  headerTitle: { fontSize: 20, fontFamily: Font.extraBold, color: C.onPrimary, lineHeight: 26 },

  // SUPER ADMIN badge (gold/amber)
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: 'rgba(251,191,36,0.18)',
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.42)',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginTop: 5,
  },
  adminBadgeStar: { fontSize: 7, color: '#FCD34D', marginRight: 3, lineHeight: 12 },
  adminBadgeText: { fontSize: 9, fontFamily: Font.bold, color: '#FCD34D', letterSpacing: 1 },

  // Action buttons
  iconBtn: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Divider between brand row and stats
  headerDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.14)', marginBottom: 16 },

  // Stats
  statsRow:    { flexDirection: 'row', alignItems: 'center' },
  statCard:    { flex: 1, alignItems: 'center' },
  statValue:   { fontSize: 18, fontFamily: Font.bold,    color: C.onPrimary,      lineHeight: 24, marginBottom: 2 },
  statLabel:   { fontSize: 11, fontFamily: Font.medium,  color: C.onPrimaryMuted, lineHeight: 16 },
  statSub:     { fontSize: 10, fontFamily: Font.regular, color: C.onPrimaryMuted, lineHeight: 14, marginTop: 1 },
  statDivider: { width: 1, height: 36, backgroundColor: C.onPrimaryIconBg },

  // List
  listContent: { paddingBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10,
  },
  sectionTitle:     { fontSize: 15, fontFamily: Font.bold, color: C.text, lineHeight: 22 },
  sectionBadge:     { backgroundColor: C.primaryLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  sectionBadgeText: { fontSize: 11, fontFamily: Font.semiBold, color: C.primary, lineHeight: 16 },

  // Search bar
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card,
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 50,
    paddingLeft: 18, paddingRight: 4, paddingVertical: 4,
    borderWidth: 1.5, borderColor: C.border,
  },
  searchInput: {
    flex: 1, fontSize: 14, fontFamily: Font.regular,
    color: C.text, padding: 0, margin: 0, height: 40,
    outlineWidth: 0,
  },
  searchBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  // User card
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, marginHorizontal: 16, marginBottom: 10,
    borderRadius: 50, paddingVertical: 6, paddingRight: 18, paddingLeft: 6,
    borderWidth: 1.5, borderColor: C.border,
  },
  userAvatar:     { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  userAvatarText: { fontSize: 15, fontFamily: Font.extraBold },
  userInfo:       { flex: 1 },
  userName:       { fontSize: 14, fontFamily: Font.semiBold, color: C.text,     lineHeight: 20 },
  userEmail:      { fontSize: 12, fontFamily: Font.regular,  color: C.textMuted, lineHeight: 18, marginTop: 2 },

  // Empty
  empty:        { alignItems: 'center', paddingTop: 70, paddingHorizontal: 40 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle:   { fontSize: 17, fontFamily: Font.bold,    color: C.text,     lineHeight: 26, marginBottom: 8 },
  emptySub:     { fontSize: 13, fontFamily: Font.regular, color: C.textMuted, lineHeight: 20, textAlign: 'center' },

  // ── User Books Modal ──────────────────────────────────────────────────────
  modalOverlay:  { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  modalBox:      { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 12 },
  modalHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 },

  modalHeader:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  modalHeaderLeft: { flex: 1, marginRight: 12 },
  modalTitle:      { fontSize: 18, fontFamily: Font.extraBold, color: C.text,     lineHeight: 26 },
  modalSubtitle:   { fontSize: 12, fontFamily: Font.regular,   color: C.textMuted, lineHeight: 18, marginTop: 2 },
  modalCloseBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: C.cardAlt, alignItems: 'center', justifyContent: 'center' },

  modalBadgeRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  modalBadge:     { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.cardAlt },
  modalBadgeText: { fontSize: 11, fontFamily: Font.medium, color: C.textMuted, lineHeight: 18 },

  modalToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.cardAlt, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  modalToggleLabel: { fontSize: 14, fontFamily: Font.semiBold, color: C.text,     lineHeight: 20 },
  modalToggleSub:   { fontSize: 12, fontFamily: Font.regular,  color: C.textMuted, lineHeight: 18, marginTop: 2 },

});
