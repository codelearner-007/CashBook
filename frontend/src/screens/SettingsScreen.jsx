import { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ScrollView, Alert, useWindowDimensions,
} from 'react-native';
import SafeAreaView from '../components/ui/AppSafeAreaView';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useProfile } from '../hooks/useProfile';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { Font } from '../constants/fonts';

// ── Icons ─────────────────────────────────────────────────────────────────────

const BackIcon = ({ color }) => (
  <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: 9, height: 9, borderLeftWidth: 2.5, borderBottomWidth: 2.5, borderColor: color, transform: [{ rotate: '45deg' }] }} />
  </View>
);

const ChevronRight = ({ color }) => (
  <View style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: 7, height: 7, borderRightWidth: 2, borderTopWidth: 2, borderColor: color, transform: [{ rotate: '45deg' }] }} />
  </View>
);

const UserIcon = ({ color, size = 14 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.5, height: size * 0.5, borderRadius: size * 0.25, borderWidth: 1.5, borderColor: color }} />
    <View style={{ width: size * 0.75, height: size * 0.35, borderTopLeftRadius: size * 0.375, borderTopRightRadius: size * 0.375, borderWidth: 1.5, borderColor: color, borderBottomWidth: 0, marginTop: 2 }} />
  </View>
);

const BuildingIcon = ({ color, size = 14 }) => (
  <View style={{ width: size, height: size, justifyContent: 'flex-end', alignItems: 'center' }}>
    <View style={{ width: size * 0.78, height: size * 0.7, borderWidth: 1.5, borderColor: color, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 2 }}>
      <View style={{ width: size * 0.18, height: size * 0.18, borderWidth: 1, borderColor: color }} />
      <View style={{ width: size * 0.18, height: size * 0.18, borderWidth: 1, borderColor: color }} />
      <View style={{ width: size * 0.18, height: size * 0.18, borderWidth: 1, borderColor: color }} />
    </View>
  </View>
);

const CurrencyIcon = ({ color, size = 14 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.72, height: size * 0.72, borderRadius: size * 0.36, borderWidth: 1.5, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 1.5, height: size * 0.38, backgroundColor: color }} />
    </View>
  </View>
);

const BellIcon = ({ color, size = 14 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.65, height: size * 0.58, borderTopLeftRadius: size * 0.325, borderTopRightRadius: size * 0.325, borderWidth: 1.5, borderColor: color, borderBottomWidth: 0, marginTop: 2 }} />
    <View style={{ width: size * 0.78, height: size * 0.15, borderWidth: 1.5, borderColor: color, marginTop: -1 }} />
    <View style={{ width: size * 0.3, height: size * 0.15, borderBottomLeftRadius: size * 0.15, borderBottomRightRadius: size * 0.15, borderWidth: 1.5, borderColor: color, borderTopWidth: 0, marginTop: 0 }} />
  </View>
);

const ShieldIcon = ({ color, size = 14 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.72, height: size * 0.78, borderTopLeftRadius: size * 0.2, borderTopRightRadius: size * 0.2, borderBottomLeftRadius: size * 0.36, borderBottomRightRadius: size * 0.36, borderWidth: 1.5, borderColor: color }} />
  </View>
);

const CloudIcon = ({ color, size = 14 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.78, height: size * 0.45, borderRadius: size * 0.225, borderWidth: 1.5, borderColor: color, marginTop: 2 }} />
    <View style={{ position: 'absolute', left: size * 0.18, bottom: size * 0.22, width: size * 0.62, height: size * 0.28, borderBottomLeftRadius: size * 0.14, borderBottomRightRadius: size * 0.14, borderWidth: 1.5, borderColor: color, borderTopWidth: 0 }} />
  </View>
);

const GlobeIcon = ({ color, size = 14 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.78, height: size * 0.78, borderRadius: size * 0.39, borderWidth: 1.5, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.78, height: 1.5, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: 1.5, height: size * 0.78, backgroundColor: color }} />
    </View>
  </View>
);

const QuestionIcon = ({ color, size = 14 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.78, height: size * 0.78, borderRadius: size * 0.39, borderWidth: 1.5, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.48, color, fontFamily: Font.bold, lineHeight: size * 0.6 }}>?</Text>
    </View>
  </View>
);

const StarIcon = ({ color, size = 14 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: size * 0.9, color, lineHeight: size }}>★</Text>
  </View>
);

const ShareIcon = ({ color, size = 14 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.35, height: size * 0.35, borderRadius: size * 0.175, borderWidth: 1.5, borderColor: color, position: 'absolute', top: 0, alignSelf: 'center' }} />
    <View style={{ width: size * 0.35, height: size * 0.35, borderRadius: size * 0.175, borderWidth: 1.5, borderColor: color, position: 'absolute', bottom: 0, left: 0 }} />
    <View style={{ width: size * 0.35, height: size * 0.35, borderRadius: size * 0.175, borderWidth: 1.5, borderColor: color, position: 'absolute', bottom: 0, right: 0 }} />
    <View style={{ width: size * 0.48, height: 1.5, backgroundColor: color, position: 'absolute', top: size * 0.22, left: size * 0.08, transform: [{ rotate: '30deg' }] }} />
    <View style={{ width: size * 0.48, height: 1.5, backgroundColor: color, position: 'absolute', top: size * 0.22, right: size * 0.08, transform: [{ rotate: '-30deg' }] }} />
  </View>
);

const LogoutIcon = ({ color, size = 14 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.55, height: size * 0.72, borderWidth: 1.5, borderColor: color, borderRightWidth: 0 }} />
    <View style={{ position: 'absolute', right: 0, width: size * 0.55, height: 1.5, backgroundColor: color }} />
    <View style={{ position: 'absolute', right: size * 0.06, top: size * 0.2, width: size * 0.22, height: size * 0.22, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: color, transform: [{ rotate: '45deg' }] }} />
  </View>
);

// ── Section data ──────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    title: 'Account',
    items: [
      { Icon: UserIcon,     label: 'Profile',           sub: null,                    route: '/(app)/settings/profile', accent: 'primary' },
      { Icon: BuildingIcon, label: 'Business Settings', sub: "My Business",           route: '/(app)/settings/business', accent: 'primary' },
      { Icon: CurrencyIcon, label: 'Currency',          sub: 'PKR – Pakistani Rupee', route: null,                      accent: 'primary' },
    ],
  },
  {
    title: 'App',
    items: [
      { Icon: BellIcon,   label: 'Notifications',    sub: 'Manage alerts',    route: null, accent: 'primary' },
      { Icon: ShieldIcon, label: 'Privacy & Security', sub: 'PIN, biometric', route: null, accent: 'primary' },
      { Icon: CloudIcon,  label: 'Backup & Sync',    sub: 'Last synced: Now', route: null, accent: 'primary' },
      { Icon: GlobeIcon,  label: 'Language',         sub: 'English',          route: null, accent: 'primary' },
    ],
  },
  {
    title: 'Support',
    items: [
      { Icon: QuestionIcon, label: 'Help & FAQ',  sub: null, route: null, accent: 'primary' },
      { Icon: StarIcon,     label: 'Rate the App', sub: null, route: null, accent: 'primary' },
      { Icon: ShareIcon,    label: 'Share App',   sub: null, route: null, accent: 'primary' },
    ],
  },
];

// ── Setting Row ───────────────────────────────────────────────────────────────

function SettingRow({ Icon, label, sub, route, isLast, onPress, C }) {
  return (
    <>
      <TouchableOpacity
        style={rowStyles.row}
        onPress={onPress}
        activeOpacity={route ? 0.7 : 1}
      >
        <View style={[rowStyles.iconBox, { backgroundColor: C.primaryLight }]}>
          <Icon color={C.primary} size={15} />
        </View>
        <View style={rowStyles.body}>
          <Text style={[rowStyles.label, { color: C.text, fontFamily: Font.semiBold }]}>{label}</Text>
          {sub ? <Text style={[rowStyles.sub, { color: C.textMuted, fontFamily: Font.regular }]}>{sub}</Text> : null}
        </View>
        <ChevronRight color={C.textSubtle} />
      </TouchableOpacity>
      {!isLast && <View style={[rowStyles.divider, { backgroundColor: C.border }]} />}
    </>
  );
}

const rowStyles = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  body:    { flex: 1 },
  label:   { fontSize: 14, lineHeight: 20 },
  sub:     { fontSize: 12, lineHeight: 17, marginTop: 1 },
  divider: { height: 1, marginHorizontal: 18 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen({ applyTop = true }) {
  const router    = useRouter();
  const { C }     = useTheme();
  const clearUser = useAuthStore((s) => s.clearUser);
  const { width } = useWindowDimensions();
  const hPad      = width > 600 ? Math.floor((width - 540) / 2) : 16;

  const { data: profile } = useProfile();

  const initials = (profile?.full_name ?? '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          if (supabase) await supabase.auth.signOut();
          clearUser(); // AuthGuard in _layout.jsx handles the redirect
        },
      },
    ]);
  };

  const s = useMemo(() => makeStyles(C, hPad), [C, hPad]);

  return (
    <SafeAreaView applyTop={applyTop} style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)/books')}
          style={s.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <BackIcon color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* Avatar Card */}
        <View style={[s.avatarCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={[s.avatar, { backgroundColor: C.primary, borderColor: C.card }]}>
            <Text style={s.avatarInitials}>{initials}</Text>
          </View>
          <Text style={[s.avatarName,  { color: C.text,      fontFamily: Font.bold }]}>
            {profile?.full_name ?? '—'}
          </Text>
          <Text style={[s.avatarEmail, { color: C.textMuted, fontFamily: Font.regular }]}>
            {profile?.email ?? '—'}
          </Text>
          <TouchableOpacity
            style={[s.editBtn, { backgroundColor: C.primaryLight, borderColor: C.primary }]}
            onPress={() => router.push('/(app)/settings/profile')}
            activeOpacity={0.8}
          >
            <Text style={[s.editBtnText, { color: C.primary, fontFamily: Font.semiBold }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Sections */}
        {SECTIONS.map((section) => (
          <View key={section.title} style={s.sectionWrap}>
            <Text style={[s.sectionLabel, { color: C.textMuted, fontFamily: Font.semiBold }]}>
              {section.title.toUpperCase()}
            </Text>
            <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
              {section.items.map((item, idx) => (
                <SettingRow
                  key={item.label}
                  Icon={item.Icon}
                  label={item.label}
                  sub={item.sub}
                  route={item.route}
                  isLast={idx === section.items.length - 1}
                  onPress={() => item.route && router.push(item.route)}
                  C={C}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <View style={s.sectionWrap}>
          <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <TouchableOpacity style={rowStyles.row} onPress={handleLogout} activeOpacity={0.7}>
              <View style={[rowStyles.iconBox, { backgroundColor: C.cashOutLight }]}>
                <LogoutIcon color={C.cashOut} size={15} />
              </View>
              <View style={rowStyles.body}>
                <Text style={[rowStyles.label, { color: C.cashOut, fontFamily: Font.semiBold }]}>Logout</Text>
              </View>
              <ChevronRight color={C.cashOut} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[s.version, { color: C.textSubtle, fontFamily: Font.regular }]}>CashBook v1.0.0</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (C, hPad) => StyleSheet.create({
  safe:          { flex: 1, backgroundColor: C.background },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 48, paddingHorizontal: hPad - 16 },

  header: {
    backgroundColor: C.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: hPad, paddingVertical: 14,
  },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: Font.bold, color: '#fff' },

  avatarCard: {
    alignItems: 'center', marginHorizontal: 16, borderRadius: 20,
    paddingVertical: 24, marginTop: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 6,
    borderWidth: 1,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, marginBottom: 12,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  avatarInitials: { fontSize: 28, fontFamily: Font.extraBold, color: '#fff' },
  avatarName:  { fontSize: 18, marginBottom: 3 },
  avatarEmail: { fontSize: 13, marginBottom: 16 },

  editBtn: {
    paddingHorizontal: 22, paddingVertical: 9, borderRadius: 20, borderWidth: 1,
  },
  editBtnText: { fontSize: 13 },

  sectionWrap:  { marginHorizontal: 16, marginTop: 24 },
  sectionLabel: {
    fontSize: 11, letterSpacing: 1,
    marginBottom: 8, marginLeft: 2,
  },
  card: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },

  version: { textAlign: 'center', fontSize: 12, marginTop: 28, marginBottom: 8 },
});
