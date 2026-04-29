import { StyleSheet, View } from "react-native";

import { mobileTheme } from "@/features/foundation/theme";

// Tab bar background: flat, solid, no glass effects.
export const GlassTabBarBackground = () => (
  <View style={styles.surface} />
);

const styles = StyleSheet.create({
  surface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.tabBar,
    borderWidth: 1,
    borderTopColor: mobileTheme.colors.limeBorder,
    borderTopWidth: 1,
  },
});
