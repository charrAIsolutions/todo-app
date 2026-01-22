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
  Modal,
  Pressable,
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
    tasks,
    activeListId,
    activeList,
    tasksByCategory,
    subtasksByParent,
    isLoading,
    setActiveList,
    addList,
    updateList,
    deleteList,
    addTask,
    toggleTask,
  } = useAppData();

  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");

  // List settings modal state
  const [settingsListId, setSettingsListId] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const settingsList = lists.find((l) => l.id === settingsListId);
  const taskCountForSettingsList = settingsListId
    ? tasks.filter((t) => t.listId === settingsListId).length
    : 0;

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
    const list = lists.find((l) => l.id === listId);
    if (list) {
      setSettingsListId(listId);
      setRenameValue(list.name);
      setIsRenaming(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCloseSettings = () => {
    setSettingsListId(null);
    setIsRenaming(false);
    setShowDeleteConfirm(false);
  };

  const handleRenameList = () => {
    const trimmed = renameValue.trim();
    if (trimmed && settingsListId) {
      updateList(settingsListId, { name: trimmed });
      setIsRenaming(false);
    }
  };

  const handleDeleteList = () => {
    if (settingsListId) {
      deleteList(settingsListId);
      handleCloseSettings();
    }
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

      {/* List Settings Modal */}
      <Modal
        visible={settingsListId !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCloseSettings}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseSettings}>
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            {!showDeleteConfirm ? (
              <>
                <Text style={styles.modalTitle}>List Settings</Text>
                <Text style={styles.modalListName}>{settingsList?.name}</Text>

                {/* Rename Section */}
                {isRenaming ? (
                  <View style={styles.renameContainer}>
                    <TextInput
                      style={styles.renameInput}
                      value={renameValue}
                      onChangeText={setRenameValue}
                      autoFocus
                      onSubmitEditing={handleRenameList}
                      returnKeyType="done"
                    />
                    <View style={styles.renameButtons}>
                      <Pressable
                        style={styles.cancelButton}
                        onPress={() => setIsRenaming(false)}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        style={styles.saveButton}
                        onPress={handleRenameList}
                      >
                        <Text style={styles.saveButtonText}>Save</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    style={styles.settingsOption}
                    onPress={() => setIsRenaming(true)}
                  >
                    <Text style={styles.settingsOptionText}>Rename List</Text>
                  </Pressable>
                )}

                {/* Delete Option */}
                <Pressable
                  style={[styles.settingsOption, styles.deleteOption]}
                  onPress={() => setShowDeleteConfirm(true)}
                >
                  <Text style={styles.deleteOptionText}>Delete List</Text>
                </Pressable>

                {/* Close Button */}
                <Pressable
                  style={styles.closeButton}
                  onPress={handleCloseSettings}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </>
            ) : (
              /* Delete Confirmation - High Visibility Warning */
              <View style={styles.deleteConfirmContainer}>
                <View style={styles.warningBanner}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <Text style={styles.warningTitle}>DANGER ZONE</Text>
                </View>

                <Text style={styles.deleteConfirmTitle}>
                  Delete "{settingsList?.name}"?
                </Text>

                <View style={styles.deleteWarningBox}>
                  <Text style={styles.deleteWarningText}>
                    THIS ACTION CANNOT BE UNDONE
                  </Text>
                  <Text style={styles.deleteWarningDetail}>
                    This will permanently delete:
                  </Text>
                  <Text style={styles.deleteWarningItem}>
                    • The list "{settingsList?.name}"
                  </Text>
                  <Text style={styles.deleteWarningItem}>
                    • All {taskCountForSettingsList} task
                    {taskCountForSettingsList !== 1 ? "s" : ""} in this list
                  </Text>
                  <Text style={styles.deleteWarningItem}>
                    • All subtasks within those tasks
                  </Text>
                </View>

                <View style={styles.deleteConfirmButtons}>
                  <Pressable
                    style={styles.deleteConfirmCancel}
                    onPress={() => setShowDeleteConfirm(false)}
                  >
                    <Text style={styles.deleteConfirmCancelText}>
                      Cancel - Keep List
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.deleteConfirmButton}
                    onPress={handleDeleteList}
                  >
                    <Text style={styles.deleteConfirmButtonText}>
                      Yes, Delete Everything
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalListName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 24,
  },
  settingsOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 12,
  },
  settingsOptionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  deleteOption: {
    backgroundColor: "#fff0f0",
    borderWidth: 1,
    borderColor: "#ffcccc",
  },
  deleteOptionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#cc0000",
  },
  closeButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
  },
  renameContainer: {
    marginBottom: 12,
  },
  renameInput: {
    height: 44,
    paddingHorizontal: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#007AFF",
    marginBottom: 12,
  },
  renameButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  // Delete confirmation styles - HIGH VISIBILITY
  deleteConfirmContainer: {
    alignItems: "center",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#cc0000",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 20,
    width: "100%",
    justifyContent: "center",
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
  },
  deleteConfirmTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  deleteWarningBox: {
    backgroundColor: "#fff0f0",
    borderWidth: 2,
    borderColor: "#cc0000",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    width: "100%",
  },
  deleteWarningText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#cc0000",
    textAlign: "center",
    marginBottom: 12,
  },
  deleteWarningDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  deleteWarningItem: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
    marginBottom: 4,
  },
  deleteConfirmButtons: {
    width: "100%",
    gap: 12,
  },
  deleteConfirmCancel: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    alignItems: "center",
  },
  deleteConfirmCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  deleteConfirmButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "#cc0000",
    borderRadius: 8,
    alignItems: "center",
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
