/**
 * Database row types matching Supabase table schemas.
 * These represent the flat relational format stored in Postgres.
 * Transformation to/from in-memory format happens in lib/supabase-storage.ts.
 */

export interface ListRow {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  show_on_open: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: string;
  list_id: string;
  user_id: string;
  name: string;
  sort_order: number;
  color: string | null;
  updated_at: string;
}

export interface TaskRow {
  id: string;
  list_id: string;
  category_id: string | null;
  parent_task_id: string | null;
  user_id: string;
  title: string;
  completed: boolean;
  sort_order: number;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

export interface UserPreferencesRow {
  user_id: string;
  show_completed: boolean;
}
