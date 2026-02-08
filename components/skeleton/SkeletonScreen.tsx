import { useEffect } from "react";
import { View, ScrollView } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SKELETON } from "@/lib/animations";
import { SkeletonTabBar } from "./SkeletonTabBar";
import { SkeletonCategorySection } from "./SkeletonCategorySection";
import { SkeletonAddTaskInput } from "./SkeletonAddTaskInput";

/**
 * Full-screen skeleton loading state that mirrors the TodoScreen layout.
 * Uses a single Animated.View with an opacity pulse so all skeleton
 * elements animate in perfect sync with one shared value.
 */
export function SkeletonScreen() {
  const opacity = useSharedValue<number>(SKELETON.opacityHigh);

  useEffect(() => {
    // eslint-disable-next-line react-compiler/react-compiler
    opacity.value = withRepeat(
      withSequence(
        withTiming(SKELETON.opacityLow, { duration: SKELETON.durationDown }),
        withTiming(SKELETON.opacityHigh, { duration: SKELETON.durationUp }),
      ),
      -1,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View className="flex-1 bg-background">
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <SkeletonTabBar />
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        >
          <SkeletonCategorySection sectionIndex={0} taskCount={3} />
          <SkeletonCategorySection sectionIndex={1} taskCount={3} />
          <SkeletonCategorySection sectionIndex={2} taskCount={2} />
        </ScrollView>
        <SkeletonAddTaskInput />
      </Animated.View>
    </View>
  );
}
