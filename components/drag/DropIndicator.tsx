import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import type { DropZoneType } from "@/types";

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

  // Different styles based on drop type
  const getIndicatorStyle = () => {
    switch (type) {
      case "nest":
        return styles.nestIndicator;
      case "unnest":
        return styles.unnestIndicator;
      case "move-category":
        return styles.moveIndicator;
      default:
        return styles.reorderIndicator;
    }
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={[styles.line, getIndicatorStyle()]} />
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
  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: withSpring(active ? 4 : 0, { damping: 15 }),
      opacity: withSpring(active ? 1 : 0, { damping: 20 }),
    };
  }, [active]);

  const getBackgroundColor = () => {
    switch (type) {
      case "nest":
        return "#34C759"; // Green for nesting
      case "move-category":
        return "#FF9500"; // Orange for category change
      default:
        return "#007AFF"; // Blue for reorder
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
  reorderIndicator: {
    backgroundColor: "#007AFF",
    marginHorizontal: 8,
  },
  moveIndicator: {
    backgroundColor: "#FF9500",
    marginHorizontal: 8,
  },
  nestIndicator: {
    backgroundColor: "#34C759",
    marginLeft: 44, // Indented to show nesting intent
    marginRight: 8,
  },
  unnestIndicator: {
    backgroundColor: "#FF3B30",
    marginRight: 44, // Shorter to show unnesting
    marginLeft: 8,
  },
  inlineContainer: {
    marginHorizontal: 8,
    borderRadius: 2,
    overflow: "hidden",
  },
});
