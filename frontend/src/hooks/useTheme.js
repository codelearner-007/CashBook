import { useThemeStore } from '../store/themeStore';
import { LightColors, DarkColors } from '../constants/colors';
import { Font } from '../constants/fonts';

export function useTheme() {
  const { isDark, toggle } = useThemeStore();
  const C = isDark ? DarkColors : LightColors;
  return { C, Font, isDark, toggleTheme: toggle };
}
