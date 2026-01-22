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
  Pressable,
} from "react-native";
import { useAppData } from "@/hooks/useAppData";
import { ListTabBar } from "@/components/ListTabBar";
import { AddTaskInput } from "@/components/AddTaskInput";

/**
 * Main todo list screen.
 * Shows list tabs at top, tasks in middle, add input at bottom.
 */
export default function TodoScreen() {
  const {
    lists,
    tasks,
    activeListId,
    activeList,
    isLoading,
    setActiveList,
    addList,
    addTask,
    toggleTask,
  } = useAppData();

  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");

  // Get tasks for active list (top-level only for now)
  const activeTasks = tasks.filter(
    (t) => t.listId === activeListId && t.parentTaskId === null,
  );

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

  const handleCancelCreateList = () => {
    setNewListName("");
    setIsCreatingList(false);
  };

  const handleAddTask = (title: string) => {
    if (activeListId) {
      addTask({ title, listId: activeListId });
    }
  };

  const handleOpenListSettings = (listId: string) => {
    // TODO: Navigate to list settings modal (Phase 2 completion)
    Alert.alert("List Settings", "Long-press detected. Settings coming soon!");
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

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
            {activeTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No tasks yet</Text>
                <Text style={styles.emptyStateHint}>
                  Add your first task below
                </Text>
              </View>
            ) : (
              activeTasks.map((task) => (
                <Pressable
                  key={task.id}
                  style={styles.taskItem}
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
                  <Text
                    style={[
                      styles.taskTitle,
                      task.completed && styles.taskTitleCompleted,
                    ]}
                  >
                    {task.title}
                  </Text>
                </Pressable>
              ))
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
  taskItem: {
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
  taskTitle: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  taskTitleCompleted: {
    color: "#999",
    textDecorationLine: "line-through",
  },
});
