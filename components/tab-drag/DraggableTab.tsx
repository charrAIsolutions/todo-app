import React, { useCallback, useEffect, useRef } from "react";
import { View, LayoutChangeEvent, Platform } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { SPRING } from "@/lib/animations";
import { useTabDragContext, useTabDragActions } from "./TabDragProvider";

// =============================================================================
// Constants
// =============================================================================

const DRAG_COOLDOWN_MS = 150;

function triggerHaptic(type: "start" | "drop") {
  if (Platform.OS === "web") return;
  if (type === "start") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

// =============================================================================
// Component
// =============================================================================

interface DraggableTabProps {
  tabId: string;
  index: number;
  onPress: () => void;
  onOpenSettings: () => void;
  children: React.ReactNode;
}

export function DraggableTab({
  tabId,
  index,
  onPress,
  onOpenSettings,
  children,
}: DraggableTabProps) {
  const { dragState, registerTab, unregisterTab } = useTabDragContext();
  const actionsRef = useTabDragActions();

  const viewRef = useRef<View>(null);
  const justDraggedRef = useRef(false);
  const isDragActiveRef = useRef(false);
  const translateX = useSharedValue(0);
  const dragStartX = useSharedValue(0);

  const isDragged = dragState.draggedTabId === tabId;
  const isDragging = dragState.isDragging;

  // -------------------------------------------------------------------------
  // Layout registration
  // -------------------------------------------------------------------------
  const handleLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      viewRef.current?.measureInWindow((x, _y, width, _height) => {
        registerTab({
          layout: { tabId, x, width, index },
          viewRef,
        });
      });
    },
    [tabId, index, registerTab],
  );

  useEffect(() => {
    return () => {
      unregisterTab(tabId);
    };
  }, [tabId, unregisterTab]);

  // -------------------------------------------------------------------------
  // Drag callbacks (JS thread)
  // -------------------------------------------------------------------------
  const activateDrag = useCallback(() => {
    isDragActiveRef.current = true;
    justDraggedRef.current = true;
    triggerHaptic("start");
    actionsRef.current?.startDrag(tabId, index);
  }, [tabId, index, actionsRef]);

  const updateDragPosition = useCallback(
    (absoluteX: number) => {
      actionsRef.current?.updateDrag(absoluteX);
    },
    [actionsRef],
  );

  const finishDrag = useCallback(() => {
    triggerHaptic("drop");
    actionsRef.current?.endDrag();
    isDragActiveRef.current = false;
    setTimeout(() => {
      justDraggedRef.current = false;
    }, DRAG_COOLDOWN_MS);
  }, [actionsRef]);

  // -------------------------------------------------------------------------
  // Gesture: Double-tap for settings (highest priority)
  // -------------------------------------------------------------------------
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(300)
    .onStart(() => {
      runOnJS(onOpenSettings)();
    });

  // -------------------------------------------------------------------------
  // Gesture: Long-press-activated pan for drag reorder
  // -------------------------------------------------------------------------
  const longPressPan = Gesture.Pan()
    .activateAfterLongPress(300)
    .onStart((event) => {
      dragStartX.value = event.absoluteX - event.translationX;
      runOnJS(activateDrag)();
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      const absoluteX = dragStartX.value + event.translationX;
      runOnJS(updateDragPosition)(absoluteX);
    })
    .onEnd(() => {
      translateX.value = translateX.value * 0.1;
      runOnJS(finishDrag)();
    })
    .onFinalize(() => {
      translateX.value = withSpring(0, {
        damping: 50,
        stiffness: 500,
        overshootClamping: true,
      });
    });

  // -------------------------------------------------------------------------
  // Gesture: Single tap for list selection (lowest priority)
  // -------------------------------------------------------------------------
  const handlePress = useCallback(() => {
    if (!justDraggedRef.current) {
      onPress();
    }
  }, [onPress]);

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .maxDelay(200)
    .onStart(() => {
      runOnJS(handlePress)();
    });

  // -------------------------------------------------------------------------
  // Compose: double-tap > long-press-pan > single-tap
  // -------------------------------------------------------------------------
  const composed = Gesture.Exclusive(doubleTap, longPressPan, singleTap);

  // -------------------------------------------------------------------------
  // Slide preview: non-dragged tabs shift to show where the drop will land
  // -------------------------------------------------------------------------
  const { draggedFromIndex, draggedTabWidth, insertAtIndex } = dragState;

  // Calculate how far this tab should shift (0 if not affected)
  let shiftOffset = 0;
  if (
    !isDragged &&
    isDragging &&
    draggedFromIndex !== null &&
    draggedTabWidth !== null &&
    insertAtIndex !== null
  ) {
    // Dragging right: tabs between (fromIndex, insertAtIndex] shift LEFT
    if (insertAtIndex > draggedFromIndex) {
      if (index > draggedFromIndex && index <= insertAtIndex) {
        shiftOffset = -draggedTabWidth;
      }
    }
    // Dragging left: tabs between [insertAtIndex, fromIndex) shift RIGHT
    else if (insertAtIndex < draggedFromIndex) {
      if (index >= insertAtIndex && index < draggedFromIndex) {
        shiftOffset = draggedTabWidth;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Animated styles
  // -------------------------------------------------------------------------
  const animatedStyle = useAnimatedStyle(() => {
    if (!isDragged) {
      return {
        transform: [
          {
            translateX:
              shiftOffset !== 0
                ? withSpring(shiftOffset, {
                    damping: 30,
                    stiffness: 200,
                    overshootClamping: true,
                  })
                : withTiming(0, { duration: 150 }),
          },
          { scale: 1 },
        ],
        opacity: 1,
        zIndex: 0,
      };
    }

    return {
      transform: [{ translateX: translateX.value }, { scale: 1.05 }],
      opacity: 0.85,
      zIndex: 1000,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    };
  }, [isDragged, shiftOffset]);

  const placeholderStyle = useAnimatedStyle(() => {
    return { opacity: isDragged ? 0.7 : 1 };
  }, [isDragged]);

  return (
    <View ref={viewRef} onLayout={handleLayout}>
      <GestureDetector gesture={composed}>
        <Animated.View style={animatedStyle}>
          <Animated.View style={placeholderStyle}>{children}</Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
