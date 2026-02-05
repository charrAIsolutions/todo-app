import { useState } from "react";
import { View, TextInput, Keyboard, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { SPRING } from "@/lib/animations";

interface AddTaskInputProps {
  onAddTask: (title: string) => void;
  placeholder?: string;
}

// Create animated pressable component
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Input field for adding new tasks.
 * Shows at the bottom of the task list with a text input and add button.
 * Features animated button press feedback.
 */
export function AddTaskInput({
  onAddTask,
  placeholder = "Add a task...",
}: AddTaskInputProps) {
  const [title, setTitle] = useState("");
  const buttonScale = useSharedValue(1);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (trimmed) {
      onAddTask(trimmed);
      setTitle("");
      Keyboard.dismiss?.();
    }
  };

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.95, SPRING.snappy);
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, SPRING.snappy);
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const isDisabled = !title.trim();

  return (
    <View className="flex-row items-center px-4 py-3 border-t border-border bg-surface">
      <TextInput
        className="flex-1 h-11 px-4 bg-surface-secondary rounded-full text-base text-text mr-3"
        value={title}
        onChangeText={setTitle}
        placeholder={placeholder}
        placeholderTextColor="rgb(var(--color-text-muted))"
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
      />
      <AnimatedPressable
        onPress={handleSubmit}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        className={`w-11 h-11 rounded-full items-center justify-center ${
          isDisabled ? "bg-border" : "bg-primary"
        }`}
        style={animatedButtonStyle}
      >
        <FontAwesome
          name="plus"
          size={18}
          color={isDisabled ? "rgb(var(--color-text-muted))" : "#fff"}
        />
      </AnimatedPressable>
    </View>
  );
}
