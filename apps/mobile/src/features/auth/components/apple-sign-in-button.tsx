import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";

import { AuthLoadingPanel } from "@/features/auth/components/auth-loading-panel";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { signInWithAppleAsync } from "@/lib/auth";
import type { SocialSignInState } from "@/types/app";

export const AppleSignInButton = () => {
  const { copy } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const [state, setState] = useState<SocialSignInState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (Platform.OS !== "ios") {
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
      <AppleAuthentication.AppleAuthenticationButton
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        cornerRadius={8}
        onPress={() => void handlePress()}
        style={styles.button}
      />
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
      height: 46,
      width: "100%",
    },
    container: {
      gap: 8,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: 12,
      lineHeight: 18,
    },
  });
