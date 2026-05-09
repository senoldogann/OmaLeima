import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { AppIcon } from "@/components/app-icon";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";

type StudentProfileHeaderActionProps = {
    route?: "/student/profile";
};

export const StudentProfileHeaderAction = ({
    route = "/student/profile",
}: StudentProfileHeaderActionProps) => {
    const router = useRouter();
    const { language, theme } = useUiPreferences();
    const styles = useThemeStyles(createStyles);

    return (
        <Pressable
            accessibilityHint={language === "fi" ? "Avaa opiskelijaprofiili" : "Open student profile"}
            accessibilityLabel={language === "fi" ? "Profiili" : "Profile"}
            accessibilityRole="button"
            onPress={() =>
                router.push({
                    pathname: route,
                    params: {
                        openedAt: String(Date.now()),
                    },
                })
            }
            style={styles.button}
        >
            <AppIcon color={theme.colors.textPrimary} name="user" size={18} />
            <Text style={styles.label}>{language === "fi" ? "Profiili" : "Profile"}</Text>
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
            paddingHorizontal: 14,
        },
        label: {
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.families.semibold,
            fontSize: theme.typography.sizes.bodySmall,
            lineHeight: theme.typography.lineHeights.bodySmall,
        },
    });
