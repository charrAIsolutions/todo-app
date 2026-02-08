import { View, ViewStyle } from "react-native";

interface SkeletonBoneProps {
  className?: string;
  style?: ViewStyle;
}

/**
 * Base skeleton building block — a rounded rectangle with the skeleton color.
 * Used by other skeleton components for individual placeholder shapes.
 */
export function SkeletonBone({ className = "", style }: SkeletonBoneProps) {
  return <View className={`bg-skeleton ${className}`} style={style} />;
}
