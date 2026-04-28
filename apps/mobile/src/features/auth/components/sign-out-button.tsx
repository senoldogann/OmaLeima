import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { interactiveSurfaceShadowStyle, mobileTheme } from "@/features/foundation/theme";
import { supabase } from "@/lib/supabase";

export const SignOutButton = () => {
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
        {isLoading ? <ActivityIndicator color="#F8FAFC" size="small" /> : null}
        <Text style={styles.buttonText}>{isLoading ? "Signing out..." : "Sign out"}</Text>
      </Pressable>
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
    backgroundColor: mobileTheme.colors.actionNeutral,
    borderColor: mobileTheme.colors.actionNeutralBorder,
    borderWidth: 1,
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
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  errorText: {
    color: "#FFC5C1",
    fontSize: 12,
    lineHeight: 18,
  },
});
