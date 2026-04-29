import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { mobileTheme } from "@/features/foundation/theme";

// AppScreen: pure black base with no decorative overlays.
export const AppScreen = ({ children }: PropsWithChildren) => (
  <SafeAreaView style={styles.safeArea}>
    <ScrollView contentContainerStyle={styles.content} style={styles.scrollView}>
      {children}
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: mobileTheme.colors.screenBase,
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
