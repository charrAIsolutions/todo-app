import { Pressable, Text, Platform, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useState } from "react";

interface ListTabProps {
  name: string;
  isActive: boolean;
  isDragged?: boolean;
  onOpenSettings?: () => void;
}

const isWeb = Platform.OS === "web";

/**
 * Pure visual component for a todo list tab.
 * Gestures (tap, double-tap, drag) are handled by the wrapping DraggableTab.
 * Only the ellipsis button retains its own onPress for settings access.
 */
export function ListTab({
  name,
  isActive,
  isDragged = false,
  onOpenSettings,
}: ListTabProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <View
      onPointerEnter={isWeb ? () => setIsHovered(true) : undefined}
      onPointerLeave={isWeb ? () => setIsHovered(false) : undefined}
      testID={isActive ? "list-tab-active" : "list-tab"}
      className={`px-4 py-2.5 mr-1 rounded-lg ${
        isActive ? "bg-primary" : isDragged ? "bg-border" : "bg-transparent"
      }`}
      style={undefined}
    >
      <View className="flex-row items-center gap-2">
        <Text
          className={`text-[15px] font-medium ${
            isActive ? "text-white font-semibold" : "text-text-secondary"
          }`}
          style={isWeb ? { userSelect: "none" } : undefined}
        >
          {name}
        </Text>
        {onOpenSettings && (
          <Pressable
            onPointerEnter={isWeb ? () => setIsHovered(true) : undefined}
            onPress={(event) => {
              event?.stopPropagation?.();
              onOpenSettings();
            }}
            className="p-1 rounded-lg"
            style={{
              opacity: Platform.OS !== "web" || isHovered ? 1 : 0,
            }}
          >
            <FontAwesome
              name="ellipsis-v"
              size={14}
              color={isActive ? "#fff" : "rgb(var(--color-text-secondary))"}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}
