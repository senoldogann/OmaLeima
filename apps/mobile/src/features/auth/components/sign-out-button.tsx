import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

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
      <Pressable disabled={isLoading} onPress={handlePress} style={styles.button}>
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
    backgroundColor: "#334155",
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
  errorText: {
    color: "#FCA5A5",
    fontSize: 12,
    lineHeight: 18,
  },
});
