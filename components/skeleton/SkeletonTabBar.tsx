import { View } from "react-native";
import { SkeletonBone } from "./SkeletonBone";

// Tab widths to mimic varied list names
const TAB_WIDTHS = [60, 80, 70];

/**
 * Skeleton placeholder for the ListTabBar:
 * 3 tab bones + add button bone in a horizontal row.
 */
export function SkeletonTabBar() {
  return (
    <View className="flex-row items-center border-b border-border bg-surface-secondary px-3 py-2">
      {TAB_WIDTHS.map((width, i) => (
        <SkeletonBone
          key={i}
          className="h-9 rounded-lg mr-2"
          style={{ width }}
        />
      ))}
      <View className="flex-1" />
      <SkeletonBone className="w-9 h-9 rounded-full" />
    </View>
  );
}
