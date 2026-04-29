import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable,
  ScrollView, Modal, FlatList,
} from 'react-native';
import AppInput from '../ui/Input';
import DatePickerModal from '../ui/DatePickerModal';
import TimePickerModal from '../ui/TimePickerModal';
import ContactPickerModal from './ContactPickerModal';
import { ChevronDownIcon, CheckIcon, CloseIcon } from '../ui/Icons';
import { useTheme } from '../../hooks/useTheme';
import { useBookFieldsStore } from '../../store/bookFieldsStore';
import { CATEGORIES, PAYMENT_MODES } from '../../constants/categories';

// Exposes { getValues(), validate() } via ref.
const EntryForm = forwardRef(function EntryForm(
  { bookId, initialValues, initialType = 'in', showTypeToggle = false, autoFocusAmount = false, onContactDeletedChange },
  ref
) {
  const { C, Font } = useTheme();
  const s = useMemo(() => makeStyles(C, Font), [C, Font]);
  const { getFields } = useBookFieldsStore();
  const { showContact, showCategory, showPaymentMode } = getFields(bookId);

  const [entryType,    setEntryType]    = useState(initialValues?.type ?? initialType);
  const [amount,       setAmount]       = useState(initialValues?.amount?.toString() ?? '');
  const [remark,       setRemark]       = useState(initialValues?.remark ?? '');
  const [category,     setCategory]     = useState(initialValues?.category ?? '');
  const [paymentMode,  setPaymentMode]  = useState(initialValues?.payment_mode ?? 'cash');
  const [contactName,  setContactName]  = useState(initialValues?.contact_name ?? '');
  const [customerId,   setCustomerId]   = useState(initialValues?.customer_id ?? null);
  const [supplierId,   setSupplierId]   = useState(initialValues?.supplier_id ?? null);

  // true when an entry still has a name snapshot but the linked contact was deleted
  const contactDeleted = contactName !== '' && !customerId && !supplierId;

  useEffect(() => { onContactDeletedChange?.(contactDeleted); }, [contactDeleted]);

  const [showAllPayments,   setShowAllPayments]   = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showContactModal,  setShowContactModal]  = useState(false);
  const [date,           setDate]           = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (!initialValues?.id) return;
    const [y, m, d] = (initialValues.entry_date ?? '').split('-').map(Number);
    const [h, min]  = (initialValues.entry_time ?? '00:00').split(':').map(Number);
    if (y) setDate(new Date(y, m - 1, d, h, min));
    setEntryType(initialValues.type ?? initialType);
    setAmount(initialValues.amount?.toString() ?? '');
    setRemark(initialValues.remark ?? '');
    setCategory(initialValues.category ?? '');
    setPaymentMode(initialValues.payment_mode ?? 'cash');
    setContactName(initialValues.contact_name ?? '');
    setCustomerId(initialValues.customer_id ?? null);
    setSupplierId(initialValues.supplier_id ?? null);
  }, [initialValues?.id]);

  useImperativeHandle(ref, () => ({
    getValues: () => ({
      type:         entryType,
      amount:       parseFloat(amount),
      remark:       remark.trim() || undefined,
      category:     category || undefined,
      payment_mode: paymentMode,
      contact_name: contactDeleted ? undefined : (contactName.trim() || undefined),
      customer_id:  contactDeleted ? undefined : (customerId || undefined),
      supplier_id:  contactDeleted ? undefined : (supplierId || undefined),
      entry_date:   date.toISOString().split('T')[0],
      entry_time:   date.toTimeString().slice(0, 5),
    }),
    validate: () => {
      const parsed = parseFloat(amount);
      return !(!amount || isNaN(parsed) || parsed <= 0);
    },
  }));

  const isIn = entryType === 'in';
  const visibleModes = showAllPayments ? PAYMENT_MODES : PAYMENT_MODES.slice(0, 2);

  const confirmDate = (picked) => {
    setDate(prev => { const n = new Date(prev); n.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate()); return n; });
    setShowDatePicker(false);
  };

  const confirmTime = (picked) => {
    setDate(prev => { const n = new Date(prev); n.setHours(picked.getHours(), picked.getMinutes()); return n; });
    setShowTimePicker(false);
  };

  const dateStr = date.toLocaleDateString('en-GB');
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();

  return (
    <>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {showTypeToggle && (
          <View style={s.typeRow}>
            <TouchableOpacity
              style={[s.typeBtn, isIn && { backgroundColor: C.cashIn, borderColor: C.cashIn }]}
              onPress={() => setEntryType('in')}
              activeOpacity={0.8}
            >
              <Text style={[s.typeBtnText, isIn && { color: '#fff' }]}>Cash In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.typeBtn, !isIn && { backgroundColor: C.danger, borderColor: C.danger }]}
              onPress={() => setEntryType('out')}
              activeOpacity={0.8}
            >
              <Text style={[s.typeBtnText, !isIn && { color: '#fff' }]}>Cash Out</Text>
            </TouchableOpacity>
          </View>
        )}

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

        <AppInput
          label="Amount *"
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="decimal-pad"
          autoFocus={autoFocusAmount}
          isLast
          style={s.fieldGap}
          labelColor={C.primary}
        />

        {showContact && (
          <View style={s.fieldGap}>
            <TouchableOpacity onPress={() => setShowContactModal(true)} activeOpacity={0.85}>
              <AppInput
                label={customerId ? 'Customer' : supplierId ? 'Supplier' : 'Contact (Customer/Supplier)'}
                value={contactName}
                placeholder="Select contact"
                editable={false}
                rightElement={
                  contactName
                    ? <TouchableOpacity onPress={(e) => { e.stopPropagation(); setContactName(''); setCustomerId(null); setSupplierId(null); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><CloseIcon color={contactDeleted ? '#F59E0B' : C.textMuted} size={14} /></TouchableOpacity>
                    : <ChevronDownIcon color={C.textMuted} size={12} />
                }
                isLast
                labelColor={contactDeleted ? '#F59E0B' : C.primary}
              />
            </TouchableOpacity>
            {contactDeleted && (
              <Text style={s.contactDeletedHint}>Contact no longer exists — tap × to remove</Text>
            )}
          </View>
        )}

        <AppInput
          label="Remark"
          value={remark}
          onChangeText={setRemark}
          placeholder="Item, Person Name, Quantity..."
          multiline
          rightElement={<Text style={{ fontSize: 20 }}>🎤</Text>}
          isLast
          style={s.fieldGap}
          labelColor={C.primary}
        />

        <TouchableOpacity style={[s.attachBtn, { borderColor: C.border }]} activeOpacity={0.7}>
          <Text style={{ fontSize: 16 }}>📎</Text>
          <Text style={[s.attachText, { color: C.primary, fontFamily: Font.semiBold }]}>
            Attach Image or PDF
          </Text>
        </TouchableOpacity>

        {showCategory && (
          <TouchableOpacity onPress={() => setShowCategoryModal(true)} activeOpacity={0.85} style={s.fieldGap}>
            <AppInput
              label="Category"
              value={category}
              placeholder="Select category"
              editable={false}
              rightElement={<ChevronDownIcon color={C.textMuted} size={12} />}
              isLast
              labelColor={C.primary}
            />
          </TouchableOpacity>
        )}

        {showPaymentMode && (
          <>
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
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

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

      {/* Contact Picker — self-contained modal */}
      <ContactPickerModal
        visible={showContactModal}
        bookId={bookId}
        selectedContactId={customerId || supplierId}
        onSelect={({ id, name, customer_id, supplier_id }) => {
          setContactName(name);
          setCustomerId(customer_id || null);
          setSupplierId(supplier_id || null);
          setShowContactModal(false);
        }}
        onDeselect={() => {
          setContactName('');
          setCustomerId(null);
          setSupplierId(null);
        }}
        onClose={() => setShowContactModal(false)}
      />

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
    </>
  );
});

export default EntryForm;

const makeStyles = (C, Font) => StyleSheet.create({
  scroll: { flex: 1, padding: 16 },

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeBtn: {
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

  fieldGap: { marginBottom: 12 },
  contactDeletedHint: {
    fontSize: 12, fontFamily: Font.medium, color: '#F59E0B',
    marginTop: 5, paddingHorizontal: 2,
  },

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
