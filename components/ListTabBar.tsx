import { ScrollView, Pressable, StyleSheet, View } from "react-native";
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
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
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
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
        >
          <FontAwesome name="plus" size={16} color="#007AFF" />
        </Pressable>
      </ScrollView>

      {/* Settings Button - moved into each list tab */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#f8f8f8",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e8f4ff",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  addButtonPressed: {
    opacity: 0.7,
  },
});
