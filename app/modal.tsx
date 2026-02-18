import { StatusBar } from "expo-status-bar";
import { Platform, View, Text, Pressable, ScrollView } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import type { ThemePreference } from "@/types/theme";

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
}[] = [
  { value: "light", label: "Light", description: "Always use light mode" },
  { value: "dark", label: "Dark", description: "Always use dark mode" },
  { value: "system", label: "System", description: "Follow device settings" },
];

export default function ModalScreen() {
  const { preference, setPreference, effectiveScheme } = useTheme();

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-4">
        <Text className="text-2xl font-bold text-text mb-6">Settings</Text>

        {/* Theme Section */}
        <View className="mb-8">
          <Text className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide mb-3">
            Appearance
          </Text>

          <View className="flex-row gap-2">
            {THEME_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                className={`flex-1 p-3 rounded-lg border-2 ${
                  preference === option.value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-surface-secondary"
                }`}
                onPress={() => setPreference(option.value)}
              >
                <Text
                  className={`text-base font-semibold text-center mb-1 ${
                    preference === option.value ? "text-primary" : "text-text"
                  }`}
                >
                  {option.label}
                </Text>
                <Text className="text-xs text-text-muted text-center">
                  {option.description}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-sm text-text-secondary mt-3 text-center">
            Currently using:{" "}
            <Text className="font-semibold">{effectiveScheme}</Text> mode
          </Text>
        </View>

        {/* App Info Section */}
        <View className="mb-8">
          <Text className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide mb-3">
            About
          </Text>

          <View className="bg-surface-secondary rounded-lg p-4">
            <Text className="text-base text-text mb-2">
              <Text className="font-semibold">Version:</Text> 0.0.9.8
            </Text>
            <Text className="text-base text-text mb-2">
              <Text className="font-semibold">Phase:</Text> 9 - iOS TestFlight
            </Text>
            <Text className="text-sm text-text-muted mt-2">
              A personal todo app built with React Native, Expo, and NativeWind.
            </Text>
          </View>
        </View>
      </View>

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </ScrollView>
  );
}
