import { DimensionValue, View } from "react-native";
import { SkeletonBone } from "./SkeletonBone";

// Deterministic widths to avoid Math.random() re-render flicker
const TITLE_WIDTHS: DimensionValue[] = [
  "75%",
  "60%",
  "85%",
  "55%",
  "70%",
  "90%",
  "65%",
  "80%",
];

interface SkeletonTaskItemProps {
  index?: number;
  indent?: number;
}

/**
 * Skeleton placeholder that mirrors the TaskItem layout:
 * checkbox circle + title text bar, with optional indentation for subtasks.
 */
export function SkeletonTaskItem({
  index = 0,
  indent = 0,
}: SkeletonTaskItemProps) {
  const width = TITLE_WIDTHS[index % TITLE_WIDTHS.length];

  return (
    <View
      className="flex-row items-center gap-3 py-3 px-1 border-b border-border"
      style={{ marginLeft: indent * 24 }}
    >
      <SkeletonBone className="w-6 h-6 rounded-full" />
      <SkeletonBone className="h-4 rounded" style={{ width }} />
    </View>
  );
}
