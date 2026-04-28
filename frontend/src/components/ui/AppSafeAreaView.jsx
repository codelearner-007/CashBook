import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SafeAreaView({ style, children, applyTop = true, ...props }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          paddingTop: applyTop ? Math.max(0, insets.top - 4) : 0,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
