import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ScrollView, Modal, TextInput, Alert,
} from 'react-native';
import SafeAreaView from '../components/ui/AppSafeAreaView';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useBookBasePath } from '../hooks/useBookBasePath';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useBookFieldsStore } from '../store/bookFieldsStore';
import { useRenameBook } from '../hooks/useBooks';
import { useCustomers, useSuppliers } from '../hooks/useContacts';
import { useCategories } from '../hooks/useCategories';
import { usePaymentModes } from '../hooks/usePaymentModes';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiDeleteAllEntries, apiGetEntries } from '../lib/api';
import SuccessDialog from '../components/ui/SuccessDialog';
import DeleteAllEntriesSheet from '../components/ui/DeleteAllEntriesSheet';

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function BookSettingsScreen() {
  const router = useRouter();
  const basePath = useBookBasePath();
  const { id, name } = useLocalSearchParams();
  const { C, Font } = useTheme();
  const s = makeStyles(C, Font);

  const [bookName, setBookName] = useState(name || 'Unnamed Book');
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const deleteSheetCloseRef = useRef(null);

  const getFields = useBookFieldsStore((s) => s.getFields);
  const fields = getFields(id);

  const qc = useQueryClient();
  const renameBook = useRenameBook();

  const { data: entries = [] } = useQuery({
    queryKey: ['entries', id],
    queryFn: () => apiGetEntries(id),
    staleTime: 1000 * 60 * 2,
    enabled: !!id,
  });

  const { data: customers = [] }    = useCustomers(id);
  const { data: suppliers = [] }    = useSuppliers(id);
  const { data: categories = [] }   = useCategories(id);
  const { data: paymentModes = [] } = usePaymentModes(id);

  const deleteAllEntries = useMutation({
    mutationFn: () => apiDeleteAllEntries(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries', id] });
      qc.invalidateQueries({ queryKey: ['summary', id] });
      qc.invalidateQueries({ queryKey: ['books'] });
      deleteSheetCloseRef.current?.(() => {
        setShowDeleteSheet(false);
        setShowDeleteSuccess(true);
      });
    },
    onError: () => {
      Alert.alert('Error', 'Could not delete entries. Please try again.');
    },
  });

  const openRename = () => {
    setRenameInput(bookName);
    setRenameVisible(true);
  };

  const confirmRename = () => {
    const trimmed = renameInput.trim();
    if (!trimmed) return;
    const previous = bookName;
    setRenameVisible(false);
    setBookName(trimmed);
    renameBook.mutate(
      { bookId: id, name: trimmed },
      {
        onSuccess: () => setShowSuccess(true),
        onError: () => {
          setBookName(previous);
          Alert.alert('Rename Failed', 'Could not rename the book. Please try again.');
        },
      },
    );
  };

  const ENTRY_FIELDS = [
    {
      icon: 'user-check',
      label: 'Customers',
      sub: 'Manage customers for this book',
      count: customers.length,
      fieldKey: 'showCustomer',
      route: `${basePath}/[id]/customers`,
      params: { type: 'customer' },
    },
    {
      icon: 'truck',
      label: 'Suppliers',
      sub: 'Manage suppliers for this book',
      count: suppliers.length,
      fieldKey: 'showSupplier',
      route: `${basePath}/[id]/suppliers`,
      params: { type: 'supplier' },
    },
    {
      icon: 'tag',
      label: 'Categories',
      sub: 'Add or remove categories',
      count: categories.length,
      fieldKey: 'showCategory',
      route: `${basePath}/[id]/categories-settings`,
      params: {},
    },
    {
      icon: 'credit-card',
      label: 'Payment Mode',
      sub: 'Manage payment methods for this book',
      count: paymentModes.length,
      alwaysActive: true,
      route: `${basePath}/[id]/payment-mode-settings`,
      params: {},
    },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Book Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Book Name */}
        <Text style={s.sectionLabel}>BOOK NAME</Text>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={s.nameRow}>
            <View style={s.nameIconBox}>
              <Feather name="book-open" size={18} color={C.primary} />
            </View>
            <View style={s.nameBody}>
              <Text style={s.nameValue}>{bookName}</Text>
              <Text style={s.nameSub}>Tap rename to change</Text>
            </View>
            <TouchableOpacity style={s.renameBtn} onPress={openRename} activeOpacity={0.8}>
              <Feather name="edit-2" size={13} color={C.primary} />
              <Text style={s.renameBtnText}>Rename</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Entry Field Settings */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>ENTRY FIELD SETTINGS</Text>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {ENTRY_FIELDS.map((item, idx) => (
            <View key={item.label}>
              <TouchableOpacity
                style={s.row}
                onPress={() => router.push({ pathname: item.route, params: { id, name: bookName, ...(item.params || {}) } })}
                activeOpacity={0.75}
              >
                <View style={[s.iconBox, { backgroundColor: C.primaryLight }]}>
                  <Feather name={item.icon} size={18} color={C.primary} />
                </View>
                <View style={s.rowBody}>
                  <Text style={s.rowLabel}>{item.label}</Text>
                  <Text style={s.rowSub}>{item.sub}</Text>
                </View>
                {item.count != null && (
                  <View style={[s.countBadge, { backgroundColor: C.primaryLight }]}>
                    <Text style={[s.countBadgeText, { color: C.primary }]}>{item.count}</Text>
                  </View>
                )}
                <Feather
                  name="chevron-right"
                  size={18}
                  color={item.alwaysActive || (item.fieldKey != null && fields[item.fieldKey]) ? C.primary : C.textSubtle}
                />
              </TouchableOpacity>
              {idx < ENTRY_FIELDS.length - 1 && (
                <View style={[s.divider, { backgroundColor: C.border }]} />
              )}
            </View>
          ))}
        </View>

        {/* Danger Zone */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>DANGER ZONE</Text>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.danger }]}>
          <TouchableOpacity
            style={s.row}
            onPress={() => setShowDeleteSheet(true)}
            activeOpacity={0.75}
          >
            <View style={[s.iconBox, { backgroundColor: C.dangerLight }]}>
              <Feather name="trash-2" size={18} color={C.danger} />
            </View>
            <View style={s.rowBody}>
              <Text style={[s.rowLabel, { color: C.danger }]}>Delete All Entries</Text>
              <Text style={s.rowSub}>Permanently removes all entries from this book</Text>
            </View>
            <Feather name="chevron-right" size={18} color={C.danger} />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Rename Modal */}
      <Modal
        visible={renameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={s.modalTitle}>Rename Book</Text>
            <TextInput
              style={[s.modalInput, { borderColor: C.border, color: C.text, backgroundColor: C.background }]}
              value={renameInput}
              onChangeText={setRenameInput}
              placeholder="Book name"
              placeholderTextColor={C.textSubtle}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={confirmRename}
            />
            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtn, { borderColor: C.border }]}
                onPress={() => setRenameVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={[s.modalBtnText, { color: C.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnPrimary, { backgroundColor: C.primary }]}
                onPress={confirmRename}
                activeOpacity={0.85}
              >
                <Text style={[s.modalBtnText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SuccessDialog
        visible={showSuccess}
        onDismiss={() => setShowSuccess(false)}
        title="Book Renamed!"
        subtitle={`"${bookName}" has been saved successfully`}
      />

      <DeleteAllEntriesSheet
        visible={showDeleteSheet}
        onDismiss={() => setShowDeleteSheet(false)}
        onConfirm={() => deleteAllEntries.mutate()}
        bookName={bookName}
        entryCount={entries.length}
        isLoading={deleteAllEntries.isPending}
        C={C}
        Font={Font}
        closeRef={deleteSheetCloseRef}
      />

      <SuccessDialog
        visible={showDeleteSuccess}
        onDismiss={() => setShowDeleteSuccess(false)}
        title="All Entries Deleted"
        subtitle={`"${bookName}" has been cleared successfully`}
      />
    </SafeAreaView>
  );
}

const makeStyles = (C, Font) => StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.background },

  header: {
    backgroundColor: C.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 14,
  },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: Font.bold, color: '#fff' },

  content:      { padding: 16, paddingTop: 24, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11, fontFamily: Font.semiBold, color: C.textMuted,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginLeft: 2,
  },
  card:    { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },

  // Name row
  nameRow:    { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  nameIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  nameBody:   { flex: 1 },
  nameValue:  { fontSize: 15, fontFamily: Font.semiBold, color: C.text, lineHeight: 22 },
  nameSub:    { fontSize: 12, fontFamily: Font.regular, color: C.textMuted, lineHeight: 18 },
  renameBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: C.primaryLight,
  },
  renameBtnText: { fontSize: 13, fontFamily: Font.semiBold, color: C.primary },

  // Entry field rows
  row:     { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  divider: { height: 1, marginHorizontal: 16 },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  rowBody:  { flex: 1 },
  rowLabel: { fontSize: 15, fontFamily: Font.semiBold, color: C.text, lineHeight: 22, marginBottom: 2 },
  rowSub:   { fontSize: 12, fontFamily: Font.regular, color: C.textMuted, lineHeight: 18 },
  countBadge: {
    minWidth: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8, marginRight: 8,
  },
  countBadgeText: { fontSize: 13, fontFamily: Font.bold },

  // Rename modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard:  {
    width: '100%', borderRadius: 20, borderWidth: 1,
    padding: 24,
    shadowColor: '#000', shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, elevation: 12,
  },
  modalTitle: { fontSize: 17, fontFamily: Font.bold, color: C.text, marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: Font.regular,
    marginBottom: 20,
  },
  modalActions:      { flexDirection: 'row', gap: 10 },
  modalBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  modalBtnPrimary:   { borderWidth: 0 },
  modalBtnText:      { fontSize: 15, fontFamily: Font.semiBold },
});
