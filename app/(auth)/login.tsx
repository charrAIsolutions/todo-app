import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@/store/AuthContext";

type AuthMode = "login" | "signup";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError(null);
    setConfirmationMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
      } else {
        const result = await signUp(email.trim(), password);
        if (result === "confirmation_required") {
          setConfirmationMessage(
            "An email has been sent to you to confirm account creation. Please click the link included to continue the sign up process.",
          );
          setMode("login");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setError(null);
    setConfirmationMessage(null);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center px-6">
        <View className="items-center mb-10">
          <Text className="text-4xl font-bold text-text mb-2">Todo</Text>
          <Text className="text-base text-text-secondary">
            {mode === "login"
              ? "Sign in to sync your tasks"
              : "Create an account to get started"}
          </Text>
        </View>

        <View className="bg-surface rounded-2xl p-6 shadow-sm">
          {/* Mode Toggle */}
          <View className="flex-row bg-surface-secondary rounded-lg p-1 mb-6">
            <Pressable
              className={`flex-1 py-2 rounded-md ${mode === "login" ? "bg-background" : ""}`}
              onPress={() => {
                setMode("login");
                setError(null);
              }}
            >
              <Text
                className={`text-center font-semibold ${mode === "login" ? "text-text" : "text-text-muted"}`}
              >
                Sign In
              </Text>
            </Pressable>
            <Pressable
              className={`flex-1 py-2 rounded-md ${mode === "signup" ? "bg-background" : ""}`}
              onPress={() => {
                setMode("signup");
                setError(null);
              }}
            >
              <Text
                className={`text-center font-semibold ${mode === "signup" ? "text-text" : "text-text-muted"}`}
              >
                Sign Up
              </Text>
            </Pressable>
          </View>

          {/* Email */}
          <Text className="text-sm font-medium text-text-secondary mb-1.5">
            Email
          </Text>
          <TextInput
            className="bg-surface-secondary text-text rounded-lg px-4 py-3 mb-4 text-base"
            placeholder="you@example.com"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
          />

          {/* Password */}
          <Text className="text-sm font-medium text-text-secondary mb-1.5">
            Password
          </Text>
          <TextInput
            className="bg-surface-secondary text-text rounded-lg px-4 py-3 mb-4 text-base"
            placeholder="At least 6 characters"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isSubmitting}
            onSubmitEditing={handleSubmit}
          />

          {/* Confirmation message */}
          {confirmationMessage && (
            <View className="bg-success/10 rounded-lg px-4 py-3 mb-4">
              <Text className="text-success text-sm">
                {confirmationMessage}
              </Text>
            </View>
          )}

          {/* Error */}
          {error && (
            <View className="bg-danger/10 rounded-lg px-4 py-3 mb-4">
              <Text className="text-danger text-sm">{error}</Text>
            </View>
          )}

          {/* Submit */}
          <Pressable
            className={`rounded-lg py-3.5 items-center ${isSubmitting ? "bg-primary/60" : "bg-primary"}`}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                {mode === "login" ? "Sign In" : "Create Account"}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Bottom toggle */}
        <Pressable className="mt-6 items-center" onPress={toggleMode}>
          <Text className="text-text-secondary text-sm">
            {mode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}
            <Text className="text-primary font-semibold">
              {mode === "login" ? "Sign Up" : "Sign In"}
            </Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
