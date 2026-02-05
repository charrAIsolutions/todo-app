/**
 * Theme preference options
 * - "light": Always light mode
 * - "dark": Always dark mode
 * - "system": Follow device/browser preference
 */
export type ThemePreference = "light" | "dark" | "system";

/**
 * The actual color scheme being rendered
 * Resolved from preference + system setting
 */
export type ColorScheme = "light" | "dark";

/**
 * Theme context value
 */
export interface ThemeContextValue {
  /** User's preference setting */
  preference: ThemePreference;
  /** Actual scheme being rendered (resolved from preference) */
  effectiveScheme: ColorScheme;
  /** Update the theme preference */
  setPreference: (preference: ThemePreference) => void;
}
