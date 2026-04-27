import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

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
      <Pressable disabled={state === "loading"} onPress={handlePress} style={styles.button}>
        {state === "loading" ? <ActivityIndicator color="#F8FAFC" size="small" /> : null}
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
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    flexDirection: "row",
    gap: 10,
  },
  buttonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  helperText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 12,
    lineHeight: 18,
  },
});
