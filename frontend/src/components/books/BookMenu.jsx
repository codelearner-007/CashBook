import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { CARD_ACCENTS } from '../../constants/colors';

const getInitials = (str = '') =>
  str.split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '?';

const TrashIcon = ({ color, size = 18 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.65, height: size * 0.7, borderWidth: 1.5, borderColor: color, borderRadius: 2, marginTop: size * 0.18 }} />
    <View style={{ position: 'absolute', top: 0, width: size * 0.85, height: 2, backgroundColor: color, borderRadius: 1 }} />
    <View style={{ position: 'absolute', top: -size * 0.12, width: size * 0.42, height: size * 0.18, borderWidth: 1.5, borderColor: color, borderRadius: 2 }} />
    {[0.25, 0.5, 0.75].map(x => (
      <View key={x} style={{ position: 'absolute', bottom: size * 0.08, left: size * x - 0.75, width: 1.5, height: size * 0.38, backgroundColor: color, borderRadius: 1 }} />
    ))}
  </View>
);

const BookMenu = memo(({ book, onDelete, onClose, C, Font }) => {
  if (!book) return null;
  const accent   = CARD_ACCENTS[0];
  const initials = getInitials(book.name);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          style={{ backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingBottom: 32, paddingHorizontal: 20 }}
          onPress={() => {}}
        >
          {/* Handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />

          {/* Book identity */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: accent + '18', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 15, fontFamily: Font.extraBold, color: accent }}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: Font.semiBold, color: C.text, lineHeight: 22 }} numberOfLines={1}>
                {book.name}
              </Text>
              <Text style={{ fontSize: 12, fontFamily: Font.regular, color: C.textMuted, lineHeight: 18 }}>
                Book options
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: C.border, marginBottom: 8 }} />

          {/* Delete row */}
          <TouchableOpacity
            onPress={onDelete}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 4, borderRadius: 12, marginTop: 4 }}
            activeOpacity={0.7}
          >
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
              <TrashIcon color="#C62828" size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: Font.semiBold, color: '#C62828', lineHeight: 22 }}>Delete Book</Text>
              <Text style={{ fontSize: 12, fontFamily: Font.regular, color: C.textMuted, lineHeight: 18 }}>
                Permanently remove this book and all its entries
              </Text>
            </View>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity
            onPress={onClose}
            style={{ marginTop: 8, paddingVertical: 15, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' }}
            activeOpacity={0.8}
          >
            <Text style={{ fontFamily: Font.semiBold, fontSize: 15, color: C.textMuted }}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

export default BookMenu;
