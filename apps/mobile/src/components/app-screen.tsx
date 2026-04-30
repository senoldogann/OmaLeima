import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles } from "@/features/preferences/ui-preferences-provider";

// AppScreen: pure black base with no decorative overlays.
export const AppScreen = ({ children }: PropsWithChildren) => {
  const styles = useThemeStyles(createStyles);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.content}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          style={styles.scrollView}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.screenBase,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      gap: theme.spacing.sectionGap,
      paddingHorizontal: theme.spacing.screenHorizontal,
      paddingTop: theme.spacing.screenVertical,
      paddingBottom: 144,
    },
  });
