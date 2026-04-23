import { Platform } from 'react-native';

export const shadow = (color = '#000', y = 2, blur = 8, opacity = 0.08) =>
  Platform.select({
    web: { boxShadow: `0 ${y}px ${blur}px ${color}` },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: blur,
      elevation: Math.round(blur * 0.6),
    },
  });
