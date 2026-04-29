import React, { useMemo, useCallback, memo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Switch, Modal, Pressable, Image,
} from 'react-native';
import SearchBar from '../components/ui/SearchBar';
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

const LockIcon = ({ color, size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.52, height: size * 0.42,
      borderTopLeftRadius: size * 0.26, borderTopRightRadius: size * 0.26,
      borderWidth: 1.8, borderColor: color, borderBottomWidth: 0,
    }} />
    <View style={{
      width: size * 0.78, height: size * 0.54,
      borderRadius: size * 0.1,
      borderWidth: 1.8, borderColor: color,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <View style={{ width: size * 0.18, height: size * 0.22, borderRadius: size * 0.1, borderWidth: 1.8, borderColor: color }} />
    </View>
  </View>
);

const CheckIcon = ({ color, size = 20 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.58, height: size * 0.32,
      borderLeftWidth: 2.5, borderBottomWidth: 2.5,
      borderColor: color,
      transform: [{ rotate: '-45deg' }, { translateY: -size * 0.04 }],
    }} />
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
  const [confirmState, setConfirmState] = useState(null);

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
    const target = allUsers.find(u => u.id === userId);
    setConfirmState({ userId, isActive, userName: target?.full_name ?? '' });
  }, [allUsers]);

  const handleConfirmToggle = useCallback(() => {
    if (!confirmState) return;
    toggleUserMutation.mutate({ userId: confirmState.userId, isActive: confirmState.isActive });
    setConfirmState(null);
  }, [confirmState, toggleUserMutation]);

  const goToProfile = useCallback(() => {
    router.push('/(app)/admin-profile');
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
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search by name or email…"
      />
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

      {/* ── User Detail Modal ────────────────────────────────────────────── */}
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

              {/* Close */}
              <TouchableOpacity
                style={s.modalCloseBtn}
                onPress={() => setSelectedUserId(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <XIcon color={C.textMuted} size={13} />
              </TouchableOpacity>

              {/* ─ Avatar + identity ─ */}
              <View style={s.modalAvatarSection}>
                <View style={[s.modalAvatarRing, {
                  borderColor: selectedUser.is_active ? C.cashIn : C.border,
                }]}>
                  <View style={[s.modalAvatarCircle, {
                    backgroundColor: selectedUser.is_active ? C.cashInLight : C.cardAlt,
                  }]}>
                    {selectedUser.avatar_url
                      ? <ExpoImage
                          source={{ uri: selectedUser.avatar_url }}
                          style={{ width: '100%', height: '100%', borderRadius: 30 }}
                          contentFit="cover"
                        />
                      : <Text style={[s.modalAvatarInitials, {
                          color: selectedUser.is_active ? C.cashIn : C.textMuted,
                        }]}>
                          {getInitials(selectedUser.full_name)}
                        </Text>
                    }
                  </View>
                  <View style={[s.modalAvatarDot, {
                    backgroundColor: selectedUser.is_active ? C.cashIn : C.textSubtle,
                  }]} />
                </View>

                <Text style={s.modalUserName}>{selectedUser.full_name}</Text>
                <Text style={s.modalUserEmail}>{selectedUser.email}</Text>

                <View style={[s.modalStatusPill, {
                  backgroundColor: selectedUser.is_active ? C.cashInLight : C.cashOutLight,
                  borderColor: selectedUser.is_active ? C.cashIn : C.cashOut,
                }]}>
                  <View style={[s.modalStatusDot, {
                    backgroundColor: selectedUser.is_active ? C.cashIn : C.cashOut,
                  }]} />
                  <Text style={[s.modalStatusPillText, {
                    color: selectedUser.is_active ? C.cashIn : C.cashOut,
                  }]}>
                    {selectedUser.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              {/* ─ Stats row ─ */}
              <View style={s.modalStatsRow}>
                <View style={s.modalStatItem}>
                  <Text style={s.modalStatValue}>{selectedUser.book_count}</Text>
                  <Text style={s.modalStatLabel}>Books</Text>
                </View>
                <View style={s.modalStatDivider} />
                <View style={s.modalStatItem}>
                  <Text style={s.modalStatValue}>{selectedUser.entry_count}</Text>
                  <Text style={s.modalStatLabel}>Entries</Text>
                </View>
                <View style={s.modalStatDivider} />
                <View style={s.modalStatItem}>
                  <Text style={s.modalStatValue}>{fmtStorage(selectedUser.storage_mb)}</Text>
                  <Text style={s.modalStatLabel}>Storage</Text>
                </View>
              </View>

              {/* ─ Account status toggle ─ */}
              <View style={[s.modalToggleCard, {
                backgroundColor: selectedUser.is_active ? C.cashInLight : C.cashOutLight,
                borderColor: selectedUser.is_active
                  ? `${C.cashIn}55`
                  : `${C.cashOut}55`,
              }]}>
                <View style={s.modalToggleLeft}>
                  <View style={[s.modalToggleIconBox, {
                    backgroundColor: selectedUser.is_active
                      ? `${C.cashIn}22`
                      : `${C.cashOut}22`,
                  }]}>
                    <LockIcon
                      color={selectedUser.is_active ? C.cashIn : C.cashOut}
                      size={16}
                    />
                  </View>
                  <View>
                    <Text style={[s.modalToggleTitle, {
                      color: selectedUser.is_active ? C.cashIn : C.cashOut,
                    }]}>
                      Account Status
                    </Text>
                    <Text style={s.modalToggleSub}>
                      {selectedUser.is_active ? 'Can access the app' : 'Blocked from the app'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={selectedUser.is_active}
                  onValueChange={(val) => handleToggleUser(selectedUser.id, val)}
                  trackColor={{
                    false: `${C.cashOut}55`,
                    true:  `${C.cashIn}77`,
                  }}
                  thumbColor={selectedUser.is_active ? C.cashIn : C.cashOut}
                />
              </View>

            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* ── Confirm Activate / Deactivate Modal ──────────────────────────── */}
      {confirmState && (
        <Modal
          visible
          animationType="fade"
          transparent
          onRequestClose={() => setConfirmState(null)}
        >
          <Pressable style={s.confirmOverlay} onPress={() => setConfirmState(null)}>
            <Pressable style={s.confirmBox} onPress={() => {}}>

              {/* Icon circle */}
              <View style={[s.confirmIconCircle, {
                backgroundColor: confirmState.isActive ? C.cashInLight : C.cashOutLight,
              }]}>
                <View style={[s.confirmIconInner, {
                  backgroundColor: confirmState.isActive
                    ? `${C.cashIn}22`
                    : `${C.cashOut}22`,
                }]}>
                  {confirmState.isActive
                    ? <CheckIcon color={C.cashIn} size={26} />
                    : <LockIcon  color={C.cashOut} size={22} />
                  }
                </View>
              </View>

              {/* Title */}
              <Text style={s.confirmTitle}>
                {confirmState.isActive ? 'Activate Account' : 'Deactivate Account'}
              </Text>

              {/* User name pill */}
              {confirmState.userName ? (
                <View style={[s.confirmNamePill, {
                  backgroundColor: confirmState.isActive ? C.cashInLight : C.cashOutLight,
                }]}>
                  <Text style={[s.confirmNameText, {
                    color: confirmState.isActive ? C.cashIn : C.cashOut,
                  }]} numberOfLines={1}>
                    {confirmState.userName}
                  </Text>
                </View>
              ) : null}

              {/* Body */}
              <Text style={s.confirmBody}>
                {confirmState.isActive
                  ? 'This user will regain full access to the app immediately.'
                  : 'This user will be blocked from the app until reactivated.'}
              </Text>

              {/* Buttons */}
              <View style={s.confirmBtns}>
                <TouchableOpacity
                  style={s.confirmCancelBtn}
                  onPress={() => setConfirmState(null)}
                  activeOpacity={0.7}
                >
                  <Text style={s.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.confirmActionBtn, {
                    backgroundColor: confirmState.isActive ? C.cashIn : C.cashOut,
                  }]}
                  onPress={handleConfirmToggle}
                  activeOpacity={0.85}
                >
                  <Text style={s.confirmActionText}>
                    {confirmState.isActive ? 'Activate' : 'Deactivate'}
                  </Text>
                </TouchableOpacity>
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

  // ── User Detail Modal ─────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: C.card,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.border, alignSelf: 'center', marginBottom: 8,
  },
  modalCloseBtn: {
    position: 'absolute', top: 16, right: 20,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.cardAlt, alignItems: 'center', justifyContent: 'center',
  },

  // Avatar section
  modalAvatarSection: { alignItems: 'center', paddingTop: 8, paddingBottom: 20 },
  modalAvatarRing: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  modalAvatarCircle: {
    width: 66, height: 66, borderRadius: 33,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  modalAvatarInitials: { fontSize: 22, fontFamily: Font.extraBold },
  modalAvatarDot: {
    position: 'absolute', bottom: 3, right: 3,
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2.5, borderColor: C.card,
  },
  modalUserName: {
    fontSize: 18, fontFamily: Font.extraBold, color: C.text,
    lineHeight: 26, marginBottom: 4,
  },
  modalUserEmail: {
    fontSize: 12, fontFamily: Font.regular, color: C.textMuted,
    lineHeight: 18, marginBottom: 12,
  },
  modalStatusPill: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 50, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 5, gap: 6,
  },
  modalStatusDot: { width: 6, height: 6, borderRadius: 3 },
  modalStatusPillText: { fontSize: 12, fontFamily: Font.semiBold, lineHeight: 16 },

  // Stats row
  modalStatsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.cardAlt, borderRadius: 16,
    marginBottom: 14, borderWidth: 1, borderColor: C.border,
  },
  modalStatItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  modalStatDivider: { width: 1, height: 32, backgroundColor: C.border },
  modalStatValue: {
    fontSize: 15, fontFamily: Font.bold, color: C.text,
    lineHeight: 22, marginBottom: 2,
  },
  modalStatLabel: { fontSize: 11, fontFamily: Font.medium, color: C.textMuted, lineHeight: 16 },

  // Status toggle card
  modalToggleCard: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16, padding: 14, borderWidth: 1,
  },
  modalToggleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12, gap: 12 },
  modalToggleIconBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalToggleTitle: { fontSize: 14, fontFamily: Font.semiBold, lineHeight: 20 },
  modalToggleSub: { fontSize: 12, fontFamily: Font.regular, color: C.textMuted, lineHeight: 18, marginTop: 2 },

  // ── Confirm Modal ────────────────────────────────────────────────────────────
  confirmOverlay: {
    flex: 1, backgroundColor: C.overlay,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  confirmBox: {
    width: '100%', backgroundColor: C.card,
    borderRadius: 28, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 28,
    alignItems: 'center',
  },
  confirmIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  confirmIconInner: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmTitle: {
    fontSize: 20, fontFamily: Font.extraBold, color: C.text,
    lineHeight: 28, marginBottom: 10, textAlign: 'center',
  },
  confirmNamePill: {
    borderRadius: 50, paddingHorizontal: 14, paddingVertical: 5,
    marginBottom: 12, maxWidth: '80%',
  },
  confirmNameText: {
    fontSize: 13, fontFamily: Font.semiBold, lineHeight: 18, textAlign: 'center',
  },
  confirmBody: {
    fontSize: 13, fontFamily: Font.regular, color: C.textMuted,
    lineHeight: 20, textAlign: 'center', marginBottom: 28,
  },
  confirmBtns: {
    flexDirection: 'row', gap: 10, width: '100%',
  },
  confirmCancelBtn: {
    flex: 1, height: 48, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 14, fontFamily: Font.semiBold, color: C.textMuted,
  },
  confirmActionBtn: {
    flex: 1, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmActionText: {
    fontSize: 14, fontFamily: Font.semiBold, color: '#FFFFFF',
  },

});
