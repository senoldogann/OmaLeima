import "expo-dev-client";

import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text, TextInput, useColorScheme, type StyleProp, type TextStyle } from "react-native";

import { AppProviders } from "@/providers/app-providers";
import { mobileTheme } from "@/features/foundation/theme";

void SplashScreen.preventAutoHideAsync();

type TextComponentWithDefaults = typeof Text & {
  defaultProps?: {
    style?: StyleProp<TextStyle>;
  };
};

type TextInputComponentWithDefaults = typeof TextInput & {
  defaultProps?: {
    style?: StyleProp<TextStyle>;
  };
};

const applyTypographyDefaults = (): void => {
  const textComponent = Text as TextComponentWithDefaults;
  const inputComponent = TextInput as TextInputComponentWithDefaults;

  textComponent.defaultProps = {
    ...textComponent.defaultProps,
    style: [
      textComponent.defaultProps?.style,
      {
        color: mobileTheme.colors.textPrimary,
        fontFamily: mobileTheme.typography.families.regular,
      },
    ],
  };

  inputComponent.defaultProps = {
    ...inputComponent.defaultProps,
    style: [
      inputComponent.defaultProps?.style,
      {
        color: mobileTheme.colors.textPrimary,
        fontFamily: mobileTheme.typography.families.regular,
      },
    ],
  };
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular: require("@expo-google-fonts/poppins/400Regular/Poppins_400Regular.ttf"),
    Poppins_500Medium: require("@expo-google-fonts/poppins/500Medium/Poppins_500Medium.ttf"),
    Poppins_600SemiBold: require("@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf"),
    Poppins_700Bold: require("@expo-google-fonts/poppins/700Bold/Poppins_700Bold.ttf"),
    Poppins_800ExtraBold: require("@expo-google-fonts/poppins/800ExtraBold/Poppins_800ExtraBold.ttf"),
  });

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    applyTypographyDefaults();
    void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <AppProviders>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="student" />
              <Stack.Screen name="business" />
            </Stack>
            <StatusBar style="light" />
          </AppProviders>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
