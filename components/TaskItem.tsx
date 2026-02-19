import { useEffect } from "react";
import { Pressable, View } from "react-native";
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
import { useTheme } from "@/hooks/useTheme";
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
  const { effectiveScheme } = useTheme();
  const isDark = effectiveScheme === "dark";

  // Theme-aware text colors for interpolateColor (can't use CSS variables)
  const textActive = isDark ? "#ffffff" : COLORS.textActive;
  const textCompleted = isDark ? "#636366" : COLORS.textCompleted;

  // Calculate margin based on indent level
  const marginStyle =
    indentLevel === 1
      ? { marginLeft: 12 }
      : indentLevel === 2
        ? { marginLeft: 32 }
        : undefined;

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
      [textActive, textCompleted],
    );
    const opacity = 1 - completionProgress.value * 0.4; // 1 → 0.6

    return { color, opacity };
  });

  return (
    <Pressable
      className="flex-row items-center py-3 px-1 border-b border-border"
      style={marginStyle}
      onPress={onPress ?? handleToggle}
    >
      {/* Animated Checkbox */}
      <Pressable onPress={handleToggle}>
        <Animated.View
          style={[
            {
              width: 24,
              height: 24,
              borderRadius: 12,
              borderWidth: 2,
              marginRight: 12,
              alignItems: "center",
              justifyContent: "center",
            },
            checkboxAnimatedStyle,
          ]}
        >
          {task.completed && (
            <Animated.Text
              entering={FadeIn.duration(DURATION.fast)}
              exiting={FadeOut.duration(DURATION.fast)}
              className="text-white text-sm font-bold"
            >
              ✓
            </Animated.Text>
          )}
        </Animated.View>
      </Pressable>

      {/* Title with animated color and opacity */}
      <Animated.Text
        className={`flex-1 text-base ${task.completed ? "line-through" : ""}`}
        style={titleAnimatedStyle}
        numberOfLines={2}
      >
        {task.title}
      </Animated.Text>
    </Pressable>
  );
}
