import { Pressable, View, Text, StyleSheet } from "react-native";
import { Task } from "@/types/todo";

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
  onPress?: () => void;
  indentLevel?: 0 | 1 | 2; // 0 = normal, 1 = task under category, 2 = subtask
}

/**
 * Individual task row with checkbox and title.
 * Supports indentation for category grouping and subtasks.
 */
export function TaskItem({
  task,
  onToggle,
  onPress,
  indentLevel = 0,
}: TaskItemProps) {
  const indent = indentLevel === 1 ? 12 : indentLevel === 2 ? 32 : 0;

  return (
    <Pressable
      style={[styles.container, { marginLeft: indent }]}
      onPress={onPress ?? onToggle}
    >
      <Pressable
        style={[styles.checkbox, task.completed && styles.checkboxChecked]}
        onPress={onToggle}
      >
        {task.completed && <Text style={styles.checkmark}>✓</Text>}
      </Pressable>
      <Text
        style={[styles.title, task.completed && styles.titleCompleted]}
        numberOfLines={2}
      >
        {task.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ccc",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  title: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  titleCompleted: {
    color: "#999",
    textDecorationLine: "line-through",
  },
});
