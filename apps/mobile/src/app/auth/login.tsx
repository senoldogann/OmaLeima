import { useState } from "react";
import { Redirect } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
            <Text style={styles.modeButtonText}>Student</Text>
            <Text style={styles.modeButtonMeta}>Google sign-in</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("business")}
            style={({ pressed }) => [
              styles.modeButton,
              mode === "business" ? styles.modeButtonActive : null,
              pressed ? styles.modeButtonPressed : null,
            ]}
          >
            <Text style={styles.modeButtonText}>Business staff</Text>
            <Text style={styles.modeButtonMeta}>Email and password</Text>
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
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  modeButtonActive: {
    borderColor: mobileTheme.colors.cyanBorder,
    backgroundColor: mobileTheme.colors.cyanSurface,
  },
  modeButtonMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  modeButtonPressed: {
    transform: [{ translateY: 1 }, { scale: 0.992 }],
  },
  modeButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  modeSelector: {
    flexDirection: "row",
    gap: 10,
  },
});
