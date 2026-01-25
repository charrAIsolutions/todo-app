import { ScrollView, Pressable, Text, StyleSheet, View } from "react-native";
import { TodoList } from "@/types/todo";
import { ListTab } from "./ListTab";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface ListTabBarProps {
  lists: TodoList[];
  activeListId: string | null;
  onSelectList: (listId: string) => void;
  onAddList: () => void;
  onOpenSettings?: () => void;
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
            isActive={list.id === activeListId}
            onPress={() => onSelectList(list.id)}
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

      {/* Settings Button - always visible on right */}
      {activeListId && (
        <Pressable
          onPress={onOpenSettings}
          style={({ pressed }) => [
            styles.settingsButton,
            pressed && styles.settingsButtonPressed,
          ]}
        >
          <FontAwesome name="ellipsis-h" size={18} color="#666" />
        </Pressable>
      )}
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
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  settingsButtonPressed: {
    opacity: 0.5,
  },
});
