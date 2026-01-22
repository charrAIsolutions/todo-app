// =============================================================================
// Data Model for Multi-List Todo App
// =============================================================================
// Structure: Lists contain Categories, Tasks belong to Lists and optionally Categories
// Subtasks are Tasks with a parentTaskId pointing to their parent Task

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

/**
 * A task list (e.g., "Work", "School", "Personal")
 * Lists are displayed as tabs at the top of the screen
 */
export interface TodoList {
  id: string;
  name: string;
  sortOrder: number; // For reordering list tabs
  categories: Category[]; // Ordered categories within this list
  createdAt: string; // ISO date string
}

/**
 * A category within a list (e.g., "Now", "Next", "Later" or "High", "Medium", "Low")
 * Categories are displayed as section headers in the task list
 */
export interface Category {
  id: string;
  name: string;
  sortOrder: number; // Position within the list
  color?: string; // Optional background/accent color
}

/**
 * A task with optional subtasks
 * Tasks belong to a list and optionally a category
 * Subtasks are tasks with parentTaskId set to their parent's id
 */
export interface Task {
  id: string;
  listId: string; // Which list this belongs to
  categoryId: string | null; // null = "Uncategorized" section at bottom
  parentTaskId: string | null; // null = top-level task, ID = subtask of that task
  title: string;
  completed: boolean;
  sortOrder: number; // Position within category (or within parent for subtasks)
  createdAt: string; // ISO date string
  completedAt?: string; // ISO date string, set when completed
}

// -----------------------------------------------------------------------------
// Input Types (for creating new items, omit auto-generated fields)
// -----------------------------------------------------------------------------

export type TaskInput = Pick<Task, "title" | "listId"> &
  Partial<Pick<Task, "categoryId" | "parentTaskId">>;

export type ListInput = Pick<TodoList, "name"> & {
  categories?: Omit<Category, "id" | "sortOrder">[];
};

export type CategoryInput = Pick<Category, "name"> &
  Partial<Pick<Category, "color">>;

// -----------------------------------------------------------------------------
// Legacy Type (for migration from old data structure)
// -----------------------------------------------------------------------------

/**
 * @deprecated Old Todo type, kept for migration purposes only
 */
export interface LegacyTodo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}
