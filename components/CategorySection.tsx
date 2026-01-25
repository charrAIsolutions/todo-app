import { useCallback, useRef } from "react";
import { View, StyleSheet, LayoutChangeEvent } from "react-native";
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

/**
 * Inner component that uses drag context (only rendered when dragEnabled)
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

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      containerRef.current?.measureInWindow((x, y, w, h) => {
        registerCategoryLayout({ categoryId, listId, y, height: h });
      });
    },
    [categoryId, listId, registerCategoryLayout],
  );

  return (
    <View ref={containerRef} style={styles.container} onLayout={handleLayout}>
      {/* Category Header */}
      {category ? (
        <CategoryHeader category={category} taskCount={tasks.length} />
      ) : (
        <UncategorizedHeader taskCount={tasks.length} />
      )}

      {/* Tasks */}
      {tasks.length > 0 ? (
        <View style={styles.taskList}>
          {tasks.map((task, index) => {
            const subtasks = subtasksByParent.get(task.id) ?? [];
            const showDropBefore =
              activeDropZone?.categoryId === categoryId &&
              activeDropZone?.beforeTaskId === task.id &&
              activeDropZone?.type !== "nest";

            return (
              <View key={task.id}>
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
                  <DraggableTask
                    key={subtask.id}
                    task={subtask}
                    index={subtaskIndex}
                    isSubtask={true}
                    indentLevel={2}
                    onToggle={() => onToggleTask(subtask.id)}
                    onPress={() => onPressTask?.(subtask.id)}
                  />
                ))}
              </View>
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
        <View style={styles.emptyCategory} />
      )}
    </View>
  );
}

/**
 * Static category section (no drag support)
 */
function StaticCategorySection({
  category,
  listId: _listId, // Not used in static mode, but accepted for type consistency
  tasks,
  subtasksByParent,
  onToggleTask,
  onPressTask,
}: Omit<CategorySectionProps, "dragEnabled">) {
  return (
    <View style={styles.container}>
      {/* Category Header */}
      {category ? (
        <CategoryHeader category={category} taskCount={tasks.length} />
      ) : (
        <UncategorizedHeader taskCount={tasks.length} />
      )}

      {/* Tasks */}
      {tasks.length > 0 ? (
        <View style={styles.taskList}>
          {tasks.map((task) => {
            const subtasks = subtasksByParent.get(task.id) ?? [];

            return (
              <View key={task.id}>
                <TaskItem
                  task={task}
                  onToggle={() => onToggleTask(task.id)}
                  onPress={onPressTask ? () => onPressTask(task.id) : undefined}
                  indentLevel={1}
                />

                {subtasks.map((subtask) => (
                  <TaskItem
                    key={subtask.id}
                    task={subtask}
                    onToggle={() => onToggleTask(subtask.id)}
                    onPress={
                      onPressTask ? () => onPressTask(subtask.id) : undefined
                    }
                    indentLevel={2}
                  />
                ))}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyCategory} />
      )}
    </View>
  );
}

/**
 * A category section with header and its tasks.
 * Renders category header (or uncategorized header) followed by indented tasks.
 * Also renders subtasks under each parent task.
 * When dragEnabled, uses DraggableTask with drop indicators.
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

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  taskList: {
    // Tasks are indented via TaskItem's indentLevel prop
  },
  emptyCategory: {
    height: 32,
    marginLeft: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
    borderRadius: 8,
    backgroundColor: "#fafafa",
  },
});
