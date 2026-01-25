import AsyncStorage from "@react-native-async-storage/async-storage";
import { TodoList, Task, LegacyTodo } from "../types/todo";
import { generateId, nowISO } from "./utils";

// =============================================================================
// Storage Keys
// =============================================================================

const STORAGE_KEYS = {
  // New multi-list structure
  LISTS: "app:lists",
  TASKS: "app:tasks",
  ACTIVE_LIST: "app:activeListId",
  // Legacy key (for migration)
  LEGACY_TODOS: "todos",
} as const;

// =============================================================================
// Storage API
// =============================================================================

export const storage = {
  // ---------------------------------------------------------------------------
  // Lists
  // ---------------------------------------------------------------------------
  async getLists(): Promise<TodoList[] | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.LISTS);
    return data ? JSON.parse(data) : null;
  },

  async setLists(lists: TodoList[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(lists));
  },

  // ---------------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------------
  async getTasks(): Promise<Task[] | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
    return data ? JSON.parse(data) : null;
  },

  async setTasks(tasks: Task[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  },

  // ---------------------------------------------------------------------------
  // Active List
  // ---------------------------------------------------------------------------
  async getActiveListId(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_LIST);
  },

  async setActiveListId(id: string | null): Promise<void> {
    if (id === null) {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_LIST);
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_LIST, id);
    }
  },

  // ---------------------------------------------------------------------------
  // Bulk Operations
  // ---------------------------------------------------------------------------
  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.LISTS,
      STORAGE_KEYS.TASKS,
      STORAGE_KEYS.ACTIVE_LIST,
    ]);
  },

  // ---------------------------------------------------------------------------
  // Legacy (for migration)
  // ---------------------------------------------------------------------------
  async getLegacyTodos(): Promise<LegacyTodo[] | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.LEGACY_TODOS);
    return data ? JSON.parse(data) : null;
  },

  async clearLegacyTodos(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.LEGACY_TODOS);
  },
};

// =============================================================================
// Migration
// =============================================================================

/**
 * Migrate from old single-list todo structure to new multi-list structure.
 * Creates a default "General" list and converts old todos to new tasks.
 * This is safe to call multiple times - it only migrates if:
 * 1. Legacy todos exist
 * 2. New lists don't exist yet
 */
export async function migrateFromLegacy(): Promise<{
  lists: TodoList[];
  tasks: Task[];
} | null> {
  const legacyTodos = await storage.getLegacyTodos();
  const existingLists = await storage.getLists();

  // Skip migration if:
  // - No legacy todos to migrate
  // - Already have new data structure
  if (!legacyTodos || legacyTodos.length === 0) {
    return null;
  }
  if (existingLists && existingLists.length > 0) {
    // Clean up legacy data since we've already migrated
    await storage.clearLegacyTodos();
    return null;
  }

  // Create default "General" list with default categories
  const defaultList: TodoList = {
    id: generateId(),
    name: "General",
    sortOrder: 0,
    categories: [
      { id: generateId(), name: "Now", sortOrder: 0 },
      { id: generateId(), name: "Next", sortOrder: 1 },
      { id: generateId(), name: "Later", sortOrder: 2 },
    ],
    showOnOpen: true,
    createdAt: nowISO(),
  };

  // Convert legacy todos to new tasks (all uncategorized initially)
  const migratedTasks: Task[] = legacyTodos.map((todo, index) => ({
    id: todo.id,
    listId: defaultList.id,
    categoryId: null, // Uncategorized
    parentTaskId: null, // Top-level
    title: todo.title,
    completed: todo.completed,
    sortOrder: index,
    createdAt: todo.createdAt,
    completedAt: todo.completedAt,
  }));

  // Save new structure
  await storage.setLists([defaultList]);
  await storage.setTasks(migratedTasks);

  // Clean up legacy data
  await storage.clearLegacyTodos();

  return { lists: [defaultList], tasks: migratedTasks };
}

// =============================================================================
// Initialization Helper
// =============================================================================

/**
 * Load app data from storage, handling migration if needed.
 * Returns the current state of lists, tasks, and activeListId.
 */
export async function loadAppData(): Promise<{
  lists: TodoList[];
  tasks: Task[];
  activeListId: string | null;
}> {
  // First, check if migration is needed
  const migrationResult = await migrateFromLegacy();
  if (migrationResult) {
    return {
      ...migrationResult,
      activeListId: migrationResult.lists[0]?.id ?? null,
    };
  }

  // Load existing data
  const lists = (await storage.getLists()) ?? [];
  const tasks = (await storage.getTasks()) ?? [];
  const savedActiveListId = await storage.getActiveListId();

  // If no data at all, create a default list
  if (lists.length === 0) {
    const defaultList: TodoList = {
      id: generateId(),
      name: "General",
      sortOrder: 0,
      categories: [
        { id: generateId(), name: "Now", sortOrder: 0 },
        { id: generateId(), name: "Next", sortOrder: 1 },
        { id: generateId(), name: "Later", sortOrder: 2 },
      ],
      showOnOpen: true,
      createdAt: nowISO(),
    };
    await storage.setLists([defaultList]);
    return { lists: [defaultList], tasks: [], activeListId: defaultList.id };
  }

  // Validate that savedActiveListId still exists, otherwise use first list
  const normalizedLists = lists.map((list) => ({
    ...list,
    showOnOpen: list.showOnOpen ?? false,
  }));

  const activeListId = normalizedLists.some((l) => l.id === savedActiveListId)
    ? savedActiveListId
    : (normalizedLists[0]?.id ?? null);

  return { lists: normalizedLists, tasks, activeListId };
}
