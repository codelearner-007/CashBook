import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, FlatList, Switch, Modal, TextInput,
} from 'react-native';
import SafeAreaView from '../components/ui/AppSafeAreaView';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useBookFieldsStore } from '../store/bookFieldsStore';
import { CATEGORIES } from '../constants/categories';

export default function CategoriesSettingsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { C, Font } = useTheme();
  const s = makeStyles(C, Font);

  const { getFields, setField } = useBookFieldsStore();
  const showField = getFields(id).showCategory;
  const setShowField = (val) => setField(id, 'showCategory', val);

  const [categories, setCategories] = useState(CATEGORIES.map((c, i) => ({ id: String(i), label: c, enabled: true })));
  const [addVisible, setAddVisible] = useState(false);
  const [newCat, setNewCat]         = useState('');

  const toggle = (id) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  const remove = (id) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const addCategory = () => {
    const label = newCat.trim();
    if (!label) return;
    setCategories(prev => [...prev, { id: Date.now().toString(), label, enabled: true }]);
    setNewCat('');
    setAddVisible(false);
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Categories</Text>
        <TouchableOpacity style={s.addHeaderBtn} onPress={() => setAddVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={item => item.id}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={[s.toggleCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={s.toggleLeft}>
                <View style={[s.iconBox, { backgroundColor: C.primaryLight }]}>
                  <Feather name="eye" size={18} color={C.primary} />
                </View>
                <View>
                  <Text style={s.toggleLabel}>Show Category Field</Text>
                  <Text style={s.toggleSub}>Display on entry form</Text>
                </View>
              </View>
              <Switch
                value={showField}
                onValueChange={setShowField}
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor="#fff"
              />
            </View>
            <Text style={s.sectionLabel}>CATEGORIES ({categories.length})</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={[s.row, { backgroundColor: C.card, borderColor: C.border, opacity: item.enabled ? 1 : 0.5 }]}>
            <View style={[s.iconBox, { backgroundColor: C.primaryLight }]}>
              <Feather name="tag" size={16} color={C.primary} />
            </View>
            <Text style={s.rowLabel}>{item.label}</Text>
            <View style={s.rowActions}>
              <Switch
                value={item.enabled}
                onValueChange={() => toggle(item.id)}
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor="#fff"
                style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
              />
              <TouchableOpacity onPress={() => remove(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={16} color={C.textSubtle} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />

      <Modal visible={addVisible} transparent animationType="fade" onRequestClose={() => setAddVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={s.modalTitle}>Add Category</Text>
            <TextInput
              style={[s.modalInput, { borderColor: C.border, color: C.text, backgroundColor: C.background }]}
              value={newCat}
              onChangeText={setNewCat}
              placeholder="Category name"
              placeholderTextColor={C.textSubtle}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={addCategory}
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, { borderColor: C.border }]} onPress={() => setAddVisible(false)}>
                <Text style={[s.modalBtnText, { color: C.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: C.primary, borderColor: C.primary }]} onPress={addCategory}>
                <Text style={[s.modalBtnText, { color: '#fff' }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (C, Font) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: {
    backgroundColor: C.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 14,
  },
  backBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addHeaderBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 17, fontFamily: Font.bold, color: '#fff' },

  content: { padding: 16, paddingBottom: 40 },
  toggleCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, borderWidth: 1,
    padding: 14, gap: 12, marginBottom: 20,
  },
  toggleLeft:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleLabel: { fontSize: 15, fontFamily: Font.semiBold, color: C.text },
  toggleSub:   { fontSize: 12, fontFamily: Font.regular, color: C.textMuted },
  sectionLabel: {
    fontSize: 11, fontFamily: Font.semiBold, color: C.textMuted,
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 10, marginLeft: 2,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12, gap: 12,
  },
  rowLabel:   { flex: 1, fontSize: 14, fontFamily: Font.medium, color: C.text },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%', borderRadius: 20, borderWidth: 1,
    padding: 24,
    shadowColor: '#000', shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, elevation: 12,
  },
  modalTitle:   { fontSize: 17, fontFamily: Font.bold, color: C.text, marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: Font.regular, marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  modalBtnText: { fontSize: 15, fontFamily: Font.semiBold },
});
