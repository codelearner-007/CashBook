import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Font } from '../../constants/fonts';

const SPARK_POS    = [
  { top: -5, left:  5 },
  { top: -5, right: 8 },
  { top:  3, right: -5 },
  { bottom: -5, left: 12 },
];
const SPARK_COLORS = ['#F59E0B', '#FCD34D', '#D97706', '#FDE68A'];

export default function AdminPillBadge() {
  const fade   = useRef(new Animated.Value(1)).current;
  const sparks = useRef(SPARK_POS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fade, { toValue: 0.28, duration: 950, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1.0,  duration: 950, useNativeDriver: true }),
        Animated.delay(300),
      ])
    ).start();

    sparks.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 310),
          Animated.timing(anim, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 260, useNativeDriver: true }),
          Animated.delay(820),
        ])
      ).start();
    });

    return () => [fade, ...sparks].forEach(a => a.stopAnimation());
  }, []);

  return (
    <View style={{ position: 'relative' }}>
      <Animated.View style={[s.pill, { opacity: fade }]}>
        <Text style={s.text}>Super Admin</Text>
      </Animated.View>
      {SPARK_POS.map((pos, i) => (
        <Animated.View
          key={i}
          style={[s.spark, pos, {
            backgroundColor: SPARK_COLORS[i],
            opacity: sparks[i],
            transform: [{ rotate: '45deg' }, { scale: sparks[i] }],
          }]}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFBEB', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1.5, borderColor: '#FCD34D',
  },
  text:  { fontSize: 11, fontFamily: Font.semiBold, color: '#B45309' },
  spark: { position: 'absolute', width: 5, height: 5, borderRadius: 1 },
});
