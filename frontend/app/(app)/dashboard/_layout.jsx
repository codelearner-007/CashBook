import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../src/hooks/useTheme';

const PeopleIcon = ({ color, size = 22 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.42, height: size * 0.42, borderRadius: size * 0.21, borderWidth: 1.8, borderColor: color, marginBottom: 1 }} />
    <View style={{ width: size * 0.65, height: size * 0.28, borderTopLeftRadius: size * 0.14, borderTopRightRadius: size * 0.14, borderWidth: 1.8, borderColor: color, borderBottomWidth: 0 }} />
  </View>
);

const BookIcon = ({ color, size = 22 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.72, height: size * 0.88, borderRadius: 2, borderWidth: 1.8, borderColor: color, justifyContent: 'center', alignItems: 'center', gap: 3 }}>
      {[0, 1, 2].map(i => (
        <View key={i} style={{ width: size * 0.4, height: 1.5, backgroundColor: color, borderRadius: 1 }} />
      ))}
    </View>
  </View>
);

const GearIcon = ({ color, size = 22 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.45, height: size * 0.45, borderRadius: size * 0.225, borderWidth: 2, borderColor: color }} />
    <View style={{ position: 'absolute', width: size * 0.82, height: 2.5, backgroundColor: color, borderRadius: 1 }} />
    <View style={{ position: 'absolute', width: size * 0.82, height: 2.5, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '60deg' }] }} />
    <View style={{ position: 'absolute', width: size * 0.82, height: 2.5, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '120deg' }] }} />
  </View>
);

const TAB_DEFS = [
  { name: 'users',    label: 'Users',    Icon: PeopleIcon },
  { name: 'books',    label: 'My Books', Icon: BookIcon   },
  { name: 'settings', label: 'Settings', Icon: GearIcon   },
];

function AdminTabBar({ state, navigation }) {
  const { C, Font } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: C.card,
      borderTopWidth: 1,
      borderTopColor: C.border,
      paddingTop: 10,
      paddingBottom: 16,
      elevation: 12,
      shadowColor: C.shadow,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    item:        { flex: 1, alignItems: 'center', gap: 4, minHeight: 44, justifyContent: 'center' },
    label:       { fontSize: 11, fontFamily: Font.medium, color: C.textMuted, lineHeight: 16 },
    labelActive: { fontSize: 11, fontFamily: Font.bold,   color: C.primary,   lineHeight: 16 },
    activeDot:   { width: 4, height: 4, borderRadius: 2, backgroundColor: C.primary, position: 'absolute', bottom: -8 },
  }), [C, Font]);

  return (
    <View style={s.bar}>
      {TAB_DEFS.map((tab) => {
        const routeIdx = state.routes.findIndex(r => r.name === tab.name);
        const active   = state.index === routeIdx;
        return (
          <TouchableOpacity
            key={tab.name}
            style={s.item}
            onPress={() => navigation.navigate(tab.name)}
            activeOpacity={0.7}
          >
            <tab.Icon color={active ? C.primary : C.textMuted} size={22} />
            <Text style={active ? s.labelActive : s.label}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function DashboardLayout() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingTop: Math.max(0, insets.top - 4) }}>
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AdminTabBar {...props} />}
    >
      <Tabs.Screen name="users" options={{ unmountOnBlur: true }} />
      <Tabs.Screen name="books" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
    </View>
  );
}
