import type { ColorScheme } from "@/types/theme";

/**
 * Semantic color values for use with React Navigation and StyleSheet.
 * These match the CSS variables in app/global.css.
 * Use these when you need actual color values (not Tailwind classes).
 */
export const SemanticColors = {
  light: {
    background: "rgb(255, 255, 255)",
    surface: "rgb(255, 255, 255)",
    surfaceSecondary: "rgb(240, 240, 240)",
    text: "rgb(51, 51, 51)",
    textSecondary: "rgb(102, 102, 102)",
    textMuted: "rgb(153, 153, 153)",
    border: "rgb(224, 224, 224)",
    primary: "rgb(0, 122, 255)",
    success: "rgb(52, 199, 89)",
    warning: "rgb(255, 149, 0)",
    danger: "rgb(255, 59, 48)",
  },
  dark: {
    background: "rgb(0, 0, 0)",
    surface: "rgb(28, 28, 30)",
    surfaceSecondary: "rgb(44, 44, 46)",
    text: "rgb(255, 255, 255)",
    textSecondary: "rgb(142, 142, 147)",
    textMuted: "rgb(99, 99, 102)",
    border: "rgb(56, 56, 58)",
    primary: "rgb(10, 132, 255)",
    success: "rgb(48, 209, 88)",
    warning: "rgb(255, 159, 10)",
    danger: "rgb(255, 69, 58)",
  },
} as const;

/**
 * Get semantic colors for the current color scheme.
 */
export function getColors(scheme: ColorScheme) {
  return SemanticColors[scheme];
}
