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
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
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

  // Category management state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editCategoryValue, setEditCategoryValue] = useState("");
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null,
  );

  const settingsList = lists.find((l) => l.id === settingsListId);
  const taskCountForSettingsList = settingsListId
    ? tasks.filter((t) => t.listId === settingsListId).length
    : 0;

  // Sorted categories for the settings modal
  const settingsCategories = settingsList?.categories
    ? [...settingsList.categories].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  // Task count by category for delete warnings
  const taskCountByCategory = settingsListId
    ? tasks
        .filter((t) => t.listId === settingsListId)
        .reduce(
          (acc, task) => {
            const key = task.categoryId ?? "uncategorized";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        )
    : {};

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
    // Reset category management state
    setIsAddingCategory(false);
    setNewCategoryName("");
    setEditingCategoryId(null);
    setEditCategoryValue("");
    setDeletingCategoryId(null);
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

  // ---------------------------------------------------------------------------
  // Category Management Handlers
  // ---------------------------------------------------------------------------
  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (name && settingsListId) {
      addCategory(settingsListId, { name });
      setNewCategoryName("");
      setIsAddingCategory(false);
    }
  };

  const handleStartEditCategory = (categoryId: string, currentName: string) => {
    setEditingCategoryId(categoryId);
    setEditCategoryValue(currentName);
  };

  const handleSaveCategory = () => {
    const trimmed = editCategoryValue.trim();
    if (trimmed && settingsListId && editingCategoryId) {
      updateCategory(settingsListId, editingCategoryId, { name: trimmed });
      setEditingCategoryId(null);
      setEditCategoryValue("");
    }
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditCategoryValue("");
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (settingsListId) {
      deleteCategory(settingsListId, categoryId);
      setDeletingCategoryId(null);
    }
  };

  const handleMoveCategoryUp = (categoryId: string) => {
    if (!settingsListId) return;
    const idx = settingsCategories.findIndex((c) => c.id === categoryId);
    if (idx <= 0) return;
    const newOrder = settingsCategories.map((c) => c.id);
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    reorderCategories(settingsListId, newOrder);
  };

  const handleMoveCategoryDown = (categoryId: string) => {
    if (!settingsListId) return;
    const idx = settingsCategories.findIndex((c) => c.id === categoryId);
    if (idx < 0 || idx >= settingsCategories.length - 1) return;
    const newOrder = settingsCategories.map((c) => c.id);
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    reorderCategories(settingsListId, newOrder);
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
            {/* Render each category section (even when empty for drag-drop targets) */}
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

            {/* Empty state only when no categories and no tasks */}
            {categories.length === 0 && !hasAnyTasks && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No tasks yet</Text>
                <Text style={styles.emptyStateHint}>
                  Add your first task below
                </Text>
              </View>
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

                {/* Categories Section */}
                <View style={styles.categoriesSection}>
                  <Text style={styles.categoriesSectionTitle}>CATEGORIES</Text>

                  {settingsCategories.map((category, index) => {
                    const isFirst = index === 0;
                    const isLast = index === settingsCategories.length - 1;
                    const isEditing = editingCategoryId === category.id;
                    const isDeleting = deletingCategoryId === category.id;
                    const taskCount = taskCountByCategory[category.id] || 0;

                    if (isDeleting) {
                      return (
                        <View key={category.id} style={styles.categoryRow}>
                          <View style={styles.categoryDeleteConfirm}>
                            <Text style={styles.categoryDeleteText}>
                              Delete "{category.name}"?
                              {taskCount > 0 &&
                                ` ${taskCount} task${taskCount !== 1 ? "s" : ""} will move to Uncategorized.`}
                            </Text>
                            <View style={styles.categoryDeleteButtons}>
                              <Pressable
                                style={styles.categoryDeleteCancel}
                                onPress={() => setDeletingCategoryId(null)}
                              >
                                <Text style={styles.categoryDeleteCancelText}>
                                  Cancel
                                </Text>
                              </Pressable>
                              <Pressable
                                style={styles.categoryDeleteConfirmBtn}
                                onPress={() =>
                                  handleDeleteCategory(category.id)
                                }
                              >
                                <Text
                                  style={styles.categoryDeleteConfirmBtnText}
                                >
                                  Delete
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      );
                    }

                    if (isEditing) {
                      return (
                        <View key={category.id} style={styles.categoryRow}>
                          <TextInput
                            style={styles.categoryEditInput}
                            value={editCategoryValue}
                            onChangeText={setEditCategoryValue}
                            autoFocus
                            onSubmitEditing={handleSaveCategory}
                            returnKeyType="done"
                          />
                          <View style={styles.categoryEditButtons}>
                            <Pressable
                              style={styles.categoryActionBtn}
                              onPress={handleCancelEditCategory}
                            >
                              <Text style={styles.categoryActionBtnText}>
                                Cancel
                              </Text>
                            </Pressable>
                            <Pressable
                              style={[
                                styles.categoryActionBtn,
                                styles.categorySaveBtn,
                                !editCategoryValue.trim() &&
                                  styles.categoryBtnDisabled,
                              ]}
                              onPress={handleSaveCategory}
                              disabled={!editCategoryValue.trim()}
                            >
                              <Text style={styles.categorySaveBtnText}>
                                Save
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    }

                    return (
                      <View key={category.id} style={styles.categoryRow}>
                        <Text
                          style={styles.categoryName}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {category.name}
                        </Text>
                        <View style={styles.categoryActions}>
                          <Pressable
                            style={[
                              styles.categoryArrowBtn,
                              isFirst && styles.categoryBtnDisabled,
                            ]}
                            onPress={() => handleMoveCategoryUp(category.id)}
                            disabled={isFirst}
                          >
                            <Text
                              style={[
                                styles.categoryArrowText,
                                isFirst && styles.categoryArrowDisabled,
                              ]}
                            >
                              ↑
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[
                              styles.categoryArrowBtn,
                              isLast && styles.categoryBtnDisabled,
                            ]}
                            onPress={() => handleMoveCategoryDown(category.id)}
                            disabled={isLast}
                          >
                            <Text
                              style={[
                                styles.categoryArrowText,
                                isLast && styles.categoryArrowDisabled,
                              ]}
                            >
                              ↓
                            </Text>
                          </Pressable>
                          <Pressable
                            style={styles.categoryIconBtn}
                            onPress={() =>
                              handleStartEditCategory(
                                category.id,
                                category.name,
                              )
                            }
                          >
                            <Text style={styles.categoryIconText}>✏️</Text>
                          </Pressable>
                          <Pressable
                            style={styles.categoryIconBtn}
                            onPress={() => setDeletingCategoryId(category.id)}
                          >
                            <Text style={styles.categoryIconText}>🗑️</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}

                  {/* Add Category */}
                  {isAddingCategory ? (
                    <View style={styles.addCategoryContainer}>
                      <TextInput
                        style={styles.addCategoryInput}
                        value={newCategoryName}
                        onChangeText={setNewCategoryName}
                        placeholder="Category name..."
                        autoFocus
                        onSubmitEditing={handleAddCategory}
                        returnKeyType="done"
                      />
                      <View style={styles.addCategoryButtons}>
                        <Pressable
                          style={styles.categoryActionBtn}
                          onPress={() => {
                            setIsAddingCategory(false);
                            setNewCategoryName("");
                          }}
                        >
                          <Text style={styles.categoryActionBtnText}>
                            Cancel
                          </Text>
                        </Pressable>
                        <Pressable
                          style={[
                            styles.categoryActionBtn,
                            styles.categorySaveBtn,
                            !newCategoryName.trim() &&
                              styles.categoryBtnDisabled,
                          ]}
                          onPress={handleAddCategory}
                          disabled={!newCategoryName.trim()}
                        >
                          <Text style={styles.categorySaveBtnText}>Add</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      style={styles.addCategoryBtn}
                      onPress={() => setIsAddingCategory(true)}
                    >
                      <Text style={styles.addCategoryBtnText}>
                        + Add Category
                      </Text>
                    </Pressable>
                  )}
                </View>

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
  // Category management styles
  categoriesSection: {
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  categoriesSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    minHeight: 44,
  },
  categoryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  categoryActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  categoryArrowBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: "#e8e8e8",
  },
  categoryArrowText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  categoryArrowDisabled: {
    color: "#ccc",
  },
  categoryIconBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconText: {
    fontSize: 14,
  },
  categoryBtnDisabled: {
    opacity: 0.4,
  },
  categoryEditInput: {
    flex: 1,
    height: 36,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    borderRadius: 6,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  categoryEditButtons: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    gap: 6,
  },
  categoryActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  categoryActionBtnText: {
    fontSize: 14,
    color: "#666",
  },
  categorySaveBtn: {
    backgroundColor: "#007AFF",
  },
  categorySaveBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  categoryDeleteConfirm: {
    flex: 1,
  },
  categoryDeleteText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  categoryDeleteButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  categoryDeleteCancel: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#e8e8e8",
  },
  categoryDeleteCancelText: {
    fontSize: 14,
    color: "#333",
  },
  categoryDeleteConfirmBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#cc0000",
  },
  categoryDeleteConfirmBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  addCategoryContainer: {
    marginTop: 4,
  },
  addCategoryInput: {
    height: 40,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#007AFF",
    marginBottom: 8,
  },
  addCategoryButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  addCategoryBtn: {
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
  },
  addCategoryBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#007AFF",
  },
});
