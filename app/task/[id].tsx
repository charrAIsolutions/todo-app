import { useState, useEffect, useMemo } from "react";
import {
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
      <View className="flex-1 items-center justify-center p-5 bg-background">
        <Text className="text-base text-text-secondary mb-4">
          Task not found
        </Text>
        <Pressable
          className="py-2.5 px-5 bg-primary rounded-lg"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Go Back</Text>
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
              className="p-2"
              accessibilityLabel="Delete task"
              accessibilityRole="button"
            >
              <FontAwesome
                name="trash"
                size={20}
                color="rgb(var(--color-danger))"
              />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 16 }}
      >
        {/* Task Title */}
        <View className="mb-6">
          <Text className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide mb-2">
            Title
          </Text>
          <TextInput
            className="text-lg font-medium text-text bg-surface-secondary p-3 rounded-lg border border-border"
            value={title}
            onChangeText={setTitle}
            onBlur={handleSaveTitle}
            placeholder="Task title..."
            placeholderTextColor="rgb(var(--color-text-muted))"
            returnKeyType="done"
            onSubmitEditing={handleSaveTitle}
          />
        </View>

        {/* Category Picker */}
        <View className="mb-6">
          <Text className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide mb-2">
            Category
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {/* Uncategorized option */}
            <Pressable
              className={`py-2 px-3.5 rounded-2xl border ${
                selectedCategoryId === null
                  ? "bg-primary border-primary"
                  : "bg-surface-secondary border-border"
              }`}
              onPress={() => handleCategoryChange(null)}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedCategoryId === null
                    ? "text-white"
                    : "text-text-secondary"
                }`}
              >
                Uncategorized
              </Text>
            </Pressable>

            {/* Category options */}
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                className={`py-2 px-3.5 rounded-2xl border ${
                  selectedCategoryId === cat.id
                    ? "bg-primary border-primary"
                    : "bg-surface-secondary border-border"
                }`}
                onPress={() => handleCategoryChange(cat.id)}
              >
                <Text
                  className={`text-sm font-medium ${
                    selectedCategoryId === cat.id
                      ? "text-white"
                      : "text-text-secondary"
                  }`}
                >
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Position - only show if more than one sibling */}
        {siblingTasks.length > 1 && (
          <View className="mb-6">
            <Text className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide mb-2">
              Position
            </Text>
            <View className="flex-row items-center justify-between bg-surface-secondary p-3 rounded-lg">
              <Text className="text-base text-text font-medium">
                {currentPosition} of {siblingTasks.length}
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  className={`w-9 h-9 rounded-full items-center justify-center border ${
                    canMoveUp
                      ? "bg-surface border-border"
                      : "bg-surface-secondary border-border/50"
                  }`}
                  onPress={handleMoveUp}
                  disabled={!canMoveUp}
                  accessibilityLabel="Move task up"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canMoveUp }}
                >
                  <FontAwesome
                    name="chevron-up"
                    size={16}
                    color={
                      canMoveUp
                        ? "rgb(var(--color-primary))"
                        : "rgb(var(--color-text-muted))"
                    }
                  />
                </Pressable>
                <Pressable
                  className={`w-9 h-9 rounded-full items-center justify-center border ${
                    canMoveDown
                      ? "bg-surface border-border"
                      : "bg-surface-secondary border-border/50"
                  }`}
                  onPress={handleMoveDown}
                  disabled={!canMoveDown}
                  accessibilityLabel="Move task down"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canMoveDown }}
                >
                  <FontAwesome
                    name="chevron-down"
                    size={16}
                    color={
                      canMoveDown
                        ? "rgb(var(--color-primary))"
                        : "rgb(var(--color-text-muted))"
                    }
                  />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Nest/Unnest Section */}
        {isSubtask ? (
          // Show parent info and unnest button for subtasks
          <View className="mb-6">
            <Text className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide mb-2">
              Parent Task
            </Text>
            <View className="bg-surface-secondary p-3 rounded-lg mb-2">
              <Text
                className="text-[15px] text-text font-medium"
                numberOfLines={1}
              >
                {parentTask?.title ?? "Unknown"}
              </Text>
            </View>
            <Pressable
              className="flex-row items-center p-3 bg-primary/10 rounded-lg border border-primary"
              onPress={handleUnnest}
            >
              <FontAwesome
                name="level-up"
                size={14}
                color="rgb(var(--color-primary))"
                style={{ marginRight: 8, transform: [{ rotate: "90deg" }] }}
              />
              <Text className="text-[15px] text-primary font-medium">
                Convert to Top-Level Task
              </Text>
            </Pressable>
          </View>
        ) : potentialParents.length > 0 ? (
          // Show nest options for top-level tasks
          <View className="mb-6">
            <Text className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide mb-2">
              Make Subtask Of
            </Text>
            {potentialParents.slice(0, 5).map((parent) => (
              <Pressable
                key={parent.id}
                className="flex-row items-center p-3 bg-surface-secondary rounded-lg mb-1.5"
                onPress={() => handleNestUnder(parent.id)}
              >
                <FontAwesome
                  name="level-down"
                  size={14}
                  color="rgb(var(--color-text-secondary))"
                  style={{ marginRight: 10, transform: [{ rotate: "-90deg" }] }}
                />
                <Text
                  className="flex-1 text-[15px] text-text"
                  numberOfLines={1}
                >
                  {parent.title}
                </Text>
              </Pressable>
            ))}
            {potentialParents.length > 5 && (
              <Text className="text-[13px] text-text-muted italic pl-1 mt-1">
                +{potentialParents.length - 5} more tasks
              </Text>
            )}
          </View>
        ) : null}

        {/* Completion Status */}
        <View className="mb-6">
          <Pressable
            className="flex-row items-center p-3 bg-surface-secondary rounded-lg"
            onPress={() => toggleTask(task.id)}
          >
            <View
              className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
                task.completed
                  ? "bg-primary border-primary"
                  : "border-text-muted"
              }`}
            >
              {task.completed && (
                <Text className="text-white text-sm font-bold">✓</Text>
              )}
            </View>
            <Text className="text-base text-text">
              {task.completed ? "Completed" : "Mark as complete"}
            </Text>
          </Pressable>
        </View>

        {/* Subtasks */}
        <View className="mb-6">
          <Text className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide mb-2">
            Subtasks ({subtasks.length})
          </Text>

          {/* Subtask List */}
          {subtasks.map((subtask) => (
            <Pressable
              key={subtask.id}
              className="flex-row items-center py-2.5 border-b border-border"
              onPress={() => toggleTask(subtask.id)}
            >
              <View
                className={`w-5 h-5 rounded-full border-2 mr-2.5 items-center justify-center ${
                  subtask.completed
                    ? "bg-primary border-primary"
                    : "border-text-muted"
                }`}
              >
                {subtask.completed && (
                  <Text className="text-white text-xs font-bold">✓</Text>
                )}
              </View>
              <Text
                className={`flex-1 text-[15px] ${
                  subtask.completed
                    ? "text-text-muted line-through"
                    : "text-text"
                }`}
              >
                {subtask.title}
              </Text>
              <Pressable
                className="p-2"
                onPress={() => handleDeleteSubtask(subtask.id, subtask.title)}
                accessibilityLabel={`Delete subtask ${subtask.title}`}
                accessibilityRole="button"
              >
                <FontAwesome
                  name="times"
                  size={16}
                  color="rgb(var(--color-text-muted))"
                />
              </Pressable>
            </Pressable>
          ))}

          {/* Add Subtask Input */}
          <View className="flex-row items-center mt-2">
            <TextInput
              className="flex-1 h-10 px-3 bg-surface-secondary rounded-lg text-[15px] mr-2 text-text"
              value={newSubtaskTitle}
              onChangeText={setNewSubtaskTitle}
              placeholder="Add subtask..."
              placeholderTextColor="rgb(var(--color-text-muted))"
              returnKeyType="done"
              onSubmitEditing={handleAddSubtask}
            />
            <Pressable
              className={`w-10 h-10 rounded-full items-center justify-center ${
                newSubtaskTitle.trim()
                  ? "bg-surface-secondary"
                  : "bg-surface-secondary opacity-50"
              }`}
              onPress={handleAddSubtask}
              disabled={!newSubtaskTitle.trim()}
              accessibilityLabel="Add subtask"
              accessibilityRole="button"
              accessibilityState={{ disabled: !newSubtaskTitle.trim() }}
            >
              <FontAwesome
                name="plus"
                size={16}
                color={
                  newSubtaskTitle.trim()
                    ? "rgb(var(--color-primary))"
                    : "rgb(var(--color-text-muted))"
                }
              />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
