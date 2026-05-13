import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  StatusBar, ActivityIndicator,
} from 'react-native';
import SafeAreaView from '../components/ui/AppSafeAreaView';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useBookShares, useRemoveCollaborator } from '../hooks/useSharing';
import { useBookBasePath } from '../hooks/useBookBasePath';
import { RIGHTS_MAP, getInitials } from '../constants/sharing';
import EditShareSheet from '../components/sharing/EditShareSheet';
import RemoveAccessSheet from '../components/sharing/RemoveAccessSheet';

// ── CollaboratorRow ───────────────────────────────────────────────────────────

const CollaboratorRow = ({ item, onEdit, onRemove, C, Font, isDark }) => {
  const meta     = RIGHTS_MAP[item.rights] ?? RIGHTS_MAP.view;
  const initials = getInitials(item.shared_with?.full_name || item.shared_with?.email || '');
  const badgeBg  = isDark ? meta.darkLight : meta.light;

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: C.border }]}
      onPress={() => onEdit(item)}
      activeOpacity={0.75}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: C.primaryLight }]}>
        <Text style={[styles.avatarText, { color: C.primary, fontFamily: Font.bold }]}>
          {initials}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.rowBody}>
        <Text style={[styles.rowName, { color: C.text, fontFamily: Font.semiBold }]} numberOfLines={1}>
          {item.shared_with?.full_name || 'Unknown'}
        </Text>
        <Text style={[styles.rowEmail, { color: C.textMuted, fontFamily: Font.regular }]} numberOfLines={1}>
          {item.shared_with?.email}
        </Text>
        <View style={[styles.rightsBadge, { backgroundColor: badgeBg }]}>
          <Feather name={meta.icon} size={11} color={meta.color} />
          <Text style={[styles.rightsText, { color: meta.color, fontFamily: Font.semiBold }]}>
            {meta.title}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: C.primaryLight }]}
          onPress={() => onEdit(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.75}
        >
          <Feather name="edit-2" size={14} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: C.dangerLight }]}
          onPress={() => onRemove(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.75}
        >
          <Feather name="user-x" size={14} color={C.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ManageSharesScreen() {
  const router   = useRouter();
  const basePath = useBookBasePath();
  const { id, name } = useLocalSearchParams();
  const { C, Font, isDark } = useTheme();

  const { data: shares = [], isLoading } = useBookShares(id);
  const removeCollaborator = useRemoveCollaborator(id);

  const [editShare, setEditShare]     = useState(null);
  const [removeShare, setRemoveShare] = useState(null);

  const handleEdit = useCallback((share) => {
    setEditShare(share);
  }, []);

  const handleRemove = useCallback((share) => {
    setRemoveShare(share);
  }, []);

  const handleConfirmRemove = useCallback(() => {
    if (!removeShare) return;
    removeCollaborator.mutate(removeShare.id, {
      onSuccess: () => setRemoveShare(null),
      onError:   () => setRemoveShare(null),
    });
  }, [removeShare, removeCollaborator]);

  const openAdd = useCallback(() => {
    router.push({ pathname: `${basePath}/[id]/add-collaborator`, params: { id, name } });
  }, [router, basePath, id, name]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.primary }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { fontFamily: Font.bold }]}>Manage Access</Text>
          <Text style={[styles.headerSub, { fontFamily: Font.regular }]} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: 'rgba(255,255,255,0.22)' }]}
          onPress={openAdd}
          activeOpacity={0.8}
        >
          <Feather name="user-plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Info banner */}
      <View style={[styles.banner, { backgroundColor: C.primaryLight, borderColor: C.primaryMid }]}>
        <Feather name="info" size={14} color={C.primary} />
        <Text style={[styles.bannerText, { color: C.primary, fontFamily: Font.regular }]}>
          Tap any row to edit their access, or use the buttons to edit or remove.
        </Text>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      ) : shares.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyBox, { backgroundColor: C.primaryLight }]}>
            <Feather name="users" size={36} color={C.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: C.text, fontFamily: Font.bold }]}>
            No collaborators yet
          </Text>
          <Text style={[styles.emptySub, { color: C.textMuted, fontFamily: Font.regular }]}>
            Tap + to share this book with someone
          </Text>
          <TouchableOpacity
            style={[styles.emptyAddBtn, { backgroundColor: C.primary }]}
            onPress={openAdd}
            activeOpacity={0.85}
          >
            <Feather name="user-plus" size={16} color="#fff" />
            <Text style={[styles.emptyAddBtnText, { fontFamily: Font.bold }]}>
              Add Collaborator
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={shares}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <CollaboratorRow
              item={item}
              onEdit={handleEdit}
              onRemove={handleRemove}
              C={C}
              Font={Font}
              isDark={isDark}
            />
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={[styles.listHeader, { color: C.textMuted, fontFamily: Font.semiBold }]}>
              {shares.length} {shares.length === 1 ? 'COLLABORATOR' : 'COLLABORATORS'}
            </Text>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Edit sheet */}
      <EditShareSheet
        visible={!!editShare}
        share={editShare}
        bookId={id}
        onClose={() => setEditShare(null)}
      />

      {/* Remove access sheet */}
      <RemoveAccessSheet
        visible={!!removeShare}
        share={removeShare}
        bookName={name}
        isLoading={removeCollaborator.isPending}
        onDismiss={() => setRemoveShare(null)}
        onConfirm={handleConfirmRemove}
        C={C}
        Font={Font}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  backBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1 },
  headerTitle:  { fontSize: 17, color: '#fff', lineHeight: 24 },
  headerSub:    { fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 18, marginTop: 1 },
  addBtn:       { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  banner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 16, marginTop: 16, marginBottom: 4,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  bannerText: { flex: 1, fontSize: 12, lineHeight: 18 },

  list:       { paddingBottom: 40 },
  listHeader: {
    fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
    marginHorizontal: 16, marginTop: 20, marginBottom: 6,
  },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  avatar:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15 },
  rowBody:    { flex: 1 },
  rowName:    { fontSize: 15, lineHeight: 22, marginBottom: 2 },
  rowEmail:   { fontSize: 12, lineHeight: 18, marginBottom: 6 },
  rightsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  rightsText: { fontSize: 11, lineHeight: 16 },
  actions:    { flexDirection: 'row', gap: 8 },
  actionBtn:  { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  empty:           { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyBox:        { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle:      { fontSize: 18, lineHeight: 26, marginBottom: 8 },
  emptySub:        { fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 28 },
  emptyAddBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 32, paddingHorizontal: 28, paddingVertical: 15 },
  emptyAddBtnText: { fontSize: 15, color: '#fff', lineHeight: 22 },
});
