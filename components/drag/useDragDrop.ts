import { useCallback, useRef } from "react";
import { useDragContext, useDragSharedValues } from "./DragProvider";
import type { Task, DragOrigin } from "@/types";

/**
 * Hook for components that need to be draggable
 * Provides gesture handlers and animated styles
 */
export function useDraggable(
  task: Task,
  index: number,
  isSubtask: boolean = false,
) {
  const { startDrag, updatePosition, endDrag, cancelDrag, dragState } =
    useDragContext();
  const sharedValues = useDragSharedValues();

  const originRef = useRef<DragOrigin | null>(null);
  const startPositionRef = useRef({ x: 0, y: 0 });

  const handleDragStart = useCallback(
    (absoluteX: number, absoluteY: number) => {
      const origin: DragOrigin = {
        taskId: task.id,
        categoryId: task.categoryId,
        parentTaskId: task.parentTaskId,
        index,
      };
      originRef.current = origin;
      startPositionRef.current = { x: absoluteX, y: absoluteY };
      startDrag(task, origin);
    },
    [task, index, startDrag],
  );

  const handleDragUpdate = useCallback(
    (translationX: number, translationY: number) => {
      updatePosition(translationX, translationY);
    },
    [updatePosition],
  );

  const handleDragEnd = useCallback(
    (translationX: number, translationY: number) => {
      // Check if we have a valid drop zone
      if (dragState.activeDropZone) {
        endDrag();
      } else {
        cancelDrag();
      }
    },
    [dragState.activeDropZone, endDrag, cancelDrag],
  );

  const isDragged =
    dragState.isDragging && dragState.draggedTask?.id === task.id;

  return {
    isDragged,
    isDragging: dragState.isDragging,
    sharedValues,
    handlers: {
      onDragStart: handleDragStart,
      onDragUpdate: handleDragUpdate,
      onDragEnd: handleDragEnd,
    },
  };
}

/**
 * Hook for measuring and registering layout
 */
export function useLayoutRegistration(taskId: string) {
  const { registerTaskLayout, unregisterTaskLayout } = useDragContext();

  const register = useCallback(
    (
      y: number,
      height: number,
      categoryId: string | null,
      parentTaskId: string | null,
      isSubtask: boolean,
    ) => {
      registerTaskLayout({
        taskId,
        y,
        height,
        categoryId,
        parentTaskId,
        isSubtask,
      });
    },
    [taskId, registerTaskLayout],
  );

  const unregister = useCallback(() => {
    unregisterTaskLayout(taskId);
  }, [taskId, unregisterTaskLayout]);

  return { register, unregister };
}
