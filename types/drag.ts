// =============================================================================
// Drag-and-Drop Types for Task Reordering
// =============================================================================

import type { Task } from "./todo";

// -----------------------------------------------------------------------------
// Core Drag Types
// -----------------------------------------------------------------------------

/**
 * Represents the current drag state
 */
export interface DragState {
  isDragging: boolean;
  draggedTask: Task | null;
  dragOrigin: DragOrigin | null;
  activeDropZone: DropZone | null;
}

/**
 * Where the drag started - used for determining valid drop targets
 */
export interface DragOrigin {
  taskId: string;
  listId: string;
  categoryId: string | null;
  parentTaskId: string | null;
  index: number;
}

/**
 * Drop zone types determine what happens on drop
 */
export type DropZoneType =
  | "reorder" // Insert between tasks in same category
  | "move-category" // Move to different category
  | "move-list" // Move to a different list
  | "nest" // Make subtask of another task
  | "unnest"; // Convert subtask to top-level task

/**
 * A drop zone - the target area where a task can be dropped
 */
export interface DropZone {
  type: DropZoneType;
  /** Target list (null = same list as origin) */
  listId: string | null;
  categoryId: string | null;
  /** For reorder: the task to insert before. null = insert at end */
  beforeTaskId: string | null;
  /** For nest: the task to nest under */
  parentTaskId: string | null;
  /** Visual position for the drop indicator */
  indicatorY: number;
}

// -----------------------------------------------------------------------------
// Layout Measurement Types
// -----------------------------------------------------------------------------

/**
 * Layout information for a task item
 */
export interface TaskLayout {
  taskId: string;
  listId: string;
  categoryId: string | null;
  parentTaskId: string | null;
  y: number; // Top position relative to scroll container
  height: number;
  isSubtask: boolean;
}

/**
 * Layout information for a category section
 */
export interface CategoryLayout {
  categoryId: string | null;
  listId: string; // Which list this category belongs to
  y: number;
  height: number;
}

/**
 * Layout information for a list pane (web split-view)
 */
export interface PaneLayout {
  listId: string;
  x: number;
  width: number;
}

/**
 * Registry of all measured layouts for drop zone calculation
 */
export interface LayoutRegistry {
  tasks: Map<string, TaskLayout>;
  categories: Map<string, CategoryLayout>; // composite key: listId:categoryId
  panes: Map<string, PaneLayout>;
  scrollOffset: number;
  containerTop: number;
}

// -----------------------------------------------------------------------------
// Drag Event Types
// -----------------------------------------------------------------------------

/**
 * Callback when drag ends with a valid drop
 */
export interface DragEndEvent {
  task: Task;
  dropZone: DropZone;
}

/**
 * Callback when drag is cancelled (released outside valid zone)
 */
export interface DragCancelEvent {
  task: Task;
}

// -----------------------------------------------------------------------------
// Context Types
// -----------------------------------------------------------------------------

/**
 * Values exposed by DragProvider context
 */
export interface DragContextValue {
  // State
  dragState: DragState;

  // Actions
  startDrag: (task: Task, origin: DragOrigin) => void;
  updatePosition: (x: number, y: number) => void;
  endDrag: () => void;
  cancelDrag: () => void;

  // Layout registration
  registerTaskLayout: (layout: TaskLayout) => void;
  unregisterTaskLayout: (taskId: string) => void;
  registerCategoryLayout: (layout: CategoryLayout) => void;
  registerPaneLayout: (layout: PaneLayout) => void;

  // Callbacks
  onDragEnd?: (event: DragEndEvent) => void;
}

// -----------------------------------------------------------------------------
// Component Props Types
// -----------------------------------------------------------------------------

export interface DraggableTaskProps {
  task: Task;
  isSubtask: boolean;
  index: number;
  onPress: () => void;
}

export interface DropIndicatorProps {
  y: number;
  visible: boolean;
  type: DropZoneType;
}
