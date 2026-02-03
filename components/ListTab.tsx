import { Pressable, Text, StyleSheet, Platform, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useState } from "react";

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
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      testID={isActive ? "list-tab-active" : "list-tab"}
      style={({ pressed }) => [
        styles.tab,
        isActive && styles.tabActive,
        pressed && styles.tabPressed,
      ]}
    >
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
            onHoverIn={() => setIsHovered(true)}
            onPress={(event) => {
              event?.stopPropagation?.();
              onOpenSettings();
            }}
            style={[
              styles.settingsButton,
              Platform.OS !== "web" || isHovered
                ? styles.settingsButtonVisible
                : styles.settingsButtonHidden,
            ]}
          >
            <FontAwesome
              name="ellipsis-v"
              size={14}
              color={isActive ? "#fff" : "#666"}
            />
          </Pressable>
        )}
      </View>
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
