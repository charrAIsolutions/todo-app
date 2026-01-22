import { View, Text, StyleSheet } from "react-native";
import { Category } from "@/types/todo";

interface CategoryHeaderProps {
  category: Category;
  taskCount?: number;
}

/**
 * Category section header.
 * Displays category name in bold with a distinct background.
 */
export function CategoryHeader({ category, taskCount }: CategoryHeaderProps) {
  return (
    <View
      style={[
        styles.container,
        category.color && { backgroundColor: category.color },
      ]}
    >
      <Text style={styles.name}>{category.name}</Text>
      {taskCount !== undefined && <Text style={styles.count}>{taskCount}</Text>}
    </View>
  );
}

/**
 * Header for the "Uncategorized" section at the bottom.
 */
export function UncategorizedHeader({ taskCount }: { taskCount?: number }) {
  return (
    <View style={[styles.container, styles.uncategorized]}>
      <Text style={[styles.name, styles.uncategorizedName]}>Uncategorized</Text>
      {taskCount !== undefined && (
        <Text style={[styles.count, styles.uncategorizedCount]}>
          {taskCount}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    marginTop: 16,
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  count: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
  uncategorized: {
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderStyle: "dashed",
  },
  uncategorizedName: {
    color: "#888",
    fontWeight: "600",
  },
  uncategorizedCount: {
    backgroundColor: "#f0f0f0",
    color: "#888",
  },
});
