import { ScrollView, Pressable, View } from "react-native";
import { TodoList } from "@/types/todo";
import { ListTab } from "./ListTab";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface ListTabBarProps {
  lists: TodoList[];
  activeListId: string | null;
  selectedListIds: string[];
  onSelectList: (listId: string) => void;
  onToggleList: (listId: string) => void;
  onAddList: () => void;
  onOpenSettings?: (listId: string) => void;
}

/**
 * Horizontal scrollable tab bar for switching between todo lists.
 * Shows all lists as tabs with a "+" button to create new lists.
 */
export function ListTabBar({
  lists,
  activeListId,
  selectedListIds,
  onSelectList,
  onToggleList,
  onAddList,
  onOpenSettings,
}: ListTabBarProps) {
  // Sort lists by sortOrder
  const sortedLists = [...lists].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <View className="flex-row items-center border-b border-border bg-surface-secondary">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          alignItems: "center",
        }}
        className="flex-1"
      >
        {sortedLists.map((list) => (
          <ListTab
            key={list.id}
            name={list.name}
            isActive={
              selectedListIds.length > 0
                ? selectedListIds.includes(list.id)
                : list.id === activeListId
            }
            onPress={() =>
              selectedListIds.length > 0
                ? onToggleList(list.id)
                : onSelectList(list.id)
            }
            onOpenSettings={
              onOpenSettings ? () => onOpenSettings(list.id) : undefined
            }
          />
        ))}

        {/* Add List Button */}
        <Pressable
          onPress={onAddList}
          className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center ml-2 active:opacity-70"
        >
          <FontAwesome
            name="plus"
            size={16}
            color="rgb(var(--color-primary))"
          />
        </Pressable>
      </ScrollView>
    </View>
  );
}
