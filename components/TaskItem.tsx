import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { Task } from "@/types/todo";
import { SPRING, DURATION, COLORS } from "@/lib/animations";

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
  onPress?: () => void;
  indentLevel?: 0 | 1 | 2; // 0 = normal, 1 = task under category, 2 = subtask
}

/**
 * Individual task row with checkbox and title.
 * Supports indentation for category grouping and subtasks.
 * Features animated checkbox with scale pulse and color transition.
 */
export function TaskItem({
  task,
  onToggle,
  onPress,
  indentLevel = 0,
}: TaskItemProps) {
  const indent = indentLevel === 1 ? 12 : indentLevel === 2 ? 32 : 0;

  // Animation shared values
  const checkboxScale = useSharedValue(1);
  const completionProgress = useSharedValue(task.completed ? 1 : 0);

  // Sync animation state when task.completed changes
  useEffect(() => {
    // Animate to new state
    completionProgress.value = withTiming(task.completed ? 1 : 0, {
      duration: DURATION.fast,
    });
  }, [task.completed, completionProgress]);

  // Handle toggle with scale pulse animation
  const handleToggle = () => {
    // Trigger scale pulse: 1 → 1.15 → 1 using shared constants
    checkboxScale.value = withSequence(
      withSpring(1.15, SPRING.snappy),
      withSpring(1, SPRING.default),
    );
    onToggle();
  };

  // Animated style for checkbox container (scale + background color)
  const checkboxAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      completionProgress.value,
      [0, 1],
      [COLORS.checkboxUnchecked, COLORS.checkboxChecked],
    );
    const borderColor = interpolateColor(
      completionProgress.value,
      [0, 1],
      [COLORS.borderUnchecked, COLORS.borderChecked],
    );

    return {
      transform: [{ scale: checkboxScale.value }],
      backgroundColor,
      borderColor,
    };
  });

  // Animated style for title (color + opacity transition together)
  // Using interpolateColor keeps the color change in sync with the animation
  const titleAnimatedStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      completionProgress.value,
      [0, 1],
      [COLORS.textActive, COLORS.textCompleted],
    );
    const opacity = 1 - completionProgress.value * 0.4; // 1 → 0.6

    return { color, opacity };
  });

  return (
    <Pressable
      style={[styles.container, { marginLeft: indent }]}
      onPress={onPress ?? handleToggle}
    >
      {/* Animated Checkbox */}
      <Pressable onPress={handleToggle}>
        <Animated.View style={[styles.checkbox, checkboxAnimatedStyle]}>
          {task.completed && (
            <Animated.Text
              entering={FadeIn.duration(DURATION.fast)}
              exiting={FadeOut.duration(DURATION.fast)}
              style={styles.checkmark}
            >
              ✓
            </Animated.Text>
          )}
        </Animated.View>
      </Pressable>

      {/* Title with animated color and opacity */}
      <Animated.Text
        style={[
          styles.title,
          task.completed && styles.titleStrikethrough,
          titleAnimatedStyle,
        ]}
        numberOfLines={2}
      >
        {task.title}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ccc",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  title: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  // Only strikethrough - color is now animated via titleAnimatedStyle
  titleStrikethrough: {
    textDecorationLine: "line-through",
  },
});
