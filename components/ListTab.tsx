import { useRef } from "react";
import { Pressable, Text, StyleSheet, View, Platform } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface ListTabProps {
  name: string;
  isActive: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

const DOUBLE_CLICK_DELAY = 400; // ms
const isWeb = Platform.OS === "web";

/**
 * Individual tab button for a todo list.
 * Active state shows with different background/text color.
 * Long-press (mobile) or double-click (web) opens list settings.
 * On web, a settings icon appears on hover.
 */
export function ListTab({
  name,
  isActive,
  onPress,
  onLongPress,
}: ListTabProps) {
  const lastClickTime = useRef<number>(0);

  const handlePress = () => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime.current;

    if (timeSinceLastClick < DOUBLE_CLICK_DELAY) {
      // Double-click detected - trigger settings
      lastClickTime.current = 0; // Reset to prevent triple-click
      onLongPress?.();
    } else {
      // Single click - select the tab
      lastClickTime.current = now;
      onPress();
    }
  };

  const handleSettingsIconPress = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onLongPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.tab,
        isActive && styles.tabActive,
        pressed && styles.tabPressed,
      ]}
    >
      {({ hovered }: { hovered: boolean }) => (
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
          {isWeb && (
            <Pressable
              onPress={handleSettingsIconPress}
              hitSlop={8}
              style={({ pressed }) => [
                styles.settingsIcon,
                !hovered && styles.settingsIconHidden,
                pressed && styles.settingsIconPressed,
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
      )}
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
  tabActive: {
    backgroundColor: "#007AFF",
  },
  tabPressed: {
    opacity: 0.7,
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  settingsIcon: {
    padding: 2,
  },
  settingsIconHidden: {
    opacity: 0,
  },
  settingsIconPressed: {
    opacity: 0.5,
  },
  noSelect: {
    userSelect: "none",
  } as const,
});
