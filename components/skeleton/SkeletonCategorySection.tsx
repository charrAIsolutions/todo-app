import { View } from "react-native";
import { SkeletonBone } from "./SkeletonBone";
import { SkeletonTaskItem } from "./SkeletonTaskItem";

// Deterministic header widths per section index
const HEADER_WIDTHS = [80, 60, 100];

interface SkeletonCategorySectionProps {
  sectionIndex?: number;
  taskCount?: number;
}

/**
 * Skeleton placeholder for a category section:
 * category header bar + N task item placeholders.
 */
export function SkeletonCategorySection({
  sectionIndex = 0,
  taskCount = 3,
}: SkeletonCategorySectionProps) {
  const headerWidth = HEADER_WIDTHS[sectionIndex % HEADER_WIDTHS.length];

  return (
    <View>
      {/* Category header */}
      <View className="flex-row items-center justify-between py-2.5 px-3 bg-surface-secondary rounded-md mt-4 mb-1">
        <SkeletonBone className="h-4 rounded" style={{ width: headerWidth }} />
        <SkeletonBone className="w-8 h-5 rounded-full" />
      </View>

      {/* Task items */}
      {Array.from({ length: taskCount }, (_, i) => (
        <SkeletonTaskItem key={i} index={sectionIndex * taskCount + i} />
      ))}
    </View>
  );
}
