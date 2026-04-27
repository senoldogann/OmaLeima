import { Redirect, Slot } from "expo-router";
import { Text, StyleSheet } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { useSession } from "@/providers/session-provider";

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useSession();

  if (isLoading) {
    return (
      <AppScreen>
        <InfoCard eyebrow="Auth" title="Checking session">
          <Text style={styles.bodyText}>Restoring the Supabase session before showing the login flow.</Text>
        </InfoCard>
      </AppScreen>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/student/events" />;
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  bodyText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
});
