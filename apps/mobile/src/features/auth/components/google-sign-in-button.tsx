import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AuthLoadingPanel } from "@/features/auth/components/auth-loading-panel";
import {
  interactiveSurfaceShadowStyle,
  type MobileTheme,
} from "@/features/foundation/theme";
import { useAppTheme, useUiPreferences, useThemeStyles } from "@/features/preferences/ui-preferences-provider";
import { signInWithGoogleAsync } from "@/lib/auth";
import type { SocialSignInState } from "@/types/app";

export const GoogleSignInButton = () => {
  const theme = useAppTheme();
  const { copy } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const [state, setState] = useState<SocialSignInState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePress = async (): Promise<void> => {
    setState("loading");
    setErrorMessage(null);

    try {
      await signInWithGoogleAsync();
      setState("redirecting");
    } catch (error) {
      setState("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown Google sign-in error.");
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityState={{ disabled: state === "loading" || state === "redirecting" }}
        disabled={state === "loading" || state === "redirecting"}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          state === "loading" || state === "redirecting" ? styles.buttonDisabled : null,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        {state === "loading" ? <ActivityIndicator color={theme.colors.actionPrimaryText} size="small" /> : null}
        {state !== "loading" ? <AppIcon color={theme.colors.actionPrimaryText} name="google" size={18} /> : null}
        <Text style={styles.buttonText}>
          {state === "loading" ? copy.auth.googleOpening : copy.auth.googleButton}
        </Text>
      </Pressable>
      {state === "loading" ? (
        <AuthLoadingPanel
          message={copy.auth.googlePreparing}
          title={copy.auth.googleOpening}
        />
      ) : null}
      {state === "redirecting" ? (
        <AuthLoadingPanel
          message={copy.auth.googleRedirecting}
          title={copy.auth.googleReturning}
        />
      ) : null}
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
      backgroundColor: theme.colors.lime,
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
      opacity: 0.8,
    },
    buttonPressed: {
      transform: [{ translateY: 1 }, { scale: 0.992 }],
    },
    buttonText: {
      color: theme.colors.actionPrimaryText,
      fontSize: 14,
      fontWeight: "800",
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: 12,
      lineHeight: 18,
    },
  });
