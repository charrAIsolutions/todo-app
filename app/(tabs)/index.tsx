import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppData } from "@/hooks/useAppData";
import { ListTabBar } from "@/components/ListTabBar";
import { AddTaskInput } from "@/components/AddTaskInput";
import { CategorySection } from "@/components/CategorySection";

/**
 * Main todo list screen.
 * Shows list tabs at top, tasks grouped by category in middle, add input at bottom.
 */
export default function TodoScreen() {
  const router = useRouter();
  const {
    lists,
    activeListId,
    activeList,
    tasksByCategory,
    subtasksByParent,
    isLoading,
    setActiveList,
    addList,
    addTask,
    toggleTask,
  } = useAppData();

  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");

  const handleAddList = () => {
    setIsCreatingList(true);
  };

  const handleCreateList = () => {
    const name = newListName.trim();
    if (name) {
      addList({ name });
      setNewListName("");
      setIsCreatingList(false);
    }
  };

  const handleAddTask = (title: string) => {
    if (activeListId) {
      addTask({ title, listId: activeListId });
    }
  };

  const handleOpenListSettings = (listId: string) => {
    // TODO: Navigate to list settings modal
    Alert.alert("List Settings", "Long-press detected. Settings coming soon!");
  };

  const handlePressTask = (taskId: string) => {
    router.push(`/task/${taskId}`);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Get categories for active list, sorted by sortOrder
  const categories = activeList?.categories
    ? [...activeList.categories].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  // Check if there are any tasks at all
  const hasAnyTasks = tasksByCategory.size > 0;
  const uncategorizedTasks = tasksByCategory.get(null) ?? [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* List Tab Bar */}
      <ListTabBar
        lists={lists}
        activeListId={activeListId}
        onSelectList={setActiveList}
        onAddList={handleAddList}
        onOpenListSettings={handleOpenListSettings}
      />

      {/* New List Input (shown when creating) */}
      {isCreatingList && (
        <View style={styles.newListContainer}>
          <TextInput
            style={styles.newListInput}
            value={newListName}
            onChangeText={setNewListName}
            placeholder="New list name..."
            autoFocus
            onSubmitEditing={handleCreateList}
            returnKeyType="done"
          />
          <Text style={styles.newListHint}>
            Press enter to create, or tap elsewhere to cancel
          </Text>
        </View>
      )}

      {/* Task List */}
      <ScrollView
        style={styles.taskList}
        contentContainerStyle={styles.taskListContent}
      >
        {activeList ? (
          <>
            {!hasAnyTasks ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No tasks yet</Text>
                <Text style={styles.emptyStateHint}>
                  Add your first task below
                </Text>
              </View>
            ) : (
              <>
                {/* Render each category section */}
                {categories.map((category) => {
                  const categoryTasks = tasksByCategory.get(category.id) ?? [];
                  return (
                    <CategorySection
                      key={category.id}
                      category={category}
                      tasks={categoryTasks}
                      subtasksByParent={subtasksByParent}
                      onToggleTask={toggleTask}
                      onPressTask={handlePressTask}
                    />
                  );
                })}

                {/* Uncategorized section at bottom */}
                {uncategorizedTasks.length > 0 && (
                  <CategorySection
                    category={null}
                    tasks={uncategorizedTasks}
                    subtasksByParent={subtasksByParent}
                    onToggleTask={toggleTask}
                    onPressTask={handlePressTask}
                  />
                )}
              </>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No list selected</Text>
            <Text style={styles.emptyStateHint}>
              Create a list using the + button above
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Task Input */}
      {activeListId && <AddTaskInput onAddTask={handleAddTask} />}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  newListContainer: {
    padding: 16,
    backgroundColor: "#f0f8ff",
    borderBottomWidth: 1,
    borderBottomColor: "#cce5ff",
  },
  newListInput: {
    height: 44,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  newListHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  taskList: {
    flex: 1,
  },
  taskListContent: {
    padding: 16,
    paddingTop: 0,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptyStateHint: {
    fontSize: 14,
    color: "#666",
  },
});
