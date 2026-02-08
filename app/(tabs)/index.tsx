import { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  Switch,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppData } from "@/hooks/useAppData";
import { ListTabBar } from "@/components/ListTabBar";
import { AddTaskInput } from "@/components/AddTaskInput";
import { CategorySection } from "@/components/CategorySection";
import { DragProvider } from "@/components/drag";
import type { DragEndEvent } from "@/types";
import type { Task } from "@/types/todo";
import { SkeletonScreen } from "@/components/skeleton";

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
    selectedListIds,
    tasksByCategory,
    subtasksByParent,
    isLoading,
    setActiveList,
    setSelectedLists,
    toggleListSelection,
    addList,
    updateList,
    deleteList,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    addTask,
    updateTask,
    toggleTask,
    moveTask,
    nestTask,
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
  const { width: windowWidth } = useWindowDimensions();

  const settingsList = lists.find((l) => l.id === settingsListId);
  const isWeb = Platform.OS === "web";
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

  const handleAddTask = (title: string, listId: string) => {
    addTask({ title, listId });
  };

  const handleOpenSettings = (listId: string) => {
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
  // Drag-and-Drop Handler
  // ---------------------------------------------------------------------------
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { task, dropZone } = event;

      switch (dropZone.type) {
        case "reorder":
        case "move-category": {
          // Determine if we're reordering subtasks or top-level tasks
          const isSubtaskReorder = dropZone.parentTaskId !== null;

          // Get sibling tasks (either subtasks of same parent, or top-level in same category)
          const targetTasks = tasks.filter((t) => {
            if (t.listId !== task.listId) return false;
            if (t.id === task.id) return false;

            if (isSubtaskReorder) {
              // Reordering among subtasks of the same parent
              return t.parentTaskId === dropZone.parentTaskId;
            } else {
              // Reordering top-level tasks in a category
              return (
                t.categoryId === dropZone.categoryId && t.parentTaskId === null
              );
            }
          });
          targetTasks.sort((a, b) => a.sortOrder - b.sortOrder);

          let newSortOrder: number;
          if (dropZone.beforeTaskId) {
            const beforeIndex = targetTasks.findIndex(
              (t) => t.id === dropZone.beforeTaskId,
            );
            if (beforeIndex === 0) {
              newSortOrder = targetTasks[0].sortOrder - 1;
            } else if (beforeIndex > 0) {
              const prev = targetTasks[beforeIndex - 1];
              const next = targetTasks[beforeIndex];
              newSortOrder = (prev.sortOrder + next.sortOrder) / 2;
            } else {
              // beforeTaskId not found, insert at end
              newSortOrder =
                targetTasks.length > 0
                  ? targetTasks[targetTasks.length - 1].sortOrder + 1
                  : 0;
            }
          } else {
            // Insert at end
            newSortOrder =
              targetTasks.length > 0
                ? targetTasks[targetTasks.length - 1].sortOrder + 1
                : 0;
          }

          if (isSubtaskReorder) {
            // Just update sort order for subtask reordering
            updateTask(task.id, { sortOrder: newSortOrder });
          } else {
            // Move task to new category with new sort order
            moveTask(task.id, dropZone.categoryId, newSortOrder);
          }
          break;
        }

        case "nest": {
          if (dropZone.parentTaskId) {
            nestTask(task.id, dropZone.parentTaskId);
          }
          break;
        }

        case "unnest": {
          nestTask(task.id, null);
          break;
        }
      }
    },
    [tasks, moveTask, nestTask, updateTask],
  );

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

  const listIdsToRender = isWeb
    ? selectedListIds.length > 0
      ? selectedListIds
      : lists[0]
        ? [lists[0].id]
        : []
    : activeListId
      ? [activeListId]
      : [];

  useEffect(() => {
    if (!isWeb || selectedListIds.length > 0 || lists.length === 0) return;
    setSelectedLists([lists[0].id]);
  }, [isWeb, lists, selectedListIds, setSelectedLists]);

  const listTaskData = useMemo(() => {
    const data = new Map<
      string,
      {
        tasksByCategory: Map<string | null, Task[]>;
        subtasksByParent: Map<string, Task[]>;
      }
    >();
    const tasksByList = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (!tasksByList.has(task.listId)) {
        tasksByList.set(task.listId, []);
      }
      tasksByList.get(task.listId)!.push(task);
    });

    tasksByList.forEach((listTasks, listId) => {
      const tasksByCategoryMap = new Map<string | null, Task[]>();
      const subtasksByParentMap = new Map<string, Task[]>();

      listTasks.forEach((task) => {
        if (task.parentTaskId === null) {
          const key = task.categoryId;
          if (!tasksByCategoryMap.has(key)) {
            tasksByCategoryMap.set(key, []);
          }
          tasksByCategoryMap.get(key)!.push(task);
        } else {
          const parentId = task.parentTaskId;
          if (!subtasksByParentMap.has(parentId)) {
            subtasksByParentMap.set(parentId, []);
          }
          subtasksByParentMap.get(parentId)!.push(task);
        }
      });

      tasksByCategoryMap.forEach((categoryTasks) => {
        categoryTasks.sort((a, b) => a.sortOrder - b.sortOrder);
      });
      subtasksByParentMap.forEach((subtasks) => {
        subtasks.sort((a, b) => a.sortOrder - b.sortOrder);
      });

      data.set(listId, {
        tasksByCategory: tasksByCategoryMap,
        subtasksByParent: subtasksByParentMap,
      });
    });

    return data;
  }, [tasks]);

  if (isLoading) {
    return <SkeletonScreen />;
  }

  // Get categories for active list, sorted by sortOrder
  const categories = activeList?.categories
    ? [...activeList.categories].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  // Check if there are any tasks at all
  const hasAnyTasks = tasksByCategory.size > 0;
  const uncategorizedTasks = tasksByCategory.get(null) ?? [];

  const renderListPane = (listId: string) => {
    const list = lists.find((item) => item.id === listId);
    if (!list) return null;
    const listCategories = [...list.categories].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    // Each pane should be 1/4 of screen width OR 360px, whichever is bigger
    const paneWidth = Math.max(windowWidth / 4, 360);
    const listData = listTaskData.get(listId);
    const listTasksByCategory = listData?.tasksByCategory ?? new Map();
    const listSubtasksByParent = listData?.subtasksByParent ?? new Map();
    const listHasTasks = listTasksByCategory.size > 0;
    const listUncategorizedTasks = listTasksByCategory.get(null) ?? [];

    return (
      <View
        key={listId}
        className="bg-surface rounded-xl border border-border overflow-hidden"
        style={{ width: paneWidth }}
      >
        <Text className="text-lg font-bold text-text px-4 pt-4 pb-2">
          {list.name}
        </Text>
        <DragProvider onDragEnd={handleDragEnd}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingTop: 0 }}
          >
            {/* Render each category section (even when empty for drag-drop targets) */}
            {listCategories.map((category) => {
              const categoryTasks = listTasksByCategory.get(category.id) ?? [];
              return (
                <CategorySection
                  key={category.id}
                  category={category}
                  listId={listId}
                  tasks={categoryTasks}
                  subtasksByParent={listSubtasksByParent}
                  onToggleTask={toggleTask}
                  onPressTask={handlePressTask}
                  dragEnabled
                />
              );
            })}

            {/* Uncategorized section at bottom */}
            {listUncategorizedTasks.length > 0 && (
              <CategorySection
                category={null}
                listId={listId}
                tasks={listUncategorizedTasks}
                subtasksByParent={listSubtasksByParent}
                onToggleTask={toggleTask}
                onPressTask={handlePressTask}
                dragEnabled
              />
            )}

            {/* Empty state only when no categories and no tasks */}
            {listCategories.length === 0 && !listHasTasks && (
              <View className="flex-1 items-center justify-center py-16">
                <Text className="text-lg font-semibold text-text mb-2">
                  No tasks yet
                </Text>
                <Text className="text-sm text-text-secondary">
                  Add your first task below
                </Text>
              </View>
            )}
          </ScrollView>
        </DragProvider>

        <AddTaskInput onAddTask={(title) => handleAddTask(title, listId)} />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* List Tab Bar */}
      <ListTabBar
        lists={lists}
        activeListId={activeListId}
        selectedListIds={isWeb ? listIdsToRender : []}
        onSelectList={setActiveList}
        onToggleList={toggleListSelection}
        onAddList={handleAddList}
        onOpenSettings={handleOpenSettings}
      />

      {/* New List Input (shown when creating) */}
      {isCreatingList && (
        <View className="p-4 bg-primary/10 border-b border-primary/30">
          <TextInput
            className="h-11 px-4 bg-surface rounded-lg text-base border border-primary text-text"
            value={newListName}
            onChangeText={setNewListName}
            placeholder="New list name..."
            placeholderTextColor="rgb(var(--color-text-muted))"
            autoFocus
            onSubmitEditing={handleCreateList}
            returnKeyType="done"
          />
          <Text className="text-xs text-text-secondary mt-2 text-center">
            Press enter to create, or tap elsewhere to cancel
          </Text>
        </View>
      )}

      {isWeb ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={{
            padding: 16,
            gap: 16,
            alignItems: "stretch",
          }}
          className="flex-1"
        >
          {listIdsToRender.length > 0 ? (
            listIdsToRender.map((listId) => renderListPane(listId))
          ) : (
            <View className="flex-1 items-center justify-center py-16">
              <Text className="text-lg font-semibold text-text mb-2">
                No list selected
              </Text>
              <Text className="text-sm text-text-secondary">
                Create a list using the + button above
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <>
          {/* Task List with Drag-and-Drop */}
          <DragProvider onDragEnd={handleDragEnd}>
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 16, paddingTop: 0 }}
            >
              {activeList ? (
                <>
                  {/* Render each category section (even when empty for drag-drop targets) */}
                  {categories.map((category) => {
                    const categoryTasks =
                      tasksByCategory.get(category.id) ?? [];
                    return (
                      <CategorySection
                        key={category.id}
                        category={category}
                        listId={activeListId!}
                        tasks={categoryTasks}
                        subtasksByParent={subtasksByParent}
                        onToggleTask={toggleTask}
                        onPressTask={handlePressTask}
                        dragEnabled
                      />
                    );
                  })}

                  {/* Uncategorized section at bottom */}
                  {uncategorizedTasks.length > 0 && (
                    <CategorySection
                      category={null}
                      listId={activeListId!}
                      tasks={uncategorizedTasks}
                      subtasksByParent={subtasksByParent}
                      onToggleTask={toggleTask}
                      onPressTask={handlePressTask}
                      dragEnabled
                    />
                  )}

                  {/* Empty state only when no categories and no tasks */}
                  {categories.length === 0 && !hasAnyTasks && (
                    <View className="flex-1 items-center justify-center py-16">
                      <Text className="text-lg font-semibold text-text mb-2">
                        No tasks yet
                      </Text>
                      <Text className="text-sm text-text-secondary">
                        Add your first task below
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View className="flex-1 items-center justify-center py-16">
                  <Text className="text-lg font-semibold text-text mb-2">
                    No list selected
                  </Text>
                  <Text className="text-sm text-text-secondary">
                    Create a list using the + button above
                  </Text>
                </View>
              )}
            </ScrollView>
          </DragProvider>

          {/* Add Task Input */}
          {activeListId && (
            <AddTaskInput
              onAddTask={(title) => handleAddTask(title, activeListId)}
            />
          )}
        </>
      )}

      {/* List Settings Modal */}
      <Modal
        visible={settingsListId !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCloseSettings}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={handleCloseSettings}
        >
          <Pressable
            className="bg-surface rounded-2xl p-6 w-[90%] max-w-[400px] shadow-lg"
            onPress={(e) => e.stopPropagation()}
          >
            {!showDeleteConfirm ? (
              <>
                <Text className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide mb-1">
                  List Settings
                </Text>
                <Text className="text-2xl font-bold text-text mb-6">
                  {settingsList?.name}
                </Text>

                {/* Rename Section */}
                {isRenaming ? (
                  <View className="mb-3">
                    <TextInput
                      className="h-11 px-3 bg-surface-secondary rounded-lg text-base border border-primary mb-3 text-text"
                      value={renameValue}
                      onChangeText={setRenameValue}
                      autoFocus
                      onSubmitEditing={handleRenameList}
                      returnKeyType="done"
                    />
                    <View className="flex-row justify-end gap-3">
                      <Pressable
                        className="py-2.5 px-4"
                        onPress={() => setIsRenaming(false)}
                      >
                        <Text className="text-base text-text-secondary">
                          Cancel
                        </Text>
                      </Pressable>
                      <Pressable
                        className="py-2.5 px-5 bg-primary rounded-lg"
                        onPress={handleRenameList}
                      >
                        <Text className="text-base text-white font-semibold">
                          Save
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    className="py-3.5 px-4 bg-surface-secondary rounded-lg mb-3"
                    onPress={() => setIsRenaming(true)}
                  >
                    <Text className="text-base font-medium text-text">
                      Rename List
                    </Text>
                  </Pressable>
                )}

                <View className="py-3 px-4 bg-surface-secondary rounded-lg mb-3 flex-row items-center justify-between gap-4">
                  <View>
                    <Text className="text-[15px] font-semibold text-text">
                      Show on open
                    </Text>
                    <Text className="text-xs text-text-secondary mt-1">
                      Display this list when the app launches on web
                    </Text>
                  </View>
                  <Switch
                    value={settingsList?.showOnOpen ?? false}
                    onValueChange={(value) => {
                      if (!settingsListId) return;
                      updateList(settingsListId, { showOnOpen: value });
                    }}
                  />
                </View>

                {/* Categories Section */}
                <View className="mb-4 pt-2 border-t border-border">
                  <Text className="text-xs font-semibold text-text-muted tracking-wide mb-3 mt-2">
                    CATEGORIES
                  </Text>

                  {settingsCategories.map((category, index) => {
                    const isFirst = index === 0;
                    const isLast = index === settingsCategories.length - 1;
                    const isEditing = editingCategoryId === category.id;
                    const isDeleting = deletingCategoryId === category.id;
                    const taskCount = taskCountByCategory[category.id] || 0;

                    if (isDeleting) {
                      return (
                        <View
                          key={category.id}
                          className="flex-row items-center bg-surface-secondary rounded-lg py-2.5 px-3 mb-2 min-h-[44px]"
                        >
                          <View className="flex-1">
                            <Text className="text-sm text-text-secondary mb-2">
                              Delete "{category.name}"?
                              {taskCount > 0 &&
                                ` ${taskCount} task${taskCount !== 1 ? "s" : ""} will move to Uncategorized.`}
                            </Text>
                            <View className="flex-row justify-end gap-2">
                              <Pressable
                                className="py-1.5 px-3 rounded-md bg-border"
                                onPress={() => setDeletingCategoryId(null)}
                              >
                                <Text className="text-sm text-text">
                                  Cancel
                                </Text>
                              </Pressable>
                              <Pressable
                                className="py-1.5 px-3 rounded-md bg-danger"
                                onPress={() =>
                                  handleDeleteCategory(category.id)
                                }
                              >
                                <Text className="text-sm font-semibold text-white">
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
                        <View
                          key={category.id}
                          className="flex-row items-center bg-surface-secondary rounded-lg py-2.5 px-3 mb-2 min-h-[44px]"
                        >
                          <TextInput
                            className="flex-1 h-9 px-2.5 bg-surface rounded-md text-[15px] border border-primary text-text"
                            value={editCategoryValue}
                            onChangeText={setEditCategoryValue}
                            autoFocus
                            onSubmitEditing={handleSaveCategory}
                            returnKeyType="done"
                          />
                          <View className="flex-row items-center ml-2 gap-1.5">
                            <Pressable
                              className="py-1.5 px-2.5 rounded-md"
                              onPress={handleCancelEditCategory}
                            >
                              <Text className="text-sm text-text-secondary">
                                Cancel
                              </Text>
                            </Pressable>
                            <Pressable
                              className={`py-1.5 px-2.5 rounded-md bg-primary ${
                                !editCategoryValue.trim() ? "opacity-40" : ""
                              }`}
                              onPress={handleSaveCategory}
                              disabled={!editCategoryValue.trim()}
                            >
                              <Text className="text-sm font-semibold text-white">
                                Save
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    }

                    return (
                      <View
                        key={category.id}
                        className="flex-row items-center bg-surface-secondary rounded-lg py-2.5 px-3 mb-2 min-h-[44px]"
                      >
                        <Text
                          className="flex-1 text-[15px] font-medium text-text"
                          numberOfLines={1}
                        >
                          {category.name}
                        </Text>
                        <View className="flex-row items-center gap-1">
                          <Pressable
                            className={`w-8 h-8 items-center justify-center rounded-md bg-border ${
                              isFirst ? "opacity-40" : ""
                            }`}
                            onPress={() => handleMoveCategoryUp(category.id)}
                            disabled={isFirst}
                          >
                            <Text
                              className={`text-base font-semibold ${
                                isFirst ? "text-text-muted" : "text-text"
                              }`}
                            >
                              ↑
                            </Text>
                          </Pressable>
                          <Pressable
                            className={`w-8 h-8 items-center justify-center rounded-md bg-border ${
                              isLast ? "opacity-40" : ""
                            }`}
                            onPress={() => handleMoveCategoryDown(category.id)}
                            disabled={isLast}
                          >
                            <Text
                              className={`text-base font-semibold ${
                                isLast ? "text-text-muted" : "text-text"
                              }`}
                            >
                              ↓
                            </Text>
                          </Pressable>
                          <Pressable
                            className="w-8 h-8 items-center justify-center"
                            onPress={() =>
                              handleStartEditCategory(
                                category.id,
                                category.name,
                              )
                            }
                          >
                            <Text className="text-sm">✏️</Text>
                          </Pressable>
                          <Pressable
                            className="w-8 h-8 items-center justify-center"
                            onPress={() => setDeletingCategoryId(category.id)}
                          >
                            <Text className="text-sm">🗑️</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}

                  {/* Add Category */}
                  {isAddingCategory ? (
                    <View className="mt-1">
                      <TextInput
                        className="h-10 px-3 bg-surface rounded-lg text-[15px] border border-primary mb-2 text-text"
                        value={newCategoryName}
                        onChangeText={setNewCategoryName}
                        placeholder="Category name..."
                        placeholderTextColor="rgb(var(--color-text-muted))"
                        autoFocus
                        onSubmitEditing={handleAddCategory}
                        returnKeyType="done"
                      />
                      <View className="flex-row justify-end gap-2">
                        <Pressable
                          className="py-1.5 px-2.5 rounded-md"
                          onPress={() => {
                            setIsAddingCategory(false);
                            setNewCategoryName("");
                          }}
                        >
                          <Text className="text-sm text-text-secondary">
                            Cancel
                          </Text>
                        </Pressable>
                        <Pressable
                          className={`py-1.5 px-2.5 rounded-md bg-primary ${
                            !newCategoryName.trim() ? "opacity-40" : ""
                          }`}
                          onPress={handleAddCategory}
                          disabled={!newCategoryName.trim()}
                        >
                          <Text className="text-sm font-semibold text-white">
                            Add
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      className="py-2.5 items-center rounded-lg border border-dashed border-border"
                      onPress={() => setIsAddingCategory(true)}
                    >
                      <Text className="text-sm font-medium text-primary">
                        + Add Category
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* Delete Option */}
                <Pressable
                  className="py-3.5 px-4 bg-danger/10 rounded-lg mb-3 border border-danger/30"
                  onPress={() => setShowDeleteConfirm(true)}
                >
                  <Text className="text-base font-medium text-danger">
                    Delete List
                  </Text>
                </Pressable>

                {/* Close Button */}
                <Pressable
                  className="py-3 items-center mt-2"
                  onPress={handleCloseSettings}
                >
                  <Text className="text-base text-primary font-medium">
                    Close
                  </Text>
                </Pressable>
              </>
            ) : (
              /* Delete Confirmation - High Visibility Warning */
              <View className="items-center">
                <View className="flex-row items-center bg-danger py-3 px-6 rounded-lg mb-5 w-full justify-center">
                  <Text className="text-2xl mr-2">⚠️</Text>
                  <Text className="text-lg font-extrabold text-white tracking-wide">
                    DANGER ZONE
                  </Text>
                </View>

                <Text className="text-xl font-bold text-text mb-4 text-center">
                  Delete "{settingsList?.name}"?
                </Text>

                <View className="bg-danger/10 border-2 border-danger rounded-lg p-4 mb-6 w-full">
                  <Text className="text-base font-extrabold text-danger text-center mb-3">
                    THIS ACTION CANNOT BE UNDONE
                  </Text>
                  <Text className="text-sm text-text-secondary mb-2">
                    This will permanently delete:
                  </Text>
                  <Text className="text-sm text-text ml-2 mb-1">
                    • The list "{settingsList?.name}"
                  </Text>
                  <Text className="text-sm text-text ml-2 mb-1">
                    • All {taskCountForSettingsList} task
                    {taskCountForSettingsList !== 1 ? "s" : ""} in this list
                  </Text>
                  <Text className="text-sm text-text ml-2">
                    • All subtasks within those tasks
                  </Text>
                </View>

                <View className="w-full gap-3">
                  <Pressable
                    className="py-3.5 px-5 bg-surface-secondary rounded-lg items-center"
                    onPress={() => setShowDeleteConfirm(false)}
                  >
                    <Text className="text-base font-semibold text-text">
                      Cancel - Keep List
                    </Text>
                  </Pressable>

                  <Pressable
                    className="py-3.5 px-5 bg-danger rounded-lg items-center"
                    onPress={handleDeleteList}
                  >
                    <Text className="text-base font-bold text-white">
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
