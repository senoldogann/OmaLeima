import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { FoundationStatusCard } from "@/features/foundation/components/foundation-status-card";
import { LoginHero } from "@/features/auth/components/login-hero";
import { publicEnv } from "@/lib/env";
import { useSession } from "@/providers/session-provider";

export default function LoginScreen() {
  const { bootstrapError, isLoading } = useSession();

  return (
    <AppScreen>
      <LoginHero />

      <FoundationStatusCard
        eyebrow="Foundation"
        title="Mobile foundation status"
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
            label: "Google sign-in",
            value: "Planned for the next feature slice.",
            state: "pending",
          },
        ]}
      />

      <InfoCard eyebrow="Preview" title="Student shell">
        <Text style={styles.bodyText}>
          The student tab structure is already mounted so future event, QR, leaderboard, reward, and profile work can land without reshaping navigation.
        </Text>
        <Link href="/student/events" asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Open student preview</Text>
          </Pressable>
        </Link>
      </InfoCard>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Branch scope stops before real login and token registration.</Text>
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
  primaryButton: {
    borderRadius: 8,
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  footer: {
    paddingBottom: 8,
  },
  footerText: {
    color: "#64748B",
    fontSize: 12,
  },
});
