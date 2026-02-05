import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme } from "nativewind";
import { storage } from "@/lib/storage";
import { ThemePreference, ColorScheme, ThemeContextValue } from "@/types/theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    async function loadPreference() {
      const saved = await storage.getThemePreference();
      if (saved) {
        setPreferenceState(saved);
      }
      setIsLoaded(true);
    }
    loadPreference();
  }, []);

  // Calculate effective scheme from preference + system
  const effectiveScheme: ColorScheme = useMemo(() => {
    if (preference === "system") {
      return systemScheme === "dark" ? "dark" : "light";
    }
    return preference;
  }, [preference, systemScheme]);

  // Apply the scheme to NativeWind whenever it changes
  // Always use explicit effectiveScheme to ensure React Navigation and NativeWind stay in sync
  // (NativeWind's "system" detection may differ from React Native's useColorScheme on web)
  useEffect(() => {
    if (!isLoaded) return;
    colorScheme.set(effectiveScheme);
  }, [effectiveScheme, isLoaded]);

  // Persist and update preference
  const setPreference = useCallback(
    async (newPreference: ThemePreference) => {
      const previousPreference = preference;
      setPreferenceState(newPreference);

      try {
        await storage.setThemePreference(newPreference);
      } catch (error) {
        // Revert state if storage fails to keep UI in sync with persisted state
        setPreferenceState(previousPreference);
        console.error("Failed to save theme preference:", error);
      }
    },
    [preference],
  );

  const value: ThemeContextValue = useMemo(
    () => ({
      preference,
      effectiveScheme,
      setPreference,
    }),
    [preference, effectiveScheme, setPreference],
  );

  // Don't render children until preference is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}
