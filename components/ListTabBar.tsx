import { ScrollView, Pressable, Text, StyleSheet, View } from "react-native";
import { TodoList } from "@/types/todo";
import { ListTab } from "./ListTab";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface ListTabBarProps {
  lists: TodoList[];
  activeListId: string | null;
  onSelectList: (listId: string) => void;
  onAddList: () => void;
  onOpenListSettings?: (listId: string) => void;
}

/**
 * Horizontal scrollable tab bar for switching between todo lists.
 * Shows all lists as tabs with a "+" button to create new lists.
 */
export function ListTabBar({
  lists,
  activeListId,
  onSelectList,
  onAddList,
  onOpenListSettings,
}: ListTabBarProps) {
  // Sort lists by sortOrder
  const sortedLists = [...lists].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sortedLists.map((list) => (
          <ListTab
            key={list.id}
            name={list.name}
            isActive={list.id === activeListId}
            onPress={() => onSelectList(list.id)}
            onLongPress={() => onOpenListSettings?.(list.id)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#f8f8f8",
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
