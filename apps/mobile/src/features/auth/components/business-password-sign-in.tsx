import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { AuthLoadingPanel } from "@/features/auth/components/auth-loading-panel";
import { fetchSessionAccessAsync } from "@/features/auth/session-access";
import {
  interactiveSurfaceShadowStyle,
  type MobileTheme,
} from "@/features/foundation/theme";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { supabase } from "@/lib/supabase";

export const BusinessPasswordSignIn = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const { copy } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const passwordInputRef = useRef<TextInput | null>(null);
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
        setErrorMessage(copy.business.accessMissing);
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

  const canSubmit = !isLoading && email.trim().length > 0 && password.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{copy.auth.businessEmail}</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
          keyboardType="email-address"
          onChangeText={setEmail}
          onSubmitEditing={() => passwordInputRef.current?.focus()}
          placeholder={copy.auth.businessEmailPlaceholder}
          placeholderTextColor={theme.colors.textDim}
          returnKeyType="next"
          style={styles.input}
          submitBehavior="submit"
          value={email}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{copy.auth.businessPassword}</Text>
        <TextInput
          editable={!isLoading}
          onChangeText={setPassword}
          onSubmitEditing={() => {
            if (canSubmit) {
              void handlePress();
            }
          }}
          placeholder={copy.auth.businessPasswordPlaceholder}
          placeholderTextColor={theme.colors.textDim}
          ref={passwordInputRef}
          returnKeyType="done"
          secureTextEntry
          style={styles.input}
          submitBehavior="blurAndSubmit"
          value={password}
        />
      </View>

      <Pressable
        disabled={!canSubmit}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          !canSubmit ? styles.disabledButton : null,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        {isLoading ? <ActivityIndicator color={theme.colors.screenBase} size="small" /> : null}
        {isLoading ? null : <AppIcon color={theme.colors.screenBase} name="business" size={18} />}
        <Text style={styles.buttonText}>{isLoading ? copy.auth.businessSigningIn : copy.auth.businessButton}</Text>
      </Pressable>

      {isLoading ? (
        <AuthLoadingPanel
          message={copy.auth.businessCheckingAccess}
          title={copy.auth.businessSigningIn}
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
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
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
      color: theme.colors.screenBase,
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
      color: theme.colors.danger,
      fontSize: 12,
      lineHeight: 18,
    },
    fieldGroup: {
      gap: 7,
    },
    input: {
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: 16,
      color: theme.colors.textPrimary,
      fontSize: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    label: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
  });
