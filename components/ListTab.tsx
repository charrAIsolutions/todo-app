import { useRef } from "react";
import { Pressable, Text, StyleSheet } from "react-native";

interface ListTabProps {
  name: string;
  isActive: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

const DOUBLE_CLICK_DELAY = 300; // ms

/**
 * Individual tab button for a todo list.
 * Active state shows with different background/text color.
 * Long-press (mobile) or double-click (web) opens list settings.
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
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
        {name}
      </Text>
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
  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#666",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
});
