import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, ScrollView, Modal, TextInput, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export default function BookSettingsScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams();
  const { C, Font, isDark } = useTheme();
  const s = makeStyles(C, Font);

  const [bookName, setBookName] = useState(name || 'Unnamed Book');
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameInput, setRenameInput] = useState('');

  const openRename = () => {
    setRenameInput(bookName);
    setRenameVisible(true);
  };

  const confirmRename = () => {
    const trimmed = renameInput.trim();
    if (!trimmed) return;
    setBookName(trimmed);
    setRenameVisible(false);
    // TODO: call API to persist rename
  };

  const ENTRY_FIELDS = [
    {
      icon: 'users',
      label: 'Contact',
      sub: 'Manage contacts for this book',
      route: '/(app)/books/[id]/contact-settings',
    },
    {
      icon: 'tag',
      label: 'Categories',
      sub: 'Add or remove categories',
      route: '/(app)/books/[id]/categories-settings',
    },
    {
      icon: 'credit-card',
      label: 'Payment Mode',
      sub: 'Configure payment modes',
      route: '/(app)/books/[id]/payment-mode-settings',
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
                onPress={() => router.push({ pathname: item.route, params: { id, name: bookName } })}
                activeOpacity={0.75}
              >
                <View style={[s.iconBox, { backgroundColor: C.primaryLight }]}>
                  <Feather name={item.icon} size={18} color={C.primary} />
                </View>
                <View style={s.rowBody}>
                  <Text style={s.rowLabel}>{item.label}</Text>
                  <Text style={s.rowSub}>{item.sub}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={C.textSubtle} />
              </TouchableOpacity>
              {idx < ENTRY_FIELDS.length - 1 && (
                <View style={[s.divider, { backgroundColor: C.border }]} />
              )}
            </View>
          ))}
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
