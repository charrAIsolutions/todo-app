import { useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  Keyboard,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface AddTaskInputProps {
  onAddTask: (title: string) => void;
  placeholder?: string;
}

/**
 * Input field for adding new tasks.
 * Shows at the bottom of the task list with a text input and add button.
 */
export function AddTaskInput({
  onAddTask,
  placeholder = "Add a task...",
}: AddTaskInputProps) {
  const [title, setTitle] = useState("");

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (trimmed) {
      onAddTask(trimmed);
      setTitle("");
      Keyboard.dismiss();
    }
  };

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
      <Pressable
        onPress={handleSubmit}
        disabled={!title.trim()}
        style={({ pressed }) => [
          styles.addButton,
          !title.trim() && styles.addButtonDisabled,
          pressed && styles.addButtonPressed,
        ]}
      >
        <FontAwesome
          name="plus"
          size={18}
          color={title.trim() ? "#fff" : "#ccc"}
        />
      </Pressable>
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
  addButtonPressed: {
    opacity: 0.8,
  },
});
