import React, { useCallback, useEffect, useRef } from "react";
import { View, LayoutChangeEvent, Platform } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { TaskItem } from "@/components/TaskItem";
import { useDraggable, useLayoutRegistration } from "./useDragDrop";
import type { Task } from "@/types";

// Trigger haptic feedback (native only)
function triggerHaptic(type: "start" | "drop") {
  if (Platform.OS === "web") return;

  if (type === "start") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

interface DraggableTaskProps {
  task: Task;
  index: number;
  isSubtask?: boolean;
  indentLevel?: 0 | 1 | 2;
  onToggle: () => void;
  onPress: () => void;
}

const DRAG_ACTIVATION_DISTANCE = 10; // px movement to activate drag
const DRAG_COOLDOWN_MS = 150; // prevent onPress firing after drag

export function DraggableTask({
  task,
  index,
  isSubtask = false,
  indentLevel = 0,
  onToggle,
  onPress,
}: DraggableTaskProps) {
  const { isDragged, isDragging, sharedValues, handlers } = useDraggable(
    task,
    index,
    isSubtask,
  );
  const { register, unregister } = useLayoutRegistration(task.id);

  const layoutRef = useRef({ y: 0, height: 0 });
  const viewRef = useRef<View>(null);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const isDragActiveRef = useRef(false);
  const justDraggedRef = useRef(false);

  // Measure and register layout on mount and layout changes
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;

      // Measure position relative to window
      viewRef.current?.measureInWindow((x, y, w, h) => {
        layoutRef.current = { y, height: h };
        register(y, h, task.categoryId, task.parentTaskId, isSubtask);
      });
    },
    [register, task.categoryId, task.parentTaskId, isSubtask],
  );

  // Unregister on unmount
  useEffect(() => {
    return () => {
      unregister();
    };
  }, [unregister]);

  // Helper to store start position and activate drag
  const setDragStart = useCallback((x: number, y: number) => {
    dragStartPosRef.current = { x, y };
  }, []);

  // Helper to activate drag (called when gesture starts after threshold)
  const activateDrag = useCallback(() => {
    isDragActiveRef.current = true;
    justDraggedRef.current = true;
    triggerHaptic("start");
    handlers.onDragStart(dragStartPosRef.current.x, dragStartPosRef.current.y);
  }, [handlers]);

  // Helper to mark drag as finished (with cooldown for onPress)
  const markDragFinished = useCallback(() => {
    isDragActiveRef.current = false;
    setTimeout(() => {
      justDraggedRef.current = false;
    }, DRAG_COOLDOWN_MS);
  }, []);

  // Pan gesture with activation offset - gesture activates after moving 10px
  // This prevents conflicts with taps and checkbox presses
  const gesture = Gesture.Pan()
    .activeOffsetX([-DRAG_ACTIVATION_DISTANCE, DRAG_ACTIVATION_DISTANCE])
    .activeOffsetY([-DRAG_ACTIVATION_DISTANCE, DRAG_ACTIVATION_DISTANCE])
    .onStart((event) => {
      // Store the absolute start position for drop zone calculations
      // Translation values start at 0 (relative to touch start)
      runOnJS(setDragStart)(
        event.absoluteX - event.translationX,
        event.absoluteY - event.translationY,
      );
      runOnJS(activateDrag)();
    })
    .onUpdate((event) => {
      sharedValues.translateX.value = event.translationX;
      sharedValues.translateY.value = event.translationY;
      const absoluteX = dragStartPosRef.current.x + event.translationX;
      const absoluteY = dragStartPosRef.current.y + event.translationY;
      runOnJS(handlers.onDragUpdate)(absoluteX, absoluteY);
    })
    .onEnd((event) => {
      runOnJS(triggerHaptic)("drop");
      runOnJS(handlers.onDragEnd)(event.translationX, event.translationY);
      runOnJS(markDragFinished)();
    })
    .onFinalize(() => {
      // Spring back
      sharedValues.translateX.value = withSpring(0);
      sharedValues.translateY.value = withSpring(0);
      sharedValues.scale.value = withTiming(1);
    });

  // Animated styles for the dragged item
  // isDragged is task-specific (checks dragState.draggedTask?.id === task.id)
  // Keep using StyleSheet for animated styles (Reanimated requirement)
  const animatedStyle = useAnimatedStyle(() => {
    if (!isDragged) {
      return {
        transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
        opacity: 1,
        zIndex: 0,
      };
    }

    return {
      transform: [
        { translateX: sharedValues.translateX.value },
        { translateY: sharedValues.translateY.value },
        { scale: sharedValues.scale.value },
      ],
      opacity: 0.95,
      zIndex: 1000,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    };
  }, [isDragged]);

  // Style for placeholder when item is being dragged
  const placeholderStyle = useAnimatedStyle(() => {
    return { opacity: isDragged ? 0.3 : 1 };
  }, [isDragged]);

  return (
    <View ref={viewRef} onLayout={handleLayout}>
      <GestureDetector gesture={gesture}>
        <Animated.View className="bg-surface" style={animatedStyle}>
          <Animated.View style={placeholderStyle}>
            <TaskItem
              task={task}
              onToggle={
                isDragging || justDraggedRef.current ? () => {} : onToggle
              }
              onPress={
                isDragging || justDraggedRef.current ? () => {} : onPress
              }
              indentLevel={indentLevel}
            />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
