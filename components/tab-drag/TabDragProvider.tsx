import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import type {
  TabDragState,
  TabDragContextValue,
  TabDragActions,
  TabRegistryEntry,
  TabLayout,
} from "@/types/tab-drag";

// =============================================================================
// Context
// =============================================================================

const TabDragContext = createContext<TabDragContextValue | null>(null);

export function useTabDragContext() {
  const context = useContext(TabDragContext);
  if (!context) {
    throw new Error("useTabDragContext must be used within a TabDragProvider");
  }
  return context;
}

// =============================================================================
// Actions ref — shared with DraggableTab without going through context
// =============================================================================

const TabDragActionsContext = createContext<
  React.RefObject<TabDragActions | null>
>({ current: null } as React.RefObject<TabDragActions | null>);

export function useTabDragActions() {
  return useContext(TabDragActionsContext);
}

// =============================================================================
// Drop zone calculation (X-axis only)
// =============================================================================

function calculateInsertIndex(
  absoluteX: number,
  layouts: Map<string, TabRegistryEntry>,
  draggedTabId: string,
): number {
  const sorted = Array.from(layouts.values())
    .filter((entry) => entry.layout.tabId !== draggedTabId)
    .sort((a, b) => a.layout.x - b.layout.x);

  if (sorted.length === 0) return 0;

  for (let i = 0; i < sorted.length; i++) {
    const tab = sorted[i].layout;
    const tabCenterX = tab.x + tab.width / 2;
    if (absoluteX < tabCenterX) {
      return i;
    }
  }

  // Past all tabs — insert at end
  return sorted.length;
}

// =============================================================================
// Provider
// =============================================================================

interface TabDragProviderProps {
  children: ReactNode;
  onReorder: (listIds: string[]) => void;
  sortedListIds: string[];
}

export function TabDragProvider({
  children,
  onReorder,
  sortedListIds,
}: TabDragProviderProps) {
  const [dragState, setDragState] = useState<TabDragState>({
    isDragging: false,
    draggedTabId: null,
    draggedFromIndex: null,
    draggedTabWidth: null,
    insertAtIndex: null,
  });

  const registryRef = useRef<Map<string, TabRegistryEntry>>(new Map());
  const insertAtIndexRef = useRef<number | null>(null);
  const draggedTabIdRef = useRef<string | null>(null);

  // -------------------------------------------------------------------------
  // Registration
  // -------------------------------------------------------------------------
  const registerTab = useCallback((entry: TabRegistryEntry) => {
    registryRef.current.set(entry.layout.tabId, entry);
  }, []);

  const unregisterTab = useCallback((tabId: string) => {
    registryRef.current.delete(tabId);
  }, []);

  // -------------------------------------------------------------------------
  // Re-measure all tabs (fixes stale positions after scroll)
  // -------------------------------------------------------------------------
  const remeasureAll = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const entries = Array.from(registryRef.current.values());
      let remaining = entries.length;
      if (remaining === 0) {
        resolve();
        return;
      }

      entries.forEach((entry) => {
        const ref = entry.viewRef.current;
        if (ref) {
          ref.measureInWindow((x, _y, width, _height) => {
            entry.layout = { ...entry.layout, x, width };
            remaining--;
            if (remaining === 0) resolve();
          });
        } else {
          remaining--;
          if (remaining === 0) resolve();
        }
      });
    });
  }, []);

  // -------------------------------------------------------------------------
  // Drag actions (exposed via ref, not context)
  // -------------------------------------------------------------------------
  const actionsRef = useRef<TabDragActions | null>(null);

  actionsRef.current = {
    startDrag: (tabId: string, fromIndex: number) => {
      draggedTabIdRef.current = tabId;
      insertAtIndexRef.current = null;

      // Re-measure, then set state with origin info for slide preview
      remeasureAll().then(() => {
        const entry = registryRef.current.get(tabId);
        const tabWidth = entry ? entry.layout.width : 0;

        setDragState({
          isDragging: true,
          draggedTabId: tabId,
          draggedFromIndex: fromIndex,
          draggedTabWidth: tabWidth,
          insertAtIndex: null,
        });
      });
    },

    updateDrag: (absoluteX: number) => {
      if (!draggedTabIdRef.current) return;

      const newIndex = calculateInsertIndex(
        absoluteX,
        registryRef.current,
        draggedTabIdRef.current,
      );

      // Only update state when insertAtIndex actually changes
      if (newIndex !== insertAtIndexRef.current) {
        insertAtIndexRef.current = newIndex;
        setDragState((prev) => ({
          ...prev,
          insertAtIndex: newIndex,
        }));
      }
    },

    endDrag: () => {
      const draggedId = draggedTabIdRef.current;
      const insertAt = insertAtIndexRef.current;

      if (draggedId !== null && insertAt !== null) {
        // Build new order: remove dragged, insert at position
        const currentOrder = [...sortedListIds];
        const fromIndex = currentOrder.indexOf(draggedId);

        if (fromIndex !== -1 && fromIndex !== insertAt) {
          currentOrder.splice(fromIndex, 1);
          // Adjust insertAt if dragging forward (indices shift after removal)
          const adjustedInsert = insertAt > fromIndex ? insertAt : insertAt;
          currentOrder.splice(adjustedInsert, 0, draggedId);
          onReorder(currentOrder);
        }
      }

      draggedTabIdRef.current = null;
      insertAtIndexRef.current = null;
      setDragState({
        isDragging: false,
        draggedTabId: null,
        draggedFromIndex: null,
        draggedTabWidth: null,
        insertAtIndex: null,
      });
    },
  };

  // -------------------------------------------------------------------------
  // Context value (stable — only changes when dragState changes)
  // -------------------------------------------------------------------------
  const contextValue: TabDragContextValue = {
    dragState,
    registerTab,
    unregisterTab,
  };

  return (
    <TabDragContext.Provider value={contextValue}>
      <TabDragActionsContext.Provider value={actionsRef}>
        {children}
      </TabDragActionsContext.Provider>
    </TabDragContext.Provider>
  );
}
