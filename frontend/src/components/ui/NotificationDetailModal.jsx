import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Font } from '../../constants/fonts';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// Feather-style bell drawn with primitives
const BellIcon = ({ color, size = 28 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.58, height: size * 0.52,
      borderTopLeftRadius: size * 0.29, borderTopRightRadius: size * 0.29,
      borderWidth: 2.2, borderColor: color, borderBottomWidth: 0, marginTop: 2,
    }} />
    <View style={{ width: size * 0.76, height: size * 0.13, borderWidth: 2.2, borderColor: color, marginTop: -1 }} />
    <View style={{
      width: size * 0.26, height: size * 0.13,
      borderBottomLeftRadius: size * 0.13, borderBottomRightRadius: size * 0.13,
      borderWidth: 2.2, borderColor: color, borderTopWidth: 0,
    }} />
  </View>
);

const CloseIcon = ({ color, size = 12 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ position: 'absolute', width: size, height: 2, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
    <View style={{ position: 'absolute', width: size, height: 2, backgroundColor: color, transform: [{ rotate: '-45deg' }] }} />
  </View>
);

const CalendarIcon = ({ color, size = 13 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size, height: size * 0.85, borderRadius: 2, borderWidth: 1.5, borderColor: color, marginTop: size * 0.15 }} />
    <View style={{ position: 'absolute', top: 0, left: size * 0.22, width: 1.5, height: size * 0.28, backgroundColor: color }} />
    <View style={{ position: 'absolute', top: 0, right: size * 0.22, width: 1.5, height: size * 0.28, backgroundColor: color }} />
    <View style={{ position: 'absolute', top: size * 0.38, left: size * 0.2, width: size * 0.6, height: 1, backgroundColor: color }} />
  </View>
);

export default function NotificationDetailModal({ visible, notification, onClose, C }) {
  if (!notification) return null;
  const isUnread = !notification.is_read;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={[s.card, { backgroundColor: C.card }]} onPress={() => {}}>

          {/* Colored header section */}
          <View style={[s.header, { backgroundColor: C.primary }]}>
            {/* Close button — top right */}
            <TouchableOpacity
              style={s.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <CloseIcon color="#fff" size={12} />
            </TouchableOpacity>

            {/* Bell icon in white circle */}
            <View style={s.iconWrap}>
              <BellIcon color={C.primary} size={28} />
            </View>

            {/* Unread badge */}
            {isUnread && (
              <View style={s.unreadBadge}>
                <View style={s.unreadDot} />
                <Text style={[s.unreadText, { fontFamily: Font.semiBold }]}>Unread</Text>
              </View>
            )}
          </View>

          {/* Body */}
          <View style={s.body}>
            <Text style={[s.title, { color: C.text, fontFamily: Font.bold }]} numberOfLines={3}>
              {notification.title}
            </Text>
            {!!notification.body && (
              <Text style={[s.message, { color: C.textMuted, fontFamily: Font.regular }]}>
                {notification.body}
              </Text>
            )}
          </View>

          {/* Footer */}
          <View style={[s.footer, { borderTopColor: C.border }]}>
            <View style={[s.datePill, { backgroundColor: C.primaryLight, borderColor: C.primaryMid }]}>
              <CalendarIcon color={C.primary} size={12} />
              <Text style={[s.dateText, { color: C.primary, fontFamily: Font.medium }]}>
                {formatDate(notification.created_at)}
              </Text>
              <View style={[s.timeSep, { backgroundColor: C.primaryMid }]} />
              <Text style={[s.dateText, { color: C.primary, fontFamily: Font.medium }]}>
                {formatTime(notification.created_at)}
              </Text>
            </View>
            <Text style={[s.tapHint, { color: C.textSubtle, fontFamily: Font.regular }]}>
              Tap outside to close
            </Text>
          </View>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    // shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 16,
  },

  // ── Header ────────────────────────────────────────
  header: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  unreadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  unreadText: { fontSize: 12, color: '#fff' },

  // ── Body ──────────────────────────────────────────
  body: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    gap: 8,
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
  },

  // ── Footer ────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    flexWrap: 'wrap',
    gap: 6,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  timeSep: { width: 1, height: 10 },
  dateText: { fontSize: 12 },
  tapHint:  { fontSize: 11 },
});
