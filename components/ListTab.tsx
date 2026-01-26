import { Pressable, Text, StyleSheet, Platform, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface ListTabProps {
  name: string;
  isActive: boolean;
  onPress: () => void;
  onOpenSettings?: () => void;
}

const isWeb = Platform.OS === "web";

/**
 * Individual tab button for a todo list.
 * Active state shows with different background/text color.
 */
export function ListTab({
  name,
  isActive,
  onPress,
  onOpenSettings,
}: ListTabProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        isActive && styles.tabActive,
        pressed && styles.tabPressed,
      ]}
    >
      {({ hovered }) => {
        const showSettings = Platform.OS !== "web" || hovered;
        return (
          <View style={styles.tabContent}>
            <Text
              style={[
                styles.tabText,
                isActive && styles.tabTextActive,
                isWeb && styles.noSelect,
              ]}
            >
              {name}
            </Text>
            {onOpenSettings && (
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  onOpenSettings();
                }}
                style={[
                  styles.settingsButton,
                  showSettings
                    ? styles.settingsButtonVisible
                    : styles.settingsButtonHidden,
                ]}
              >
                <FontAwesome
                  name="ellipsis-h"
                  size={14}
                  color={isActive ? "#fff" : "#666"}
                />
              </Pressable>
            )}
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 4,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tabActive: {
    backgroundColor: "#007AFF",
  },
  tabPressed: {
    opacity: 0.7,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#666",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  settingsButton: {
    padding: 4,
    borderRadius: 8,
  },
  settingsButtonHidden: {
    opacity: 0,
  },
  settingsButtonVisible: {
    opacity: 1,
  },
  noSelect: {
    userSelect: "none",
  } as const,
});
