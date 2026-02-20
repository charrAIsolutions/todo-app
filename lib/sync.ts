import type { TodoList, Task } from "../types/todo";
import type { ListRow, CategoryRow, TaskRow } from "../types/supabase";
import {
  toListRow,
  toCategoryRow,
  toTaskRow,
  transformToRows,
  fetchAll,
  upsertLists,
  upsertCategories,
  upsertTasks,
  upsertPreferences,
  deleteLists,
  deleteCategories,
  deleteTasks,
} from "./supabase-storage";

// =============================================================================
// Snapshot Type (stored in row format for efficient diffing)
// =============================================================================

export interface SyncSnapshot {
  listRows: ListRow[];
  categoryRows: CategoryRow[];
  taskRows: TaskRow[];
  showCompleted: boolean;
}

// =============================================================================
// Diff Types
// =============================================================================

interface TableDiff<T> {
  upserted: T[];
  deletedIds: string[];
}

export interface SyncDiff {
  lists: TableDiff<ListRow>;
  categories: TableDiff<CategoryRow>;
  tasks: TableDiff<TaskRow>;
  showCompleted: boolean | null; // null = unchanged
}

// =============================================================================
// computeDiff — operates on flattened row format
// =============================================================================

export function computeDiff(
  prev: SyncSnapshot,
  currentLists: TodoList[],
  currentTasks: Task[],
  currentShowCompleted: boolean,
  userId: string,
): SyncDiff {
  // 1. Convert current in-memory state to flat rows
  const { listRows: currListRows, categoryRows: currCategoryRows } =
    transformToRows(userId, currentLists);
  const currTaskRows = currentTasks.map((t) => toTaskRow(t, userId));

  // 2. Build ID maps for prev and curr
  const prevListMap = new Map(prev.listRows.map((r) => [r.id, r]));
  const currListMap = new Map(currListRows.map((r) => [r.id, r]));
  const prevCatMap = new Map(prev.categoryRows.map((r) => [r.id, r]));
  const currCatMap = new Map(currCategoryRows.map((r) => [r.id, r]));
  const prevTaskMap = new Map(prev.taskRows.map((r) => [r.id, r]));
  const currTaskMap = new Map(currTaskRows.map((r) => [r.id, r]));

  // 3. Diff each table: find upserted (new or changed) and deleted
  const listUpserted = currListRows.filter((row) => {
    const prev = prevListMap.get(row.id);
    return !prev || !shallowRowEqual(prev, row, ["updated_at"]);
  });
  const listDeletedIds = [...prevListMap.keys()].filter(
    (id) => !currListMap.has(id),
  );

  const catUpserted = currCategoryRows.filter((row) => {
    const prev = prevCatMap.get(row.id);
    return !prev || !shallowRowEqual(prev, row, ["updated_at"]);
  });
  let catDeletedIds = [...prevCatMap.keys()].filter(
    (id) => !currCatMap.has(id),
  );

  const taskUpserted = currTaskRows.filter((row) => {
    const prev = prevTaskMap.get(row.id);
    return !prev || !shallowRowEqual(prev, row, ["updated_at"]);
  });
  let taskDeletedIds = [...prevTaskMap.keys()].filter(
    (id) => !currTaskMap.has(id),
  );

  // 4. Cascade-delete awareness: if a list is deleted, don't also emit
  //    its categories/tasks (Postgres FK cascades handle those)
  const deletedListIdSet = new Set(listDeletedIds);
  if (deletedListIdSet.size > 0) {
    catDeletedIds = catDeletedIds.filter((id) => {
      const row = prevCatMap.get(id);
      return row ? !deletedListIdSet.has(row.list_id) : true;
    });
    taskDeletedIds = taskDeletedIds.filter((id) => {
      const row = prevTaskMap.get(id);
      return row ? !deletedListIdSet.has(row.list_id) : true;
    });
  }

  // Similarly, don't emit task deletions for tasks whose parent was deleted
  // (Postgres ON DELETE CASCADE on parent_task_id handles that)
  const deletedTaskIdSet = new Set(taskDeletedIds);
  taskDeletedIds = taskDeletedIds.filter((id) => {
    const row = prevTaskMap.get(id);
    if (!row) return true;
    // Keep if parent wasn't also deleted
    return !row.parent_task_id || !deletedTaskIdSet.has(row.parent_task_id);
  });

  // 5. showCompleted diff
  const showCompletedDiff =
    prev.showCompleted !== currentShowCompleted ? currentShowCompleted : null;

  return {
    lists: { upserted: listUpserted, deletedIds: listDeletedIds },
    categories: { upserted: catUpserted, deletedIds: catDeletedIds },
    tasks: { upserted: taskUpserted, deletedIds: taskDeletedIds },
    showCompleted: showCompletedDiff,
  };
}

/**
 * Shallow compare two row objects, ignoring specified keys (like updated_at
 * which changes every time we create the row).
 */
function shallowRowEqual<T extends object>(
  a: T,
  b: T,
  ignoreKeys: string[],
): boolean {
  const ignoreSet = new Set(ignoreKeys);
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA).filter((k) => !ignoreSet.has(k));
  const keysB = Object.keys(objB).filter((k) => !ignoreSet.has(k));
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => objA[key] === objB[key]);
}

// =============================================================================
// pushDiff — send changes to Supabase
// =============================================================================

export async function pushDiff(userId: string, diff: SyncDiff): Promise<void> {
  // Phase 1: Deletes (children first to satisfy FK constraints)
  // Tasks and categories can be deleted in parallel (no FK between them for deletes)
  const deletePromises: Promise<void>[] = [];
  if (diff.tasks.deletedIds.length > 0) {
    deletePromises.push(deleteTasks(diff.tasks.deletedIds));
  }
  if (diff.categories.deletedIds.length > 0) {
    deletePromises.push(deleteCategories(diff.categories.deletedIds));
  }
  if (deletePromises.length > 0) {
    await Promise.all(deletePromises);
  }
  // List deletes after children are gone (cascade handles remaining, but be safe)
  if (diff.lists.deletedIds.length > 0) {
    await deleteLists(diff.lists.deletedIds);
  }

  // Phase 2: Upserts (parents first to satisfy FK constraints)
  if (diff.lists.upserted.length > 0) {
    await upsertLists(diff.lists.upserted);
  }
  if (diff.categories.upserted.length > 0) {
    await upsertCategories(diff.categories.upserted);
  }
  // Tasks + preferences can run in parallel (no FK dependency between them)
  const upsertPromises: Promise<void>[] = [];
  if (diff.tasks.upserted.length > 0) {
    upsertPromises.push(upsertTasks(diff.tasks.upserted));
  }
  if (diff.showCompleted !== null) {
    upsertPromises.push(upsertPreferences(userId, diff.showCompleted));
  }
  if (upsertPromises.length > 0) {
    await Promise.all(upsertPromises);
  }
}

// =============================================================================
// isDiffEmpty — check if there's anything to push
// =============================================================================

export function isDiffEmpty(diff: SyncDiff): boolean {
  return (
    diff.lists.upserted.length === 0 &&
    diff.lists.deletedIds.length === 0 &&
    diff.categories.upserted.length === 0 &&
    diff.categories.deletedIds.length === 0 &&
    diff.tasks.upserted.length === 0 &&
    diff.tasks.deletedIds.length === 0 &&
    diff.showCompleted === null
  );
}

// =============================================================================
// migrateLocalToSupabase — first-time upload of local data
// =============================================================================

export async function migrateLocalToSupabase(
  userId: string,
  lists: TodoList[],
  tasks: Task[],
  showCompleted: boolean,
): Promise<void> {
  const { listRows, categoryRows } = transformToRows(userId, lists);
  const taskRows = tasks.map((t) => toTaskRow(t, userId));

  // Upload all data in parallel (parents first for FK, but upsert handles order)
  await upsertLists(listRows);
  await upsertCategories(categoryRows);
  await upsertTasks(taskRows);
  await upsertPreferences(userId, showCompleted);
}

// =============================================================================
// createSnapshot — create a snapshot from current state for future diffs
// =============================================================================

export function createSnapshot(
  userId: string,
  lists: TodoList[],
  tasks: Task[],
  showCompleted: boolean,
): SyncSnapshot {
  const { listRows, categoryRows } = transformToRows(userId, lists);
  const taskRows = tasks.map((t) => toTaskRow(t, userId));
  return { listRows, categoryRows, taskRows, showCompleted };
}

// =============================================================================
// Deep equality check for HYDRATE gating
// =============================================================================

export function stateEquals(
  a: { lists: TodoList[]; tasks: Task[]; showCompleted: boolean },
  b: { lists: TodoList[]; tasks: Task[]; showCompleted: boolean },
): boolean {
  if (a.showCompleted !== b.showCompleted) return false;
  // Lists are sorted by sortOrder from transformToAppState, so JSON compare is safe.
  // Tasks are NOT guaranteed to be in the same order (DB may return different order),
  // so sort by id before comparing.
  if (JSON.stringify(a.lists) !== JSON.stringify(b.lists)) return false;
  const sortById = (arr: Task[]) =>
    [...arr].sort((x, y) => x.id.localeCompare(y.id));
  return (
    JSON.stringify(sortById(a.tasks)) === JSON.stringify(sortById(b.tasks))
  );
}

// Re-export fetchAll for use in hooks
export { fetchAll } from "./supabase-storage";
