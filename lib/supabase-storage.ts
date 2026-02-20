import { supabase } from "./supabase";
import type { TodoList, Task, Category } from "../types/todo";
import type {
  ListRow,
  CategoryRow,
  TaskRow,
  UserPreferencesRow,
} from "../types/supabase";

// =============================================================================
// Transformation: In-Memory -> Row Format
// =============================================================================

export function toListRow(list: TodoList, userId: string): ListRow {
  return {
    id: list.id,
    user_id: userId,
    name: list.name,
    sort_order: list.sortOrder,
    show_on_open: list.showOnOpen ?? false,
    created_at: list.createdAt,
    updated_at: new Date().toISOString(),
  };
}

export function toCategoryRow(
  cat: Category,
  listId: string,
  userId: string,
): CategoryRow {
  return {
    id: cat.id,
    list_id: listId,
    user_id: userId,
    name: cat.name,
    sort_order: cat.sortOrder,
    color: cat.color ?? null,
    updated_at: new Date().toISOString(),
  };
}

export function toTaskRow(task: Task, userId: string): TaskRow {
  return {
    id: task.id,
    list_id: task.listId,
    category_id: task.categoryId,
    parent_task_id: task.parentTaskId,
    user_id: userId,
    title: task.title,
    completed: task.completed,
    sort_order: task.sortOrder,
    created_at: task.createdAt,
    completed_at: task.completedAt ?? null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Extract all list and category rows from in-memory state.
 */
export function transformToRows(
  userId: string,
  lists: TodoList[],
): { listRows: ListRow[]; categoryRows: CategoryRow[] } {
  const listRows = lists.map((list) => toListRow(list, userId));
  const categoryRows = lists.flatMap((list) =>
    list.categories.map((cat) => toCategoryRow(cat, list.id, userId)),
  );
  return { listRows, categoryRows };
}

// =============================================================================
// Transformation: Row Format -> In-Memory
// =============================================================================

function rowToList(row: ListRow, categories: Category[]): TodoList {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    showOnOpen: row.show_on_open,
    categories,
    createdAt: row.created_at,
  };
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    color: row.color ?? undefined,
  };
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    listId: row.list_id,
    categoryId: row.category_id,
    parentTaskId: row.parent_task_id,
    title: row.title,
    completed: row.completed,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
  };
}

/**
 * Convert flat DB rows back into the in-memory format (categories embedded in lists).
 */
export function transformToAppState(
  listRows: ListRow[],
  categoryRows: CategoryRow[],
  taskRows: TaskRow[],
  prefs: UserPreferencesRow | null,
): { lists: TodoList[]; tasks: Task[]; showCompleted: boolean } {
  // Group categories by list_id
  const catsByList = new Map<string, Category[]>();
  for (const row of categoryRows) {
    const cats = catsByList.get(row.list_id) ?? [];
    cats.push(rowToCategory(row));
    catsByList.set(row.list_id, cats);
  }
  // Sort categories within each list
  catsByList.forEach((cats) => cats.sort((a, b) => a.sortOrder - b.sortOrder));

  const lists = listRows
    .map((row) => rowToList(row, catsByList.get(row.id) ?? []))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const tasks = taskRows.map(rowToTask);

  return {
    lists,
    tasks,
    showCompleted: prefs?.show_completed ?? false,
  };
}

// =============================================================================
// Fetch All Data
// =============================================================================

export async function fetchAll(userId: string): Promise<{
  lists: TodoList[];
  tasks: Task[];
  showCompleted: boolean;
  listRows: ListRow[];
  categoryRows: CategoryRow[];
  taskRows: TaskRow[];
}> {
  const [listsRes, categoriesRes, tasksRes, prefsRes] = await Promise.all([
    supabase().from("lists").select("*").eq("user_id", userId),
    supabase().from("categories").select("*").eq("user_id", userId),
    supabase().from("tasks").select("*").eq("user_id", userId),
    supabase()
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single(),
  ]);

  if (listsRes.error) throw listsRes.error;
  if (categoriesRes.error) throw categoriesRes.error;
  if (tasksRes.error) throw tasksRes.error;
  // PGRST116 = "no rows" — prefs may not exist yet for new users
  if (prefsRes.error && prefsRes.error.code !== "PGRST116") {
    throw prefsRes.error;
  }

  const listRows = listsRes.data as ListRow[];
  const categoryRows = categoriesRes.data as CategoryRow[];
  const taskRows = tasksRes.data as TaskRow[];
  const prefs = (prefsRes.data as UserPreferencesRow) ?? null;

  const appState = transformToAppState(listRows, categoryRows, taskRows, prefs);

  return {
    ...appState,
    listRows,
    categoryRows,
    taskRows,
  };
}

// =============================================================================
// Upsert Operations
// =============================================================================

export async function upsertLists(rows: ListRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase().from("lists").upsert(rows);
  if (error) throw error;
}

export async function upsertCategories(rows: CategoryRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase().from("categories").upsert(rows);
  if (error) throw error;
}

export async function upsertTasks(rows: TaskRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase().from("tasks").upsert(rows);
  if (error) throw error;
}

export async function upsertPreferences(
  userId: string,
  showCompleted: boolean,
): Promise<void> {
  const { error } = await supabase()
    .from("user_preferences")
    .upsert({ user_id: userId, show_completed: showCompleted });
  if (error) throw error;
}

// =============================================================================
// Delete Operations
// =============================================================================

export async function deleteLists(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase().from("lists").delete().in("id", ids);
  if (error) throw error;
}

export async function deleteCategories(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase().from("categories").delete().in("id", ids);
  if (error) throw error;
}

export async function deleteTasks(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase().from("tasks").delete().in("id", ids);
  if (error) throw error;
}
