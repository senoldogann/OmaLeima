import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useRouter } from "expo-router";

import { fetchSessionAccessAsync } from "@/features/auth/session-access";
import { supabase } from "@/lib/supabase";

export const BusinessPasswordSignIn = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>("scanner@omaleima.test");
  const [password, setPassword] = useState<string>("password123");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePress = async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error !== null) {
      setIsLoading(false);
      setErrorMessage(error.message);
      return;
    }

    const userId = data.user?.id;

    if (typeof userId !== "string") {
      await supabase.auth.signOut();
      setIsLoading(false);
      setErrorMessage("Password sign-in returned without a user id.");
      return;
    }

    try {
      const access = await fetchSessionAccessAsync(userId);

      if (access.area !== "business" || access.homeHref === null) {
        await supabase.auth.signOut();
        setIsLoading(false);
        setErrorMessage("This account does not have active business staff access.");
        return;
      }

      setIsLoading(false);
      router.replace(access.homeHref);
    } catch (error) {
      await supabase.auth.signOut();
      setIsLoading(false);
      setErrorMessage(error instanceof Error ? error.message : "Unknown business sign-in error.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Business email</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="scanner@omaleima.test"
          placeholderTextColor="#64748B"
          style={styles.input}
          value={email}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          editable={!isLoading}
          onChangeText={setPassword}
          placeholder="password123"
          placeholderTextColor="#64748B"
          secureTextEntry
          style={styles.input}
          value={password}
        />
      </View>

      <Pressable
        disabled={isLoading || email.trim().length === 0 || password.length === 0}
        onPress={handlePress}
        style={[styles.button, isLoading ? styles.disabledButton : null]}
      >
        {isLoading ? <ActivityIndicator color="#F8FAFC" size="small" /> : null}
        <Text style={styles.buttonText}>{isLoading ? "Signing in..." : "Sign in with email"}</Text>
      </Pressable>

      <Text style={styles.helperText}>
        Local seed account: `scanner@omaleima.test / password123`
      </Text>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#1D4ED8",
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  container: {
    gap: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 12,
    lineHeight: 18,
  },
  fieldGroup: {
    gap: 6,
  },
  helperText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
  },
  input: {
    backgroundColor: "#0F172A",
    borderColor: "#334155",
    borderRadius: 8,
    borderWidth: 1,
    color: "#F8FAFC",
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  label: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
  },
});
