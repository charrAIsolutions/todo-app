import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Platform,
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useAppData } from "@/hooks/useAppData";
import { useAuth } from "@/store/AuthContext";
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
  const { showCompleted, setShowCompleted } = useAppData();
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to sign out?")) {
        performSignOut();
      }
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: performSignOut },
      ]);
    }
  };

  const performSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch {
      // AuthContext handles error logging
    } finally {
      setIsSigningOut(false);
    }
  };

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

        {/* Tasks Section */}
        <View className="mb-8">
          <Text className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide mb-3">
            Tasks
          </Text>
          <View className="bg-surface-secondary rounded-lg p-4 flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-[15px] font-semibold text-text">
                Show completed tasks
              </Text>
              <Text className="text-xs text-text-muted mt-1">
                Display tasks that have been checked off
              </Text>
            </View>
            <Switch
              value={showCompleted}
              onValueChange={setShowCompleted}
              trackColor={{ false: "#767577", true: "#3b82f6" }}
            />
          </View>
        </View>

        {/* Account Section */}
        {user && (
          <View className="mb-8">
            <Text className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Account
            </Text>
            <View className="bg-surface-secondary rounded-lg p-4">
              <Text className="text-sm text-text-secondary mb-3">
                Signed in as{" "}
                <Text className="font-semibold text-text">{user.email}</Text>
              </Text>
              <Pressable
                className={`rounded-lg py-3 items-center ${isSigningOut ? "bg-danger/60" : "bg-danger"}`}
                onPress={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-sm">
                    Sign Out
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* App Info Section */}
        <View className="mb-8">
          <Text className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide mb-3">
            About
          </Text>

          <View className="bg-surface-secondary rounded-lg p-4">
            <Text className="text-base text-text mb-2">
              <Text className="font-semibold">Version:</Text> 0.0.10.0
            </Text>
            <Text className="text-base text-text mb-2">
              <Text className="font-semibold">Phase:</Text> 10 - Supabase Sync
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
