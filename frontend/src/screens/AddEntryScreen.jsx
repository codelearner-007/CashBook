import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Pressable,
  SafeAreaView, StatusBar, ScrollView, Modal, FlatList, Alert,
} from 'react-native';
import DatePickerModal from '../components/ui/DatePickerModal';
import TimePickerModal from '../components/ui/TimePickerModal';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';
import AppInput from '../components/ui/Input';
import { CATEGORIES, PAYMENT_MODES } from '../constants/categories';
import { apiCreateEntry } from '../lib/api';

// ── Icons ─────────────────────────────────────────────────────────────────────

const ChevronLeftIcon = ({ color, size = 20 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.45, height: size * 0.45,
      borderLeftWidth: 2.5, borderBottomWidth: 2.5,
      borderColor: color, borderRadius: 1,
      transform: [{ rotate: '45deg' }, { translateX: size * 0.08 }],
    }} />
  </View>
);

const ChevronDownIcon = ({ color, size = 12 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.6, height: size * 0.6,
      borderRightWidth: 2, borderBottomWidth: 2,
      borderColor: color, borderRadius: 1,
      transform: [{ rotate: '45deg' }, { translateY: -size * 0.12 }],
    }} />
  </View>
);

const CheckIcon = ({ color, size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.55, height: size * 0.3,
      borderLeftWidth: 2, borderBottomWidth: 2,
      borderColor: color,
      transform: [{ rotate: '-45deg' }, { translateY: -size * 0.05 }],
    }} />
  </View>
);

const CloseIcon = ({ color, size = 18 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ position: 'absolute', width: size * 0.8, height: 2, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '45deg' }] }} />
    <View style={{ position: 'absolute', width: size * 0.8, height: 2, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '-45deg' }] }} />
  </View>
);

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AddEntryScreen() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams();
  const { C, Font, isDark } = useTheme();
  const s = useMemo(() => makeStyles(C, Font), [C, Font]);
  const qc = useQueryClient();

  const isIn        = type === 'in';
  const accentColor = isIn ? C.cashIn : C.cashOut;
  const titleText   = isIn ? 'Cash In' : 'Cash Out';

  const [amount,       setAmount]       = useState('');
  const [remark,       setRemark]       = useState('');
  const [category,     setCategory]     = useState('');
  const [paymentMode,  setPaymentMode]  = useState('cash');
  const [contactName,  setContactName]  = useState('');
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showContactModal,  setShowContactModal]  = useState(false);
  const [date,           setDate]           = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const dateStr = date.toLocaleDateString('en-GB');
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();

  const confirmDate = (picked) => {
    setDate(prev => { const n = new Date(prev); n.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate()); return n; });
    setShowDatePicker(false);
  };

  const confirmTime = (picked) => {
    setDate(prev => { const n = new Date(prev); n.setHours(picked.getHours(), picked.getMinutes()); return n; });
    setShowTimePicker(false);
  };

  const visibleModes = showAllPayments ? PAYMENT_MODES : PAYMENT_MODES.slice(0, 2);

  const createEntry = useMutation({
    mutationFn: (payload) => apiCreateEntry(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries', id] });
      qc.invalidateQueries({ queryKey: ['summary', id] });
      qc.invalidateQueries({ queryKey: ['books'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Failed to save entry. Please try again.'),
  });

  const handleSave = () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }
    createEntry.mutate({
      type,
      amount:       parsed,
      remark:       remark.trim() || undefined,
      category:     category || undefined,
      payment_mode: paymentMode,
      contact_name: contactName.trim() || undefined,
      entry_date:   date.toISOString().split('T')[0],
      entry_time:   date.toTimeString().slice(0, 5),
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.card} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.headerBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeftIcon color={C.text} size={22} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{titleText}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Date + Time Row */}
        <View style={s.dateTimeRow}>
          <TouchableOpacity style={s.dateTimePicker} activeOpacity={0.7} onPress={() => setShowDatePicker(true)}>
            <Text style={s.dateTimeIcon}>📅</Text>
            <Text style={s.dateTimeText}>{dateStr}</Text>
            <ChevronDownIcon color={C.textMuted} size={11} />
          </TouchableOpacity>
          <TouchableOpacity style={s.dateTimePicker} activeOpacity={0.7} onPress={() => setShowTimePicker(true)}>
            <Text style={s.dateTimeIcon}>🕐</Text>
            <Text style={s.dateTimeText}>{timeStr}</Text>
            <ChevronDownIcon color={C.textMuted} size={11} />
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <AppInput
          label="Amount *"
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="decimal-pad"
          autoFocus
          isLast
          style={s.fieldGap}
        />

        {/* Contact */}
        <TouchableOpacity onPress={() => setShowContactModal(true)} activeOpacity={0.85} style={s.fieldGap}>
          <AppInput
            label="Contact (Customer/Supplier)"
            value={contactName}
            placeholder="Select contact"
            editable={false}
            rightElement={<ChevronDownIcon color={C.textMuted} size={12} />}
            isLast
          />
        </TouchableOpacity>

        {/* Remark */}
        <AppInput
          label="Remark"
          value={remark}
          onChangeText={setRemark}
          placeholder="Item, Person Name, Quantity..."
          multiline
          rightElement={<Text style={{ fontSize: 20 }}>🎤</Text>}
          isLast
          style={s.fieldGap}
        />

        {/* Attach */}
        <TouchableOpacity style={[s.attachBtn, { borderColor: C.border }]} activeOpacity={0.7}>
          <Text style={{ fontSize: 16 }}>📎</Text>
          <Text style={[s.attachText, { color: C.primary, fontFamily: Font.semiBold }]}>
            Attach Image or PDF
          </Text>
        </TouchableOpacity>

        {/* Category */}
        <TouchableOpacity onPress={() => setShowCategoryModal(true)} activeOpacity={0.85} style={s.fieldGap}>
          <AppInput
            label="Category"
            value={category}
            placeholder="Select category"
            editable={false}
            rightElement={<ChevronDownIcon color={C.textMuted} size={12} />}
            isLast
          />
        </TouchableOpacity>

        {/* Payment Mode */}
        <Text style={s.sectionLabel}>Payment Mode</Text>
        <View style={s.paymentRow}>
          {visibleModes.map((mode) => (
            <TouchableOpacity
              key={mode.value}
              style={[s.paymentChip, paymentMode === mode.value && { backgroundColor: C.primary, borderColor: C.primary }]}
              onPress={() => setPaymentMode(mode.value)}
              activeOpacity={0.8}
            >
              <Text style={[s.paymentChipText, paymentMode === mode.value && { color: '#fff' }]}>
                {mode.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setShowAllPayments(v => !v)} activeOpacity={0.7}>
            <Text style={[s.showMoreText, { color: C.primary }]}>
              {showAllPayments ? 'Show Less ▲' : 'Show More ▾'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add More Fields */}
        <TouchableOpacity style={[s.moreFieldsBtn, { borderColor: C.border }]} activeOpacity={0.7}>
          <Text style={[s.moreFieldsText, { color: C.primary, fontFamily: Font.semiBold }]}>
            Add More Fields
          </Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={[s.saveContainer, { backgroundColor: C.card, borderTopColor: C.border }]}>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: C.primary }, createEntry.isPending && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={createEntry.isPending}
          activeOpacity={0.85}
        >
          <Text style={s.saveBtnText}>{createEntry.isPending ? 'SAVING…' : 'SAVE'}</Text>
        </TouchableOpacity>
      </View>

      {/* Category Modal */}
      <Modal visible={showCategoryModal} transparent animationType="slide" onRequestClose={() => setShowCategoryModal(false)}>
        <Pressable style={[s.modalOverlay, { backgroundColor: C.overlay }]} onPress={() => setShowCategoryModal(false)}>
          <Pressable style={[s.modalBox, { backgroundColor: C.card }]} onPress={() => {}}>
            <View style={[s.modalHandle, { backgroundColor: C.border }]} />
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: C.text, fontFamily: Font.bold }]}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <CloseIcon color={C.textMuted} size={18} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CATEGORIES}
              keyExtractor={(i) => i}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.modalItem, { borderBottomColor: C.border }]}
                  onPress={() => { setCategory(item); setShowCategoryModal(false); }}
                >
                  <Text style={[
                    s.modalItemText,
                    { color: C.text, fontFamily: Font.regular },
                    category === item && { color: C.primary, fontFamily: Font.semiBold },
                  ]}>
                    {item}
                  </Text>
                  {category === item && <CheckIcon color={C.primary} size={16} />}
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Contact Modal */}
      <Modal visible={showContactModal} transparent animationType="slide" onRequestClose={() => setShowContactModal(false)}>
        <Pressable style={[s.modalOverlay, { backgroundColor: C.overlay }]} onPress={() => setShowContactModal(false)}>
          <Pressable style={[s.modalBox, { backgroundColor: C.card }]} onPress={() => {}}>
            <View style={[s.modalHandle, { backgroundColor: C.border }]} />
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: C.text, fontFamily: Font.bold }]}>Contact Name</Text>
              <TouchableOpacity onPress={() => setShowContactModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <CloseIcon color={C.textMuted} size={18} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[s.modalInput, { borderColor: C.border, color: C.text, backgroundColor: C.background, fontFamily: Font.regular }]}
              placeholder="Type contact name…"
              placeholderTextColor={C.textMuted}
              value={contactName}
              onChangeText={setContactName}
              autoFocus
            />
            <TouchableOpacity
              style={[s.modalConfirmBtn, { backgroundColor: C.primary }]}
              onPress={() => setShowContactModal(false)}
            >
              <Text style={[s.modalConfirmText, { fontFamily: Font.bold }]}>Confirm</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <DatePickerModal
        visible={showDatePicker}
        date={date}
        onConfirm={confirmDate}
        onCancel={() => setShowDatePicker(false)}
      />
      <TimePickerModal
        visible={showTimePicker}
        date={date}
        onConfirm={confirmTime}
        onCancel={() => setShowTimePicker(false)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (C, Font) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, paddingHorizontal: 8, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border, minHeight: 56,
  },
  headerBtn:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: Font.bold, color: C.text, lineHeight: 24, textAlign: 'center' },

  scroll: { flex: 1, padding: 16 },

  dateTimeRow:    { flexDirection: 'row', gap: 10, marginBottom: 16 },
  dateTimePicker: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
    borderWidth: 1, borderColor: C.border,
  },
  dateTimeIcon: { fontSize: 14 },
  dateTimeText: { flex: 1, fontSize: 13, fontFamily: Font.medium, color: C.text, lineHeight: 18 },

  fieldGap: { marginBottom: 12 },

  attachBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderStyle: 'dashed',
    borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16,
    marginBottom: 14,
  },
  attachText: { fontSize: 14, lineHeight: 20 },

  sectionLabel:    { fontSize: 13, fontFamily: Font.bold, color: C.text, marginBottom: 10, lineHeight: 18 },
  paymentRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  paymentChip:     { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 24, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border },
  paymentChipText: { fontSize: 13, fontFamily: Font.semiBold, color: C.text, lineHeight: 18 },
  showMoreText:    { fontSize: 13, fontFamily: Font.semiBold, lineHeight: 18 },

  moreFieldsBtn:  { borderWidth: 1.5, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 14 },
  moreFieldsText: { fontSize: 14, lineHeight: 20 },

  saveContainer: { padding: 16, borderTopWidth: 1 },
  saveBtn:       { borderRadius: 14, paddingVertical: 16, alignItems: 'center', minHeight: 52 },
  saveBtnText:   { color: '#fff', fontFamily: Font.extraBold, fontSize: 14, letterSpacing: 0.8, lineHeight: 20 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBox:     { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 12, maxHeight: '72%' },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle:   { fontSize: 17, lineHeight: 26 },
  modalItem:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, minHeight: 52 },
  modalItemText: { fontSize: 15, lineHeight: 22 },
  modalInput:   { borderWidth: 1.5, borderRadius: 14, padding: 14, fontSize: 15, marginBottom: 16, minHeight: 48 },
  modalConfirmBtn:  { borderRadius: 14, paddingVertical: 15, alignItems: 'center', minHeight: 52 },
  modalConfirmText: { color: '#fff', fontSize: 15, lineHeight: 22 },
});
