import { StyleSheet, View } from "react-native";

import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles } from "@/features/preferences/ui-preferences-provider";

// Tab bar background: flat, solid, no glass effects.
export const GlassTabBarBackground = () => {
  const styles = useThemeStyles(createStyles);

  return <View style={styles.surface} />;
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    surface: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.screenBase,
      borderColor: "transparent",
      borderRadius: theme.radius.tabBar,
      borderWidth: 0,
    },
  });
