import { useState } from "react";
import { Redirect } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { AuthLoadingPanel } from "@/features/auth/components/auth-loading-panel";
import { BusinessPasswordSignIn } from "@/features/auth/components/business-password-sign-in";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { mobileTheme } from "@/features/foundation/theme";
import { LoginHero } from "@/features/auth/components/login-hero";
import { useSession } from "@/providers/session-provider";
import { useSessionAccessQuery } from "@/features/auth/session-access";

type LoginMode = "student" | "business";

export default function LoginScreen() {
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
          message="Checking your session and opening the right area."
          title="Opening OmaLeima"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <LoginHero />

      <InfoCard
        eyebrow="Continue"
        motionIndex={1}
        title={mode === "student" ? "Student sign-in" : "Business sign-in"}
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
            <AppIcon
              color={mode === "student" ? mobileTheme.colors.screenBase : mobileTheme.colors.textPrimary}
              name="google"
              size={18}
            />
            <Text style={[styles.modeButtonText, mode === "student" ? styles.modeButtonTextActive : null]}>
              Student
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
            <AppIcon
              color={mode === "business" ? mobileTheme.colors.screenBase : mobileTheme.colors.textPrimary}
              name="business"
              size={18}
            />
            <Text style={[styles.modeButtonText, mode === "business" ? styles.modeButtonTextActive : null]}>
              Business
            </Text>
          </Pressable>
        </View>

        <Text style={styles.helperText}>
          {mode === "student"
            ? "Use Google to open your student view."
            : "Use staff credentials to open scanner tools."}
        </Text>
        {mode === "student" ? <GoogleSignInButton /> : <BusinessPasswordSignIn />}
      </InfoCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  helperText: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    lineHeight: mobileTheme.typography.lineHeights.bodySmall,
  },
  modeButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderRadius: mobileTheme.radius.card,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  modeButtonActive: {
    backgroundColor: mobileTheme.colors.lime,
  },
  modeButtonPressed: {
    transform: [{ translateY: 1 }, { scale: 0.992 }],
  },
  modeButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.body,
    lineHeight: mobileTheme.typography.lineHeights.body,
  },
  modeButtonTextActive: {
    color: mobileTheme.colors.screenBase,
  },
  modeSelector: {
    flexDirection: "row",
    gap: 10,
  },
});
