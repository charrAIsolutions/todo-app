import { useState } from "react";
import { View, TextInput, StyleSheet, Keyboard, Pressable } from "react-native";
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

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder={placeholder}
        placeholderTextColor="#999"
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
      />
      <AnimatedPressable
        onPress={handleSubmit}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!title.trim()}
        style={[
          styles.addButton,
          !title.trim() && styles.addButtonDisabled,
          animatedButtonStyle,
        ]}
      >
        <FontAwesome
          name="plus"
          size={18}
          color={title.trim() ? "#fff" : "#ccc"}
        />
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 22,
    fontSize: 16,
    marginRight: 12,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonDisabled: {
    backgroundColor: "#e0e0e0",
  },
});
