import { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useAppData } from "@/hooks/useAppData";
import FontAwesome from "@expo/vector-icons/FontAwesome";

/**
 * Task detail screen for editing task and managing subtasks.
 * Accessed via /task/[id] route.
 */
export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    tasks,
    lists,
    subtasksByParent,
    updateTask,
    deleteTask,
    toggleTask,
    addTask,
    setActiveList,
    nestTask,
    reorderTasks,
  } = useAppData();

  // Find the task and its list (not activeList - the task's actual list)
  const task = tasks.find((t) => t.id === id);
  const taskList = task ? lists.find((l) => l.id === task.listId) : null;
  const subtasks = id ? (subtasksByParent.get(id) ?? []) : [];

  // Local state for editing
  const [title, setTitle] = useState(task?.title ?? "");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    task?.categoryId ?? null,
  );
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  // Update local state when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setSelectedCategoryId(task.categoryId);
    }
  }, [task]);

  // Set active list to task's list when viewing this screen
  // This ensures going back lands on the correct list
  useEffect(() => {
    if (task?.listId) {
      setActiveList(task.listId);
    }
  }, [task?.listId, setActiveList]);

  // ---------------------------------------------------------------------------
  // Position: Sibling tasks for reordering
  // ---------------------------------------------------------------------------
  const siblingTasks = useMemo(() => {
    if (!task) return [];
    if (task.parentTaskId) {
      // Subtask: siblings are other subtasks of same parent
      return tasks
        .filter((t) => t.parentTaskId === task.parentTaskId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    } else {
      // Top-level: siblings are tasks with same listId, categoryId, no parent
      return tasks
        .filter(
          (t) =>
            t.listId === task.listId &&
            t.categoryId === task.categoryId &&
            t.parentTaskId === null,
        )
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
  }, [tasks, task]);

  const currentPosition = useMemo(() => {
    if (!task) return 0;
    return siblingTasks.findIndex((t) => t.id === task.id) + 1;
  }, [siblingTasks, task]);

  const canMoveUp = currentPosition > 1;
  const canMoveDown = currentPosition < siblingTasks.length;

  // ---------------------------------------------------------------------------
  // Nest/Unnest: Potential parent tasks
  // ---------------------------------------------------------------------------
  const potentialParents = useMemo(() => {
    if (!task || task.parentTaskId !== null) return [];
    // Can only nest under other top-level tasks in same list
    return tasks
      .filter(
        (t) =>
          t.listId === task.listId &&
          t.parentTaskId === null &&
          t.id !== task.id,
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [tasks, task]);

  const parentTask = useMemo(() => {
    if (!task?.parentTaskId) return null;
    return tasks.find((t) => t.id === task.parentTaskId) ?? null;
  }, [tasks, task]);

  const isSubtask = task?.parentTaskId !== null;

  if (!task) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Task not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Get categories from the task's list, not the active list
  const categories = taskList?.categories ?? [];

  const handleSaveTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) {
      updateTask(task.id, { title: trimmed });
    }
  };

  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    updateTask(task.id, { categoryId });
  };

  const handleAddSubtask = () => {
    const trimmed = newSubtaskTitle.trim();
    if (trimmed && task.listId) {
      addTask({
        title: trimmed,
        listId: task.listId,
        categoryId: task.categoryId,
        parentTaskId: task.id,
      });
      setNewSubtaskTitle("");
    }
  };

  const handleDeleteTask = () => {
    // Use confirm() on web since Alert.alert doesn't work properly
    if (Platform.OS === "web") {
      if (window.confirm("Delete this task and all its subtasks?")) {
        deleteTask(task.id);
        router.back();
      }
    } else {
      Alert.alert(
        "Delete Task",
        "Are you sure you want to delete this task and all its subtasks?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              deleteTask(task.id);
              router.back();
            },
          },
        ],
      );
    }
  };

  const handleDeleteSubtask = (subtaskId: string, subtaskTitle: string) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Delete subtask "${subtaskTitle}"?`)) {
        deleteTask(subtaskId);
      }
    } else {
      Alert.alert("Delete Subtask", `Delete "${subtaskTitle}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteTask(subtaskId),
        },
      ]);
    }
  };

  const handleMoveUp = () => {
    if (!canMoveUp) return;
    const currentIndex = siblingTasks.findIndex((t) => t.id === task.id);
    const newOrder = [...siblingTasks];
    // Swap with previous
    [newOrder[currentIndex - 1], newOrder[currentIndex]] = [
      newOrder[currentIndex],
      newOrder[currentIndex - 1],
    ];
    const newIds = newOrder.map((t) => t.id);
    reorderTasks(newIds, task.categoryId, task.parentTaskId);
  };

  const handleMoveDown = () => {
    if (!canMoveDown) return;
    const currentIndex = siblingTasks.findIndex((t) => t.id === task.id);
    const newOrder = [...siblingTasks];
    // Swap with next
    [newOrder[currentIndex], newOrder[currentIndex + 1]] = [
      newOrder[currentIndex + 1],
      newOrder[currentIndex],
    ];
    const newIds = newOrder.map((t) => t.id);
    reorderTasks(newIds, task.categoryId, task.parentTaskId);
  };

  const handleNestUnder = (parentId: string) => {
    nestTask(task.id, parentId);
  };

  const handleUnnest = () => {
    nestTask(task.id, null);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Task Details",
          presentation: "modal",
          headerRight: () => (
            <Pressable
              onPress={handleDeleteTask}
              style={styles.deleteButton}
              accessibilityLabel="Delete task"
              accessibilityRole="button"
            >
              <FontAwesome name="trash" size={20} color="#FF3B30" />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Task Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            onBlur={handleSaveTitle}
            placeholder="Task title..."
            returnKeyType="done"
            onSubmitEditing={handleSaveTitle}
          />
        </View>

        {/* Category Picker */}
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryList}>
            {/* Uncategorized option */}
            <Pressable
              style={[
                styles.categoryOption,
                selectedCategoryId === null && styles.categoryOptionSelected,
              ]}
              onPress={() => handleCategoryChange(null)}
            >
              <Text
                style={[
                  styles.categoryOptionText,
                  selectedCategoryId === null &&
                    styles.categoryOptionTextSelected,
                ]}
              >
                Uncategorized
              </Text>
            </Pressable>

            {/* Category options */}
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                style={[
                  styles.categoryOption,
                  selectedCategoryId === cat.id &&
                    styles.categoryOptionSelected,
                ]}
                onPress={() => handleCategoryChange(cat.id)}
              >
                <Text
                  style={[
                    styles.categoryOptionText,
                    selectedCategoryId === cat.id &&
                      styles.categoryOptionTextSelected,
                  ]}
                >
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Position - only show if more than one sibling */}
        {siblingTasks.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.label}>Position</Text>
            <View style={styles.positionRow}>
              <Text style={styles.positionText}>
                {currentPosition} of {siblingTasks.length}
              </Text>
              <View style={styles.positionButtons}>
                <Pressable
                  style={[
                    styles.positionButton,
                    !canMoveUp && styles.positionButtonDisabled,
                  ]}
                  onPress={handleMoveUp}
                  disabled={!canMoveUp}
                  accessibilityLabel="Move task up"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canMoveUp }}
                >
                  <FontAwesome
                    name="chevron-up"
                    size={16}
                    color={canMoveUp ? "#007AFF" : "#ccc"}
                  />
                </Pressable>
                <Pressable
                  style={[
                    styles.positionButton,
                    !canMoveDown && styles.positionButtonDisabled,
                  ]}
                  onPress={handleMoveDown}
                  disabled={!canMoveDown}
                  accessibilityLabel="Move task down"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canMoveDown }}
                >
                  <FontAwesome
                    name="chevron-down"
                    size={16}
                    color={canMoveDown ? "#007AFF" : "#ccc"}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Nest/Unnest Section */}
        {isSubtask ? (
          // Show parent info and unnest button for subtasks
          <View style={styles.section}>
            <Text style={styles.label}>Parent Task</Text>
            <View style={styles.parentInfoRow}>
              <Text style={styles.parentName} numberOfLines={1}>
                {parentTask?.title ?? "Unknown"}
              </Text>
            </View>
            <Pressable style={styles.unnestButton} onPress={handleUnnest}>
              <FontAwesome
                name="level-up"
                size={14}
                color="#007AFF"
                style={styles.unnestIcon}
              />
              <Text style={styles.unnestButtonText}>
                Convert to Top-Level Task
              </Text>
            </Pressable>
          </View>
        ) : potentialParents.length > 0 ? (
          // Show nest options for top-level tasks
          <View style={styles.section}>
            <Text style={styles.label}>Make Subtask Of</Text>
            {potentialParents.slice(0, 5).map((parent) => (
              <Pressable
                key={parent.id}
                style={styles.nestOption}
                onPress={() => handleNestUnder(parent.id)}
              >
                <FontAwesome
                  name="level-down"
                  size={14}
                  color="#666"
                  style={styles.nestIcon}
                />
                <Text style={styles.nestOptionText} numberOfLines={1}>
                  {parent.title}
                </Text>
              </Pressable>
            ))}
            {potentialParents.length > 5 && (
              <Text style={styles.moreHint}>
                +{potentialParents.length - 5} more tasks
              </Text>
            )}
          </View>
        ) : null}

        {/* Completion Status */}
        <View style={styles.section}>
          <Pressable
            style={styles.completionRow}
            onPress={() => toggleTask(task.id)}
          >
            <View
              style={[
                styles.checkbox,
                task.completed && styles.checkboxChecked,
              ]}
            >
              {task.completed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.completionText}>
              {task.completed ? "Completed" : "Mark as complete"}
            </Text>
          </Pressable>
        </View>

        {/* Subtasks */}
        <View style={styles.section}>
          <Text style={styles.label}>Subtasks ({subtasks.length})</Text>

          {/* Subtask List */}
          {subtasks.map((subtask) => (
            <Pressable
              key={subtask.id}
              style={styles.subtaskRow}
              onPress={() => toggleTask(subtask.id)}
            >
              <View
                style={[
                  styles.subtaskCheckbox,
                  subtask.completed && styles.checkboxChecked,
                ]}
              >
                {subtask.completed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text
                style={[
                  styles.subtaskTitle,
                  subtask.completed && styles.subtaskTitleCompleted,
                ]}
              >
                {subtask.title}
              </Text>
              <Pressable
                style={styles.subtaskDelete}
                onPress={() => handleDeleteSubtask(subtask.id, subtask.title)}
                accessibilityLabel={`Delete subtask ${subtask.title}`}
                accessibilityRole="button"
              >
                <FontAwesome name="times" size={16} color="#999" />
              </Pressable>
            </Pressable>
          ))}

          {/* Add Subtask Input */}
          <View style={styles.addSubtaskRow}>
            <TextInput
              style={styles.addSubtaskInput}
              value={newSubtaskTitle}
              onChangeText={setNewSubtaskTitle}
              placeholder="Add subtask..."
              returnKeyType="done"
              onSubmitEditing={handleAddSubtask}
            />
            <Pressable
              style={[
                styles.addSubtaskButton,
                !newSubtaskTitle.trim() && styles.addSubtaskButtonDisabled,
              ]}
              onPress={handleAddSubtask}
              disabled={!newSubtaskTitle.trim()}
              accessibilityLabel="Add subtask"
              accessibilityRole="button"
              accessibilityState={{ disabled: !newSubtaskTitle.trim() }}
            >
              <FontAwesome
                name="plus"
                size={16}
                color={newSubtaskTitle.trim() ? "#007AFF" : "#ccc"}
              />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  deleteButton: {
    padding: 8,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: "500",
    color: "#333",
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  categoryList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#f0f0f0",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  categoryOptionSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  categoryOptionTextSelected: {
    color: "#fff",
  },
  completionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
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
  completionText: {
    fontSize: 16,
    color: "#333",
  },
  subtaskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  subtaskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ccc",
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  subtaskTitleCompleted: {
    color: "#999",
    textDecorationLine: "line-through",
  },
  subtaskDelete: {
    padding: 8,
  },
  addSubtaskRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  addSubtaskInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    fontSize: 15,
    marginRight: 8,
  },
  addSubtaskButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  addSubtaskButtonDisabled: {
    opacity: 0.5,
  },
  // Position section styles
  positionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
  },
  positionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  positionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  positionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  positionButtonDisabled: {
    backgroundColor: "#f8f8f8",
    borderColor: "#eee",
  },
  // Nest/Unnest section styles
  parentInfoRow: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  parentName: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  unnestButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#EBF5FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  unnestIcon: {
    marginRight: 8,
    transform: [{ rotate: "90deg" }],
  },
  unnestButtonText: {
    fontSize: 15,
    color: "#007AFF",
    fontWeight: "500",
  },
  nestOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    marginBottom: 6,
  },
  nestIcon: {
    marginRight: 10,
    transform: [{ rotate: "-90deg" }],
  },
  nestOptionText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  moreHint: {
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
    paddingLeft: 4,
    marginTop: 4,
  },
});
