import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";

import { AppIcon } from "@/components/app-icon";
import { AuthLoadingPanel } from "@/features/auth/components/auth-loading-panel";
import { interactiveSurfaceShadowStyle } from "@/features/foundation/theme";
import type { MobileTheme } from "@/features/foundation/theme";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { signInWithAppleAsync } from "@/lib/auth";
import type { SocialSignInState } from "@/types/app";

export const AppleSignInButton = () => {
  const theme = useAppTheme();
  const { copy } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const [state, setState] = useState<SocialSignInState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAvailabilityAsync = async (): Promise<void> => {
      if (Platform.OS !== "ios") {
        return;
      }

      try {
        const nextIsAvailable = await AppleAuthentication.isAvailableAsync();

        if (isMounted) {
          setIsAvailable(nextIsAvailable);
        }
      } catch {
        if (isMounted) {
          setIsAvailable(false);
        }
      }
    };

    void checkAvailabilityAsync();

    return () => {
      isMounted = false;
    };
  }, []);

  if (Platform.OS !== "ios" || !isAvailable) {
    return null;
  }

  const isBusy = state === "loading" || state === "redirecting";

  const handlePress = async (): Promise<void> => {
    if (isBusy) {
      return;
    }

    setState("loading");
    setErrorMessage(null);

    try {
      await signInWithAppleAsync();
      setState("redirecting");
    } catch (error) {
      setState("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown Apple sign-in error.");
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel={copy.auth.appleButton}
        accessibilityRole="button"
        accessibilityState={{ disabled: isBusy }}
        disabled={isBusy}
        onPress={() => void handlePress()}
        style={({ pressed }) => [
          styles.button,
          isBusy ? styles.buttonDisabled : null,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        {state === "loading" ? <ActivityIndicator color={theme.colors.screenBase} size="small" /> : null}
        {state !== "loading" ? <AppIcon color={theme.colors.screenBase} name="apple" size={19} /> : null}
        <Text style={styles.buttonText}>
          {state === "loading" ? copy.auth.appleOpening : copy.auth.appleButton}
        </Text>
      </Pressable>
      {state === "loading" ? (
        <AuthLoadingPanel
          message={copy.auth.applePreparing}
          title={copy.auth.appleOpening}
        />
      ) : null}
      {state === "redirecting" ? (
        <AuthLoadingPanel
          message={copy.auth.appleRedirecting}
          title={copy.auth.appleReturning}
        />
      ) : null}
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    button: {
      alignItems: "center",
      backgroundColor: theme.mode === "dark" ? "#F8FAF5" : "#050705",
      borderRadius: 10,
      flexDirection: "row",
      gap: 10,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 14,
      paddingVertical: 12,
      ...interactiveSurfaceShadowStyle,
    },
    buttonDisabled: {
      opacity: 0.78,
    },
    buttonPressed: {
      transform: [{ translateY: 1 }, { scale: 0.992 }],
    },
    buttonText: {
      color: theme.colors.screenBase,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    container: {
      gap: 8,
    },
    errorText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
  });
