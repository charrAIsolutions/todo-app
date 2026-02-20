import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useSegments, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "./global.css";

import { AppProvider, useAppContext } from "@/store/AppContext";
import { ThemeProvider, useThemeContext } from "@/store/ThemeContext";
import { AuthProvider, useAuth } from "@/store/AuthContext";

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
        <AuthProvider>
          <AppProvider>
            <SplashScreenManager fontsLoaded={fontsLoaded} />
            <ThemedNavigator />
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Hides the Expo splash screen once fonts, auth check, AND data hydration are complete.
 * Renders nothing — just a side-effect component.
 */
function SplashScreenManager({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { state } = useAppContext();
  const { isLoading: authLoading, session } = useAuth();
  const hasHidden = useRef(false);

  useEffect(() => {
    // Wait for fonts + auth check. If no session, skip waiting for data hydration
    // (user will see login screen with no data to load).
    const authReady = !authLoading;
    const dataReady = !session || !state.isLoading;

    if (fontsLoaded && authReady && dataReady && !hasHidden.current) {
      hasHidden.current = true;
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authLoading, session, state.isLoading]);

  return null;
}

function ThemedNavigator() {
  const { effectiveScheme } = useThemeContext();
  const { session, isLoading: authLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (authLoading) return;

    const inAuthGroup = (segments[0] as string) === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login" as never);
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, authLoading, segments]);

  return (
    <NavigationThemeProvider
      value={effectiveScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
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
