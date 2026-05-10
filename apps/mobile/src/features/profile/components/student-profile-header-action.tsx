import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { AppIcon } from "@/components/app-icon";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";

type StudentProfileHeaderActionProps = {
  route?: "/student/profile";
  showLabel?: boolean;
};

export const StudentProfileHeaderAction = ({
  route = "/student/profile",
  showLabel = true,
}: StudentProfileHeaderActionProps) => {
  const router = useRouter();
  const { language, theme } = useUiPreferences();
  const styles = useThemeStyles(createStyles);

  return (
    <Pressable
      accessibilityHint={language === "fi" ? "Avaa opiskelijaprofiili" : "Open student profile"}
      accessibilityLabel={language === "fi" ? "Profiili" : "Profile"}
      accessibilityRole="button"
      hitSlop={12}
      onPress={() =>
        router.push({
          pathname: route,
          params: {
            openedAt: String(Date.now()),
          },
        })
      }
      pressRetentionOffset={12}
      style={styles.button}
    >
      <AppIcon color={theme.colors.textPrimary} name="user" size={18} />
      {showLabel ? <Text style={styles.label}>{language === "fi" ? "Profiili" : "Profile"}</Text> : null}
    </Pressable>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    button: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flexDirection: "row",
      gap: 8,
      height: 42,
      justifyContent: "center",
      minWidth: 42,
      paddingHorizontal: 14,
    },
    label: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
  });
