import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/supabase-storage";
import { stateEquals } from "@/lib/sync";
import type { TodoList, Task } from "@/types/todo";

const ECHO_WINDOW_MS = 2000;
const REFETCH_DEBOUNCE_MS = 1000;

interface UseRealtimeSyncOptions {
  userId: string | null;
  lastPushTimestampRef: React.MutableRefObject<number>;
  currentLists: TodoList[];
  currentTasks: Task[];
  currentShowCompleted: boolean;
  onRemoteData: (data: {
    lists: TodoList[];
    tasks: Task[];
    showCompleted: boolean;
  }) => void;
}

/**
 * Subscribe to Supabase Realtime changes on lists, categories, and tasks.
 * On remote change: debounced full refetch -> deep equality check -> callback only if data differs.
 */
export function useRealtimeSync({
  userId,
  lastPushTimestampRef,
  currentLists,
  currentTasks,
  currentShowCompleted,
  onRemoteData,
}: UseRealtimeSyncOptions) {
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep current state in refs so the refetch callback always has fresh data
  const currentStateRef = useRef({
    lists: currentLists,
    tasks: currentTasks,
    showCompleted: currentShowCompleted,
  });
  currentStateRef.current = {
    lists: currentLists,
    tasks: currentTasks,
    showCompleted: currentShowCompleted,
  };

  const onRemoteDataRef = useRef(onRemoteData);
  onRemoteDataRef.current = onRemoteData;

  const scheduleRefetch = useCallback(() => {
    if (!userId) return;

    // Echo prevention: ignore events within ECHO_WINDOW_MS of our last push
    if (Date.now() - lastPushTimestampRef.current < ECHO_WINDOW_MS) {
      return;
    }

    // Debounce: batch rapid events into one refetch
    if (refetchTimerRef.current) {
      clearTimeout(refetchTimerRef.current);
    }

    refetchTimerRef.current = setTimeout(async () => {
      try {
        const remote = await fetchAll(userId);
        const current = currentStateRef.current;

        // Deep equality check: only dispatch if data actually changed
        if (
          !stateEquals(
            {
              lists: current.lists,
              tasks: current.tasks,
              showCompleted: current.showCompleted,
            },
            {
              lists: remote.lists,
              tasks: remote.tasks,
              showCompleted: remote.showCompleted,
            },
          )
        ) {
          onRemoteDataRef.current({
            lists: remote.lists,
            tasks: remote.tasks,
            showCompleted: remote.showCompleted,
          });
        }
      } catch (err) {
        console.warn("Realtime refetch failed:", err);
      }
    }, REFETCH_DEBOUNCE_MS);
  }, [userId, lastPushTimestampRef]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase()
      .channel("db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lists",
          filter: `user_id=eq.${userId}`,
        },
        scheduleRefetch,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
          filter: `user_id=eq.${userId}`,
        },
        scheduleRefetch,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `user_id=eq.${userId}`,
        },
        scheduleRefetch,
      )
      .subscribe();

    return () => {
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current);
      }
      supabase().removeChannel(channel);
    };
  }, [userId, scheduleRefetch]);
}
