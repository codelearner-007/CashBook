import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView, Modal, FlatList, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';
import { CATEGORIES, PAYMENT_MODES } from '../constants/categories';
import { apiGetEntries, apiUpdateEntry, apiDeleteEntry } from '../lib/api';

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

const TrashIcon = ({ color, size = 20 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.6, height: size * 0.65, borderWidth: 1.8,
      borderColor: color, borderRadius: 2, marginTop: size * 0.1,
    }} />
    <View style={{
      position: 'absolute', top: 0, width: size * 0.8, height: 2,
      backgroundColor: color, borderRadius: 1,
    }} />
    <View style={{
      position: 'absolute', top: -3, width: size * 0.35, height: 4,
      backgroundColor: color, borderRadius: 1,
    }} />
  </View>
);

const MicIcon = ({ color, size = 20 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.45, height: size * 0.6, borderRadius: size * 0.22,
      borderWidth: 2, borderColor: color, marginBottom: 1,
    }} />
    <View style={{
      width: size * 0.65, height: size * 0.3,
      borderTopLeftRadius: size * 0.33, borderTopRightRadius: size * 0.33,
      borderWidth: 2, borderBottomWidth: 0, borderColor: color,
    }} />
  </View>
);

const CalendarIcon = ({ color, size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size, height: size * 0.85, borderWidth: 1.5, borderColor: color,
      borderRadius: 3, marginTop: size * 0.1,
    }} />
    <View style={{
      position: 'absolute', top: 0,
      flexDirection: 'row', gap: size * 0.35, paddingHorizontal: size * 0.2,
    }}>
      <View style={{ width: 2, height: size * 0.3, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: 2, height: size * 0.3, backgroundColor: color, borderRadius: 1 }} />
    </View>
  </View>
);

const ClockIcon = ({ color, size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 1.5, borderColor: color,
    }} />
    <View style={{
      position: 'absolute', width: 1.5, height: size * 0.3,
      backgroundColor: color, bottom: '50%', left: '50%', transformOrigin: 'bottom',
    }} />
  </View>
);

const PaperclipIcon = ({ color, size = 18 }) => (
  <Text style={{ fontSize: size, color }}>📎</Text>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

// ── Screen ────────────────────────────────────────────────────────────────────

export default function EditEntryScreen() {
  const router = useRouter();
  const { id, eid } = useLocalSearchParams();
  const { C, Font, isDark } = useTheme();
  const s = useMemo(() => makeStyles(C, Font), [C, Font]);
  const qc = useQueryClient();

  const { data: entries = [] } = useQuery({
    queryKey: ['entries', id],
    queryFn: () => apiGetEntries(id),
    staleTime: 1000 * 60 * 2,
    enabled: !!id,
  });

  const entry = entries.find(e => e.id === eid);

  const [entryType,    setEntryType]    = useState(entry?.type ?? 'in');
  const [amount,       setAmount]       = useState(entry?.amount?.toString() ?? '');
  const [remark,       setRemark]       = useState(entry?.remark ?? '');
  const [remarkFocused, setRemarkFocused] = useState(false);
  const [category,     setCategory]     = useState(entry?.category ?? '');
  const [paymentMode,  setPaymentMode]  = useState(entry?.payment_mode ?? 'cash');
  const [contactName,  setContactName]  = useState(entry?.contact_name ?? '');
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showContactModal,  setShowContactModal]  = useState(false);

  const isIn        = entryType === 'in';
  const accentColor = isIn ? C.cashIn : C.cashOut;

  const visibleModes = showAllPayments ? PAYMENT_MODES : PAYMENT_MODES.slice(0, 2);

  const updateEntry = useMutation({
    mutationFn: (payload) => apiUpdateEntry(id, eid, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries', id] });
      qc.invalidateQueries({ queryKey: ['summary', id] });
      qc.invalidateQueries({ queryKey: ['books'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Failed to update entry. Please try again.'),
  });

  const deleteEntry = useMutation({
    mutationFn: () => apiDeleteEntry(id, eid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries', id] });
      qc.invalidateQueries({ queryKey: ['summary', id] });
      qc.invalidateQueries({ queryKey: ['books'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Failed to delete entry. Please try again.'),
  });

  const handleUpdate = () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }
    updateEntry.mutate({
      type:         entryType,
      amount:       parsed,
      remark:       remark.trim() || undefined,
      category:     category || undefined,
      payment_mode: paymentMode,
      contact_name: contactName.trim() || undefined,
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteEntry.mutate() },
      ]
    );
  };

  if (!entry) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: Font.regular, color: C.textMuted, fontSize: 14 }}>
            Entry not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={s.headerTitle}>Edit Entry</Text>
        <TouchableOpacity
          onPress={handleDelete}
          style={s.headerBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          disabled={deleteEntry.isPending}
        >
          <TrashIcon color="#DC2626" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Type Toggle */}
        <View style={s.typeRow}>
          <TouchableOpacity
            style={[s.typeBtn, isIn && { backgroundColor: C.cashIn, borderColor: C.cashIn }]}
            onPress={() => setEntryType('in')}
            activeOpacity={0.8}
          >
            <Text style={[s.typeBtnText, isIn && { color: '#fff' }]}>Cash In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.typeBtn, !isIn && { backgroundColor: C.cashOut, borderColor: C.cashOut }]}
            onPress={() => setEntryType('out')}
            activeOpacity={0.8}
          >
            <Text style={[s.typeBtnText, !isIn && { color: '#fff' }]}>Cash Out</Text>
          </TouchableOpacity>
        </View>

        {/* Date + Time Row */}
        <View style={s.dateTimeRow}>
          <TouchableOpacity style={s.dateTimePicker} activeOpacity={0.7}>
            <Text style={s.dateTimeIcon}>📅</Text>
            <Text style={s.dateTimeText}>{formatDate(entry.entry_date)}</Text>
            <ChevronDownIcon color={C.textMuted} size={11} />
          </TouchableOpacity>
          <TouchableOpacity style={s.dateTimePicker} activeOpacity={0.7}>
            <Text style={s.dateTimeIcon}>🕐</Text>
            <Text style={s.dateTimeText}>{formatTime(entry.entry_time)}</Text>
            <ChevronDownIcon color={C.textMuted} size={11} />
          </TouchableOpacity>
        </View>

        {/* Amount — floating label outline */}
        <View style={[s.outlineBox, { borderColor: accentColor }]}>
          <View style={[s.floatingLabel, { backgroundColor: C.background }]}>
            <Text style={[s.floatingLabelText, { color: accentColor }]}>Amount *</Text>
          </View>
          <TextInput
            style={[s.amountInput, { color: accentColor }]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={accentColor + '50'}
            allowFontScaling={false}
          />
        </View>

        {/* Contact */}
        <TouchableOpacity
          style={s.inputBox}
          onPress={() => setShowContactModal(true)}
          activeOpacity={0.7}
        >
          <Text style={[s.inputPlaceholder, contactName && { color: C.text, fontFamily: Font.medium }]}>
            {contactName || 'Contact (Customer/Supplier)'}
          </Text>
          <ChevronDownIcon color={C.textMuted} size={12} />
        </TouchableOpacity>

        {/* Remark — floating label outline */}
        <View style={[s.outlineBox, { borderColor: remarkFocused ? C.primary : C.border }]}>
          <View style={[s.floatingLabel, { backgroundColor: C.background }]}>
            <Text style={[s.floatingLabelText, { color: remarkFocused ? C.primary : C.textMuted }]}>
              Remark
            </Text>
          </View>
          <View style={s.remarkRow}>
            <TextInput
              style={s.remarkInput}
              placeholder="Remark (Item, Person Name, Quantity...)"
              placeholderTextColor={C.textMuted}
              value={remark}
              onChangeText={setRemark}
              onFocus={() => setRemarkFocused(true)}
              onBlur={() => setRemarkFocused(false)}
              multiline
            />
            <MicIcon color={C.primary} size={20} />
          </View>
        </View>

        {/* Attach */}
        <TouchableOpacity style={s.attachBtn} activeOpacity={0.7}>
          <PaperclipIcon color={C.primary} size={16} />
          <Text style={[s.attachText, { color: C.primary }]}>Attach Image or PDF</Text>
        </TouchableOpacity>

        {/* Category */}
        <TouchableOpacity
          style={s.inputBox}
          onPress={() => setShowCategoryModal(true)}
          activeOpacity={0.7}
        >
          <Text style={[s.inputPlaceholder, category && { color: C.text, fontFamily: Font.medium }]}>
            {category || 'Category'}
          </Text>
          <ChevronDownIcon color={C.textMuted} size={12} />
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
          <Text style={[s.moreFieldsText, { color: C.primary }]}>Add More Fields</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Update Button */}
      <View style={[s.saveContainer, { backgroundColor: C.card, borderTopColor: C.border }]}>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: C.primary }, (updateEntry.isPending || deleteEntry.isPending) && { opacity: 0.6 }]}
          onPress={handleUpdate}
          disabled={updateEntry.isPending || deleteEntry.isPending}
          activeOpacity={0.85}
        >
          <Text style={s.saveBtnText}>{updateEntry.isPending ? 'SAVING…' : 'UPDATE'}</Text>
        </TouchableOpacity>
      </View>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={[s.modalOverlay, { backgroundColor: C.overlay }]}>
          <View style={[s.modalBox, { backgroundColor: C.card }]}>
            <View style={[s.modalHandle, { backgroundColor: C.border }]} />
            <Text style={[s.modalTitle, { color: C.text, fontFamily: Font.bold }]}>
              Select Category
            </Text>
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
          </View>
        </View>
      </Modal>

      {/* Contact Modal */}
      <Modal
        visible={showContactModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={[s.modalOverlay, { backgroundColor: C.overlay }]}>
          <View style={[s.modalBox, { backgroundColor: C.card }]}>
            <View style={[s.modalHandle, { backgroundColor: C.border }]} />
            <Text style={[s.modalTitle, { color: C.text, fontFamily: Font.bold }]}>
              Contact Name
            </Text>
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
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    flex: 1, fontSize: 17, fontFamily: Font.bold,
    color: C.text, lineHeight: 24, textAlign: 'center',
  },

  scroll: { flex: 1, padding: 16 },

  typeRow:   { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeBtn:   {
    flex: 1, paddingVertical: 11, borderRadius: 24,
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center',
  },
  typeBtnText: { fontSize: 14, fontFamily: Font.semiBold, color: C.text, lineHeight: 20 },

  dateTimeRow:    { flexDirection: 'row', gap: 10, marginBottom: 16 },
  dateTimePicker: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
    borderWidth: 1, borderColor: C.border,
  },
  dateTimeIcon: { fontSize: 14 },
  dateTimeText: { flex: 1, fontSize: 13, fontFamily: Font.medium, color: C.text, lineHeight: 18 },

  outlineBox: {
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, paddingTop: 18, paddingBottom: 14,
    marginBottom: 14, position: 'relative',
  },
  floatingLabel: {
    position: 'absolute', top: -9, left: 10,
    paddingHorizontal: 4,
  },
  floatingLabelText: { fontSize: 12, fontFamily: Font.semiBold, lineHeight: 16 },
  amountInput:       { fontSize: 40, fontFamily: Font.extraBold, letterSpacing: -1, lineHeight: 48, padding: 0 },

  remarkRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  remarkInput: {
    flex: 1, fontSize: 15, fontFamily: Font.regular, color: C.text,
    lineHeight: 22, minHeight: 24, padding: 0,
  },

  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 14, minHeight: 50,
  },
  inputPlaceholder: {
    flex: 1, fontSize: 15, fontFamily: Font.regular,
    color: C.textMuted, lineHeight: 22,
  },

  attachBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed',
    borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16,
    marginBottom: 14,
  },
  attachText: { fontSize: 14, fontFamily: Font.semiBold, lineHeight: 20 },

  sectionLabel:  { fontSize: 13, fontFamily: Font.bold, color: C.text, marginBottom: 10, lineHeight: 18 },
  paymentRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  paymentChip:   {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 24,
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border,
  },
  paymentChipText: { fontSize: 13, fontFamily: Font.semiBold, color: C.text, lineHeight: 18 },
  showMoreText:    { fontSize: 13, fontFamily: Font.semiBold, lineHeight: 18 },

  moreFieldsBtn: {
    borderWidth: 1.5, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', marginBottom: 14,
  },
  moreFieldsText: { fontSize: 14, fontFamily: Font.semiBold, lineHeight: 20 },

  saveContainer: { padding: 16, borderTopWidth: 1 },
  saveBtn:       { borderRadius: 14, paddingVertical: 16, alignItems: 'center', minHeight: 52 },
  saveBtnText:   { color: '#fff', fontFamily: Font.extraBold, fontSize: 14, letterSpacing: 0.8, lineHeight: 20 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBox: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingTop: 12, maxHeight: '72%',
  },
  modalHandle:      { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle:       { fontSize: 17, lineHeight: 26, marginBottom: 16 },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 15, borderBottomWidth: 1, minHeight: 52,
  },
  modalItemText:    { fontSize: 15, lineHeight: 22 },
  modalInput: {
    borderWidth: 1.5, borderRadius: 14,
    padding: 14, fontSize: 15,
    marginBottom: 16, minHeight: 48,
  },
  modalConfirmBtn:  { borderRadius: 14, paddingVertical: 15, alignItems: 'center', minHeight: 52 },
  modalConfirmText: { color: '#fff', fontSize: 15, lineHeight: 22 },
});
