import { Pressable, Text, Platform, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";

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

  const handleLongPress = useCallback(() => {
    if (!onOpenSettings) return;
    if (!isWeb) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onOpenSettings();
  }, [onOpenSettings]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onOpenSettings ? handleLongPress : undefined}
      delayLongPress={300}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      testID={isActive ? "list-tab-active" : "list-tab"}
      className={`px-4 py-2.5 mr-1 rounded-lg ${
        isActive ? "bg-primary" : "bg-transparent active:opacity-70"
      }`}
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
            onHoverIn={() => setIsHovered(true)}
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
    </Pressable>
  );
}
