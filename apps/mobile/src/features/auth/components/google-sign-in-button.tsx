import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { interactiveSurfaceShadowStyle, mobileTheme } from "@/features/foundation/theme";
import { signInWithGoogleAsync } from "@/lib/auth";
import type { GoogleSignInState } from "@/types/app";

export const GoogleSignInButton = () => {
  const [state, setState] = useState<GoogleSignInState>("idle");
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
        disabled={state === "loading"}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          state === "loading" ? styles.buttonDisabled : null,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        {state === "loading" ? <ActivityIndicator color="#F8FAFC" size="small" /> : null}
        {state !== "loading" ? <AppIcon color={mobileTheme.colors.screenBase} name="google" size={18} /> : null}
        <Text style={styles.buttonText}>
          {state === "loading" ? "Opening Google..." : "Continue with Google"}
        </Text>
      </Pressable>
      {state === "redirecting" ? (
        <Text style={styles.helperText}>Waiting for the Google auth redirect to come back into OmaLeima.</Text>
      ) : null}
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  button: {
    borderRadius: 8,
    backgroundColor: mobileTheme.colors.lime,
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
    color: mobileTheme.colors.screenBase,
    fontSize: 14,
    fontWeight: "800",
  },
  helperText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    color: "#FFC5C1",
    fontSize: 12,
    lineHeight: 18,
  },
});
