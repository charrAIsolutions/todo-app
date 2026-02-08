import { View } from "react-native";
import { SkeletonBone } from "./SkeletonBone";

/**
 * Skeleton placeholder for the AddTaskInput:
 * rounded input bar + circular add button.
 */
export function SkeletonAddTaskInput() {
  return (
    <View className="flex-row items-center px-4 py-3 border-t border-border bg-surface">
      <SkeletonBone className="flex-1 h-11 rounded-full mr-3" />
      <SkeletonBone className="w-11 h-11 rounded-full" />
    </View>
  );
}
