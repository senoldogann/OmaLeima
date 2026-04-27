import { Redirect } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { FoundationStatusCard } from "@/features/foundation/components/foundation-status-card";
import { LoginHero } from "@/features/auth/components/login-hero";
import { createGoogleRedirectUri } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { useSession } from "@/providers/session-provider";

export default function LoginScreen() {
  const { bootstrapError, isAuthenticated, isLoading } = useSession();

  if (!isLoading && isAuthenticated) {
    return <Redirect href="/student/events" />;
  }

  return (
    <AppScreen>
      <LoginHero />

      <FoundationStatusCard
        eyebrow="Auth"
        title="Google login status"
        items={[
          {
            label: "Supabase URL",
            value: publicEnv.EXPO_PUBLIC_SUPABASE_URL,
            state: "ready",
          },
          {
            label: "Publishable key",
            value: "Configured via Expo public env.",
            state: "ready",
          },
          {
            label: "Session bootstrap",
            value: bootstrapError ?? (isLoading ? "Reading persisted session state." : "Ready for auth integration."),
            state: bootstrapError ? "error" : isLoading ? "loading" : "ready",
          },
          {
            label: "Redirect URI",
            value: createGoogleRedirectUri(),
            state: "pending",
          },
        ]}
      />

      <InfoCard eyebrow="Sign in" title="Continue with Google">
        <Text style={styles.bodyText}>
          Google OAuth is handled by Supabase and comes back through the app callback route. The first authenticated guard is already wired to the student tab layout.
        </Text>
        <GoogleSignInButton />
      </InfoCard>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Local web preview still works even before provider credentials are fully configured.</Text>
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
});
