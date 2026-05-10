import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { hapticImpact, hapticNotification, ImpactStyle, NotificationType } from "@/features/foundation/safe-haptics";

import { AppIcon } from "@/components/app-icon";
import {
  interactiveSurfaceShadowStyle,
  type MobileTheme,
} from "@/features/foundation/theme";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { supabase } from "@/lib/supabase";

export const SignOutButton = () => {
  const theme = useAppTheme();
  const { copy, language } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirmPress = (): void => {
    hapticImpact(ImpactStyle.Light);
    setIsConfirming(true);
    setErrorMessage(null);
  };

  const handleCancelPress = (): void => {
    hapticImpact(ImpactStyle.Light);
    setIsConfirming(false);
    setErrorMessage(null);
  };

  const handleSignOut = async (): Promise<void> => {
    hapticNotification(NotificationType.Warning);
    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signOut();

    if (error !== null) {
      setIsLoading(false);
      setIsConfirming(false);
      setErrorMessage(error.message);
      return;
    }

    setIsLoading(false);
  };

  if (isConfirming) {
    return (
      <View style={styles.container}>
        <Text style={styles.confirmLabel}>
          {language === "fi" ? "Kirjaudutaanko ulos?" : "Sign out?"}
        </Text>
        <View style={styles.confirmRow}>
          <Pressable
            disabled={isLoading}
            onPress={() => void handleSignOut()}
            style={({ pressed }) => [
              styles.button,
              styles.buttonDanger,
              isLoading ? styles.buttonDisabled : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.danger} size="small" />
            ) : (
              <AppIcon color={theme.colors.danger} name="logout" size={17} />
            )}
            <Text style={[styles.buttonText, styles.buttonTextDanger]}>
              {isLoading
                ? copy.common.signingOut
                : language === "fi"
                  ? "Kyllä, kirjaudu ulos"
                  : "Yes, sign out"}
            </Text>
          </Pressable>
          <Pressable
            disabled={isLoading}
            onPress={handleCancelPress}
            style={({ pressed }) => [
              styles.cancelButton,
              isLoading ? styles.buttonDisabled : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.cancelButtonText}>
              {language === "fi" ? "Peruuta" : "Cancel"}
            </Text>
          </Pressable>
        </View>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        disabled={isLoading}
        onPress={handleConfirmPress}
        style={({ pressed }) => [
          styles.button,
          isLoading ? styles.buttonDisabled : null,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color={theme.colors.textPrimary} size="small" />
        ) : (
          <AppIcon color={theme.colors.textPrimary} name="logout" size={17} />
        )}
        <Text style={styles.buttonText}>
          {isLoading ? copy.common.signingOut : copy.common.signOut}
        </Text>
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
    buttonDanger: {
      backgroundColor: theme.mode === "dark"
        ? "rgba(220, 60, 60, 0.14)"
        : "rgba(220, 60, 60, 0.08)",
      borderWidth: 1,
      borderColor: "rgba(220, 60, 60, 0.3)",
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
    buttonTextDanger: {
      color: theme.colors.danger,
    },
    cancelButton: {
      flex: 1,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceL2,
      paddingHorizontal: 14,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 46,
    },
    cancelButtonText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
    },
    confirmLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      textAlign: "center",
    },
    confirmRow: {
      flexDirection: "row",
      gap: 8,
    },
    errorText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
  });
