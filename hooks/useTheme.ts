import { useThemeContext } from "@/store/ThemeContext";

/**
 * Hook to access and control the app's theme
 *
 * @returns {Object} Theme state and controls
 * @returns {ThemePreference} preference - Current user preference (light/dark/system)
 * @returns {ColorScheme} effectiveScheme - Actual rendered scheme (light/dark)
 * @returns {Function} setPreference - Function to update theme preference
 *
 * @example
 * ```tsx
 * const { preference, effectiveScheme, setPreference } = useTheme();
 *
 * // Show current mode
 * <Text>Mode: {effectiveScheme}</Text>
 *
 * // Toggle between modes
 * <Button onPress={() => setPreference("dark")} title="Dark Mode" />
 * ```
 */
export function useTheme() {
  return useThemeContext();
}
