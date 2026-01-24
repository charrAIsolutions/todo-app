import { useEffect, useMemo, useCallback } from "react";
import { useAppContext } from "../store/AppContext";
import { storage, loadAppData } from "../lib/storage";
import { Task, TaskInput, ListInput, CategoryInput } from "../types/todo";

/**
 * Main hook for accessing and manipulating app data.
 * Handles:
 * - Initial data loading and migration
 * - Auto-persistence on state changes
 * - Derived data (tasks grouped by category, subtasks by parent)
 * - Convenient action dispatchers
 */
export function useAppData() {
  const { state, dispatch } = useAppContext();

  // ---------------------------------------------------------------------------
  // Hydration: Load data on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      try {
        const { lists, tasks, activeListId } = await loadAppData();
        if (mounted) {
          dispatch({
            type: "HYDRATE",
            payload: { lists, tasks, activeListId },
          });
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
  }, [dispatch]);

  // ---------------------------------------------------------------------------
  // Persistence: Save on state changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Don't persist while still loading initial data
    if (state.isLoading) return;

    storage.setLists(state.lists);
    storage.setTasks(state.tasks);
  }, [state.lists, state.tasks, state.isLoading]);

  // Persist activeListId separately (changes more frequently)
  useEffect(() => {
    if (state.isLoading) return;
    storage.setActiveListId(state.activeListId);
  }, [state.activeListId, state.isLoading]);

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
      (t) => t.listId === state.activeListId && t.parentTaskId === null,
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
  }, [state.tasks, state.activeListId]);

  // ---------------------------------------------------------------------------
  // Derived Data: Subtasks indexed by parent task ID
  // ---------------------------------------------------------------------------
  const subtasksByParent = useMemo(() => {
    const map = new Map<string, Task[]>();

    state.tasks
      .filter((t) => t.parentTaskId !== null)
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
  }, [state.tasks]);

  // ---------------------------------------------------------------------------
  // Action Dispatchers: Lists
  // ---------------------------------------------------------------------------
  const setActiveList = useCallback(
    (listId: string | null) => {
      dispatch({ type: "SET_ACTIVE_LIST", payload: listId });
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
    (id: string, updates: { name?: string }) => {
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

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  return {
    // State
    lists: state.lists,
    tasks: state.tasks,
    activeListId: state.activeListId,
    isLoading: state.isLoading,
    error: state.error,

    // Derived
    activeList,
    tasksByCategory,
    subtasksByParent,

    // List actions
    setActiveList,
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
    nestTask,
    reorderTasks,
  };
}
