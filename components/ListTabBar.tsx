import { ScrollView, Pressable, View } from "react-native";
import { TodoList } from "@/types/todo";
import { ListTab } from "./ListTab";
import { TabDragProvider, useTabDragContext, DraggableTab } from "./tab-drag";
import FontAwesome from "@expo/vector-icons/FontAwesome";

// =============================================================================
// Inner tab list (needs context access)
// =============================================================================

interface InnerTabListProps {
  sortedLists: TodoList[];
  selectedListIds: string[];
  activeListId: string | null;
  onSelectList: (listId: string) => void;
  onToggleList: (listId: string) => void;
  onAddList: () => void;
  onOpenSettings?: (listId: string) => void;
}

function InnerTabList({
  sortedLists,
  selectedListIds,
  activeListId,
  onSelectList,
  onToggleList,
  onAddList,
  onOpenSettings,
}: InnerTabListProps) {
  const { dragState } = useTabDragContext();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={!dragState.isDragging}
      contentContainerStyle={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignItems: "center",
      }}
      className="flex-1"
    >
      {sortedLists.map((list, index) => (
        <DraggableTab
          key={list.id}
          tabId={list.id}
          index={index}
          onPress={() =>
            selectedListIds.length > 0
              ? onToggleList(list.id)
              : onSelectList(list.id)
          }
          onOpenSettings={
            onOpenSettings ? () => onOpenSettings(list.id) : () => {}
          }
        >
          <ListTab
            name={list.name}
            isActive={
              selectedListIds.length > 0
                ? selectedListIds.includes(list.id)
                : list.id === activeListId
            }
            isDragged={dragState.draggedTabId === list.id}
            onOpenSettings={
              onOpenSettings ? () => onOpenSettings(list.id) : undefined
            }
          />
        </DraggableTab>
      ))}

      {/* Add List Button — fixed at end, not draggable */}
      <Pressable
        onPress={onAddList}
        className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center ml-2 active:opacity-70"
      >
        <FontAwesome name="plus" size={16} color="rgb(var(--color-primary))" />
      </Pressable>
    </ScrollView>
  );
}

// =============================================================================
// ListTabBar (public component)
// =============================================================================

interface ListTabBarProps {
  lists: TodoList[];
  activeListId: string | null;
  selectedListIds: string[];
  onSelectList: (listId: string) => void;
  onToggleList: (listId: string) => void;
  onAddList: () => void;
  onOpenSettings?: (listId: string) => void;
  onReorderLists?: (listIds: string[]) => void;
}

/**
 * Horizontal scrollable tab bar for switching between todo lists.
 * Supports drag-to-reorder via long-press, double-tap for settings.
 */
export function ListTabBar({
  lists,
  activeListId,
  selectedListIds,
  onSelectList,
  onToggleList,
  onAddList,
  onOpenSettings,
  onReorderLists,
}: ListTabBarProps) {
  const sortedLists = [...lists].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedListIds = sortedLists.map((l) => l.id);

  const handleReorder = (listIds: string[]) => {
    onReorderLists?.(listIds);
  };

  return (
    <View className="flex-row items-center border-b border-border bg-surface-secondary">
      <TabDragProvider onReorder={handleReorder} sortedListIds={sortedListIds}>
        <InnerTabList
          sortedLists={sortedLists}
          selectedListIds={selectedListIds}
          activeListId={activeListId}
          onSelectList={onSelectList}
          onToggleList={onToggleList}
          onAddList={onAddList}
          onOpenSettings={onOpenSettings}
        />
      </TabDragProvider>
    </View>
  );
}
