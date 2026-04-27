import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Dimensions, Modal, FlatList,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { LightColors } from '../constants/colors';
import { useAuthStore } from '../store/authStore';
import { MOCK_USERS } from '../lib/api';

const C = LightColors;
const { width, height } = Dimensions.get('window');

function GoogleIcon({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

function EmailIcon({ size = 18, color = C.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 6l-10 7L2 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ShieldCheckIcon({ size = 13, color = '#15803D' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRight({ size = 13, color = C.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckIcon({ size = 16, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function BackgroundBlobs() {
  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
      <Circle cx={width * 0.85} cy={height * 0.12} r={130} fill="rgba(57,170,170,0.12)" />
      <Circle cx={width * 0.05} cy={height * 0.3} r={90} fill="rgba(57,170,170,0.07)" />
      <Circle cx={width * 0.5} cy={height * 0.82} r={160} fill="rgba(57,170,170,0.08)" />
    </Svg>
  );
}

const getInitials = (name) =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const ROLE_COLORS = {
  superadmin: { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  user:       { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
};

function UserPickerModal({ visible, onClose, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerBox}>
          <View style={styles.pickerHandle} />
          <Text style={styles.pickerTitle}>Select Account</Text>
          <Text style={styles.pickerSub}>
            Dev mode — pick a user to log in as
          </Text>

          <FlatList
            data={MOCK_USERS}
            keyExtractor={u => u.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.pickerSep} />}
            renderItem={({ item }) => {
              const rc = ROLE_COLORS[item.role] ?? ROLE_COLORS.user;
              const initials = getInitials(item.full_name);
              return (
                <TouchableOpacity
                  style={styles.pickerRow}
                  onPress={() => onSelect(item)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.pickerAvatar, { backgroundColor: rc.bg, borderColor: rc.border }]}>
                    <Text style={[styles.pickerAvatarText, { color: rc.text }]}>{initials}</Text>
                  </View>
                  <View style={styles.pickerInfo}>
                    <Text style={styles.pickerName}>{item.full_name}</Text>
                    <Text style={styles.pickerEmail}>{item.email}</Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: rc.bg, borderColor: rc.border }]}>
                    <Text style={[styles.roleBadgeText, { color: rc.text }]}>
                      {item.role === 'superadmin' ? 'Admin' : 'User'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          <TouchableOpacity style={styles.pickerCancel} onPress={onClose}>
            <Text style={styles.pickerCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function LoginScreen() {
  const router  = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPicker, setShowPicker] = useState(false);

  const handleSelectUser = (user) => {
    setShowPicker(false);
    setUser(user);
    if (user.role === 'superadmin') {
      router.replace('/(app)/dashboard');
    } else {
      router.replace('/(app)/books');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <BackgroundBlobs />

      <View style={styles.container}>

        {/* Logo block */}
        <View style={styles.logoBlock}>
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>C</Text>
          </View>
          <Text style={styles.appName}>CashBook</Text>
          <Text style={styles.tagline}>Smart money tracking for your business</Text>
        </View>

        {/* Main card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome</Text>
          <Text style={styles.cardSub}>Login or signup to backup your data securely</Text>

          {/* Google — opens user picker in dev mode */}
          <TouchableOpacity style={styles.googleBtn} onPress={() => setShowPicker(true)} activeOpacity={0.82}>
            <View style={styles.iconSlot}>
              <GoogleIcon size={20} />
            </View>
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email */}
          <TouchableOpacity style={styles.emailBtn} onPress={() => setShowPicker(true)} activeOpacity={0.82}>
            <EmailIcon size={18} color={C.primary} />
            <Text style={styles.emailBtnText}>Continue with Email</Text>
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <Text style={styles.terms}>
          By creating an account, you agree to our{' '}
          <Text style={styles.link}>Terms of Service</Text>
          {' '}&amp;{' '}
          <Text style={styles.link}>Privacy Policy</Text>
        </Text>

        {/* Other login */}
        <TouchableOpacity style={styles.otherRow} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
          <Text style={styles.otherText}>Other ways to login</Text>
          <ChevronRight size={13} color={C.primary} />
        </TouchableOpacity>

        {/* Trust badge */}
        <View style={styles.trustBadge}>
          <ShieldCheckIcon size={13} color="#15803D" />
          <Text style={styles.trustText}>CashBook is trusted by 3 million users</Text>
        </View>

      </View>

      <UserPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleSelectUser}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 0,
  },

  // Logo
  logoBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  logoLetter: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
  },
  appName: {
    fontSize: 24,
    fontWeight: '900',
    color: C.primary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 13,
    color: C.textMuted,
    letterSpacing: 0.1,
  },

  // Card
  card: {
    width: '100%',
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 24,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardSub: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },

  // Google button
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleBtnText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginRight: 34,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    fontSize: 12,
    color: C.textSubtle,
    fontWeight: '500',
  },

  // Email button
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 18,
    gap: 10,
    borderWidth: 1.5,
    borderColor: C.primaryMid,
    backgroundColor: C.primaryLight,
  },
  emailBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.primary,
  },

  // Footer
  terms: {
    fontSize: 12,
    color: C.textSubtle,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  link: {
    color: C.primary,
    fontWeight: '600',
  },

  otherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  otherText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },

  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  trustText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
  },

  // User Picker Modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerBox: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingTop: 12,
    paddingBottom: 36,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    marginBottom: 4,
    lineHeight: 28,
  },
  pickerSub: {
    fontSize: 13,
    color: C.textMuted,
    marginBottom: 20,
    lineHeight: 20,
  },
  pickerSep: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 2,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  pickerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerAvatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  pickerInfo: {
    flex: 1,
  },
  pickerName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    lineHeight: 20,
    marginBottom: 2,
  },
  pickerEmail: {
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 18,
  },
  roleBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  pickerCancel: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
  },
  pickerCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textMuted,
  },
});
