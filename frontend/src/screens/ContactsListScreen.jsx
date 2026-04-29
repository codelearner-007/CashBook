import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable, StatusBar,
  FlatList, Modal, Alert, ActivityIndicator, Animated,
  Keyboard, Platform, TextInput,
} from 'react-native';
import SafeAreaView from '../components/ui/AppSafeAreaView';
import SearchBar from '../components/ui/SearchBar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useBookBasePath } from '../hooks/useBookBasePath';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useContacts, useCreateContact } from '../hooks/useContacts';

const TYPE_CONFIG = {
  customer: { label: 'Customers', icon: 'user',  emptyIcon: 'user-plus' },
  supplier: { label: 'Suppliers', icon: 'truck', emptyIcon: 'truck' },
};


function EmptyState({ cfg, C, Font }) {
  return (
    <View style={es.wrap}>
      <View style={[es.iconBox, { backgroundColor: C.primaryLight }]}>
        <Feather name={cfg.emptyIcon} size={36} color={C.primary} />
      </View>
      <Text style={[es.title, { color: C.text, fontFamily: Font.bold }]}>
        No {cfg.label} yet
      </Text>
      <Text style={[es.sub, { color: C.textMuted, fontFamily: Font.regular }]}>
        Tap the + button below{'\n'}to add your first {cfg.label.slice(0, -1).toLowerCase()}
      </Text>
    </View>
  );
}

const es = StyleSheet.create({
  wrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  iconBox: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title:   { fontSize: 16, lineHeight: 24, marginBottom: 8 },
  sub:     { fontSize: 13, lineHeight: 20, textAlign: 'center' },
});

export default function ContactsListScreen() {
  const router   = useRouter();
  const basePath = useBookBasePath();
  const { id: bookId, name: bookName, type } = useLocalSearchParams();
  const { C, Font } = useTheme();
  const s = useMemo(() => makeStyles(), []);

  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.customer;

  const [search,       setSearch]       = useState('');
  const [addVisible,   setAddVisible]   = useState(false);
  const [newName,      setNewName]      = useState('');
  const [newPhone,     setNewPhone]     = useState('');
  const [kbHeight,     setKbHeight]     = useState(0);

  useEffect(() => {
    if (!addVisible) { setKbHeight(0); return; }
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKbHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKbHeight(0)
    );
    return () => { show.remove(); hide.remove(); };
  }, [addVisible]);
  const { data: contacts = [], isLoading } = useContacts(bookId, type);
  const createContact = useCreateContact(bookId, type);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  }, [contacts, search]);

  // true only when there is genuinely no data (not a search-no-match)
  const isEmpty = !isLoading && filtered.length === 0 && !search.trim();

  // Animation refs for FAB glow + bottom arrow
  const glowScale   = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const arrow1 = useRef(new Animated.Value(0)).current;
  const arrow2 = useRef(new Animated.Value(0)).current;
  const arrow3 = useRef(new Animated.Value(0)).current;
  const arrowAnims = useMemo(() => [arrow1, arrow2, arrow3], []);

  useEffect(() => {
    if (!isEmpty) {
      glowScale.setValue(1);
      glowOpacity.setValue(0);
      arrowAnims.forEach(a => a.setValue(0));
      return;
    }

    // Pulsing glow ring: expands outward and fades
    const glow = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale,   { toValue: 2,    duration: 950, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0,    duration: 950, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale,   { toValue: 1,    duration: 0,   useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.55, duration: 0,   useNativeDriver: true }),
        ]),
      ])
    );

    // Cascading chevrons pointing right toward the FAB
    const cascade = Animated.loop(
      Animated.sequence([
        Animated.stagger(200, arrowAnims.map(a =>
          Animated.sequence([
            Animated.timing(a, { toValue: 1,    duration: 300, useNativeDriver: true }),
            Animated.timing(a, { toValue: 0.12, duration: 300, useNativeDriver: true }),
          ])
        )),
        Animated.delay(400),
      ])
    );

    glow.start();
    cascade.start();
    return () => { glow.stop(); cascade.stop(); };
  }, [isEmpty]);

  const openDetail = (contact) => {
    router.push({
      pathname: `${basePath}/[id]/contact-detail`,
      params: { id: bookId, name: bookName, contactId: contact.id, contactType: type, contactName: contact.name },
    });
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) { Alert.alert('Name required', 'Please enter a name.'); return; }
    createContact.mutate(
      { type, name, phone: newPhone.trim() || undefined },
      {
        onSuccess: () => {
          setAddVisible(false);
          setNewName('');
          setNewPhone('');
        },
        onError: () => Alert.alert('Error', 'Failed to create contact.'),
      }
    );
  };

  const renderContact = ({ item }) => {
    const avatarBg = C.primaryLight;
    const balance  = item.balance ?? 0;
    return (
      <TouchableOpacity
        style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}
        onPress={() => openDetail(item)}
        activeOpacity={0.8}
      >
        <View style={[s.avatar, { backgroundColor: avatarBg }]}>
          <Feather name="user" size={20} color={C.primary} />
        </View>

        <View style={s.cardBody}>
          <Text style={[s.cardName, { color: C.text, fontFamily: Font.semiBold }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.phone
            ? <Text style={[s.cardSub, { color: C.textMuted, fontFamily: Font.regular }]}>{item.phone}</Text>
            : null}
        </View>

        <TouchableOpacity
          style={[s.balancePill, { backgroundColor: balance >= 0 ? C.cashInLight : C.dangerLight }]}
          onPress={() => router.push({
            pathname: `${basePath}/[id]/contact-balance`,
            params: { id: bookId, name: bookName, contactId: item.id, contactName: item.name, contactType: type },
          })}
          activeOpacity={0.8}
        >
          <Text style={[s.balanceText, { color: balance >= 0 ? C.cashIn : C.danger, fontFamily: Font.bold }]}>
            {Math.abs(balance).toLocaleString()}
          </Text>
          <Feather name="chevron-right" size={11} color={balance >= 0 ? C.cashIn : C.danger} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: C.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { fontFamily: Font.bold }]}>{cfg.label}</Text>
          {bookName ? <Text style={[s.headerSub, { fontFamily: Font.regular }]}>{bookName}</Text> : null}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={[s.searchWrap, { borderBottomColor: C.border }]}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={`Search ${cfg.label.toLowerCase()}…`}
          onClear={() => setSearch('')}
        />
      </View>

      {/* List / empty states */}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.primary} />
      ) : filtered.length === 0 ? (
        search ? (
          <View style={s.empty}>
            <Feather name="search" size={40} color={C.border} />
            <Text style={[s.emptyTitle, { color: C.text, fontFamily: Font.semiBold }]}>No results</Text>
            <Text style={[s.emptySub, { color: C.textMuted, fontFamily: Font.regular }]}>Try a different search.</Text>
          </View>
        ) : (
          <EmptyState cfg={cfg} C={C} Font={Font} />
        )
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderContact}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Cascading arrows at bottom pointing right → FAB (only when empty) */}
      {isEmpty && (
        <View style={s.fabArrow}>
          {arrowAnims.map((anim, i) => (
            <Animated.View key={i} style={{ opacity: anim }}>
              <Feather name="chevron-right" size={28} color={C.primary} />
            </Animated.View>
          ))}
        </View>
      )}

      {/* FAB — with pulsing glow ring when empty */}
      <View style={s.fabWrap}>
        {isEmpty && (
          <Animated.View
            style={[
              s.fabGlow,
              {
                backgroundColor: C.primary,
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />
        )}
        <TouchableOpacity
          style={[s.fab, { backgroundColor: C.primary }]}
          onPress={() => setAddVisible(true)}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Add Modal */}
      <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
        <Pressable style={[s.modalOverlay, { backgroundColor: C.overlay }]} onPress={() => { setAddVisible(false); setNewName(''); setNewPhone(''); }}>
          <Pressable style={[s.modalSheet, { backgroundColor: C.card, marginBottom: kbHeight }]} onPress={() => {}}>
            <View style={[s.modalHandle, { backgroundColor: C.border }]} />
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: C.text, fontFamily: Font.bold }]}>
                Add {cfg.label.slice(0, -1)}
              </Text>
              <TouchableOpacity onPress={() => setAddVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[s.modalInput, { borderColor: C.border, color: C.text, backgroundColor: C.background, fontFamily: Font.regular }]}
              placeholder="Name *"
              placeholderTextColor={C.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="next"
            />
            <TextInput
              style={[s.modalInput, { borderColor: C.border, color: C.text, backgroundColor: C.background, fontFamily: Font.regular }]}
              placeholder="Phone (optional)"
              placeholderTextColor={C.textMuted}
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
              returnKeyType="done"
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtn, { borderColor: C.border }]}
                onPress={() => { setAddVisible(false); setNewName(''); setNewPhone(''); }}
              >
                <Text style={[s.modalBtnText, { color: C.textMuted, fontFamily: Font.semiBold }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: C.primary, borderColor: C.primary }]}
                onPress={handleCreate}
                disabled={createContact.isPending}
              >
                {createContact.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={[s.modalBtnText, { color: '#fff', fontFamily: Font.semiBold }]}>Add</Text>
                }
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = () => StyleSheet.create({
  safe: { flex: 1 },

  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14 },
  backBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 17, color: '#fff', lineHeight: 24 },
  headerSub:    { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },

  searchWrap:  { paddingVertical: 10, borderBottomWidth: 1 },
  searchBar:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 50, paddingHorizontal: 16, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, lineHeight: 20, padding: 0 },

  listContent: { paddingTop: 12, paddingBottom: 120 },

  card:        { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, borderRadius: 50, paddingVertical: 6, paddingLeft: 6, paddingRight: 14, borderWidth: 1.5 },
  avatar:      { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText:  { fontSize: 15, lineHeight: 22 },
  cardBody:    { flex: 1 },
  cardName:    { fontSize: 14, lineHeight: 20 },
  cardSub:     { fontSize: 12, lineHeight: 18, marginTop: 1 },

  balancePill: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  balanceText: { fontSize: 13, lineHeight: 18 },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 60 },
  emptyTitle: { fontSize: 17, lineHeight: 26 },
  emptySub:   { fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 240 },

  // FAB: outer wrapper is absolutely positioned; glow ring sits inside it
  fabWrap: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
  },
  fabGlow: {
    position: 'absolute',
    width: 56, height: 56, borderRadius: 28,
  },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },

  // Three chevrons horizontally to the left of the FAB, vertically centered with it
  // FAB center from bottom = 24 + 28 = 52; arrow (28px) center offset = 14 → bottom: 38
  fabArrow: {
    position: 'absolute',
    bottom: 38,
    right: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: -6,
  },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet:   { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 12 },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle:   { fontSize: 17, lineHeight: 26 },
  modalInput:   { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, lineHeight: 22, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtn:     { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 15, lineHeight: 22 },
});
