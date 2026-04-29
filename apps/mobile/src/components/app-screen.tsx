import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { mobileTheme } from "@/features/foundation/theme";

// AppScreen: pure black base with no decorative overlays.
export const AppScreen = ({ children }: PropsWithChildren) => (
  <SafeAreaView style={styles.safeArea}>
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      style={styles.keyboardAvoidingView}
    >
      <ScrollView
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: mobileTheme.colors.screenBase,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    gap: mobileTheme.spacing.sectionGap,
    paddingHorizontal: mobileTheme.spacing.screenHorizontal,
    paddingTop: mobileTheme.spacing.screenVertical,
    paddingBottom: 144,
  },
});
