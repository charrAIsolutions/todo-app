/**
 * Shared animation constants for consistent motion throughout the app.
 * Uses Reanimated spring configs for natural, physics-based animations.
 */
import { WithSpringConfig } from "react-native-reanimated";

/**
 * Spring configurations for different animation "feels"
 * - default: General purpose, balanced feel
 * - snappy: Quick, responsive interactions (buttons, toggles)
 * - bouncy: More playful, visible spring (entry animations)
 * - gentle: Slower, subtle animations (fades, color transitions)
 */
export const SPRING: Record<string, WithSpringConfig> = {
  default: { damping: 15, stiffness: 150 },
  snappy: { damping: 20, stiffness: 300 },
  bouncy: { damping: 10, stiffness: 100 },
  gentle: { damping: 20, stiffness: 100 },
};

/**
 * Duration values in milliseconds for timing-based animations
 * - fast: Quick micro-interactions (button press, toggle)
 * - normal: Standard transitions (fade in/out)
 * - slow: Deliberate animations (page transitions)
 */
export const DURATION = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

/**
 * Common color values for animations
 * Using hex format for interpolateColor compatibility
 */
export const COLORS = {
  checkboxUnchecked: "#ffffff",
  checkboxChecked: "#007AFF",
  borderUnchecked: "#cccccc",
  borderChecked: "#007AFF",
  textActive: "#333333",
  textCompleted: "#999999",
} as const;

/**
 * Skeleton loading pulse animation config
 * - durationDown/Up: ms for each half of the opacity cycle
 * - opacityLow/High: opacity range for the pulse effect
 */
export const SKELETON = {
  durationDown: 800,
  durationUp: 800,
  opacityLow: 0.4,
  opacityHigh: 1.0,
} as const;
