import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ScrollView, Alert, Modal, Animated,
} from 'react-native';
import SafeAreaView from '../components/ui/AppSafeAreaView';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import { Font } from '../constants/fonts';
import AppInput from '../components/ui/Input';

// ── Icons ─────────────────────────────────────────────────────────────────────

const BackIcon = ({ color }) => (
  <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: 9, height: 9, borderLeftWidth: 2.5, borderBottomWidth: 2.5, borderColor: color, transform: [{ rotate: '45deg' }] }} />
  </View>
);

const CameraIcon = ({ size = 13 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.82, height: size * 0.65, borderRadius: 2, borderWidth: 1.5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.35, height: size * 0.35, borderRadius: size * 0.175, borderWidth: 1.5, borderColor: '#fff' }} />
    </View>
    <View style={{ position: 'absolute', top: 0, left: size * 0.2, width: size * 0.25, height: size * 0.18, borderTopLeftRadius: 2, borderTopRightRadius: 2, borderWidth: 1.5, borderColor: '#fff', borderBottomWidth: 0 }} />
  </View>
);

// ── Skeleton block ────────────────────────────────────────────────────────────

function Skeleton({ width, height, radius = 6, style }) {
  return (
    <View style={[{ width, height, borderRadius: radius, backgroundColor: '#E2E8F0', opacity: 0.7 }, style]} />
  );
}

function ProfileSkeleton({ C }) {
  return (
    <>
      <View style={[skeletonStyles.avatarCard, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={[skeletonStyles.avatarCircle, { backgroundColor: '#E2E8F0' }]} />
        <Skeleton width={140} height={18} radius={6} style={{ marginBottom: 8 }} />
        <Skeleton width={180} height={13} radius={6} />
      </View>

      <View style={[skeletonStyles.section, { marginTop: 24 }]}>
        <Skeleton width={110} height={10} radius={4} style={{ marginBottom: 10, marginLeft: 2 }} />
        <View style={[skeletonStyles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {[0, 1, 2].map((i) => (
            <View key={i}>
              <View style={skeletonStyles.fieldRow}>
                <Skeleton width={70}  height={10} radius={4} style={{ marginBottom: 8 }} />
                <Skeleton width={160} height={15} radius={5} />
              </View>
              {i < 2 && <View style={[skeletonStyles.divider, { backgroundColor: C.border }]} />}
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

const skeletonStyles = StyleSheet.create({
  avatarCard:   { alignItems: 'center', marginHorizontal: 16, borderRadius: 20, paddingVertical: 24, marginTop: -36, borderWidth: 1 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  section:      { marginHorizontal: 16 },
  card:         { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  fieldRow:     { paddingHorizontal: 18, paddingVertical: 16 },
  divider:      { height: 1, marginHorizontal: 18 },
});


// ── Success Dialog ────────────────────────────────────────────────────────────

const SPARKLE_N = 8;

function SuccessDialog({ visible, onDismiss, C }) {
  const cardScale    = useRef(new Animated.Value(0.5)).current;
  const circleScale  = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const ringScale    = useRef(new Animated.Value(1)).current;
  const ringOpacity  = useRef(new Animated.Value(0.8)).current;
  const sparkleAnims = useRef(
    Array.from({ length: SPARKLE_N }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (!visible) return;

    cardScale.setValue(0.5);
    circleScale.setValue(0);
    checkOpacity.setValue(0);
    ringScale.setValue(1);
    ringOpacity.setValue(0.8);
    sparkleAnims.forEach(a => a.setValue(0));

    Animated.spring(cardScale, {
      toValue: 1, tension: 220, friction: 9, useNativeDriver: true,
    }).start(() => {
      Animated.spring(circleScale, {
        toValue: 1, tension: 260, friction: 7, useNativeDriver: true,
      }).start(() => {
        Animated.timing(checkOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();

        Animated.loop(
          Animated.parallel([
            Animated.timing(ringScale,   { toValue: 1.55, duration: 850, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0,    duration: 850, useNativeDriver: true }),
          ])
        ).start();

        Animated.parallel(
          sparkleAnims.map((a, i) =>
            Animated.sequence([
              Animated.delay(i * 65),
              Animated.loop(
                Animated.sequence([
                  Animated.timing(a, { toValue: 1,    duration: 300, useNativeDriver: true }),
                  Animated.timing(a, { toValue: 0.08, duration: 300, useNativeDriver: true }),
                ])
              ),
            ])
          )
        ).start();
      });
    });

    const t = setTimeout(onDismiss, 2800);
    return () => {
      clearTimeout(t);
      [cardScale, circleScale, checkOpacity, ringScale, ringOpacity, ...sparkleAnims]
        .forEach(a => a.stopAnimation());
    };
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <View style={sd.bg}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1} />

        <Animated.View style={[sd.card, { backgroundColor: C.card, transform: [{ scale: cardScale }] }]}>

          {/* Sparkles + ring + circle */}
          <View style={sd.sparkleArea}>

            {sparkleAnims.map((anim, i) => {
              const angle = (i / SPARKLE_N) * Math.PI * 2 - Math.PI / 2;
              const R     = 57;
              const size  = i % 2 === 0 ? 9 : 6;
              const color = i % 3 === 0 ? '#22C55E' : i % 3 === 1 ? '#16A34A' : '#4ADE80';
              return (
                <Animated.View
                  key={i}
                  style={{
                    position:        'absolute',
                    left:            70 + Math.cos(angle) * R - size / 2,
                    top:             70 + Math.sin(angle) * R - size / 2,
                    width:           size,
                    height:          size,
                    backgroundColor: color,
                    borderRadius:    1,
                    opacity:         anim,
                    transform:       [{ rotate: '45deg' }, { scale: anim }],
                  }}
                />
              );
            })}

            {/* Pulse ring */}
            <Animated.View style={[sd.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />

            {/* Circle */}
            <Animated.View style={[sd.circle, { transform: [{ scale: circleScale }] }]}>
              <Animated.Text style={[sd.checkText, { opacity: checkOpacity }]}>✓</Animated.Text>
            </Animated.View>
          </View>

          <Text style={[sd.title, { color: C.text }]}>Profile Updated</Text>
          <Text style={[sd.sub,   { color: C.textMuted }]}>Your changes have been saved</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const sd = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 280, borderRadius: 24, paddingBottom: 32, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22, shadowRadius: 28, elevation: 24,
  },
  sparkleArea: {
    width: 140, height: 140,
    marginTop: 28, marginBottom: 16,
    position: 'relative', alignSelf: 'center',
  },
  ring: {
    position: 'absolute', left: 30, top: 30,
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2.5, borderColor: '#22C55E',
  },
  circle: {
    position: 'absolute', left: 30, top: 30,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#16A34A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },
  checkText: { fontSize: 40, color: '#fff', textAlign: 'center', lineHeight: 50 },
  title: {
    fontSize: 20, fontFamily: Font.bold,
    marginBottom: 6, letterSpacing: 0.3,
  },
  sub: {
    fontSize: 13, fontFamily: Font.regular,
    textAlign: 'center', paddingHorizontal: 24, lineHeight: 18,
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const { C }  = useTheme();

  const { data: profile, isLoading, isError } = useProfile();
  const updateProfile = useUpdateProfile();

  const [name,        setName]        = useState('');
  const [phone,       setPhone]       = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync form when data loads
  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  const initials = (profile?.full_name ?? '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const isDirty = profile
    ? name.trim() !== (profile.full_name ?? '') || phone !== (profile.phone ?? '')
    : false;

  const handleUpdate = () => {
    if (!name.trim()) return;
    updateProfile.mutate(
      { full_name: name.trim(), phone: phone.trim() || null },
      {
        onSuccess: () => setShowSuccess(true),
        onError:   () => Alert.alert('Error', 'Could not save changes. Please try again.'),
      }
    );
  };

  const s = makeStyles(C);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <BackIcon color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {isLoading ? (
          <ProfileSkeleton C={C} />
        ) : isError ? (
          <View style={s.errorBox}>
            <Text style={[s.errorText, { color: C.textMuted }]}>Could not load profile. Pull down to retry.</Text>
          </View>
        ) : (
          <>
            {/* Avatar card — overlaps hero */}
            <View style={[s.avatarCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={s.avatarWrap}>
                <View style={[s.avatar, { backgroundColor: C.primary, borderColor: C.card }]}>
                  <Text style={s.avatarInitials}>{initials}</Text>
                </View>
                <TouchableOpacity
                  style={[s.cameraBtn, { backgroundColor: C.primaryDark, borderColor: C.card }]}
                  activeOpacity={0.8}
                  onPress={() =>
                    Alert.alert('Change Photo', 'Choose an option', [
                      { text: 'Camera',  onPress: () => {} },
                      { text: 'Gallery', onPress: () => {} },
                      { text: 'Cancel',  style: 'cancel' },
                    ])
                  }
                >
                  <CameraIcon size={13} />
                </TouchableOpacity>
              </View>
              <Text style={[s.avatarName,  { color: C.text }]}>{profile?.full_name ?? '—'}</Text>
              <Text style={[s.avatarEmail, { color: C.textMuted }]}>{profile?.email ?? '—'}</Text>
            </View>

            {/* Editable fields */}
            <View style={s.sectionWrap}>
              <Text style={[s.sectionLabel, { color: C.textMuted }]}>ACCOUNT DETAILS</Text>
              <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
                <AppInput
                  label="Full Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                />
                <AppInput
                  label="Email Address"
                  value={profile?.email}
                  editable={false}
                  rightElement={
                    profile?.email_verified ? (
                      <View style={s.verifiedBadge}>
                        <View style={s.verifiedDot} />
                        <Text style={s.verifiedText}>Verified</Text>
                      </View>
                    ) : null
                  }
                />
                <AppInput
                  label="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="+92 300 0000000"
                  isLast
                />
              </View>
            </View>

            {/* Update button */}
            <View style={s.btnWrap}>
              <TouchableOpacity
                style={[s.updateBtn, { backgroundColor: C.primary, opacity: isDirty && !updateProfile.isPending ? 1 : 0.4 }]}
                onPress={handleUpdate}
                disabled={!isDirty || updateProfile.isPending}
                activeOpacity={0.85}
              >
                <Text style={s.updateBtnText}>
                  {updateProfile.isPending ? 'Saving…' : 'Update Profile'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

      </ScrollView>
      <SuccessDialog visible={showSuccess} onDismiss={() => setShowSuccess(false)} C={C} />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (C) => StyleSheet.create({
  safe:          { flex: 1, backgroundColor: C.background },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  header: {
    backgroundColor: C.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
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
  avatarWrap: { marginBottom: 12 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  avatarInitials: { fontSize: 28, fontFamily: Font.extraBold, color: '#fff' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: -2,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  avatarName:  { fontSize: 18, fontFamily: Font.bold,    marginBottom: 3 },
  avatarEmail: { fontSize: 13, fontFamily: Font.regular },

  sectionWrap:  { marginHorizontal: 16, marginTop: 24, marginBottom: 16 },
  sectionLabel: {
    fontSize: 11, fontFamily: Font.semiBold, letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 8, marginLeft: 2,
  },
  card: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },

  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0FDF4', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#BBF7D0', marginLeft: 8,
  },
  verifiedDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  verifiedText: { fontSize: 11, fontFamily: Font.semiBold, color: '#15803D' },

  btnWrap:   { marginHorizontal: 16, marginTop: 8 },
  updateBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 4,
  },
  updateBtnText: { fontSize: 15, fontFamily: Font.bold, color: '#fff' },

  errorBox:  { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  errorText: { fontSize: 14, fontFamily: Font.regular, textAlign: 'center', lineHeight: 22 },
});
