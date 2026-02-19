import { createContext, useContext, useReducer, ReactNode } from "react";
import {
  TodoList,
  Task,
  TaskInput,
  ListInput,
  CategoryInput,
  Category,
} from "../types/todo";
import { generateId, nowISO } from "../lib/utils";

// =============================================================================
// State Shape
// =============================================================================

interface AppState {
  lists: TodoList[];
  tasks: Task[];
  activeListId: string | null;
  selectedListIds: string[];
  showCompleted: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AppState = {
  lists: [],
  tasks: [],
  activeListId: null,
  selectedListIds: [],
  showCompleted: false,
  isLoading: true,
  error: null,
};

// =============================================================================
// Action Types
// =============================================================================

type AppAction =
  // Hydration & Loading
  | {
      type: "HYDRATE";
      payload: {
        lists: TodoList[];
        tasks: Task[];
        activeListId: string | null;
        selectedListIds: string[];
        showCompleted: boolean;
      };
    }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_SHOW_COMPLETED"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }

  // List actions
  | { type: "SET_ACTIVE_LIST"; payload: string | null }
  | { type: "SET_SELECTED_LISTS"; payload: string[] }
  | { type: "TOGGLE_LIST_SELECTION"; payload: string }
  | { type: "ADD_LIST"; payload: ListInput }
  | {
      type: "UPDATE_LIST";
      payload: {
        id: string;
        updates: Partial<Pick<TodoList, "name" | "showOnOpen">>;
      };
    }
  | { type: "DELETE_LIST"; payload: string }

  // Category actions
  | {
      type: "ADD_CATEGORY";
      payload: { listId: string; category: CategoryInput };
    }
  | {
      type: "UPDATE_CATEGORY";
      payload: {
        listId: string;
        categoryId: string;
        updates: Partial<Category>;
      };
    }
  | { type: "DELETE_CATEGORY"; payload: { listId: string; categoryId: string } }
  | {
      type: "REORDER_CATEGORIES";
      payload: { listId: string; categoryIds: string[] };
    }

  // Task actions
  | { type: "ADD_TASK"; payload: TaskInput }
  | { type: "UPDATE_TASK"; payload: { id: string; updates: Partial<Task> } }
  | { type: "DELETE_TASK"; payload: string }
  | { type: "TOGGLE_TASK"; payload: string }
  | {
      type: "MOVE_TASK";
      payload: {
        taskId: string;
        categoryId: string | null;
        newSortOrder: number;
      };
    }
  | {
      type: "MOVE_TASK_TO_LIST";
      payload: {
        taskId: string;
        targetListId: string;
        targetCategoryId: string | null;
        newSortOrder: number;
      };
    }
  | {
      type: "NEST_TASK";
      payload: { taskId: string; parentTaskId: string | null };
    }
  | {
      type: "REORDER_TASKS";
      payload: {
        taskIds: string[];
        categoryId: string | null;
        parentTaskId?: string | null;
      };
    };

// =============================================================================
// Reducer
// =============================================================================

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // -------------------------------------------------------------------------
    // Hydration & Loading
    // -------------------------------------------------------------------------
    case "HYDRATE": {
      const { lists, tasks, activeListId, selectedListIds, showCompleted } =
        action.payload;
      return {
        ...state,
        lists,
        tasks,
        activeListId,
        selectedListIds,
        showCompleted,
        isLoading: false,
      };
    }

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "SET_SHOW_COMPLETED":
      return { ...state, showCompleted: action.payload };

    // -------------------------------------------------------------------------
    // List Actions
    // -------------------------------------------------------------------------
    case "SET_ACTIVE_LIST":
      return {
        ...state,
        activeListId: action.payload,
        selectedListIds: action.payload ? [action.payload] : [],
      };

    case "SET_SELECTED_LISTS":
      return { ...state, selectedListIds: action.payload };

    case "TOGGLE_LIST_SELECTION": {
      const listId = action.payload;
      const isSelected = state.selectedListIds.includes(listId);
      const selectedListIds = isSelected
        ? state.selectedListIds.filter((id) => id !== listId)
        : [...state.selectedListIds, listId];
      return { ...state, selectedListIds };
    }

    case "ADD_LIST": {
      const { name, categories, showOnOpen = false } = action.payload;
      // Default categories if none provided
      const defaultCategories: CategoryInput[] = [
        { name: "Now" },
        { name: "Next" },
        { name: "Later" },
      ];
      const categoriesToUse = categories ?? defaultCategories;
      const newList: TodoList = {
        id: generateId(),
        name,
        sortOrder: state.lists.length,
        categories: categoriesToUse.map((cat, index) => ({
          id: generateId(),
          name: cat.name,
          sortOrder: index,
          color: cat.color,
        })),
        showOnOpen,
        createdAt: nowISO(),
      };
      const newLists = [...state.lists, newList];
      const selectedListIds =
        state.selectedListIds.length === 0
          ? [newList.id]
          : state.selectedListIds;
      return {
        ...state,
        lists: newLists,
        // If this is the first list, make it active
        activeListId: state.activeListId ?? newList.id,
        selectedListIds,
      };
    }

    case "UPDATE_LIST": {
      const { id, updates } = action.payload;
      return {
        ...state,
        lists: state.lists.map((list) =>
          list.id === id ? { ...list, ...updates } : list,
        ),
      };
    }

    case "DELETE_LIST": {
      const listId = action.payload;
      const newLists = state.lists.filter((list) => list.id !== listId);
      const newTasks = state.tasks.filter((task) => task.listId !== listId);
      const filteredSelected = state.selectedListIds.filter(
        (id) => id !== listId,
      );
      const nextSelected =
        filteredSelected.length > 0
          ? filteredSelected
          : newLists[0]
            ? [newLists[0].id]
            : [];
      return {
        ...state,
        lists: newLists,
        tasks: newTasks,
        // If we deleted the active list, switch to the first remaining list
        activeListId:
          state.activeListId === listId
            ? newLists.length > 0
              ? newLists[0].id
              : null
            : state.activeListId,
        selectedListIds: nextSelected,
      };
    }

    // -------------------------------------------------------------------------
    // Category Actions
    // -------------------------------------------------------------------------
    case "ADD_CATEGORY": {
      const { listId, category } = action.payload;
      return {
        ...state,
        lists: state.lists.map((list) => {
          if (list.id !== listId) return list;
          const newCategory: Category = {
            id: generateId(),
            name: category.name,
            sortOrder: list.categories.length,
            color: category.color,
          };
          return {
            ...list,
            categories: [...list.categories, newCategory],
          };
        }),
      };
    }

    case "UPDATE_CATEGORY": {
      const { listId, categoryId, updates } = action.payload;
      return {
        ...state,
        lists: state.lists.map((list) => {
          if (list.id !== listId) return list;
          return {
            ...list,
            categories: list.categories.map((cat) =>
              cat.id === categoryId ? { ...cat, ...updates } : cat,
            ),
          };
        }),
      };
    }

    case "DELETE_CATEGORY": {
      const { listId, categoryId } = action.payload;
      return {
        ...state,
        lists: state.lists.map((list) => {
          if (list.id !== listId) return list;
          return {
            ...list,
            categories: list.categories.filter((cat) => cat.id !== categoryId),
          };
        }),
        // Move tasks from deleted category to uncategorized
        tasks: state.tasks.map((task) =>
          task.categoryId === categoryId ? { ...task, categoryId: null } : task,
        ),
      };
    }

    case "REORDER_CATEGORIES": {
      const { listId, categoryIds } = action.payload;
      return {
        ...state,
        lists: state.lists.map((list) => {
          if (list.id !== listId) return list;
          const reordered = categoryIds
            .map((id, index) => {
              const cat = list.categories.find((c) => c.id === id);
              return cat ? { ...cat, sortOrder: index } : null;
            })
            .filter((c): c is Category => c !== null);
          return { ...list, categories: reordered };
        }),
      };
    }

    // -------------------------------------------------------------------------
    // Task Actions
    // -------------------------------------------------------------------------
    case "ADD_TASK": {
      const {
        title,
        listId,
        categoryId = null,
        parentTaskId = null,
      } = action.payload;
      // Calculate sortOrder: put at end of its category/parent
      const siblingTasks = state.tasks.filter(
        (t) =>
          t.listId === listId &&
          t.categoryId === categoryId &&
          t.parentTaskId === parentTaskId,
      );
      const newTask: Task = {
        id: generateId(),
        listId,
        categoryId,
        parentTaskId,
        title,
        completed: false,
        sortOrder: siblingTasks.length,
        createdAt: nowISO(),
      };
      return { ...state, tasks: [...state.tasks, newTask] };
    }

    case "UPDATE_TASK": {
      const { id, updates } = action.payload;
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === id ? { ...task, ...updates } : task,
        ),
      };
    }

    case "DELETE_TASK": {
      const taskId = action.payload;
      // Also delete all subtasks of this task
      return {
        ...state,
        tasks: state.tasks.filter(
          (task) => task.id !== taskId && task.parentTaskId !== taskId,
        ),
      };
    }

    case "TOGGLE_TASK": {
      const taskId = action.payload;
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                completed: !task.completed,
                completedAt: !task.completed ? nowISO() : undefined,
              }
            : task,
        ),
      };
    }

    case "MOVE_TASK": {
      const { taskId, categoryId, newSortOrder } = action.payload;
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? { ...task, categoryId, sortOrder: newSortOrder }
            : task,
        ),
      };
    }

    case "MOVE_TASK_TO_LIST": {
      const { taskId, targetListId, targetCategoryId, newSortOrder } =
        action.payload;
      return {
        ...state,
        tasks: state.tasks.map((task) => {
          if (task.id === taskId) {
            return {
              ...task,
              listId: targetListId,
              categoryId: targetCategoryId,
              sortOrder: newSortOrder,
              parentTaskId: null, // Cross-list nesting not supported
            };
          }
          // Move subtasks with their parent
          if (task.parentTaskId === taskId) {
            return {
              ...task,
              listId: targetListId,
              categoryId: targetCategoryId,
            };
          }
          return task;
        }),
      };
    }

    case "NEST_TASK": {
      const { taskId, parentTaskId } = action.payload;
      // When nesting, calculate new sortOrder within parent's subtasks
      const newSiblings = state.tasks.filter(
        (t) => t.parentTaskId === parentTaskId,
      );
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                parentTaskId,
                sortOrder: newSiblings.length,
                // When becoming a subtask, inherit parent's categoryId
                categoryId: parentTaskId
                  ? (state.tasks.find((t) => t.id === parentTaskId)
                      ?.categoryId ?? null)
                  : task.categoryId,
              }
            : task,
        ),
      };
    }

    case "REORDER_TASKS": {
      const { taskIds, categoryId, parentTaskId } = action.payload;
      const orderMap = new Map(taskIds.map((id, index) => [id, index]));
      return {
        ...state,
        tasks: state.tasks.map((task) => {
          const newOrder = orderMap.get(task.id);
          if (newOrder === undefined) return task;

          // For subtask reordering (parentTaskId is provided and not null)
          if (parentTaskId !== undefined && parentTaskId !== null) {
            if (task.parentTaskId === parentTaskId) {
              return { ...task, sortOrder: newOrder };
            }
          }
          // For top-level task reordering (parentTaskId is null or undefined)
          else if (
            task.categoryId === categoryId &&
            task.parentTaskId === null
          ) {
            return { ...task, sortOrder: newOrder };
          }
          return task;
        }),
      };
    }

    default:
      return state;
  }
}

// =============================================================================
// Context & Provider
// =============================================================================

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
