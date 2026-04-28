import { useState } from "react";
import { Redirect } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { BusinessPasswordSignIn } from "@/features/auth/components/business-password-sign-in";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { FoundationStatusCard } from "@/features/foundation/components/foundation-status-card";
import { LoginHero } from "@/features/auth/components/login-hero";
import { createGoogleRedirectUri } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { useSession } from "@/providers/session-provider";
import { useSessionAccessQuery } from "@/features/auth/session-access";

type LoginMode = "student" | "business";

export default function LoginScreen() {
  const { bootstrapError, isAuthenticated, isLoading, session } = useSession();
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

      <FoundationStatusCard
        eyebrow="Auth"
        title="Access status"
        items={[
          {
            label: "Supabase URL",
            value: publicEnv.EXPO_PUBLIC_SUPABASE_URL,
            state: "ready",
          },
          {
            label: "Session bootstrap",
            value: bootstrapError ?? (isLoading ? "Reading persisted session state." : "Ready for auth integration."),
            state: bootstrapError ? "error" : isLoading ? "loading" : "ready",
          },
          {
            label: "Student redirect URI",
            value: createGoogleRedirectUri(),
            state: "pending",
          },
          {
            label: "Authenticated route",
            value:
              accessQuery.isLoading
                ? "Resolving whether the current user belongs in the student or business flow."
                : accessQuery.data?.homeHref ?? "No authenticated home route yet.",
            state: accessQuery.isLoading ? "loading" : accessQuery.data?.homeHref ? "ready" : "pending",
          },
        ]}
      />

      <InfoCard eyebrow="Sign in" title="Choose your mode">
        <View style={styles.modeSelector}>
          <Pressable
            onPress={() => setMode("student")}
            style={[styles.modeButton, mode === "student" ? styles.modeButtonActive : null]}
          >
            <Text style={styles.modeButtonText}>Student</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("business")}
            style={[styles.modeButton, mode === "business" ? styles.modeButtonActive : null]}
          >
            <Text style={styles.modeButtonText}>Business staff</Text>
          </Pressable>
        </View>

        {mode === "student" ? (
          <>
            <Text selectable style={styles.bodyText}>
              Student sign-in stays on Google OAuth. After the callback completes, the app route guard sends the user into the student area automatically.
            </Text>
            <GoogleSignInButton />
          </>
        ) : (
          <>
            <Text selectable style={styles.bodyText}>
              Business staff sign in with email and password. Active business membership is checked immediately after auth before the business home route opens.
            </Text>
            <BusinessPasswordSignIn />
          </>
        )}
      </InfoCard>

      <View style={styles.footer}>
        <Text selectable style={styles.footerText}>
          Local web preview still works even before full native scanner functionality lands.
        </Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    paddingBottom: 8,
  },
  footerText: {
    color: "#64748B",
    fontSize: 12,
  },
  modeButton: {
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderColor: "#334155",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modeButtonActive: {
    borderColor: "#1D4ED8",
    backgroundColor: "#172554",
  },
  modeButtonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  modeSelector: {
    flexDirection: "row",
    gap: 10,
  },
});
