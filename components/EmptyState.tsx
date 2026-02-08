import { useRef, useEffect } from "react";
import { View, Text } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SPRING } from "@/lib/animations";

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  animated?: boolean;
  compact?: boolean;
}

const entryAnimation = FadeInDown.springify()
  .damping(SPRING.gentle.damping!)
  .stiffness(SPRING.gentle.stiffness!);

/**
 * Context-aware empty state component with two display modes:
 * - Full (default): Centered hero with emoji in a circle, title, and subtitle
 * - Compact: Inline banner with emoji next to title text
 *
 * Uses the hasRendered ref pattern to skip animation on initial mount,
 * same as CategorySection.tsx.
 */
export function EmptyState({
  icon,
  title,
  message,
  animated = true,
  compact = false,
}: EmptyStateProps) {
  const hasRendered = useRef(false);
  useEffect(() => {
    hasRendered.current = true;
  }, []);

  const shouldAnimate = animated && hasRendered.current;

  if (compact) {
    return (
      <Animated.View
        entering={shouldAnimate ? entryAnimation : undefined}
        className="py-4 px-4 items-center"
      >
        <Text className="text-base font-semibold text-text mb-1">
          {icon} {title}
        </Text>
        <Text className="text-sm text-text-secondary text-center">
          {message}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={shouldAnimate ? entryAnimation : undefined}
      className="flex-1 items-center justify-center py-12"
    >
      <View className="w-16 h-16 rounded-full bg-surface-secondary items-center justify-center mb-4">
        <Text className="text-2xl">{icon}</Text>
      </View>
      <Text className="text-lg font-semibold text-text mb-2">{title}</Text>
      <Text className="text-sm text-text-secondary text-center max-w-xs">
        {message}
      </Text>
    </Animated.View>
  );
}
