import { View, Text } from "react-native";

export default function TabTwoScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-xl font-bold text-text">Tab Two</Text>
      <View className="my-8 h-px w-4/5 bg-border" />
      <Text className="text-sm text-text-secondary px-4 text-center">
        This is a placeholder tab. It can be used for additional features.
      </Text>
    </View>
  );
}
