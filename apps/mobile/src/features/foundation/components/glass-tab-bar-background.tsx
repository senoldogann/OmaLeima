import { StyleSheet, View } from "react-native";

import { mobileTheme } from "@/features/foundation/theme";

// Tab bar background: flat, solid, no glass effects.
export const GlassTabBarBackground = () => (
  <View style={styles.surface} />
);

const styles = StyleSheet.create({
  surface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: mobileTheme.colors.screenBase,
    borderColor: "transparent",
    borderRadius: mobileTheme.radius.tabBar,
    borderWidth: 0,
  },
});
