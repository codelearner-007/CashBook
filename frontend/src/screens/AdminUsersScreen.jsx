import React, { useMemo, useCallback, memo, useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Switch, Modal, Pressable, Image, Animated, ScrollView,
} from 'react-native';
import SearchBar from '../components/ui/SearchBar';
import { Font } from '../constants/fonts';
import { Image as ExpoImage } from 'expo-image';
import SafeAreaView from '../components/ui/AppSafeAreaView';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import Toast from '../lib/toast';
import { apiGetAllUsers, apiToggleUserStatus, apiGetBooks } from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ── Super Admin header badge (vibrant + twinkling) ───────────────────────────

const SA_SPARKS = [
  { top: -4, left:  2 },
  { top: -4, right: 4 },
  { bottom: -4, left: 10 },
  { bottom: -4, right: 2 },
];
const SA_SPARK_COLORS = ['#FCD34D', '#F59E0B', '#FDE68A', '#D97706'];

function SuperAdminBadge() {
  const glow   = useRef(new Animated.Value(1)).current;
  const sparks = useRef(SA_SPARKS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.45, duration: 800, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 1.0,  duration: 800, useNativeDriver: true }),
        Animated.delay(200),
      ])
    ).start();

    sparks.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 280),
          Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }),
          Animated.delay(700),
        ])
      ).start();
    });

    return () => [glow, ...sparks].forEach(a => a.stopAnimation());
  }, []);

  return (
    <View style={{ position: 'relative', alignSelf: 'flex-start' }}>
      <Animated.View style={[sab.badge, { opacity: glow }]}>
        <View style={sab.dot} />
        <Text style={sab.text}>Super Admin</Text>
      </Animated.View>
      {SA_SPARKS.map((pos, i) => (
        <Animated.View
          key={i}
          style={[sab.spark, pos, {
            backgroundColor: SA_SPARK_COLORS[i],
            opacity: sparks[i],
            transform: [{ rotate: '45deg' }, { scale: sparks[i] }],
          }]}
        />
      ))}
    </View>
  );
}

const sab = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(251,191,36,0.22)',
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.55)',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  dot:   { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FCD34D' },
  text:  { fontSize: 10, fontFamily: Font.semiBold, color: '#FCD34D', letterSpacing: 0.4 },
  spark: { position: 'absolute', width: 4, height: 4, borderRadius: 1 },
});

// ── Constants ─────────────────────────────────────────────────────────────────

const DATE_FILTERS = [
  { key: 'all',   label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'last7', label: 'Last 7 Days' },
  { key: 'month', label: 'This Month' },
  { key: 'year',  label: 'This Year' },
];

const STATUS_OPTIONS = [
  { key: 'all',      label: 'All Users' },
  { key: 'active',   label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
];

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

const ChevronDownIcon = ({ color, size = 14 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.55, height: size * 0.55,
      borderRightWidth: 2, borderBottomWidth: 2,
      borderColor: color,
      transform: [{ rotate: '45deg' }, { translateY: -size * 0.12 }],
    }} />
  </View>
);

// ── User Row ──────────────────────────────────────────────────────────────────

const UserRow = memo(({ item, onViewBooks, C, s }) => {
  const initials = getInitials(item.full_name);
  return (
    <TouchableOpacity
      style={[s.userCard, item.isAdmin && { borderColor: 'rgba(251,191,36,0.45)', backgroundColor: 'rgba(251,191,36,0.07)' }]}
      onPress={onViewBooks}
      activeOpacity={0.7}
    >
      <View style={[s.userAvatar, { backgroundColor: item.isAdmin ? 'rgba(251,191,36,0.18)' : item.is_active ? C.primaryLight : C.cardAlt, overflow: 'hidden' }]}>
        {item.avatar_url
          ? <ExpoImage source={{ uri: item.avatar_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          : <Text style={[s.userAvatarText, { color: item.isAdmin ? '#D97706' : item.is_active ? C.primary : C.textMuted }]}>{initials}</Text>
        }
      </View>
      <View style={s.userInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <Text style={[s.userName, { flex: 1 }]} numberOfLines={1}>{item.full_name}</Text>
          {item.isAdmin ? (
            <View style={[s.userStatusPill, { backgroundColor: 'rgba(251,191,36,0.18)', borderColor: 'rgba(251,191,36,0.5)' }]}>
              <View style={[s.userStatusDot, { backgroundColor: '#FCD34D' }]} />
              <Text style={[s.userStatusText, { color: '#D97706' }]}>Super Admin</Text>
            </View>
          ) : (
            <View style={[s.userStatusPill, {
              backgroundColor: item.is_active ? C.cashInLight : C.dangerLight,
              borderColor:     item.is_active ? `${C.cashIn}55` : `${C.danger}55`,
            }]}>
              <View style={[s.userStatusDot, { backgroundColor: item.is_active ? C.cashIn : C.danger }]} />
              <Text style={[s.userStatusText, { color: item.is_active ? C.cashIn : C.danger }]}>
                {item.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          )}
        </View>
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

  const [selectedUserId,  setSelectedUserId]  = useState(null);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [confirmState,    setConfirmState]    = useState(null);
  const [activeFilter,    setActiveFilter]    = useState('all'); // 'all' | 'active' | 'inactive'
  const [dateFilter,      setDateFilter]      = useState('all'); // 'all' | 'today' | 'last7' | 'month' | 'year'
  const [datePickerOpen,   setDatePickerOpen]   = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [isFocused,       setIsFocused]       = useState(false);

  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn:  apiGetAllUsers,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: isFocused ? 10000 : false,
  });

  const { data: books = [] } = useQuery({
    queryKey: ['books'],
    queryFn:  apiGetBooks,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['books'] });
      return () => setIsFocused(false);
    }, [qc])
  );

  const toggleUserMutation = useMutation({
    mutationFn: ({ userId, isActive }) => apiToggleUserStatus(userId, isActive),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let users = !q ? allUsers : allUsers.filter(
      u => u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q),
    );
    if (dateFilter !== 'all') {
      const now = new Date();
      users = users.filter(u => {
        if (!u.created_at) return true;
        const d = new Date(u.created_at);
        if (dateFilter === 'today')
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
        if (dateFilter === 'last7')  return (now - d) / 86400000 <= 7;
        if (dateFilter === 'month')  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (dateFilter === 'year')   return d.getFullYear() === now.getFullYear();
        return true;
      });
    }
    if (activeFilter === 'active')   return users.filter(u =>  u.is_active);
    if (activeFilter === 'inactive') return users.filter(u => !u.is_active);
    return users;
  }, [allUsers, searchQuery, activeFilter, dateFilter]);

  const adminItem = useMemo(() => ({
    id:          user?.id ?? '__admin__',
    full_name:   adminProfile?.full_name ?? user?.full_name ?? 'Admin',
    email:       adminProfile?.email     ?? user?.email     ?? '',
    avatar_url:  adminProfile?.avatar_url ?? null,
    is_active:   true,
    isAdmin:     true,
    book_count:  books.length,
    storage_mb:  adminProfile?.storage_mb ?? 0,
    entry_count: 0,
    created_at:  null,
  }), [user, adminProfile, books.length]);

  const listData = useMemo(() => [adminItem, ...filteredUsers], [adminItem, filteredUsers]);

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    if (adminItem.id === selectedUserId) return adminItem;
    return allUsers.find(u => u.id === selectedUserId) ?? null;
  }, [allUsers, selectedUserId, adminItem]);

  const handleViewBooks = useCallback((userId) => {
    setSelectedUserId(userId);
  }, []);

  const handleToggleUser = useCallback((userId, isActive) => {
    if (!isActive) {
      // Deactivating — require confirmation
      const target = allUsers.find(u => u.id === userId);
      setConfirmState({ userId, isActive, userName: target?.full_name ?? '' });
    } else {
      // Activating — proceed immediately
      toggleUserMutation.mutate({ userId, isActive });
    }
  }, [allUsers, toggleUserMutation]);

  const handleConfirmToggle = useCallback(() => {
    if (!confirmState) return;
    toggleUserMutation.mutate({ userId: confirmState.userId, isActive: confirmState.isActive });
    setConfirmState(null);
  }, [confirmState, toggleUserMutation]);

  const goToProfile = useCallback(() => {
    router.push('/(app)/admin-profile');
  }, [router]);

  const stats = useMemo(() => {
    const isAll = activeFilter === 'all' && dateFilter === 'all' && !searchQuery.trim();
    const totalUsers   = filteredUsers.length;
    const activeUsers  = filteredUsers.filter(u => u.is_active).length;
    const totalBooks   = filteredUsers.reduce((acc, u) => acc + u.book_count, 0) + (isAll ? books.length : 0);
    const totalStorage = filteredUsers.reduce((acc, u) => acc + u.storage_mb, 0);
    return { totalUsers, activeUsers, totalBooks, totalStorage, isAll };
  }, [filteredUsers, books, activeFilter, dateFilter, searchQuery]);

  const adminInitials = useMemo(() => getInitials(user?.full_name ?? 'AD'), [user]);

  const renderUser = useCallback(({ item }) => (
    <UserRow
      item={item}
      onViewBooks={() => handleViewBooks(item.id)}
      C={C}
      s={s}
    />
  ), [C, s, handleViewBooks]);

  const isAllSelected    = activeFilter === 'all' && dateFilter === 'all';
  const currentDateLabel = DATE_FILTERS.find(d => d.key === dateFilter)?.label ?? 'All Time';
  const statusIsActive  = activeFilter !== 'all';
  const statusDotColor  = statusIsActive ? C.primary : C.textMuted;
  const statusBg        = statusIsActive ? C.primary : C.card;
  const statusBorder    = statusIsActive ? C.primary : C.border;
  const statusTextColor = statusIsActive ? '#fff' : C.textMuted;
  const statusLabel     = STATUS_OPTIONS.find(o => o.key === activeFilter && o.key !== 'all')?.label ?? 'Status';
  const STATUS_PICKER   = STATUS_OPTIONS.filter(o => o.key !== 'all');

  const ListHeader = (
    <View>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search by name or email…"
      />

      {/* ── Single filter row ─────────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRowContent}
        style={s.filterRow}
      >
        {/* ALL */}
        <TouchableOpacity
          onPress={() => { setActiveFilter('all'); setDateFilter('all'); }}
          activeOpacity={0.75}
          style={[s.filterChip, { borderColor: isAllSelected ? C.primary : C.border, backgroundColor: isAllSelected ? C.primary : C.card }]}
        >
          <Text style={[s.filterChipText, { color: isAllSelected ? '#fff' : C.textMuted }]}>All</Text>
        </TouchableOpacity>

        {/* Status picker button */}
        <TouchableOpacity
          onPress={() => setStatusPickerOpen(true)}
          activeOpacity={0.75}
          style={[s.filterChip, { borderColor: statusBorder, backgroundColor: statusBg, gap: 5 }]}
        >
          <View style={[s.filterDot, { backgroundColor: statusDotColor }]} />
          <Text style={[s.filterChipText, { color: statusTextColor }]}>{statusLabel}</Text>
          <ChevronDownIcon color={statusTextColor} size={12} />
        </TouchableOpacity>

        {/* Date picker button */}
        <TouchableOpacity
          onPress={() => setDatePickerOpen(true)}
          activeOpacity={0.75}
          style={[s.filterChip, { borderColor: dateFilter !== 'all' ? C.primary : C.border, backgroundColor: dateFilter !== 'all' ? C.primary : C.card, gap: 5 }]}
        >
          <Text style={[s.filterChipText, { color: dateFilter !== 'all' ? '#fff' : C.textMuted }]}>{currentDateLabel}</Text>
          <ChevronDownIcon color={dateFilter !== 'all' ? '#fff' : C.textMuted} size={12} />
        </TouchableOpacity>
      </ScrollView>

      {/* Divider below filters / above user list */}
      <View style={s.listDivider} />
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
              <Text style={s.headerTitle}>Dashboard</Text>
              <SuperAdminBadge />
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
          <StatCard label="Storage"      value={fmtStorage(stats.totalStorage)} sub={stats.isAll ? 'all users' : 'filtered'} s={s} />
        </View>
      </View>

      {/* ── Users List ───────────────────────────────────────────────────── */}
      <FlatList
        data={listData}
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
          onRequestClose={() => confirmState ? setConfirmState(null) : setSelectedUserId(null)}
        >
          {/* Wrapper fills the Modal so the confirm overlay can sit absolutely on top */}
          <View style={{ flex: 1 }}>
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
                    backgroundColor: selectedUser.isAdmin ? 'rgba(251,191,36,0.18)' : selectedUser.is_active ? C.cashInLight : C.dangerLight,
                    borderColor:     selectedUser.isAdmin ? 'rgba(251,191,36,0.5)'  : selectedUser.is_active ? C.cashIn      : C.danger,
                  }]}>
                    <View style={[s.modalStatusDot, {
                      backgroundColor: selectedUser.isAdmin ? '#FCD34D' : selectedUser.is_active ? C.cashIn : C.danger,
                    }]} />
                    <Text style={[s.modalStatusPillText, {
                      color: selectedUser.isAdmin ? '#D97706' : selectedUser.is_active ? C.cashIn : C.danger,
                    }]}>
                      {selectedUser.isAdmin ? 'Super Admin' : selectedUser.is_active ? 'Active' : 'Inactive'}
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

                {/* ─ Account status toggle / locked ─ */}
                {selectedUser.isAdmin ? (
                  <View style={[s.modalToggleCard, {
                    backgroundColor: 'rgba(251,191,36,0.12)',
                    borderColor: 'rgba(251,191,36,0.4)',
                  }]}>
                    <View style={s.modalToggleLeft}>
                      <View style={[s.modalToggleIconBox, { backgroundColor: 'rgba(251,191,36,0.18)' }]}>
                        <LockIcon color="#D97706" size={14} />
                      </View>
                      <View>
                        <Text style={[s.modalToggleTitle, { color: '#D97706' }]}>Account Status</Text>
                        <Text style={s.modalToggleSub}>Super Admin — always active</Text>
                      </View>
                    </View>
                    <View style={[s.userStatusPill, { backgroundColor: 'rgba(251,191,36,0.18)', borderColor: 'rgba(251,191,36,0.5)' }]}>
                      <View style={[s.userStatusDot, { backgroundColor: '#FCD34D' }]} />
                      <Text style={[s.userStatusText, { color: '#D97706' }]}>Active</Text>
                    </View>
                  </View>
                ) : (
                  <View style={[s.modalToggleCard, {
                    backgroundColor: selectedUser.is_active ? C.cashInLight : C.dangerLight,
                    borderColor: selectedUser.is_active
                      ? `${C.cashIn}55`
                      : `${C.danger}55`,
                  }]}>
                    <View style={s.modalToggleLeft}>
                      <View style={[s.modalToggleIconBox, {
                        backgroundColor: selectedUser.is_active
                          ? `${C.cashIn}22`
                          : `${C.danger}22`,
                      }]}>
                        <LockIcon
                          color={selectedUser.is_active ? C.cashIn : C.danger}
                          size={14}
                        />
                      </View>
                      <View>
                        <Text style={[s.modalToggleTitle, {
                          color: selectedUser.is_active ? C.cashIn : C.danger,
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
                        false: `${C.danger}55`,
                        true:  `${C.cashIn}77`,
                      }}
                      thumbColor={selectedUser.is_active ? C.cashIn : C.danger}
                    />
                  </View>
                )}

              </Pressable>
            </Pressable>

            {/* ── Confirm Deactivate — inline overlay (iOS-safe, no nested Modal) ── */}
            {confirmState && (
              <Pressable
                style={[StyleSheet.absoluteFill, s.confirmOverlay]}
                onPress={() => setConfirmState(null)}
              >
                <Pressable style={s.confirmBox} onPress={() => {}}>

                  {/* Icon circle */}
                  <View style={[s.confirmIconCircle, { backgroundColor: C.dangerLight }]}>
                    <View style={[s.confirmIconInner, { backgroundColor: `${C.danger}22` }]}>
                      <LockIcon color={C.danger} size={16} />
                    </View>
                  </View>

                  {/* Title */}
                  <Text style={s.confirmTitle}>Deactivate Account</Text>

                  {/* User name pill */}
                  {confirmState.userName ? (
                    <View style={[s.confirmNamePill, { backgroundColor: C.dangerLight }]}>
                      <Text style={[s.confirmNameText, { color: C.danger }]} numberOfLines={1}>
                        {confirmState.userName}
                      </Text>
                    </View>
                  ) : null}

                  {/* Body */}
                  <Text style={s.confirmBody}>
                    This user will be blocked from the app until reactivated.
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
                      style={[s.confirmActionBtn, { backgroundColor: C.danger }]}
                      onPress={handleConfirmToggle}
                      activeOpacity={0.85}
                    >
                      <Text style={s.confirmActionText}>Deactivate</Text>
                    </TouchableOpacity>
                  </View>

                </Pressable>
              </Pressable>
            )}
          </View>
        </Modal>
      )}
      {/* ── Status Picker Modal ──────────────────────────────────────────── */}
      {statusPickerOpen && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setStatusPickerOpen(false)}>
          <Pressable style={s.datePickerOverlay} onPress={() => setStatusPickerOpen(false)}>
            <Pressable style={s.datePickerBox} onPress={() => {}}>
              <View style={s.modalHandle} />
              <Text style={s.datePickerTitle}>Filter by Status</Text>
              {STATUS_PICKER.map(opt => {
                const on = activeFilter === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[s.datePickerRow, on && { backgroundColor: C.primaryLight }]}
                    onPress={() => { setActiveFilter(opt.key); setStatusPickerOpen(false); }}
                    activeOpacity={0.75}
                  >
                    <View style={[s.filterDot, { backgroundColor: C.primary }]} />
                    <Text style={[s.datePickerText, { color: on ? C.primary : C.text }]}>{opt.label}</Text>
                    {on && <CheckIcon color={C.primary} size={16} />}
                  </TouchableOpacity>
                );
              })}
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* ── Date Picker Modal ────────────────────────────────────────────── */}
      {datePickerOpen && (
        <Modal
          visible
          animationType="slide"
          transparent
          onRequestClose={() => setDatePickerOpen(false)}
        >
          <Pressable style={s.datePickerOverlay} onPress={() => setDatePickerOpen(false)}>
            <Pressable style={s.datePickerBox} onPress={() => {}}>
              <View style={s.modalHandle} />
              <Text style={s.datePickerTitle}>Filter by Date</Text>
              {DATE_FILTERS.map(opt => {
                const on = dateFilter === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[s.datePickerRow, on && { backgroundColor: C.primaryLight }]}
                    onPress={() => { setDateFilter(opt.key); setDatePickerOpen(false); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.datePickerText, { color: on ? C.primary : C.text }]}>{opt.label}</Text>
                    {on && <CheckIcon color={C.primary} size={16} />}
                  </TouchableOpacity>
                );
              })}
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
  brandBlock:    { justifyContent: 'center', gap: 4 },
  brandLabel:  { fontSize: 9, fontFamily: Font.bold, color: C.onPrimaryMuted, letterSpacing: 1.8, marginBottom: 1 },
  headerTitle: { fontSize: 20, fontFamily: Font.extraBold, color: C.onPrimary, lineHeight: 26 },


  // Action buttons
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.onPrimaryIconBg,
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
  listContent: { paddingTop: 12, paddingBottom: 32 },

  // User card
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, marginHorizontal: 16, marginBottom: 8,
    borderRadius: 50, paddingVertical: 6, paddingRight: 16, paddingLeft: 6,
    borderWidth: 1.5, borderColor: C.border,
  },
  userAvatar:     { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  userAvatarText: { fontSize: 15, fontFamily: Font.extraBold },
  userInfo:       { flex: 1 },
  userName:       { fontSize: 14, fontFamily: Font.semiBold, color: C.text,     lineHeight: 20 },
  userEmail:      { fontSize: 12, fontFamily: Font.regular,  color: C.textMuted, lineHeight: 17, marginTop: 3 },
  userStatusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  userStatusDot:  { width: 5, height: 5, borderRadius: 3 },
  userStatusText: { fontSize: 10, fontFamily: Font.semiBold, lineHeight: 14 },

  listDivider: { height: 1, backgroundColor: C.border, marginBottom: 4 },

  // ── Unified filter row ──────────────────────────────────────────────────────
  filterRow:        { marginTop: 10, marginBottom: 4 },
  filterRowContent: { paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, borderWidth: 1.5,
    paddingHorizontal: 13, paddingVertical: 6,
  },
  filterChipText: { fontSize: 12, fontFamily: Font.semiBold },
  filterDot:      { width: 7, height: 7, borderRadius: 4, marginRight: 5 },

  // Date picker sheet
  datePickerOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  datePickerBox: {
    backgroundColor: C.card,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28,
  },
  datePickerTitle: {
    fontSize: 14, fontFamily: Font.bold, color: C.text,
    textAlign: 'center', marginBottom: 14,
  },
  datePickerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 12, gap: 12,
    borderRadius: 12, marginBottom: 4,
  },
  datePickerText: { flex: 1, fontSize: 14, fontFamily: Font.medium },

  // Empty
  empty:        { alignItems: 'center', paddingTop: 70, paddingHorizontal: 40 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle:   { fontSize: 17, fontFamily: Font.bold,    color: C.text,     lineHeight: 26, marginBottom: 8 },
  emptySub:     { fontSize: 13, fontFamily: Font.regular, color: C.textMuted, lineHeight: 20, textAlign: 'center' },

  // ── User Detail Modal ─────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.border, alignSelf: 'center', marginBottom: 6,
  },
  modalCloseBtn: {
    position: 'absolute', top: 14, right: 16,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.cardAlt, alignItems: 'center', justifyContent: 'center',
  },

  // Avatar section
  modalAvatarSection: { alignItems: 'center', paddingTop: 4, paddingBottom: 12 },
  modalAvatarRing: {
    width: 62, height: 62, borderRadius: 31,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  modalAvatarCircle: {
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  modalAvatarInitials: { fontSize: 18, fontFamily: Font.extraBold },
  modalAvatarDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 13, height: 13, borderRadius: 7,
    borderWidth: 2, borderColor: C.card,
  },
  modalUserName: {
    fontSize: 16, fontFamily: Font.bold, color: C.text,
    lineHeight: 22, marginBottom: 2,
  },
  modalUserEmail: {
    fontSize: 12, fontFamily: Font.regular, color: C.textMuted,
    lineHeight: 17, marginBottom: 8,
  },
  modalStatusPill: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 50, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 4, gap: 5,
  },
  modalStatusDot: { width: 5, height: 5, borderRadius: 3 },
  modalStatusPillText: { fontSize: 11, fontFamily: Font.semiBold, lineHeight: 15 },

  // Stats row
  modalStatsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.cardAlt, borderRadius: 12,
    marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  modalStatItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  modalStatDivider: { width: 1, height: 26, backgroundColor: C.border },
  modalStatValue: {
    fontSize: 14, fontFamily: Font.bold, color: C.text,
    lineHeight: 20, marginBottom: 1,
  },
  modalStatLabel: { fontSize: 10, fontFamily: Font.medium, color: C.textMuted, lineHeight: 14 },

  // Status toggle card
  modalToggleCard: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12, padding: 11, borderWidth: 1,
  },
  modalToggleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10, gap: 10 },
  modalToggleIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalToggleTitle: { fontSize: 13, fontFamily: Font.semiBold, lineHeight: 18 },
  modalToggleSub: { fontSize: 11, fontFamily: Font.regular, color: C.textMuted, lineHeight: 16, marginTop: 1 },

  // ── Confirm Modal ────────────────────────────────────────────────────────────
  confirmOverlay: {
    flex: 1, backgroundColor: C.overlay,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36,
  },
  confirmBox: {
    width: '100%', backgroundColor: C.card,
    borderRadius: 20, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 20,
    alignItems: 'center',
  },
  confirmIconCircle: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  confirmIconInner: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmTitle: {
    fontSize: 16, fontFamily: Font.bold, color: C.text,
    lineHeight: 23, marginBottom: 7, textAlign: 'center',
  },
  confirmNamePill: {
    borderRadius: 50, paddingHorizontal: 12, paddingVertical: 4,
    marginBottom: 8, maxWidth: '80%',
  },
  confirmNameText: {
    fontSize: 12, fontFamily: Font.semiBold, lineHeight: 17, textAlign: 'center',
  },
  confirmBody: {
    fontSize: 12, fontFamily: Font.regular, color: C.textMuted,
    lineHeight: 18, textAlign: 'center', marginBottom: 18,
  },
  confirmBtns: {
    flexDirection: 'row', gap: 8, width: '100%',
  },
  confirmCancelBtn: {
    flex: 1, height: 42, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 13, fontFamily: Font.semiBold, color: C.textMuted,
  },
  confirmActionBtn: {
    flex: 1, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmActionText: {
    fontSize: 13, fontFamily: Font.semiBold, color: '#FFFFFF',
  },

});
