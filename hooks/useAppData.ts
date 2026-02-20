import { useEffect, useMemo, useCallback, useRef } from "react";
import { Platform, AppState } from "react-native";
import { useAppContext } from "../store/AppContext";
import { useAuth } from "../store/AuthContext";
import { storage, loadAppData } from "../lib/storage";
import {
  computeDiff,
  pushDiff,
  isDiffEmpty,
  migrateLocalToSupabase,
  createSnapshot,
  stateEquals,
  fetchAll,
} from "../lib/sync";
import type { SyncSnapshot } from "../lib/sync";
import { useRealtimeSync } from "./useRealtimeSync";
import { Task, TaskInput, ListInput, CategoryInput } from "../types/todo";

const DEBOUNCE_MS = 500;

/**
 * Main hook for accessing and manipulating app data.
 * Handles:
 * - Two-phase hydration (AsyncStorage first, then Supabase)
 * - Debounced diff-based persistence to Supabase
 * - Real-time cross-device sync
 * - Convenient action dispatchers
 */
export function useAppData() {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // Sync refs
  const prevSnapshotRef = useRef<SyncSnapshot | null>(null);
  const lastPushTimestampRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHydratedRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Reset sync state on sign-out (prevents stale snapshot from generating
  // DELETE operations that wipe cloud data on re-sign-in)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!userId) {
      prevSnapshotRef.current = null;
      isHydratedRef.current = false;
      lastPushTimestampRef.current = 0;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    }
  }, [userId]);

  // ---------------------------------------------------------------------------
  // Phase 1: Load from AsyncStorage (instant, app usable immediately)
  // Phase 2: Fetch from Supabase (background, reconcile)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      try {
        // Phase 1: Local cache
        const { lists, tasks, activeListId } = await loadAppData();
        const showCompleted = await storage.getShowCompleted();
        const isWeb = Platform.OS === "web";
        const selectedListIds = isWeb
          ? (() => {
              const selected = lists
                .filter((list) => list.showOnOpen)
                .map((list) => list.id);
              return selected.length > 0
                ? selected
                : lists[0]
                  ? [lists[0].id]
                  : [];
            })()
          : activeListId
            ? [activeListId]
            : [];

        if (mounted) {
          dispatch({
            type: "HYDRATE",
            payload: {
              lists,
              tasks,
              activeListId,
              selectedListIds,
              showCompleted,
            },
          });
          isHydratedRef.current = true;
        }

        // Phase 2: Supabase sync (only if authenticated)
        if (!userId || !mounted) return;

        const hasPendingSync = await storage.getHasPendingSync();
        let pendingPushSucceeded = !hasPendingSync; // true if nothing was pending

        // If there are unsyncced local changes, push them first
        if (hasPendingSync && lists.length > 0) {
          try {
            await migrateLocalToSupabase(userId, lists, tasks, showCompleted);
            await storage.setHasPendingSync(false);
            pendingPushSucceeded = true;
          } catch (err) {
            console.warn("Failed to push pending sync:", err);
            // pendingPushSucceeded stays false — don't clear flag later
          }
        }

        // Fetch from Supabase
        try {
          const remote = await fetchAll(userId);

          if (!mounted) return;

          if (remote.lists.length === 0 && lists.length > 0) {
            // First-time migration: Supabase empty, local has data
            await migrateLocalToSupabase(userId, lists, tasks, showCompleted);
            await storage.setHasPendingSync(false);
            // Initialize snapshot from local state (it IS the truth)
            prevSnapshotRef.current = createSnapshot(
              userId,
              lists,
              tasks,
              showCompleted,
            );
          } else if (remote.lists.length > 0) {
            // Supabase has data — use it if different from local
            if (
              !stateEquals(
                { lists, tasks, showCompleted },
                {
                  lists: remote.lists,
                  tasks: remote.tasks,
                  showCompleted: remote.showCompleted,
                },
              )
            ) {
              const remoteSelectedListIds = isWeb
                ? (() => {
                    const selected = remote.lists
                      .filter((list) => list.showOnOpen)
                      .map((list) => list.id);
                    return selected.length > 0
                      ? selected
                      : remote.lists[0]
                        ? [remote.lists[0].id]
                        : [];
                  })()
                : remote.lists[0]
                  ? [remote.lists[0].id]
                  : [];

              dispatch({
                type: "HYDRATE",
                payload: {
                  lists: remote.lists,
                  tasks: remote.tasks,
                  activeListId: remote.lists[0]?.id ?? null,
                  selectedListIds: remoteSelectedListIds,
                  showCompleted: remote.showCompleted,
                },
              });

              // Update local cache
              await storage.setLists(remote.lists);
              await storage.setTasks(remote.tasks);
              await storage.setShowCompleted(remote.showCompleted);
            }
            // Initialize snapshot from Supabase rows
            prevSnapshotRef.current = {
              listRows: remote.listRows,
              categoryRows: remote.categoryRows,
              taskRows: remote.taskRows,
              showCompleted: remote.showCompleted,
            };
          } else {
            // Both empty — initialize empty snapshot
            prevSnapshotRef.current = createSnapshot(userId, [], [], false);
          }

          // Only clear pending flag if the earlier push also succeeded
          if (pendingPushSucceeded) {
            await storage.setHasPendingSync(false);
          }
        } catch (err) {
          // Supabase fetch failed — silently skip, cache is valid
          console.warn("Supabase fetch failed during hydration:", err);
          // Still initialize snapshot from local for future diffs
          if (!prevSnapshotRef.current) {
            prevSnapshotRef.current = createSnapshot(
              userId,
              lists,
              tasks,
              showCompleted,
            );
          }
        }
      } catch (error) {
        if (mounted) {
          dispatch({
            type: "SET_ERROR",
            payload:
              error instanceof Error ? error.message : "Failed to load data",
          });
          dispatch({ type: "SET_LOADING", payload: false });
        }
      }
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, [dispatch, userId]);

  // ---------------------------------------------------------------------------
  // Persistence: Unified debounced sync
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (state.isLoading || !isHydratedRef.current) return;

    // Immediate: write to AsyncStorage (local cache always stays current)
    storage.setLists(state.lists);
    storage.setTasks(state.tasks);
    storage.setShowCompleted(state.showCompleted);

    // Skip Supabase sync if not authenticated
    if (!userId || !prevSnapshotRef.current) return;

    // Mark as having pending changes
    storage.setHasPendingSync(true);

    // Debounced: push diff to Supabase
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (!prevSnapshotRef.current || !userId) return;

      try {
        const diff = computeDiff(
          prevSnapshotRef.current,
          state.lists,
          state.tasks,
          state.showCompleted,
          userId,
        );

        if (!isDiffEmpty(diff)) {
          await pushDiff(userId, diff);
          lastPushTimestampRef.current = Date.now();
        }

        // Update snapshot to current state
        prevSnapshotRef.current = createSnapshot(
          userId,
          state.lists,
          state.tasks,
          state.showCompleted,
        );
        await storage.setHasPendingSync(false);
      } catch (err) {
        // Push failed — hasPendingSync stays true, retry on next launch
        console.warn("Supabase push failed:", err);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [state.lists, state.tasks, state.showCompleted, state.isLoading, userId]);

  // Persist activeListId separately (per-device, not synced)
  useEffect(() => {
    if (state.isLoading) return;
    storage.setActiveListId(state.activeListId);
  }, [state.activeListId, state.isLoading]);

  // ---------------------------------------------------------------------------
  // Foreground retry: push pending changes when app returns from background
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!userId || !prevSnapshotRef.current) return;

    const subscription = AppState.addEventListener("change", async (next) => {
      if (next !== "active") return;

      const hasPending = await storage.getHasPendingSync();
      if (!hasPending || !prevSnapshotRef.current || !userId) return;

      try {
        const diff = computeDiff(
          prevSnapshotRef.current,
          state.lists,
          state.tasks,
          state.showCompleted,
          userId,
        );

        if (!isDiffEmpty(diff)) {
          await pushDiff(userId, diff);
          lastPushTimestampRef.current = Date.now();
        }

        prevSnapshotRef.current = createSnapshot(
          userId,
          state.lists,
          state.tasks,
          state.showCompleted,
        );
        await storage.setHasPendingSync(false);
      } catch {
        // Still offline — will retry next foreground
      }
    });

    return () => subscription.remove();
  }, [userId, state.lists, state.tasks, state.showCompleted]);

  // ---------------------------------------------------------------------------
  // Real-time Subscriptions
  // ---------------------------------------------------------------------------
  const handleRemoteData = useCallback(
    (data: {
      lists: typeof state.lists;
      tasks: typeof state.tasks;
      showCompleted: boolean;
    }) => {
      // Preserve current activeListId if it still exists in remote data,
      // otherwise fall back to first list
      const remoteListIds = new Set(data.lists.map((l) => l.id));
      const preservedActiveListId =
        state.activeListId && remoteListIds.has(state.activeListId)
          ? state.activeListId
          : (data.lists[0]?.id ?? null);

      const isWeb = Platform.OS === "web";
      const selectedListIds = isWeb
        ? (() => {
            // Preserve current selections that still exist
            const preserved = state.selectedListIds.filter((id) =>
              remoteListIds.has(id),
            );
            if (preserved.length > 0) return preserved;
            const selected = data.lists
              .filter((list) => list.showOnOpen)
              .map((list) => list.id);
            return selected.length > 0
              ? selected
              : data.lists[0]
                ? [data.lists[0].id]
                : [];
          })()
        : preservedActiveListId
          ? [preservedActiveListId]
          : [];

      dispatch({
        type: "HYDRATE",
        payload: {
          lists: data.lists,
          tasks: data.tasks,
          activeListId: preservedActiveListId,
          selectedListIds,
          showCompleted: data.showCompleted,
        },
      });

      // Update local cache + snapshot
      storage.setLists(data.lists);
      storage.setTasks(data.tasks);
      storage.setShowCompleted(data.showCompleted);

      if (userId) {
        prevSnapshotRef.current = createSnapshot(
          userId,
          data.lists,
          data.tasks,
          data.showCompleted,
        );
      }
    },
    [dispatch, userId],
  );

  useRealtimeSync({
    userId,
    lastPushTimestampRef,
    currentLists: state.lists,
    currentTasks: state.tasks,
    currentShowCompleted: state.showCompleted,
    onRemoteData: handleRemoteData,
  });

  // ---------------------------------------------------------------------------
  // Derived Data: Active list
  // ---------------------------------------------------------------------------
  const activeList = useMemo(() => {
    return state.lists.find((list) => list.id === state.activeListId) ?? null;
  }, [state.lists, state.activeListId]);

  // ---------------------------------------------------------------------------
  // Derived Data: Tasks grouped by category for active list
  // ---------------------------------------------------------------------------
  const tasksByCategory = useMemo(() => {
    if (!state.activeListId) return new Map<string | null, Task[]>();

    // Get top-level tasks for the active list
    const listTasks = state.tasks.filter(
      (t) =>
        t.listId === state.activeListId &&
        t.parentTaskId === null &&
        (state.showCompleted || !t.completed),
    );

    // Group by categoryId
    const grouped = new Map<string | null, Task[]>();

    listTasks.forEach((task) => {
      const key = task.categoryId;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(task);
    });

    // Sort each group by sortOrder
    grouped.forEach((tasks) => {
      tasks.sort((a, b) => a.sortOrder - b.sortOrder);
    });

    return grouped;
  }, [state.tasks, state.activeListId, state.showCompleted]);

  // ---------------------------------------------------------------------------
  // Derived Data: Subtasks indexed by parent task ID
  // ---------------------------------------------------------------------------
  const subtasksByParent = useMemo(() => {
    const map = new Map<string, Task[]>();

    state.tasks
      .filter(
        (t) => t.parentTaskId !== null && (state.showCompleted || !t.completed),
      )
      .forEach((task) => {
        const parentId = task.parentTaskId!;
        if (!map.has(parentId)) {
          map.set(parentId, []);
        }
        map.get(parentId)!.push(task);
      });

    // Sort each group by sortOrder
    map.forEach((tasks) => {
      tasks.sort((a, b) => a.sortOrder - b.sortOrder);
    });

    return map;
  }, [state.tasks, state.showCompleted]);

  // ---------------------------------------------------------------------------
  // Action Dispatchers: Lists
  // ---------------------------------------------------------------------------
  const setActiveList = useCallback(
    (listId: string | null) => {
      dispatch({ type: "SET_ACTIVE_LIST", payload: listId });
    },
    [dispatch],
  );

  const setSelectedLists = useCallback(
    (listIds: string[]) => {
      dispatch({ type: "SET_SELECTED_LISTS", payload: listIds });
    },
    [dispatch],
  );

  const toggleListSelection = useCallback(
    (listId: string) => {
      dispatch({ type: "TOGGLE_LIST_SELECTION", payload: listId });
    },
    [dispatch],
  );

  const addList = useCallback(
    (input: ListInput) => {
      dispatch({ type: "ADD_LIST", payload: input });
    },
    [dispatch],
  );

  const updateList = useCallback(
    (id: string, updates: { name?: string; showOnOpen?: boolean }) => {
      dispatch({ type: "UPDATE_LIST", payload: { id, updates } });
    },
    [dispatch],
  );

  const deleteList = useCallback(
    (id: string) => {
      dispatch({ type: "DELETE_LIST", payload: id });
    },
    [dispatch],
  );

  // ---------------------------------------------------------------------------
  // Action Dispatchers: Categories
  // ---------------------------------------------------------------------------
  const addCategory = useCallback(
    (listId: string, category: CategoryInput) => {
      dispatch({ type: "ADD_CATEGORY", payload: { listId, category } });
    },
    [dispatch],
  );

  const updateCategory = useCallback(
    (
      listId: string,
      categoryId: string,
      updates: { name?: string; color?: string },
    ) => {
      dispatch({
        type: "UPDATE_CATEGORY",
        payload: { listId, categoryId, updates },
      });
    },
    [dispatch],
  );

  const deleteCategory = useCallback(
    (listId: string, categoryId: string) => {
      dispatch({ type: "DELETE_CATEGORY", payload: { listId, categoryId } });
    },
    [dispatch],
  );

  const reorderCategories = useCallback(
    (listId: string, categoryIds: string[]) => {
      dispatch({
        type: "REORDER_CATEGORIES",
        payload: { listId, categoryIds },
      });
    },
    [dispatch],
  );

  // ---------------------------------------------------------------------------
  // Action Dispatchers: Tasks
  // ---------------------------------------------------------------------------
  const addTask = useCallback(
    (input: TaskInput) => {
      dispatch({ type: "ADD_TASK", payload: input });
    },
    [dispatch],
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      dispatch({ type: "UPDATE_TASK", payload: { id, updates } });
    },
    [dispatch],
  );

  const deleteTask = useCallback(
    (id: string) => {
      dispatch({ type: "DELETE_TASK", payload: id });
    },
    [dispatch],
  );

  const toggleTask = useCallback(
    (id: string) => {
      dispatch({ type: "TOGGLE_TASK", payload: id });
    },
    [dispatch],
  );

  const moveTask = useCallback(
    (taskId: string, categoryId: string | null, newSortOrder: number) => {
      dispatch({
        type: "MOVE_TASK",
        payload: { taskId, categoryId, newSortOrder },
      });
    },
    [dispatch],
  );

  const moveTaskToList = useCallback(
    (
      taskId: string,
      targetListId: string,
      targetCategoryId: string | null,
      newSortOrder: number,
    ) => {
      dispatch({
        type: "MOVE_TASK_TO_LIST",
        payload: { taskId, targetListId, targetCategoryId, newSortOrder },
      });
    },
    [dispatch],
  );

  const nestTask = useCallback(
    (taskId: string, parentTaskId: string | null) => {
      dispatch({ type: "NEST_TASK", payload: { taskId, parentTaskId } });
    },
    [dispatch],
  );

  const reorderTasks = useCallback(
    (
      taskIds: string[],
      categoryId: string | null,
      parentTaskId?: string | null,
    ) => {
      dispatch({
        type: "REORDER_TASKS",
        payload: { taskIds, categoryId, parentTaskId },
      });
    },
    [dispatch],
  );

  const setShowCompleted = useCallback(
    (show: boolean) => {
      dispatch({ type: "SET_SHOW_COMPLETED", payload: show });
    },
    [dispatch],
  );

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  return {
    // State
    lists: state.lists,
    tasks: state.tasks,
    activeListId: state.activeListId,
    selectedListIds: state.selectedListIds,
    showCompleted: state.showCompleted,
    isLoading: state.isLoading,
    error: state.error,

    // Derived
    activeList,
    tasksByCategory,
    subtasksByParent,

    // List actions
    setActiveList,
    setSelectedLists,
    toggleListSelection,
    addList,
    updateList,
    deleteList,

    // Category actions
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,

    // Task actions
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    moveTask,
    moveTaskToList,
    nestTask,
    reorderTasks,
    setShowCompleted,
  };
}
