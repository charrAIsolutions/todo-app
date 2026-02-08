import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "./global.css";

import { AppProvider, useAppContext } from "@/store/AppContext";
import { ThemeProvider, useThemeContext } from "@/store/ThemeContext";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav fontsLoaded={loaded} />;
}

function RootLayoutNav({ fontsLoaded }: { fontsLoaded: boolean }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppProvider>
          <SplashScreenManager fontsLoaded={fontsLoaded} />
          <ThemedNavigator />
        </AppProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Hides the Expo splash screen once both fonts AND data hydration are complete.
 * Renders nothing — just a side-effect component.
 */
function SplashScreenManager({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { state } = useAppContext();
  const hasHidden = useRef(false);

  useEffect(() => {
    if (fontsLoaded && !state.isLoading && !hasHidden.current) {
      hasHidden.current = true;
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, state.isLoading]);

  return null;
}

function ThemedNavigator() {
  const { effectiveScheme } = useThemeContext();

  return (
    <NavigationThemeProvider
      value={effectiveScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        <Stack.Screen
          name="task/[id]"
          options={{
            presentation: "modal",
            title: "Task Details",
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
    </NavigationThemeProvider>
  );
}
