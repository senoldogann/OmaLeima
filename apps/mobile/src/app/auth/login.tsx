import { useState } from "react";
import { Redirect } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { AuthLoadingPanel } from "@/features/auth/components/auth-loading-panel";
import { BusinessPasswordSignIn } from "@/features/auth/components/business-password-sign-in";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { LoginHero } from "@/features/auth/components/login-hero";
import { useSessionAccessQuery } from "@/features/auth/session-access";
import type { MobileTheme } from "@/features/foundation/theme";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

type LoginMode = "student" | "business";

export default function LoginScreen() {
  const theme = useAppTheme();
  const { copy } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const { isAuthenticated, isLoading, session } = useSession();
  const accessQuery = useSessionAccessQuery({
    userId: session?.user.id ?? "",
    isEnabled: isAuthenticated && session !== null,
  });
  const [mode, setMode] = useState<LoginMode>("student");
  const isResolvingAccess = !isLoading && isAuthenticated && accessQuery.isLoading;

  if (!isLoading && isAuthenticated && accessQuery.data?.homeHref !== null && typeof accessQuery.data !== "undefined") {
    return <Redirect href={accessQuery.data.homeHref} />;
  }

  if (isLoading || isResolvingAccess) {
    return (
      <AppScreen>
        <LoginHero />
        <AuthLoadingPanel
          message={copy.auth.openingMessage}
          title={copy.auth.opening}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <LoginHero />

      <InfoCard
        eyebrow={copy.auth.continueEyebrow}
        motionIndex={1}
        title={mode === "student" ? copy.auth.studentSignIn : copy.auth.businessSignIn}
      >
        <View style={styles.modeSelector}>
          <Pressable
            onPress={() => setMode("student")}
            style={({ pressed }) => [
              styles.modeButton,
              mode === "student" ? styles.modeButtonActive : null,
              pressed ? styles.modeButtonPressed : null,
            ]}
          >
            <AppIcon color={mode === "student" ? theme.colors.screenBase : theme.colors.textPrimary} name="google" size={18} />
            <Text style={[styles.modeButtonText, mode === "student" ? styles.modeButtonTextActive : null]}>
              {copy.common.student}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("business")}
            style={({ pressed }) => [
              styles.modeButton,
              mode === "business" ? styles.modeButtonActive : null,
              pressed ? styles.modeButtonPressed : null,
            ]}
          >
            <AppIcon color={mode === "business" ? theme.colors.screenBase : theme.colors.textPrimary} name="business" size={18} />
            <Text style={[styles.modeButtonText, mode === "business" ? styles.modeButtonTextActive : null]}>
              {copy.common.business}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.helperText}>
          {mode === "student" ? copy.auth.studentHelper : copy.auth.businessHelper}
        </Text>
        {mode === "student" ? <GoogleSignInButton /> : <BusinessPasswordSignIn />}
      </InfoCard>
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    helperText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    modeButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: theme.radius.card,
      flex: 1,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 14,
    },
    modeButtonActive: {
      backgroundColor: theme.colors.lime,
    },
    modeButtonPressed: {
      transform: [{ translateY: 1 }, { scale: 0.992 }],
    },
    modeButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    modeButtonTextActive: {
      color: theme.colors.screenBase,
    },
    modeSelector: {
      flexDirection: "row",
      gap: 10,
    },
  });
