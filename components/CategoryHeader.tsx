import { View, Text } from "react-native";
import { Category } from "@/types/todo";

interface CategoryHeaderProps {
  category: Category;
  taskCount?: number;
  isDropTarget?: boolean;
}

/**
 * Category section header.
 * Displays category name in bold with a distinct background.
 * Highlights with primary color when a task is being dragged over this category.
 */
export function CategoryHeader({
  category,
  taskCount,
  isDropTarget,
}: CategoryHeaderProps) {
  return (
    <View
      className={`flex-row items-center justify-between py-2.5 px-3 rounded-md mt-4 mb-1 ${
        isDropTarget ? "bg-primary/15" : "bg-surface-secondary"
      }`}
      style={
        !isDropTarget && category.color
          ? { backgroundColor: category.color }
          : undefined
      }
    >
      <Text className="text-[15px] font-bold text-text uppercase tracking-wide">
        {category.name}
      </Text>
      {taskCount !== undefined && (
        <Text className="text-[13px] font-semibold text-text-secondary bg-border px-2 py-0.5 rounded-full overflow-hidden">
          {taskCount}
        </Text>
      )}
    </View>
  );
}

/**
 * Header for the "Uncategorized" section at the bottom.
 * Highlights with primary color when a task is being dragged over this section.
 */
export function UncategorizedHeader({
  taskCount,
  isDropTarget,
}: {
  taskCount?: number;
  isDropTarget?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between py-2.5 px-3 rounded-md mt-4 mb-1 ${
        isDropTarget
          ? "bg-primary/15"
          : "bg-surface border border-dashed border-border"
      }`}
    >
      <Text className="text-[15px] font-semibold text-text-muted uppercase tracking-wide">
        Uncategorized
      </Text>
      {taskCount !== undefined && (
        <Text className="text-[13px] font-semibold text-text-muted bg-surface-secondary px-2 py-0.5 rounded-full overflow-hidden">
          {taskCount}
        </Text>
      )}
    </View>
  );
}
