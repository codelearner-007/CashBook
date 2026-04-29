import React, { useMemo } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export default function SearchBar({ value, onChangeText, placeholder = 'Search…' }) {
  const { C, Font } = useTheme();
  const s = useMemo(() => makeStyles(C, Font), [C, Font]);

  return (
    <View style={s.searchBar}>
      <TextInput
        style={s.searchInput}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      <View style={s.searchBtn}>
        <View style={{ width: 13, height: 13, borderRadius: 6.5, borderWidth: 2.5, borderColor: '#fff' }} />
        <View style={{
          position: 'absolute', bottom: 5, right: 5,
          width: 6, height: 2.5, borderRadius: 1.5,
          backgroundColor: '#fff',
          transform: [{ rotate: '45deg' }],
        }} />
      </View>
    </View>
  );
}

const makeStyles = (C, Font) => StyleSheet.create({
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card,
    marginHorizontal: 16, marginBottom: 6,
    borderRadius: 50,
    paddingLeft: 18, paddingRight: 4, paddingVertical: 4,
    borderWidth: 1.5, borderColor: C.border,
  },
  searchInput: {
    flex: 1, fontSize: 14, fontFamily: Font.regular,
    color: C.text, padding: 0, margin: 0, height: 40,
    outlineWidth: 0,
  },
  searchBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});
