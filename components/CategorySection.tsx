import { useCallback, useRef, useEffect } from "react";
import { View, LayoutChangeEvent } from "react-native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";
import { Text } from "react-native";
import { Category, Task } from "@/types/todo";
import { CategoryHeader, UncategorizedHeader } from "./CategoryHeader";
import { TaskItem } from "./TaskItem";
import { DraggableTask, InlineDropIndicator, useDragContext } from "./drag";

interface CategorySectionProps {
  category: Category | null; // null = uncategorized
  listId: string; // Which list this category belongs to
  tasks: Task[];
  subtasksByParent: Map<string, Task[]>;
  onToggleTask: (taskId: string) => void;
  onPressTask?: (taskId: string) => void;
  dragEnabled?: boolean;
}

// Shared entry animation config
const entryAnimation = FadeInDown.springify().damping(15);
const exitAnimation = FadeOutUp.duration(200);

/**
 * Inner component that uses drag context (only rendered when dragEnabled)
 * Note: LinearTransition is NOT used here to avoid conflicts with drag-drop
 * position measurements. The drag system uses measureInWindow which can
 * return stale positions if a layout animation is in progress.
 */
function DraggableCategorySection({
  category,
  listId,
  tasks,
  subtasksByParent,
  onToggleTask,
  onPressTask,
}: Omit<CategorySectionProps, "dragEnabled">) {
  const { dragState, registerCategoryLayout } = useDragContext();
  const activeDropZone = dragState.activeDropZone;
  const categoryId = category?.id ?? null;

  const containerRef = useRef<View>(null);

  // Track if initial render is complete to skip entry animations on mount
  const hasRendered = useRef(false);
  useEffect(() => {
    hasRendered.current = true;
  }, []);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      containerRef.current?.measureInWindow((x, y, w, h) => {
        registerCategoryLayout({ categoryId, listId, y, height: h });
      });
    },
    [categoryId, listId, registerCategoryLayout],
  );

  return (
    <View ref={containerRef} className="mb-2" onLayout={handleLayout}>
      {/* Category Header */}
      {category ? (
        <CategoryHeader category={category} taskCount={tasks.length} />
      ) : (
        <UncategorizedHeader taskCount={tasks.length} />
      )}

      {/* Tasks */}
      {tasks.length > 0 ? (
        <View>
          {tasks.map((task, index) => {
            const subtasks = subtasksByParent.get(task.id) ?? [];
            const showDropBefore =
              activeDropZone?.categoryId === categoryId &&
              activeDropZone?.beforeTaskId === task.id &&
              activeDropZone?.type !== "nest";

            return (
              <Animated.View
                key={task.id}
                entering={hasRendered.current ? entryAnimation : undefined}
                exiting={exitAnimation}
              >
                {/* Drop indicator before task */}
                <InlineDropIndicator
                  active={showDropBefore}
                  type={activeDropZone?.type ?? "reorder"}
                />

                {/* Parent Task */}
                <DraggableTask
                  task={task}
                  index={index}
                  isSubtask={false}
                  indentLevel={1}
                  onToggle={() => onToggleTask(task.id)}
                  onPress={() => onPressTask?.(task.id)}
                />

                {/* Subtasks */}
                {subtasks.map((subtask, subtaskIndex) => (
                  <Animated.View
                    key={subtask.id}
                    entering={hasRendered.current ? entryAnimation : undefined}
                    exiting={exitAnimation}
                  >
                    <DraggableTask
                      task={subtask}
                      index={subtaskIndex}
                      isSubtask={true}
                      indentLevel={2}
                      onToggle={() => onToggleTask(subtask.id)}
                      onPress={() => onPressTask?.(subtask.id)}
                    />
                  </Animated.View>
                ))}
              </Animated.View>
            );
          })}

          {/* Drop indicator at end of category */}
          <InlineDropIndicator
            active={
              activeDropZone?.categoryId === categoryId &&
              activeDropZone?.beforeTaskId === null &&
              activeDropZone?.type !== "nest"
            }
            type={activeDropZone?.type ?? "reorder"}
          />
        </View>
      ) : (
        <View className="h-10 ml-4 border border-dashed border-border rounded-lg bg-surface items-center justify-center">
          <Text className="text-xs text-text-muted">No tasks yet</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Static category section (no drag support)
 * Uses LinearTransition for smooth reordering since there's no drag system
 * measuring positions here.
 */
function StaticCategorySection({
  category,
  listId: _listId, // Not used in static mode, but accepted for type consistency
  tasks,
  subtasksByParent,
  onToggleTask,
  onPressTask,
}: Omit<CategorySectionProps, "dragEnabled">) {
  // Track if initial render is complete to skip entry animations on mount
  const hasRendered = useRef(false);
  useEffect(() => {
    hasRendered.current = true;
  }, []);

  return (
    <View className="mb-2">
      {/* Category Header */}
      {category ? (
        <CategoryHeader category={category} taskCount={tasks.length} />
      ) : (
        <UncategorizedHeader taskCount={tasks.length} />
      )}

      {/* Tasks */}
      {tasks.length > 0 ? (
        <View>
          {tasks.map((task) => {
            const subtasks = subtasksByParent.get(task.id) ?? [];

            return (
              <Animated.View
                key={task.id}
                entering={hasRendered.current ? entryAnimation : undefined}
                exiting={exitAnimation}
                layout={LinearTransition.springify()}
              >
                <TaskItem
                  task={task}
                  onToggle={() => onToggleTask(task.id)}
                  onPress={onPressTask ? () => onPressTask(task.id) : undefined}
                  indentLevel={1}
                />

                {subtasks.map((subtask) => (
                  <Animated.View
                    key={subtask.id}
                    entering={hasRendered.current ? entryAnimation : undefined}
                    exiting={exitAnimation}
                    layout={LinearTransition.springify()}
                  >
                    <TaskItem
                      task={subtask}
                      onToggle={() => onToggleTask(subtask.id)}
                      onPress={
                        onPressTask ? () => onPressTask(subtask.id) : undefined
                      }
                      indentLevel={2}
                    />
                  </Animated.View>
                ))}
              </Animated.View>
            );
          })}
        </View>
      ) : (
        <View className="h-10 ml-4 border border-dashed border-border rounded-lg bg-surface items-center justify-center">
          <Text className="text-xs text-text-muted">No tasks yet</Text>
        </View>
      )}
    </View>
  );
}

/**
 * A category section with header and its tasks.
 * Renders category header (or uncategorized header) followed by indented tasks.
 * Also renders subtasks under each parent task.
 * When dragEnabled, uses DraggableTask with drop indicators.
 * Features entry/exit animations for smooth list updates (only for items
 * added/removed after initial render - not on mount or list switch).
 */
export function CategorySection({
  category,
  listId,
  tasks,
  subtasksByParent,
  onToggleTask,
  onPressTask,
  dragEnabled = false,
}: CategorySectionProps) {
  // For uncategorized, only show if there are tasks
  if (!category && tasks.length === 0) {
    return null;
  }

  // Use the appropriate component based on drag state
  if (dragEnabled) {
    return (
      <DraggableCategorySection
        category={category}
        listId={listId}
        tasks={tasks}
        subtasksByParent={subtasksByParent}
        onToggleTask={onToggleTask}
        onPressTask={onPressTask}
      />
    );
  }

  return (
    <StaticCategorySection
      category={category}
      listId={listId}
      tasks={tasks}
      subtasksByParent={subtasksByParent}
      onToggleTask={onToggleTask}
      onPressTask={onPressTask}
    />
  );
}
