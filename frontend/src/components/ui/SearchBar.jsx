import React, { useMemo } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search…',
  style,
  autoFocus = false,
  onClear,
}) {
  const { C, Font } = useTheme();
  const s = useMemo(() => makeStyles(C, Font), [C, Font]);

  const hasText = value && value.length > 0;

  return (
    <View style={[s.searchBar, style]}>
      <TextInput
        style={s.searchInput}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        autoFocus={autoFocus}
      />
      <TouchableOpacity
        style={s.searchBtn}
        onPress={hasText && onClear ? onClear : undefined}
        activeOpacity={hasText && onClear ? 0.7 : 1}
      >
        {hasText && onClear ? (
          <Feather name="x" size={16} color="#fff" />
        ) : (
          <>
            <View style={{ width: 13, height: 13, borderRadius: 6.5, borderWidth: 2.5, borderColor: '#fff' }} />
            <View style={{
              position: 'absolute', bottom: 5, right: 5,
              width: 6, height: 2.5, borderRadius: 1.5,
              backgroundColor: '#fff',
              transform: [{ rotate: '45deg' }],
            }} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (C, Font) => StyleSheet.create({
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card,
    marginHorizontal: 16, marginBottom: 4,
    borderRadius: 50,
    paddingLeft: 14, paddingRight: 3, paddingVertical: 3,
    borderWidth: 1.5, borderColor: C.border,
  },
  searchInput: {
    flex: 1, fontSize: 13, fontFamily: Font.regular,
    color: C.text, padding: 0, margin: 0, height: 32,
    outlineWidth: 0,
  },
  searchBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});
