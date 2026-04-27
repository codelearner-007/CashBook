import React from 'react';
import { View } from 'react-native';

export const ChevronLeftIcon = ({ color, size = 20 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.45, height: size * 0.45,
      borderLeftWidth: 2.5, borderBottomWidth: 2.5,
      borderColor: color, borderRadius: 1,
      transform: [{ rotate: '45deg' }, { translateX: size * 0.08 }],
    }} />
  </View>
);

export const ChevronDownIcon = ({ color, size = 12 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.6, height: size * 0.6,
      borderRightWidth: 2, borderBottomWidth: 2,
      borderColor: color, borderRadius: 1,
      transform: [{ rotate: '45deg' }, { translateY: -size * 0.12 }],
    }} />
  </View>
);

export const CheckIcon = ({ color, size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.55, height: size * 0.3,
      borderLeftWidth: 2, borderBottomWidth: 2,
      borderColor: color,
      transform: [{ rotate: '-45deg' }, { translateY: -size * 0.05 }],
    }} />
  </View>
);

export const CloseIcon = ({ color, size = 18 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ position: 'absolute', width: size * 0.8, height: 2, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '45deg' }] }} />
    <View style={{ position: 'absolute', width: size * 0.8, height: 2, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '-45deg' }] }} />
  </View>
);

export const TrashIcon = ({ color, size = 20 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.6, height: size * 0.65, borderWidth: 1.8,
      borderColor: color, borderRadius: 2, marginTop: size * 0.1,
    }} />
    <View style={{ position: 'absolute', top: 0, width: size * 0.8, height: 2, backgroundColor: color, borderRadius: 1 }} />
    <View style={{ position: 'absolute', top: -3, width: size * 0.35, height: 4, backgroundColor: color, borderRadius: 1 }} />
  </View>
);

export const PencilIcon = ({ color, size = 18 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.55, height: size * 0.85, borderRadius: 2,
      borderWidth: 1.5, borderColor: color,
      transform: [{ rotate: '-45deg' }],
    }} />
    <View style={{
      position: 'absolute', bottom: 0, left: size * 0.08,
      width: size * 0.32, height: size * 0.32,
      borderLeftWidth: 1.5, borderBottomWidth: 1.5, borderColor: color,
      transform: [{ rotate: '-45deg' }],
    }} />
  </View>
);

export const DotsVerticalIcon = ({ color, size = 20 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'space-evenly', paddingVertical: size * 0.1 }}>
    {[0, 1, 2].map(i => (
      <View key={i} style={{ width: size * 0.22, height: size * 0.22, borderRadius: size * 0.11, backgroundColor: color }} />
    ))}
  </View>
);

export const CloudIcon = ({ color, size = 20 }) => (
  <View style={{ width: size, height: size * 0.72, position: 'relative' }}>
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: size * 0.44, borderRadius: size * 0.22, backgroundColor: color }} />
    <View style={{ position: 'absolute', bottom: size * 0.2, left: size * 0.08, width: size * 0.36, height: size * 0.36, borderRadius: size * 0.18, backgroundColor: color }} />
    <View style={{ position: 'absolute', bottom: size * 0.28, left: size * 0.26, width: size * 0.44, height: size * 0.44, borderRadius: size * 0.22, backgroundColor: color }} />
    <View style={{ position: 'absolute', bottom: size * 0.18, right: size * 0.08, width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15, backgroundColor: color }} />
  </View>
);
