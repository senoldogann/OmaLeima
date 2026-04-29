import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useRouter } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { AuthLoadingPanel } from "@/features/auth/components/auth-loading-panel";
import { interactiveSurfaceShadowStyle, mobileTheme } from "@/features/foundation/theme";
import { fetchSessionAccessAsync } from "@/features/auth/session-access";
import { supabase } from "@/lib/supabase";

export const BusinessPasswordSignIn = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
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
          placeholder="scanner@example.com"
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
          placeholder="Use the current hosted scanner password"
          placeholderTextColor="#64748B"
          secureTextEntry
          style={styles.input}
          value={password}
        />
      </View>

      <Pressable
        disabled={isLoading || email.trim().length === 0 || password.length === 0}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          isLoading ? styles.disabledButton : null,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        {isLoading ? <ActivityIndicator color="#F8FAFC" size="small" /> : null}
        {isLoading ? null : <AppIcon color={mobileTheme.colors.screenBase} name="business" size={18} />}
        <Text style={styles.buttonText}>{isLoading ? "Signing in..." : "Sign in with email"}</Text>
      </Pressable>

      {isLoading ? (
        <AuthLoadingPanel
          message="Checking business access and opening the scanner tools."
          title="Signing in"
        />
      ) : null}

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.lime,
    borderRadius: mobileTheme.radius.button,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...interactiveSurfaceShadowStyle,
  },
  buttonPressed: {
    transform: [{ translateY: 1 }, { scale: 0.992 }],
  },
  buttonText: {
    color: mobileTheme.colors.screenBase,
    fontSize: 14,
    fontWeight: "800",
  },
  container: {
    gap: 12,
  },
  disabledButton: {
    opacity: 0.8,
  },
  errorText: {
    color: "#FFC5C1",
    fontSize: 12,
    lineHeight: 18,
  },
  fieldGroup: {
    gap: 7,
  },
  input: {
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderRadius: 16,
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  label: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
});
