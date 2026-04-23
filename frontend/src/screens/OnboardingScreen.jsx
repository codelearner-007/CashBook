import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: '📊',
    title: 'Track Income & Expenses',
    subtitle: 'Stay updated on your profits',
    bg: Colors.primaryLight,
    accent: Colors.primary,
  },
  {
    id: '2',
    icon: '📄',
    title: 'PDF & Excel Reports',
    subtitle: 'Easily download & share with others',
    bg: '#FFF3E0',
    accent: '#E65100',
  },
  {
    id: '3',
    icon: '📚',
    title: 'Multiple Books',
    subtitle: 'Manage business & personal separately',
    bg: Colors.cashInLight,
    accent: Colors.cashIn,
  },
  {
    id: '4',
    icon: '🔒',
    title: 'Secure & Private',
    subtitle: 'Your data stays safe with Google login',
    bg: '#F3E5F5',
    accent: '#7B1FA2',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
      setActiveIndex(activeIndex + 1);
    } else {
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <Text style={[styles.slideTitle, { color: item.accent }]}>{item.title}</Text>
            <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
        <Text style={styles.nextBtnText}>
          {activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next →'}
        </Text>
      </TouchableOpacity>

      {activeIndex < SLIDES.length - 1 && (
        <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 },
  iconBox: { width: 180, height: 180, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 36 },
  icon: { fontSize: 80 },
  slideTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 12, letterSpacing: -0.5 },
  slideSubtitle: { fontSize: 16, color: Colors.textMuted, textAlign: 'center', lineHeight: 24 },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { width: 24, backgroundColor: Colors.primary },
  nextBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingHorizontal: 48, paddingVertical: 16, marginBottom: 16, width: width - 64 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  skip: { color: Colors.textMuted, fontSize: 14, marginBottom: 40 },
});
