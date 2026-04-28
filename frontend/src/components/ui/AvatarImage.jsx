import { View, Text } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Font } from '../../constants/fonts';

/**
 * Shows a profile photo if `uri` is set, otherwise falls back to initials.
 * Drop-in for every avatar circle in the app.
 */
export default function AvatarImage({
  uri,
  initials = '?',
  size = 40,
  backgroundColor = '#6B7280',
  textColor = '#fff',
  borderColor,
  borderWidth = 0,
  style,
}) {
  return (
    <View
      style={[
        {
          width: size, height: size, borderRadius: size / 2,
          overflow: 'hidden', backgroundColor,
          alignItems: 'center', justifyContent: 'center',
          borderColor, borderWidth,
        },
        style,
      ]}
    >
      {uri ? (
        <ExpoImage source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <Text
          style={{
            fontSize: size * 0.34,
            fontFamily: Font.extraBold,
            color: textColor,
            includeFontPadding: false,
          }}
        >
          {String(initials).slice(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  );
}
