import { View, StyleSheet } from "react-native";
import { Category, Task } from "@/types/todo";
import { CategoryHeader, UncategorizedHeader } from "./CategoryHeader";
import { TaskItem } from "./TaskItem";

interface CategorySectionProps {
  category: Category | null; // null = uncategorized
  tasks: Task[];
  subtasksByParent: Map<string, Task[]>;
  onToggleTask: (taskId: string) => void;
  onPressTask?: (taskId: string) => void;
}

/**
 * A category section with header and its tasks.
 * Renders category header (or uncategorized header) followed by indented tasks.
 * Also renders subtasks under each parent task.
 */
export function CategorySection({
  category,
  tasks,
  subtasksByParent,
  onToggleTask,
  onPressTask,
}: CategorySectionProps) {
  // For uncategorized, only show if there are tasks
  if (!category && tasks.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Category Header */}
      {category ? (
        <CategoryHeader category={category} taskCount={tasks.length} />
      ) : (
        <UncategorizedHeader taskCount={tasks.length} />
      )}

      {/* Tasks (or empty space for drop target) */}
      {tasks.length > 0 ? (
        <View style={styles.taskList}>
          {tasks.map((task) => (
            <View key={task.id}>
              {/* Parent Task */}
              <TaskItem
                task={task}
                onToggle={() => onToggleTask(task.id)}
                onPress={onPressTask ? () => onPressTask(task.id) : undefined}
                indentLevel={1}
              />

              {/* Subtasks */}
              {subtasksByParent.get(task.id)?.map((subtask) => (
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
          ))}
        </View>
      ) : (
        <View style={styles.emptyCategory} />
      )}
    </View>
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
