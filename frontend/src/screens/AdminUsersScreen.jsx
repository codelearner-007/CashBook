import React, { useMemo, useCallback, memo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Switch, Alert, Modal, Pressable,
} from 'react-native';
import SafeAreaView from '../components/ui/AppSafeAreaView';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
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

const UserRow = memo(({ item, onToggle, onViewBooks, C, s }) => {
  const initials = getInitials(item.full_name);
  return (
    <View style={s.userCard}>
      <TouchableOpacity style={s.userCardLeft} onPress={onViewBooks} activeOpacity={0.7}>
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
      </TouchableOpacity>
      <Switch
        value={item.is_active}
        onValueChange={(val) => onToggle(item.id, val)}
        trackColor={{ false: C.border, true: C.primaryMid }}
        thumbColor={item.is_active ? C.primary : C.textSubtle}
      />
    </View>
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

  const [selectedUser, setSelectedUser] = useState(null);

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

  const handleViewBooks = useCallback((user) => {
    setSelectedUser(user);
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
    router.push('/(app)/settings/profile');
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
      onToggle={handleToggleUser}
      onViewBooks={() => handleViewBooks(item)}
      C={C}
      s={s}
    />
  ), [C, s, handleToggleUser, handleViewBooks]);

  const ListHeader = (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>All Users</Text>
      <View style={s.sectionBadge}>
        <Text style={s.sectionBadgeText}>{allUsers.length} registered</Text>
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

          {/* Left — logo + brand + badge */}
          <View style={s.headerLeft}>
            <View style={s.logoBox}>
              <Text style={s.logoLetter}>C</Text>
            </View>
            <View style={s.brandBlock}>
              <Text style={s.brandLabel}>CASHBOOK</Text>
              <Text style={s.headerTitle}>Dashboard</Text>
              <View style={s.adminBadge}>
                <Text style={s.adminBadgeStar}>✦ </Text>
                <Text style={s.adminBadgeText}>SUPER ADMIN</Text>
              </View>
            </View>
          </View>

          {/* Right — theme toggle + profile avatar */}
          <View style={s.headerActions}>
            <TouchableOpacity onPress={toggleTheme} style={s.iconBtn} activeOpacity={0.8}>
              {isDark
                ? <SunIcon  color={C.onPrimary} size={18} />
                : <MoonIcon color={C.onPrimary} size={18} />}
            </TouchableOpacity>
            <TouchableOpacity style={s.avatarBtn} onPress={goToProfile} activeOpacity={0.8}>
              <Text style={s.avatarText}>{adminInitials}</Text>
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
        data={allUsers}
        keyExtractor={item => item.id}
        renderItem={renderUser}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
      />

      {/* ── User Books Modal ─────────────────────────────────────────────── */}
      {selectedUser && (
        <Modal
          visible
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedUser(null)}
        >
          <Pressable style={s.modalOverlay} onPress={() => setSelectedUser(null)}>
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
                  onPress={() => setSelectedUser(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <XIcon color={C.textMuted} size={16} />
                </TouchableOpacity>
              </View>

              {/* Badge row */}
              <View style={s.modalBadgeRow}>
                <View style={s.modalBadge}>
                  <Text style={s.modalBadgeText}>
                    {selectedUser.book_count} books
                  </Text>
                </View>
                <View style={s.modalBadge}>
                  <Text style={s.modalBadgeText}>
                    {selectedUser.entry_count} entries
                  </Text>
                </View>
                <View style={s.modalBadge}>
                  <Text style={s.modalBadgeText}>
                    {fmtStorage(selectedUser.storage_mb)}
                  </Text>
                </View>
                <View style={[s.modalBadge, selectedUser.is_active ? s.modalBadgeActive : s.modalBadgeInactive]}>
                  <Text style={[s.modalBadgeText, selectedUser.is_active ? s.modalBadgeTextActive : s.modalBadgeTextInactive]}>
                    {selectedUser.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
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

  // Logo
  logoBox: {
    width: 54, height: 54, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.38)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoLetter: { fontSize: 26, fontFamily: Font.extraBold, color: C.onPrimary },

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
  avatarBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontFamily: Font.bold, color: C.onPrimary },

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

  // User card
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, marginHorizontal: 16, marginBottom: 10,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
    minHeight: 80,
  },
  userCardLeft:   { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  userAvatar:     { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  userAvatarText: { fontSize: 16, fontFamily: Font.extraBold },
  userInfo:       { flex: 1, marginRight: 10 },
  userNameRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  userName:       { fontSize: 14, fontFamily: Font.semiBold, color: C.text,     lineHeight: 20, flexShrink: 1 },
  inactiveBadge:  { backgroundColor: '#FEF2F2', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#FECACA' },
  inactiveBadgeText: { fontSize: 10, fontFamily: Font.bold, color: '#DC2626', lineHeight: 14 },
  userEmail:      { fontSize: 12, fontFamily: Font.regular, color: C.textMuted, lineHeight: 18, marginBottom: 4 },
  userMeta:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userMetaText:   { fontSize: 11, fontFamily: Font.regular, color: C.textSubtle, lineHeight: 16 },
  userMetaDot:    { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.textSubtle },

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

  modalBadgeRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  modalBadge:           { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.cardAlt },
  modalBadgeActive:     { backgroundColor: C.primaryLight, borderWidth: 1, borderColor: C.primaryMid },
  modalBadgeInactive:   { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  modalBadgeText:       { fontSize: 11, fontFamily: Font.medium, color: C.textMuted, lineHeight: 18 },
  modalBadgeTextActive: { color: C.primary },
  modalBadgeTextInactive: { color: '#DC2626' },

});
