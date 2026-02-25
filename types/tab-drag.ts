// =============================================================================
// Tab Drag-and-Drop Types for List Tab Reordering
// =============================================================================

import type { RefObject } from "react";
import type { View } from "react-native";

/**
 * Layout information for a single tab in the tab bar.
 * X positions are absolute (via measureInWindow), not relative to ScrollView content.
 */
export interface TabLayout {
  tabId: string;
  x: number;
  width: number;
  index: number;
}

/**
 * Ref entry stored in the provider's registry for re-measurement on drag start.
 */
export interface TabRegistryEntry {
  layout: TabLayout;
  viewRef: RefObject<View | null>;
}

/**
 * Current state of a tab drag operation.
 */
export interface TabDragState {
  isDragging: boolean;
  draggedTabId: string | null;
  draggedFromIndex: number | null;
  draggedTabWidth: number | null;
  insertAtIndex: number | null;
}

/**
 * Context value exposed to tab drag consumers (read-only drag state + registration).
 */
export interface TabDragContextValue {
  dragState: TabDragState;
  registerTab: (entry: TabRegistryEntry) => void;
  unregisterTab: (tabId: string) => void;
}

/**
 * Internal methods passed to DraggableTab via ref (not on context to avoid re-renders).
 */
export interface TabDragActions {
  startDrag: (tabId: string, index: number) => void;
  updateDrag: (absoluteX: number) => void;
  endDrag: () => void;
}
