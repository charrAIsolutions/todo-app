import { Pressable, Text, StyleSheet, Platform } from "react-native";

interface ListTabProps {
  name: string;
  isActive: boolean;
  onPress: () => void;
}

const isWeb = Platform.OS === "web";

/**
 * Individual tab button for a todo list.
 * Active state shows with different background/text color.
 */
export function ListTab({ name, isActive, onPress }: ListTabProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        isActive && styles.tabActive,
        pressed && styles.tabPressed,
      ]}
    >
      <Text
        style={[
          styles.tabText,
          isActive && styles.tabTextActive,
          isWeb && styles.noSelect,
        ]}
      >
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 4,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  tabActive: {
    backgroundColor: "#007AFF",
  },
  tabPressed: {
    opacity: 0.7,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#666",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  noSelect: {
    userSelect: "none",
  } as const,
});
