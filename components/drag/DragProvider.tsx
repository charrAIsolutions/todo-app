import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSharedValue, type SharedValue } from "react-native-reanimated";

import type {
  DragContextValue,
  DragEndEvent,
  DragOrigin,
  DragState,
  DropZone,
  TaskLayout,
  CategoryLayout,
  PaneLayout,
  LayoutRegistry,
} from "@/types";
import type { Task } from "@/types";

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

const DragContext = createContext<DragContextValue | null>(null);

// Separate context for shared values (UI thread access)
interface DragSharedValues {
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  isDragging: SharedValue<boolean>;
  draggedTaskId: SharedValue<string | null>;
  scale: SharedValue<number>;
}

const DragSharedContext = createContext<DragSharedValues | null>(null);

// -----------------------------------------------------------------------------
// Provider Props
// -----------------------------------------------------------------------------

interface DragProviderProps {
  children: React.ReactNode;
  onDragEnd?: (event: DragEndEvent) => void;
  enabled?: boolean;
}

// -----------------------------------------------------------------------------
// Provider Component
// -----------------------------------------------------------------------------

export function DragProvider({
  children,
  onDragEnd,
  enabled = true,
}: DragProviderProps) {
  // Drag state (React state for JS thread)
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedTask: null,
    dragOrigin: null,
    activeDropZone: null,
  });

  // Shared values for smooth 60fps animations (UI thread)
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDraggingShared = useSharedValue(false);
  const draggedTaskId = useSharedValue<string | null>(null);
  const scale = useSharedValue(1);

  // Refs for values that must be readable during an active gesture
  // (gesture handler worklets on native capture stale closure references)
  const dragOriginRef = useRef<DragOrigin | null>(null);
  const draggedTaskRef = useRef<Task | null>(null);

  // Layout registry for drop zone calculation
  const layoutRegistry = useRef<LayoutRegistry>({
    tasks: new Map(),
    categories: new Map(),
    panes: new Map(),
    scrollOffset: 0,
    containerTop: 0,
  });

  // Start drag action
  const startDrag = useCallback(
    (task: Task, origin: DragOrigin) => {
      if (!enabled) return;

      // Set refs FIRST so they're available to stale closures immediately
      dragOriginRef.current = origin;
      draggedTaskRef.current = task;
      activeDropZoneRef.current = null;

      setDragState({
        isDragging: true,
        draggedTask: task,
        dragOrigin: origin,
        activeDropZone: null,
      });

      isDraggingShared.value = true;
      draggedTaskId.value = task.id;
      scale.value = 1.05;
    },
    [enabled, isDraggingShared, draggedTaskId, scale],
  );

  // Track active drop zone in a ref to avoid unnecessary re-renders
  const activeDropZoneRef = useRef<DropZone | null>(null);

  // Update position during drag (receives absolute position for drop zone calculation)
  // Note: Shared values for visual translation are managed by DraggableTask directly
  // Reads from refs (not state) to avoid stale closure issues with native gesture handlers
  const updatePosition = useCallback((absoluteX: number, absoluteY: number) => {
    const dropZone = calculateDropZone(
      absoluteX,
      absoluteY,
      layoutRegistry.current,
      dragOriginRef.current,
      draggedTaskRef.current?.listId ?? null,
    );

    const prev = activeDropZoneRef.current;

    // Deep compare to avoid unnecessary re-renders
    const changed =
      !prev ||
      !dropZone ||
      prev.type !== dropZone.type ||
      prev.listId !== dropZone.listId ||
      prev.categoryId !== dropZone.categoryId ||
      prev.beforeTaskId !== dropZone.beforeTaskId ||
      prev.parentTaskId !== dropZone.parentTaskId;

    if (changed) {
      activeDropZoneRef.current = dropZone;
      setDragState((prev) => ({ ...prev, activeDropZone: dropZone }));
    }
  }, []);

  // End drag — reads refs to determine if it's a valid drop or a cancel.
  // This avoids stale closure issues: native gesture handlers capture old function
  // references, but refs always point to current values.
  // Note: Shared values (translateX/Y, scale) are reset by DraggableTask.onFinalize
  const endDrag = useCallback(() => {
    const task = draggedTaskRef.current;
    const dropZone = activeDropZoneRef.current;

    if (task && dropZone && onDragEnd) {
      onDragEnd({ task, dropZone });
    }

    // Reset refs
    dragOriginRef.current = null;
    draggedTaskRef.current = null;
    activeDropZoneRef.current = null;

    // Reset React state (shared values handled by gesture's onFinalize)
    setDragState({
      isDragging: false,
      draggedTask: null,
      dragOrigin: null,
      activeDropZone: null,
    });

    isDraggingShared.value = false;
    draggedTaskId.value = null;
  }, [onDragEnd, isDraggingShared, draggedTaskId]);

  // Cancel drag (no valid drop zone)
  // Note: Shared values reset by DraggableTask.onFinalize
  const cancelDrag = useCallback(() => {
    // Reset refs
    dragOriginRef.current = null;
    draggedTaskRef.current = null;
    activeDropZoneRef.current = null;

    setDragState({
      isDragging: false,
      draggedTask: null,
      dragOrigin: null,
      activeDropZone: null,
    });

    isDraggingShared.value = false;
    draggedTaskId.value = null;
  }, [isDraggingShared, draggedTaskId]);

  // Layout registration
  const registerTaskLayout = useCallback((layout: TaskLayout) => {
    layoutRegistry.current.tasks.set(layout.taskId, layout);
  }, []);

  const unregisterTaskLayout = useCallback(
    (taskId: string, expectedCategoryId?: string | null) => {
      // When expectedCategoryId is provided, only unregister if it matches.
      // This prevents exit animations from removing a newer registration
      // (old component unmounts 200ms after new component already registered).
      if (expectedCategoryId !== undefined) {
        const existing = layoutRegistry.current.tasks.get(taskId);
        if (existing && existing.categoryId !== expectedCategoryId) return;
      }
      layoutRegistry.current.tasks.delete(taskId);
    },
    [],
  );

  const registerCategoryLayout = useCallback((layout: CategoryLayout) => {
    const key = `${layout.listId}:${layout.categoryId ?? "uncategorized"}`;
    layoutRegistry.current.categories.set(key, layout);
  }, []);

  const registerPaneLayout = useCallback((layout: PaneLayout) => {
    layoutRegistry.current.panes.set(layout.listId, layout);
  }, []);

  // Context value
  const contextValue = useMemo<DragContextValue>(
    () => ({
      dragState,
      startDrag,
      updatePosition,
      endDrag,
      cancelDrag,
      registerTaskLayout,
      unregisterTaskLayout,
      registerCategoryLayout,
      registerPaneLayout,
      onDragEnd,
    }),
    [
      dragState,
      startDrag,
      updatePosition,
      endDrag,
      cancelDrag,
      registerTaskLayout,
      unregisterTaskLayout,
      registerCategoryLayout,
      registerPaneLayout,
      onDragEnd,
    ],
  );

  // Shared values context
  const sharedValues = useMemo<DragSharedValues>(
    () => ({
      translateX,
      translateY,
      isDragging: isDraggingShared,
      draggedTaskId,
      scale,
    }),
    [translateX, translateY, isDraggingShared, draggedTaskId, scale],
  );

  return (
    <DragContext.Provider value={contextValue}>
      <DragSharedContext.Provider value={sharedValues}>
        {children}
      </DragSharedContext.Provider>
    </DragContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// Hooks
// -----------------------------------------------------------------------------

export function useDragContext(): DragContextValue {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error("useDragContext must be used within a DragProvider");
  }
  return context;
}

export function useDragSharedValues(): DragSharedValues {
  const context = useContext(DragSharedContext);
  if (!context) {
    throw new Error("useDragSharedValues must be used within a DragProvider");
  }
  return context;
}

// -----------------------------------------------------------------------------
// Drop Zone Calculation (pure function)
// -----------------------------------------------------------------------------

function calculateDropZone(
  absoluteX: number,
  absoluteY: number,
  registry: LayoutRegistry,
  origin: DragOrigin | null,
  taskListId: string | null, // The listId of the dragged task
): DropZone | null {
  if (!origin) return null;

  const allTasks = Array.from(registry.tasks.values());
  if (allTasks.length === 0) return null;

  // --- Determine target list from X position (pane detection) ---
  let targetListId = taskListId ?? "";
  for (const [listId, pane] of registry.panes) {
    if (absoluteX >= pane.x && absoluteX < pane.x + pane.width) {
      targetListId = listId;
      break;
    }
  }
  const isCrossListDrag = targetListId !== taskListId;

  // Filter tasks and categories by target list
  const tasks = allTasks.filter((t) => t.listId === targetListId);

  const allCategories = Array.from(registry.categories.entries());
  const categories = allCategories.filter(
    ([_key, layout]) => layout.listId === targetListId,
  );
  const isSubtaskDrag = origin.parentTaskId !== null;

  // Find which category region we're in based on absolute Y position
  let targetCategoryId: string | null = null;

  if (categories.length > 0) {
    for (const [_key, layout] of categories) {
      if (absoluteY >= layout.y && absoluteY < layout.y + layout.height) {
        targetCategoryId = layout.categoryId; // Use value, not key
        break;
      }
    }
  } else {
    // No categories registered, infer from closest top-level task
    let closestTask: TaskLayout | null = null;
    let closestDistance = Infinity;

    for (const task of tasks) {
      if (task.isSubtask) continue;
      const taskCenter = task.y + task.height / 2;
      const distance = Math.abs(absoluteY - taskCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestTask = task;
      }
    }

    if (closestTask) {
      targetCategoryId = closestTask.categoryId;
    }
  }

  // If no category matched by Y region, snap to nearest category by distance
  // This prevents tasks from accidentally landing in uncategorized when dropped
  // in the gap between categories, above the first, or below the last.
  if (targetCategoryId === null && categories.length > 0) {
    let closestCategoryId: string | null = null;
    let closestDistance = Infinity;
    for (const [_key, layout] of categories) {
      const categoryCenter = layout.y + layout.height / 2;
      const distance = Math.abs(absoluteY - categoryCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCategoryId = layout.categoryId;
      }
    }
    if (closestCategoryId !== null) {
      targetCategoryId = closestCategoryId;
    }
  }

  // Get top-level tasks in target category
  const topLevelTasks = tasks
    .filter(
      (t) =>
        t.categoryId === targetCategoryId &&
        t.taskId !== origin.taskId &&
        !t.isSubtask,
    )
    .sort((a, b) => a.y - b.y);

  // --- Cross-list branch: skip nest/unnest, just find insertion point ---
  if (isCrossListDrag) {
    for (const taskLayout of topLevelTasks) {
      const taskCenter = taskLayout.y + taskLayout.height / 2;
      if (absoluteY < taskCenter) {
        return {
          type: "move-list",
          listId: targetListId,
          categoryId: targetCategoryId,
          beforeTaskId: taskLayout.taskId,
          parentTaskId: null,
          indicatorY: taskLayout.y,
        };
      }
    }
    // Insert at end
    const lastTask = topLevelTasks[topLevelTasks.length - 1];
    return {
      type: "move-list",
      listId: targetListId,
      categoryId: targetCategoryId,
      beforeTaskId: null,
      parentTaskId: null,
      indicatorY: lastTask ? lastTask.y + lastTask.height : absoluteY,
    };
  }

  // --- Within-list logic ---

  // If dragging a subtask within same parent, handle subtask reordering
  if (isSubtaskDrag) {
    const siblingSubtasks = tasks
      .filter(
        (t) =>
          t.parentTaskId === origin.parentTaskId &&
          t.taskId !== origin.taskId &&
          t.isSubtask,
      )
      .sort((a, b) => a.y - b.y);

    const parentLayout = tasks.find((t) => t.taskId === origin.parentTaskId);
    if (parentLayout && siblingSubtasks.length > 0) {
      const firstSubtask = siblingSubtasks[0];
      const lastSubtask = siblingSubtasks[siblingSubtasks.length - 1];
      const subtaskAreaTop = firstSubtask.y;
      const subtaskAreaBottom = lastSubtask.y + lastSubtask.height;

      if (
        absoluteY >= subtaskAreaTop - 20 &&
        absoluteY <= subtaskAreaBottom + 20
      ) {
        for (const subtask of siblingSubtasks) {
          const subtaskCenter = subtask.y + subtask.height / 2;
          if (absoluteY < subtaskCenter) {
            return {
              type: "reorder",
              listId: targetListId,
              categoryId: origin.categoryId,
              beforeTaskId: subtask.taskId,
              parentTaskId: origin.parentTaskId,
              indicatorY: subtask.y,
            };
          }
        }

        return {
          type: "reorder",
          listId: targetListId,
          categoryId: origin.categoryId,
          beforeTaskId: null,
          parentTaskId: origin.parentTaskId,
          indicatorY: lastSubtask.y + lastSubtask.height,
        };
      }
    }

    // Subtask dragged outside subtask area = cancel (snap back)
    // Unnesting is only available via the task detail menu
    return null;
  }

  // Standard top-level task reorder - find insertion point
  for (let i = 0; i < topLevelTasks.length; i++) {
    const taskLayout = topLevelTasks[i];
    const taskCenter = taskLayout.y + taskLayout.height / 2;

    if (absoluteY < taskCenter) {
      return {
        type:
          targetCategoryId === origin.categoryId ? "reorder" : "move-category",
        listId: targetListId,
        categoryId: targetCategoryId,
        beforeTaskId: taskLayout.taskId,
        parentTaskId: null,
        indicatorY: taskLayout.y,
      };
    }
  }

  // Insert at end of category
  const lastTask = topLevelTasks[topLevelTasks.length - 1];
  return {
    type: targetCategoryId === origin.categoryId ? "reorder" : "move-category",
    listId: targetListId,
    categoryId: targetCategoryId,
    beforeTaskId: null,
    parentTaskId: null,
    indicatorY: lastTask ? lastTask.y + lastTask.height : absoluteY,
  };
}
