import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable,
  FlatList, TextInput, ActivityIndicator, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useCustomers, useSuppliers, useCreateCustomer, useCreateSupplier } from '../../hooks/useContacts';

// expo-contacts is optional — install with: npx expo install expo-contacts
let Contacts = null;
try { Contacts = require('expo-contacts'); } catch (_) {}

// ── views: 'list' | 'create' | 'phone' ────────────────────────────────────────

const TYPE_CONFIG = {
  customer: { label: 'Customer', icon: 'user',  bg: '#DCFCE7', color: '#16A34A' },
  supplier: { label: 'Supplier', icon: 'truck', bg: '#FEF3C7', color: '#D97706' },
};

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
}

export default function ContactPickerModal({
  visible,
  bookId,
  selectedContactId,
  onSelect,
  onDeselect,
  onClose,
}) {
  const { C, Font } = useTheme();
  const s = useMemo(() => makeStyles(C, Font), [C, Font]);

  // ── view state ───────────────────────────────────────────────────────────────
  const [view,       setView]       = useState('list');   // 'list' | 'create' | 'phone'
  const [search,     setSearch]     = useState('');
  const [phoneSearch,setPhoneSearch]= useState('');
  const [newName,    setNewName]    = useState('');
  const [newPhone,   setNewPhone]   = useState('');
  const [newType,    setNewType]    = useState('customer');
  const [phoneList,  setPhoneList]  = useState([]);
  const [loadingPhone, setLoadingPhone] = useState(false);

  const { data: customers = [], isLoading: loadingC } = useCustomers(bookId);
  const { data: suppliers  = [], isLoading: loadingS } = useSuppliers(bookId);
  const createCustomer = useCreateCustomer(bookId);
  const createSupplier = useCreateSupplier(bookId);
  const isLoading = loadingC || loadingS;

  // ── derived contact list ─────────────────────────────────────────────────────
  const allContacts = useMemo(() => [
    ...customers.map(c => ({ ...c, _type: 'customer' })),
    ...suppliers.map(s => ({ ...s, _type: 'supplier' })),
  ], [customers, suppliers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allContacts;
    return allContacts.filter(c =>
      c.name.toLowerCase().includes(q) || (c.phone || '').includes(q)
    );
  }, [allContacts, search]);

  const grouped = useMemo(() => {
    const cust = filtered.filter(c => c._type === 'customer');
    const supp = filtered.filter(c => c._type === 'supplier');
    const items = [];
    if (cust.length) { items.push({ _key: 'h-c', _header: true, title: 'Customers' }); items.push(...cust); }
    if (supp.length) { items.push({ _key: 'h-s', _header: true, title: 'Suppliers' });  items.push(...supp); }
    return items;
  }, [filtered]);

  // ── phone contacts ───────────────────────────────────────────────────────────
  const filteredPhone = useMemo(() => {
    const q = phoneSearch.toLowerCase().trim();
    if (!q) return phoneList;
    return phoneList.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    );
  }, [phoneList, phoneSearch]);

  const openPhoneView = useCallback(async () => {
    if (!Contacts) {
      Alert.alert('Package required', 'Run:\n  npx expo install expo-contacts\nin the frontend directory, then restart.');
      return;
    }
    setView('phone');
    setLoadingPhone(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow contacts access in your device settings.');
        setView('list');
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });
      const mapped = data
        .filter(c => c.name)
        .map(c => ({ name: c.name, phone: c.phoneNumbers?.[0]?.number || '' }));
      setPhoneList(mapped);
    } catch {
      Alert.alert('Error', 'Could not read contacts.');
      setView('list');
    } finally {
      setLoadingPhone(false);
    }
  }, []);

  const pickPhoneContact = (c) => {
    setNewName(c.name);
    setNewPhone(c.phone);
    setView('create');
    setPhoneSearch('');
  };

  // ── create ───────────────────────────────────────────────────────────────────
  const handleCreate = () => {
    const name = newName.trim();
    if (!name) { Alert.alert('Name required', 'Please enter a contact name.'); return; }
    const fn = newType === 'customer' ? createCustomer : createSupplier;
    fn.mutate(
      { name, phone: newPhone.trim() || undefined },
      {
        onSuccess: (contact) => {
          resetAll();
          onSelect({
            id: contact.id, name: contact.name, type: newType,
            customer_id: newType === 'customer' ? contact.id : null,
            supplier_id: newType === 'supplier' ? contact.id : null,
          });
        },
        onError: () => Alert.alert('Error', 'Failed to create contact.'),
      }
    );
  };

  const resetAll = () => {
    setView('list');
    setSearch('');
    setPhoneSearch('');
    setNewName('');
    setNewPhone('');
    setNewType('customer');
    setPhoneList([]);
  };

  const handleClose = () => { resetAll(); onClose(); };

  // ── header config per view ───────────────────────────────────────────────────
  const headerTitle = { list: 'Select Contact', create: 'New Contact', phone: 'Phone Contacts' }[view];
  const handleBack  = view === 'list' ? null : () => setView(view === 'phone' ? 'list' : 'list');

  const isPending = createCustomer.isPending || createSupplier.isPending;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={[s.overlay, { backgroundColor: C.overlay }]}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <Pressable style={[s.sheet, { backgroundColor: C.card }]} onPress={() => {}}>

          {/* ── Handle ── */}
          <View style={[s.handle, { backgroundColor: C.border }]} />

          {/* ── Header ── */}
          <View style={s.header}>
            {handleBack ? (
              <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={s.headerSideBtn}>
                <Feather name="arrow-left" size={20} color={C.text} />
              </TouchableOpacity>
            ) : (
              <View style={s.headerSideBtn} />
            )}
            <Text style={[s.headerTitle, { color: C.text, fontFamily: Font.bold }]}>{headerTitle}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={s.headerSideBtn}>
              <Feather name="x" size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {/* ── LIST VIEW ── */}
          {view === 'list' && (
            <>
              {/* Search bar */}
              <View style={[s.searchBar, { backgroundColor: C.background, borderColor: C.border }]}>
                <Feather name="search" size={15} color={C.textMuted} />
                <TextInput
                  style={[s.searchInput, { color: C.text, fontFamily: Font.regular }]}
                  placeholder="Search contacts…"
                  placeholderTextColor={C.textMuted}
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="x" size={14} color={C.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Quick actions */}
              <View style={s.quickRow}>
                <TouchableOpacity
                  style={[s.quickBtn, { backgroundColor: C.primaryLight, borderColor: C.primary }]}
                  onPress={() => setView('create')}
                  activeOpacity={0.8}
                >
                  <View style={[s.quickIcon, { backgroundColor: C.primary }]}>
                    <Feather name="user-plus" size={14} color="#fff" />
                  </View>
                  <Text style={[s.quickLabel, { color: C.primary, fontFamily: Font.semiBold }]}>New Contact</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.quickBtn, { backgroundColor: C.card, borderColor: C.border }]}
                  onPress={openPhoneView}
                  activeOpacity={0.8}
                >
                  <View style={[s.quickIcon, { backgroundColor: C.border }]}>
                    <Feather name="smartphone" size={14} color={C.textMuted} />
                  </View>
                  <Text style={[s.quickLabel, { color: C.text, fontFamily: Font.semiBold }]}>From Phone</Text>
                </TouchableOpacity>
              </View>

              {/* Remove current */}
              {selectedContactId && (
                <TouchableOpacity style={[s.removeBtn, { borderColor: C.danger, backgroundColor: C.dangerLight }]} onPress={onDeselect} activeOpacity={0.8}>
                  <Feather name="x-circle" size={14} color={C.danger} />
                  <Text style={[s.removeBtnText, { fontFamily: Font.semiBold }]}>Remove selected contact</Text>
                </TouchableOpacity>
              )}

              {/* Contact list */}
              {isLoading ? (
                <ActivityIndicator style={s.loader} color={C.primary} />
              ) : grouped.length === 0 ? (
                <View style={s.empty}>
                  <Feather name="users" size={36} color={C.border} />
                  <Text style={[s.emptyText, { color: C.textMuted, fontFamily: Font.regular }]}>
                    {search ? 'No contacts match your search.' : 'No contacts yet.\nTap "New Contact" to add one.'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={grouped}
                  keyExtractor={(item) => item._key || item.id}
                  showsVerticalScrollIndicator={false}
                  style={s.list}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => {
                    if (item._header) {
                      return (
                        <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: Font.semiBold }]}>
                          {item.title}
                        </Text>
                      );
                    }
                    const isSelected = item.id === selectedContactId;
                    const cfg = TYPE_CONFIG[item._type];
                    return (
                      <TouchableOpacity
                        style={[s.contactRow, { borderBottomColor: C.border }, isSelected && { backgroundColor: C.primaryLight }]}
                        onPress={() => onSelect({
                          id: item.id, name: item.name, type: item._type,
                          customer_id: item._type === 'customer' ? item.id : null,
                          supplier_id: item._type === 'supplier' ? item.id : null,
                        })}
                        activeOpacity={0.75}
                      >
                        <View style={[s.avatar, { backgroundColor: cfg.bg }]}>
                          <Text style={[s.avatarText, { color: cfg.color, fontFamily: Font.bold }]}>
                            {initials(item.name)}
                          </Text>
                        </View>
                        <View style={s.contactBody}>
                          <Text style={[s.contactName, { color: C.text, fontFamily: Font.semiBold }]}>{item.name}</Text>
                          {item.phone ? <Text style={[s.contactPhone, { color: C.textMuted, fontFamily: Font.regular }]}>{item.phone}</Text> : null}
                        </View>
                        <View style={[s.typePill, { backgroundColor: cfg.bg }]}>
                          <Feather name={cfg.icon} size={11} color={cfg.color} />
                        </View>
                        {isSelected && <Feather name="check-circle" size={18} color={C.primary} />}
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </>
          )}

          {/* ── CREATE VIEW ── */}
          {view === 'create' && (
            <View style={s.createWrap}>
              {/* Type selector */}
              <Text style={[s.fieldLabel, { color: C.textMuted, fontFamily: Font.semiBold }]}>Type</Text>
              <View style={s.typeRow}>
                {(['customer', 'supplier']).map((t) => {
                  const cfg = TYPE_CONFIG[t];
                  const active = newType === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[s.typeChip, { borderColor: active ? cfg.color : C.border, backgroundColor: active ? cfg.bg : C.background }]}
                      onPress={() => setNewType(t)}
                      activeOpacity={0.8}
                    >
                      <Feather name={cfg.icon} size={15} color={active ? cfg.color : C.textMuted} />
                      <Text style={[s.typeChipText, { color: active ? cfg.color : C.text, fontFamily: Font.semiBold }]}>
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[s.fieldLabel, { color: C.textMuted, fontFamily: Font.semiBold }]}>Name *</Text>
              <TextInput
                style={[s.input, { borderColor: C.border, color: C.text, backgroundColor: C.background, fontFamily: Font.regular }]}
                placeholder="Full name"
                placeholderTextColor={C.textMuted}
                value={newName}
                onChangeText={setNewName}
                autoFocus={!newName}
                returnKeyType="next"
              />

              <Text style={[s.fieldLabel, { color: C.textMuted, fontFamily: Font.semiBold }]}>Phone</Text>
              <TextInput
                style={[s.input, { borderColor: C.border, color: C.text, backgroundColor: C.background, fontFamily: Font.regular }]}
                placeholder="Phone number (optional)"
                placeholderTextColor={C.textMuted}
                value={newPhone}
                onChangeText={setNewPhone}
                keyboardType="phone-pad"
                returnKeyType="done"
              />

              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: C.primary }, isPending && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={isPending}
                activeOpacity={0.85}
              >
                {isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : (
                    <>
                      <Feather name="user-plus" size={16} color="#fff" />
                      <Text style={[s.saveBtnText, { fontFamily: Font.bold }]}>Add Contact</Text>
                    </>
                  )
                }
              </TouchableOpacity>
            </View>
          )}

          {/* ── PHONE CONTACTS VIEW ── */}
          {view === 'phone' && (
            <>
              <View style={[s.searchBar, { backgroundColor: C.background, borderColor: C.border }]}>
                <Feather name="search" size={15} color={C.textMuted} />
                <TextInput
                  style={[s.searchInput, { color: C.text, fontFamily: Font.regular }]}
                  placeholder="Search phone contacts…"
                  placeholderTextColor={C.textMuted}
                  value={phoneSearch}
                  onChangeText={setPhoneSearch}
                  autoFocus
                />
                {phoneSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setPhoneSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="x" size={14} color={C.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {loadingPhone ? (
                <View style={s.empty}>
                  <ActivityIndicator color={C.primary} size="large" />
                  <Text style={[s.emptyText, { color: C.textMuted, fontFamily: Font.regular }]}>Loading contacts…</Text>
                </View>
              ) : filteredPhone.length === 0 ? (
                <View style={s.empty}>
                  <Feather name="smartphone" size={36} color={C.border} />
                  <Text style={[s.emptyText, { color: C.textMuted, fontFamily: Font.regular }]}>
                    {phoneSearch ? 'No contacts match.' : 'No contacts found on device.'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredPhone}
                  keyExtractor={(item, i) => `${item.name}-${i}`}
                  showsVerticalScrollIndicator={false}
                  style={s.list}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[s.contactRow, { borderBottomColor: C.border }]}
                      onPress={() => pickPhoneContact(item)}
                      activeOpacity={0.75}
                    >
                      <View style={[s.avatar, { backgroundColor: C.primaryLight }]}>
                        <Text style={[s.avatarText, { color: C.primary, fontFamily: Font.bold }]}>
                          {initials(item.name)}
                        </Text>
                      </View>
                      <View style={s.contactBody}>
                        <Text style={[s.contactName, { color: C.text, fontFamily: Font.semiBold }]}>{item.name}</Text>
                        {item.phone ? <Text style={[s.contactPhone, { color: C.textMuted, fontFamily: Font.regular }]}>{item.phone}</Text> : null}
                      </View>
                      <Feather name="plus-circle" size={20} color={C.primary} />
                    </TouchableOpacity>
                  )}
                />
              )}
            </>
          )}

        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (C, Font) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20, maxHeight: '65%', backgroundColor: C.card },
  handle:  { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 10 },

  // Header
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerSideBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 15, lineHeight: 22 },

  // Search
  searchBar:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 13, lineHeight: 18, padding: 0 },

  // Quick action buttons
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  quickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  quickIcon:{ width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  quickLabel:{ fontSize: 13, lineHeight: 18 },

  // Remove button
  removeBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 8, marginBottom: 6 },
  removeBtnText: { fontSize: 12, color: C.danger, lineHeight: 18 },

  // List
  list:        { flexGrow: 0 },
  sectionLabel:{ fontSize: 10, fontFamily: Font.semiBold, letterSpacing: 0.8, textTransform: 'uppercase', paddingTop: 8, paddingBottom: 2, paddingHorizontal: 2 },
  loader:      { marginTop: 20 },

  // Contact row
  contactRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  avatar:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 12, lineHeight: 18 },
  contactBody: { flex: 1 },
  contactName: { fontSize: 14, lineHeight: 20 },
  contactPhone:{ fontSize: 11, lineHeight: 16, marginTop: 1 },
  typePill:    { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  // Empty
  empty:     { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 220 },

  // Create form
  createWrap: { gap: 2 },
  fieldLabel: { fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4, marginTop: 8 },
  typeRow:    { flexDirection: 'row', gap: 8, marginBottom: 2 },
  typeChip:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderRadius: 12, paddingVertical: 10 },
  typeChipText:{ fontSize: 13, lineHeight: 18 },
  input:      { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, lineHeight: 20, marginBottom: 2 },
  saveBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 13, marginTop: 6 },
  saveBtnText:{ color: '#fff', fontSize: 15, lineHeight: 22 },
});
