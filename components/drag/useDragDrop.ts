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
  const { startDrag, updatePosition, endDrag, dragState } = useDragContext();
  const sharedValues = useDragSharedValues();

  const originRef = useRef<DragOrigin | null>(null);
  const startPositionRef = useRef({ x: 0, y: 0 });

  const handleDragStart = useCallback(
    (absoluteX: number, absoluteY: number) => {
      const origin: DragOrigin = {
        taskId: task.id,
        listId: task.listId,
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

  const handleDragEnd = useCallback(() => {
    // Always call endDrag — DragProvider reads activeDropZoneRef internally
    // to decide whether it's a valid drop or a cancel.
    // This avoids stale closure issues where the gesture handler on native
    // captures an old dragState.activeDropZone value.
    endDrag();
  }, [endDrag]);

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
export function useLayoutRegistration(taskId: string, listId: string) {
  const { registerTaskLayout, unregisterTaskLayout } = useDragContext();

  // Track the categoryId we registered with, so unregister can be conditional.
  // This prevents exit animation cleanup from removing a newer registration.
  const registeredCategoryRef = useRef<string | null>(null);

  const register = useCallback(
    (
      y: number,
      height: number,
      categoryId: string | null,
      parentTaskId: string | null,
      isSubtask: boolean,
    ) => {
      registeredCategoryRef.current = categoryId;
      registerTaskLayout({
        taskId,
        listId,
        y,
        height,
        categoryId,
        parentTaskId,
        isSubtask,
      });
    },
    [taskId, listId, registerTaskLayout],
  );

  const unregister = useCallback(() => {
    unregisterTaskLayout(taskId, registeredCategoryRef.current);
  }, [taskId, unregisterTaskLayout]);

  return { register, unregister };
}
