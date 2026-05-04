import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { LightColors, DarkColors } from '../../constants/colors';
import { Font } from '../../constants/fonts';

const TYPE_CONFIG = {
  success: { icon: 'check-circle', color: '#15803D' },
  error:   { icon: 'x-circle',     color: '#B91C1C' },
  info:    { icon: 'info',          color: '#39AAAA' },
};

function ToastItem({ type = 'info', text1, text2 }) {
  const isDark = useThemeStore((s) => s.isDark);
  const C = isDark ? DarkColors : LightColors;
  const { icon, color } = TYPE_CONFIG[type] || TYPE_CONFIG.info;

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: C.card,
        borderColor: C.border,
        borderLeftColor: color,
        shadowColor: C.shadow,
      },
    ]}>
      <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <View style={styles.textWrap}>
        {text1 ? (
          <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text style={[styles.body, { color: C.textMuted }]} numberOfLines={2}>
            {text2}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export const toastConfig = {
  success: (props) => <ToastItem type="success" {...props} />,
  error:   (props) => <ToastItem type="error"   {...props} />,
  info:    (props) => <ToastItem type="info"     {...props} />,
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 16,
    paddingLeft: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 8,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontFamily: Font.bold,
    lineHeight: 20,
  },
  body: {
    fontSize: 12,
    fontFamily: Font.medium,
    lineHeight: 17,
  },
});
