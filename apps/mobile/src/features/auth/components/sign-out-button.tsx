import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import {
  interactiveSurfaceShadowStyle,
  type MobileTheme,
} from "@/features/foundation/theme";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { supabase } from "@/lib/supabase";

export const SignOutButton = () => {
  const theme = useAppTheme();
  const { copy } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePress = async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signOut();

    if (error !== null) {
      setIsLoading(false);
      setErrorMessage(error.message);
      return;
    }

    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <Pressable
        disabled={isLoading}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          isLoading ? styles.buttonDisabled : null,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        {isLoading ? <ActivityIndicator color={theme.colors.textPrimary} size="small" /> : null}
        {isLoading ? null : <AppIcon color={theme.colors.textPrimary} name="logout" size={17} />}
        <Text style={styles.buttonText}>{isLoading ? copy.common.signingOut : copy.common.signOut}</Text>
      </Pressable>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    container: {
      gap: 8,
    },
    button: {
      borderRadius: 8,
      backgroundColor: theme.colors.actionNeutral,
      paddingHorizontal: 14,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 46,
      flexDirection: "row",
      gap: 10,
      ...interactiveSurfaceShadowStyle,
    },
    buttonDisabled: {
      opacity: 0.82,
    },
    buttonPressed: {
      transform: [{ translateY: 1 }, { scale: 0.992 }],
    },
    buttonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
    },
    errorText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
  });
