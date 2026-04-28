import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, Dimensions, StyleSheet } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const POPUP_W = 220;

// ── Icons ─────────────────────────────────────────────────────────────────────

const PencilIcon = ({ color, size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.68, height: 2, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '-45deg' }] }} />
    <View style={{ position: 'absolute', top: size * 0.05, right: size * 0.08, width: size * 0.28, height: size * 0.28, backgroundColor: color, borderTopLeftRadius: 3, borderTopRightRadius: 3, transform: [{ rotate: '-45deg' }] }} />
    <View style={{ position: 'absolute', bottom: size * 0.02, left: size * 0.06, width: size * 0.2, height: size * 0.2, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: color, transform: [{ rotate: '-45deg' }] }} />
  </View>
);

const TrashIcon = ({ color, size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.65, height: size * 0.65, borderWidth: 1.5, borderColor: color, borderRadius: 2, marginTop: size * 0.2 }} />
    <View style={{ position: 'absolute', top: size * 0.1, width: size * 0.82, height: 1.5, backgroundColor: color, borderRadius: 1 }} />
    <View style={{ position: 'absolute', top: 0, width: size * 0.4, height: size * 0.16, borderWidth: 1.5, borderColor: color, borderRadius: 2 }} />
  </View>
);

// ── Menu items config ─────────────────────────────────────────────────────────

const ITEMS = [
  { key: 'rename', label: 'Rename',      Icon: PencilIcon, danger: false },
  { key: 'delete', label: 'Delete Book', Icon: TrashIcon,  danger: true  },
];

// ── Popup menu ────────────────────────────────────────────────────────────────

const BookMenu = memo(({ book, anchor, onClose, onSelect, C, Font }) => {
  if (!book) return null;

  const ITEM_H  = 48;
  const PAD_V   = 6;
  const POPUP_H = ITEMS.length * ITEM_H + PAD_V * 2 + 8;

  const anchorX = anchor?.pageX ?? SCREEN_W - POPUP_W - 16;
  const anchorY = anchor?.pageY ?? SCREEN_H / 2;
  const btnW    = anchor?.width  ?? 32;
  const btnH    = anchor?.height ?? 32;

  let left = anchorX - POPUP_W + btnW;
  let top  = anchorY + btnH + 6;

  if (top + POPUP_H > SCREEN_H - 60) top  = anchorY - POPUP_H - 6;
  if (left < 8)                       left = 8;
  if (left + POPUP_W > SCREEN_W - 8)  left = SCREEN_W - POPUP_W - 8;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose}>
        <Pressable
          style={{
            position: 'absolute', top, left,
            width: POPUP_W,
            backgroundColor: C.card,
            borderRadius: 14,
            paddingVertical: PAD_V,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.18,
            shadowRadius: 16,
            elevation: 16,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: C.border,
          }}
          onPress={() => {}}
        >
          {ITEMS.map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => onSelect(item.key, book)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                ...(item.key === 'delete' ? {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: C.border,
                  marginTop: 4,
                } : {}),
              }}
              activeOpacity={0.7}
            >
              <item.Icon color={item.danger ? '#E53935' : C.textSubtle} size={16} />
              <Text style={{ fontSize: 14, fontFamily: Font.medium, color: item.danger ? '#E53935' : C.text, lineHeight: 20 }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
});

export default BookMenu;
