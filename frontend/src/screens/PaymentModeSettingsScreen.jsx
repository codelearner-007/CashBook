import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable, StatusBar,
  FlatList, Modal, Alert, ActivityIndicator, Animated,
  Keyboard, Platform, TextInput,
} from 'react-native';
import SafeAreaView from '../components/ui/AppSafeAreaView';
import SearchBar from '../components/ui/SearchBar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import {
  usePaymentModes, useCreatePaymentMode, useUpdatePaymentMode, useDeletePaymentMode,
} from '../hooks/usePaymentModes';

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ C, Font }) {
  return (
    <View style={es.wrap}>
      <View style={[es.iconBox, { backgroundColor: C.primaryLight }]}>
        <Feather name="credit-card" size={36} color={C.primary} />
      </View>
      <Text style={[es.title, { color: C.text, fontFamily: Font.bold }]}>
        No payment modes yet
      </Text>
      <Text style={[es.sub, { color: C.textMuted, fontFamily: Font.regular }]}>
        Tap the + button below{'\n'}to add a payment mode
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

// ── Mode Menu Sheet ───────────────────────────────────────────────────────────

function ModeMenuSheet({ visible, mode, onClose, onRename, onDelete, renaming, C, Font }) {
  const slideY   = useRef(new Animated.Value(300)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameInput, setRenameInput]     = useState('');
  const [kbHeight, setKbHeight]           = useState(0);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideY,    { toValue: 0,    duration: 280, useNativeDriver: true }),
        Animated.timing(bgOpacity, { toValue: 1,    duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY,    { toValue: 300,  duration: 220, useNativeDriver: true }),
        Animated.timing(bgOpacity, { toValue: 0,    duration: 180, useNativeDriver: true }),
      ]).start();
      setRenameVisible(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!renameVisible) { setKbHeight(0); return; }
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKbHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKbHeight(0),
    );
    return () => { show.remove(); hide.remove(); };
  }, [renameVisible]);

  const openRename = () => {
    setRenameInput(mode?.name ?? '');
    setRenameVisible(true);
  };

  const confirmRename = () => {
    const trimmed = renameInput.trim();
    if (!trimmed) return;
    onRename(trimmed);
  };

  if (!visible && !mode) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: bgOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} pointerEvents="box-none">
        <Animated.View style={{ marginBottom: kbHeight }}>
          <Animated.View style={[ms.sheet, { backgroundColor: C.card, transform: [{ translateY: slideY }] }]}>
            <View style={[ms.handle, { backgroundColor: C.border }]} />

            {!renameVisible ? (
              <>
                <View style={ms.modeRow}>
                  <View style={[ms.modeIcon, { backgroundColor: C.primaryLight }]}>
                    <Feather name="credit-card" size={20} color={C.primary} />
                  </View>
                  <Text style={[ms.modeName, { color: C.text, fontFamily: Font.bold }]} numberOfLines={1}>
                    {mode?.name}
                  </Text>
                </View>

                <View style={[ms.divider, { backgroundColor: C.border }]} />

                <TouchableOpacity style={ms.action} onPress={openRename} activeOpacity={0.7}>
                  <Feather name="edit-2" size={18} color={C.primary} />
                  <Text style={[ms.actionText, { color: C.text, fontFamily: Font.medium }]}>Rename</Text>
                </TouchableOpacity>

                <View style={[ms.divider, { backgroundColor: C.border }]} />

                <TouchableOpacity style={ms.action} onPress={onDelete} activeOpacity={0.7}>
                  <Feather name="trash-2" size={18} color={C.danger} />
                  <Text style={[ms.actionText, { color: C.danger, fontFamily: Font.medium }]}>Delete</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[ms.renameTitle, { color: C.text, fontFamily: Font.bold }]}>Rename Mode</Text>
                <TextInput
                  style={[ms.renameInput, { borderColor: C.border, color: C.text, backgroundColor: C.background, fontFamily: Font.regular }]}
                  value={renameInput}
                  onChangeText={setRenameInput}
                  placeholder="Mode name *"
                  placeholderTextColor={C.textMuted}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={confirmRename}
                />
                <View style={ms.renameActions}>
                  <TouchableOpacity
                    style={[ms.renameBtn, { borderColor: C.border }]}
                    onPress={() => setRenameVisible(false)}
                  >
                    <Text style={[ms.renameBtnText, { color: C.textMuted, fontFamily: Font.semiBold }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[ms.renameBtn, { backgroundColor: C.primary, borderColor: C.primary }]}
                    onPress={confirmRename}
                    disabled={renaming}
                  >
                    {renaming
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={[ms.renameBtnText, { color: '#fff', fontFamily: Font.semiBold }]}>Save</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  sheet:        { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 12, paddingBottom: 40 },
  handle:       { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modeRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  modeIcon:     { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modeName:     { flex: 1, fontSize: 17, lineHeight: 24 },
  divider:      { height: 1, marginBottom: 4 },
  action:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  actionText:   { fontSize: 15, lineHeight: 22 },
  renameTitle:  { fontSize: 17, lineHeight: 26, marginBottom: 16 },
  renameInput:  { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, lineHeight: 22, marginBottom: 16 },
  renameActions:{ flexDirection: 'row', gap: 10 },
  renameBtn:    { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  renameBtnText:{ fontSize: 15, lineHeight: 22 },
});

// ── Delete Confirm Sheet ──────────────────────────────────────────────────────

function DeleteModeSheet({ visible, modeName, onDismiss, onConfirm, isLoading, C, Font }) {
  const slideY    = useRef(new Animated.Value(300)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideY,    { toValue: 0,   duration: 280, useNativeDriver: true }),
        Animated.timing(bgOpacity, { toValue: 1,   duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY,    { toValue: 300, duration: 220, useNativeDriver: true }),
        Animated.timing(bgOpacity, { toValue: 0,   duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: bgOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1} />
      </Animated.View>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} pointerEvents="box-none">
        <Animated.View style={[ds.sheet, { backgroundColor: C.card, transform: [{ translateY: slideY }] }]}>
          <View style={[ds.handle, { backgroundColor: C.border }]} />
          <View style={[ds.iconWrap, { backgroundColor: C.dangerLight }]}>
            <Feather name="trash-2" size={28} color={C.danger} />
          </View>
          <Text style={[ds.title, { color: C.text, fontFamily: Font.bold }]}>Delete Payment Mode?</Text>
          <Text style={[ds.sub, { color: C.textMuted, fontFamily: Font.regular }]}>
            <Text style={{ fontFamily: Font.semiBold, color: C.text }}>"{modeName}"</Text>
            {' '}will be removed. Existing entries will keep their payment mode text.
          </Text>
          <View style={ds.actions}>
            <TouchableOpacity style={[ds.btn, { borderColor: C.border }]} onPress={onDismiss} activeOpacity={0.8}>
              <Text style={[ds.btnText, { color: C.textMuted, fontFamily: Font.semiBold }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[ds.btn, { backgroundColor: C.danger, borderColor: C.danger }]} onPress={onConfirm} activeOpacity={0.85} disabled={isLoading}>
              {isLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={[ds.btnText, { color: '#fff', fontFamily: Font.semiBold }]}>Delete</Text>
              }
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const ds = StyleSheet.create({
  sheet:   { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 12, paddingBottom: 40 },
  handle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  iconWrap:{ width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  title:   { fontSize: 19, lineHeight: 28, textAlign: 'center', marginBottom: 10 },
  sub:     { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 28 },
  actions: { flexDirection: 'row', gap: 10 },
  btn:     { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, lineHeight: 22 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function PaymentModeSettingsScreen() {
  const router = useRouter();
  const { id: bookId, name: bookName } = useLocalSearchParams();
  const { C, Font } = useTheme();
  const s = useMemo(() => makeStyles(), []);

  const [search, setSearch]           = useState('');
  const [addVisible, setAddVisible]   = useState(false);
  const [newName, setNewName]         = useState('');
  const [kbHeight, setKbHeight]       = useState(0);

  const [menuModeId, setMenuModeId]           = useState(null);
  const [deletingMode, setDeletingMode]       = useState(null);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);

  useEffect(() => {
    if (!addVisible) { setKbHeight(0); return; }
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKbHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKbHeight(0),
    );
    return () => { show.remove(); hide.remove(); };
  }, [addVisible]);

  const { data: modes = [], isLoading } = usePaymentModes(bookId);
  const { mutate: createMode, isPending: creating }  = useCreatePaymentMode(bookId);
  const { mutate: deleteMode, isPending: deleting }  = useDeletePaymentMode(bookId);
  const { mutate: updateMode, isPending: renaming }  = useUpdatePaymentMode(bookId, menuModeId);

  const menuMode = useMemo(
    () => modes.find(m => m.id === menuModeId) ?? null,
    [modes, menuModeId],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return modes;
    const q = search.toLowerCase();
    return modes.filter(m => m.name.toLowerCase().includes(q));
  }, [modes, search]);

  const isEmpty = !isLoading && filtered.length === 0 && !search.trim();

  // ── FAB animations ────────────────────────────────────────────────────────
  const glowScale   = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const arrow1      = useRef(new Animated.Value(0)).current;
  const arrow2      = useRef(new Animated.Value(0)).current;
  const arrow3      = useRef(new Animated.Value(0)).current;
  const arrowAnims  = useMemo(() => [arrow1, arrow2, arrow3], []);

  useEffect(() => {
    if (!isEmpty) {
      glowScale.setValue(1); glowOpacity.setValue(0);
      arrowAnims.forEach(a => a.setValue(0));
      return;
    }
    const glow = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale,    { toValue: 2,    duration: 950, useNativeDriver: true }),
          Animated.timing(glowOpacity,  { toValue: 0,    duration: 950, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale,    { toValue: 1,    duration: 0,   useNativeDriver: true }),
          Animated.timing(glowOpacity,  { toValue: 0.55, duration: 0,   useNativeDriver: true }),
        ]),
      ]),
    );
    const cascade = Animated.loop(
      Animated.sequence([
        Animated.stagger(200, arrowAnims.map(a =>
          Animated.sequence([
            Animated.timing(a, { toValue: 1,    duration: 300, useNativeDriver: true }),
            Animated.timing(a, { toValue: 0.12, duration: 300, useNativeDriver: true }),
          ]),
        )),
        Animated.delay(400),
      ]),
    );
    glow.start(); cascade.start();
    return () => { glow.stop(); cascade.stop(); };
  }, [isEmpty]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleRename = (newName) => {
    updateMode({ name: newName }, {
      onSuccess: () => setMenuModeId(null),
      onError: (err) => {
        const detail = err?.response?.data?.detail ?? '';
        Alert.alert('Error', detail.includes('already exists') ? 'That name already exists.' : 'Failed to rename.');
      },
    });
  };

  const handleDelete = (mode) => {
    if (modes.length <= 1) {
      Alert.alert('Cannot Delete', 'You must have at least one payment mode.');
      return;
    }
    setMenuModeId(null);
    setDeletingMode(mode);
    setTimeout(() => setShowDeleteSheet(true), 280);
  };

  const confirmDelete = () => {
    if (!deletingMode) return;
    deleteMode(deletingMode.id, {
      onSuccess: () => { setShowDeleteSheet(false); setDeletingMode(null); },
      onError: (err) => {
        const detail = err?.response?.data?.detail ?? '';
        Alert.alert('Error', detail.includes('last payment mode') ? 'Cannot delete the last payment mode.' : 'Failed to delete.');
      },
    });
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) { Alert.alert('Name required', 'Please enter a payment mode name.'); return; }
    createMode({ name }, {
      onSuccess: () => { setAddVisible(false); setNewName(''); },
      onError: (err) => {
        const detail = err?.response?.data?.detail ?? '';
        if (detail.includes('already exists')) {
          Alert.alert('Duplicate', 'A payment mode with that name already exists.');
        } else {
          Alert.alert('Error', 'Failed to create payment mode.');
        }
      },
    });
  };

  // ── Render card ───────────────────────────────────────────────────────────

  const renderMode = ({ item }) => (
    <TouchableOpacity
      style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}
      onPress={() => setMenuModeId(item.id)}
      activeOpacity={0.8}
    >
      <View style={[s.avatar, { backgroundColor: C.primaryLight }]}>
        <Feather name="credit-card" size={20} color={C.primary} />
      </View>
      <Text style={[s.cardName, { color: C.text, fontFamily: Font.semiBold }]} numberOfLines={1}>
        {item.name}
      </Text>
      <Feather name="more-vertical" size={18} color={C.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: C.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { fontFamily: Font.bold }]}>Payment Modes</Text>
          {bookName ? <Text style={[s.headerSub, { fontFamily: Font.regular }]}>{bookName}</Text> : null}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Info banner — payment mode is always required */}
      <View style={[s.infoBanner, { backgroundColor: C.primaryLight, borderBottomColor: C.border }]}>
        <Feather name="info" size={14} color={C.primary} />
        <Text style={[s.infoText, { color: C.primary, fontFamily: Font.medium }]}>
          Payment mode is required for every entry and cannot be hidden.
        </Text>
      </View>

      <View style={[s.searchWrap, { borderBottomColor: C.border }]}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search payment modes…"
          onClear={() => setSearch('')}
        />
      </View>

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
          <EmptyState C={C} Font={Font} />
        )
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderMode}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Cascading arrows → FAB (only when empty) */}
      {isEmpty && (
        <View style={s.fabArrow}>
          {arrowAnims.map((anim, i) => (
            <Animated.View key={i} style={{ opacity: anim }}>
              <Feather name="chevron-right" size={28} color={C.primary} />
            </Animated.View>
          ))}
        </View>
      )}

      {/* FAB */}
      <View style={s.fabWrap}>
        {isEmpty && (
          <Animated.View
            style={[s.fabGlow, { backgroundColor: C.primary, opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
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

      {/* Mode Menu Sheet */}
      <ModeMenuSheet
        visible={!!menuModeId}
        mode={menuMode}
        onClose={() => setMenuModeId(null)}
        onRename={handleRename}
        onDelete={() => handleDelete(menuMode)}
        renaming={renaming}
        C={C}
        Font={Font}
      />

      {/* Delete Sheet */}
      <DeleteModeSheet
        visible={showDeleteSheet}
        modeName={deletingMode?.name}
        onDismiss={() => { setShowDeleteSheet(false); setDeletingMode(null); }}
        onConfirm={confirmDelete}
        isLoading={deleting}
        C={C}
        Font={Font}
      />

      {/* Add Modal */}
      <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => { setAddVisible(false); setNewName(''); }}>
        <Pressable style={[s.modalOverlay, { backgroundColor: C.overlay }]} onPress={() => { setAddVisible(false); setNewName(''); }}>
          <Pressable style={[s.modalSheet, { backgroundColor: C.card, marginBottom: kbHeight }]} onPress={() => {}}>
            <View style={[s.modalHandle, { backgroundColor: C.border }]} />
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: C.text, fontFamily: Font.bold }]}>Add Payment Mode</Text>
              <TouchableOpacity onPress={() => { setAddVisible(false); setNewName(''); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[s.modalInput, { borderColor: C.border, color: C.text, backgroundColor: C.background, fontFamily: Font.regular }]}
              placeholder="Mode name *"
              placeholderTextColor={C.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtn, { borderColor: C.border }]}
                onPress={() => { setAddVisible(false); setNewName(''); }}
              >
                <Text style={[s.modalBtnText, { color: C.textMuted, fontFamily: Font.semiBold }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: C.primary, borderColor: C.primary }]}
                onPress={handleCreate}
                disabled={creating}
              >
                {creating
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

  infoBanner:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  infoText:      { flex: 1, fontSize: 12, lineHeight: 18 },

  searchWrap:    { paddingVertical: 10, borderBottomWidth: 1 },
  listContent:   { paddingTop: 12, paddingBottom: 120 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 50, paddingVertical: 6, paddingLeft: 6, paddingRight: 14,
    borderWidth: 1.5,
  },
  avatar:   { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardName: { flex: 1, fontSize: 14, lineHeight: 20 },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 60 },
  emptyTitle: { fontSize: 17, lineHeight: 26 },
  emptySub:   { fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 240 },

  fabWrap: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
  },
  fabGlow: { position: 'absolute', width: 56, height: 56, borderRadius: 28 },
  fab:     { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  fabArrow:{ position: 'absolute', bottom: 38, right: 88, flexDirection: 'row', alignItems: 'center', gap: -6 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet:   { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 12 },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle:   { fontSize: 17, lineHeight: 26 },
  modalInput:   { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, lineHeight: 22, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtn:     { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 15, lineHeight: 22 },
});
