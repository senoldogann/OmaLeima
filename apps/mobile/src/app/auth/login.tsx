import { useState } from "react";
import { Redirect } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
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

  if (!isLoading && isAuthenticated && accessQuery.data?.homeHref !== null && typeof accessQuery.data !== "undefined") {
    return <Redirect href={accessQuery.data.homeHref} />;
  }

  return (
    <AppScreen>
      <LoginHero />

      <InfoCard eyebrow="Sign in" motionIndex={1} title="Choose your mode">
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
            <Text style={[styles.modeButtonText, mode === "student" ? styles.modeButtonTextActive : null]}>Student</Text>
            <Text style={[styles.modeButtonMeta, mode === "student" ? styles.modeButtonMetaActive : null]}>Google sign-in</Text>
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
            <Text style={[styles.modeButtonText, mode === "business" ? styles.modeButtonTextActive : null]}>Business staff</Text>
            <Text style={[styles.modeButtonMeta, mode === "business" ? styles.modeButtonMetaActive : null]}>Email and password</Text>
          </Pressable>
        </View>

        {mode === "student" ? (
          <>
            <Text selectable style={styles.bodyText}>
              Students continue with Google and land directly inside the student area after sign-in.
            </Text>
            <GoogleSignInButton />
          </>
        ) : (
          <>
            <Text selectable style={styles.bodyText}>
              Business staff sign in with email and password before opening the scanner and event-day tools.
            </Text>
            <BusinessPasswordSignIn />
          </>
        )}
      </InfoCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  modeButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderRadius: mobileTheme.radius.card,
    flex: 1,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  modeButtonActive: {
    backgroundColor: mobileTheme.colors.lime,
  },
  modeButtonMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  modeButtonMetaActive: {
    color: mobileTheme.colors.screenBase,
  },
  modeButtonPressed: {
    transform: [{ translateY: 1 }, { scale: 0.992 }],
  },
  modeButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  modeButtonTextActive: {
    color: mobileTheme.colors.screenBase,
  },
  modeSelector: {
    flexDirection: "row",
    gap: 10,
  },
});
