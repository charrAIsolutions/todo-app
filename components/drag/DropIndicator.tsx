import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import type { DropZoneType } from "@/types";
import { useTheme } from "@/hooks/useTheme";
import { getColors } from "@/lib/colors";

interface DropIndicatorProps {
  visible: boolean;
  type: DropZoneType;
}

/**
 * Visual indicator showing where a task will be dropped.
 * - Blue line for reorder/move
 * - Indented blue line for nest
 * - Left-aligned for unnest
 */
export function DropIndicator({ visible, type }: DropIndicatorProps) {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withSpring(visible ? 1 : 0, { damping: 20 }),
      transform: [
        {
          scaleX: withSpring(visible ? 1 : 0.5, { damping: 15 }),
        },
      ],
    };
  }, [visible]);

  // Get color based on drop type using semantic colors
  const getIndicatorColor = () => {
    switch (type) {
      case "nest":
        return colors.success;
      case "unnest":
        return colors.danger;
      case "move-category":
        return colors.warning;
      case "move-list":
        return colors.primary;
      default:
        return colors.primary;
    }
  };

  // Get margins based on drop type
  const getIndicatorMargins = () => {
    switch (type) {
      case "nest":
        return { marginLeft: 44, marginRight: 8 };
      case "unnest":
        return { marginRight: 44, marginLeft: 8 };
      default:
        return { marginHorizontal: 8 };
    }
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View
        style={[
          styles.line,
          { backgroundColor: getIndicatorColor() },
          getIndicatorMargins(),
        ]}
      />
    </Animated.View>
  );
}

/**
 * Inline drop indicator that shows between tasks
 */
export function InlineDropIndicator({
  active,
  type,
}: {
  active: boolean;
  type: DropZoneType;
}) {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: withSpring(active ? 4 : 0, { damping: 15 }),
      opacity: withSpring(active ? 1 : 0, { damping: 20 }),
    };
  }, [active]);

  const getBackgroundColor = () => {
    switch (type) {
      case "nest":
        return colors.success;
      case "move-category":
        return colors.warning;
      case "move-list":
        return colors.primary;
      default:
        return colors.primary;
    }
  };

  return (
    <Animated.View
      style={[
        styles.inlineContainer,
        animatedStyle,
        { backgroundColor: getBackgroundColor() },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 4,
    justifyContent: "center",
    zIndex: 100,
  },
  line: {
    height: 3,
    borderRadius: 2,
  },
  inlineContainer: {
    marginHorizontal: 8,
    borderRadius: 2,
    overflow: "hidden",
  },
});
