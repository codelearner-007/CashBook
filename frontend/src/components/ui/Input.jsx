import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Font } from '../../constants/fonts';

/**
 * AppInput — reusable labeled input field.
 *
 * Props:
 *   label          string   — field label shown above input
 *   value          string
 *   onChangeText   fn
 *   placeholder    string
 *   keyboardType   string   — default 'default'
 *   editable       bool     — default true
 *   rightElement   node     — optional badge / icon on the right
 *   isLast         bool     — omits bottom divider when true
 *   secureText     bool     — for password fields
 *   error          string   — shows red error message below
 */
export default function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  editable = true,
  rightElement,
  isLast = false,
  secureText = false,
  multiline = false,
  autoFocus = false,
  error,
}) {
  const { C } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? C.cashOut
    : focused
    ? C.primary
    : C.border;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { backgroundColor: C.card, borderColor }]}>
        {/* Left accent bar on focus */}
        {focused && <View style={[styles.accentBar, { backgroundColor: C.primary }]} />}

        <View style={styles.inner}>
          <Text style={[styles.label, { color: focused ? C.primary : C.textMuted, fontFamily: Font.medium }]}>
            {label}
          </Text>

          <View style={styles.inputRow}>
            {editable ? (
              <TextInput
                style={[styles.input, { color: C.text, fontFamily: Font.semiBold }, multiline && styles.multiline]}
                value={value ?? ''}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={C.textSubtle}
                keyboardType={keyboardType}
                secureTextEntry={secureText}
                returnKeyType={multiline ? 'default' : 'done'}
                multiline={multiline}
                autoFocus={autoFocus}
                editable={editable}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                underlineColorAndroid="transparent"
              />
            ) : (
              <Text style={[styles.input, styles.readOnly, { color: value ? C.text : C.textSubtle, fontFamily: Font.semiBold }]}>
                {value || placeholder || '—'}
              </Text>
            )}
            {rightElement && <View style={styles.right}>{rightElement}</View>}
          </View>
        </View>
      </View>

      {!isLast && <View style={[styles.divider, { backgroundColor: C.border }]} />}
      {error && <Text style={[styles.error, { color: C.cashOut, fontFamily: Font.regular }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:    { position: 'relative' },

  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 64,
  },

  accentBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    borderRadius: 2,
  },

  inner:    { flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },

  label: {
    fontSize: 11,
    letterSpacing: 0.3,
    marginBottom: 4,
    lineHeight: 15,
  },

  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: 0,
    borderWidth: 0,
    outlineWidth: 0,
    outlineStyle: 'none',
  },

  readOnly:  { opacity: 1 },
  multiline: { minHeight: 20, textAlignVertical: 'top' },

  right:   { marginLeft: 10 },
  divider: { height: 1, marginHorizontal: 16 },
  error:   { fontSize: 11, marginTop: 4, marginHorizontal: 16, lineHeight: 16 },
});
