import { Redirect, Tabs } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { useSession } from "@/providers/session-provider";

export default function StudentTabsLayout() {
  const { isAuthenticated, isLoading } = useSession();

  if (isLoading) {
    return (
      <AppScreen>
        <InfoCard eyebrow="Student" title="Checking session">
          <Text style={styles.bodyText}>Confirming that the student area has an authenticated session.</Text>
        </InfoCard>
      </AppScreen>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: {
          backgroundColor: "#0F172A",
          borderTopColor: "#1E293B",
        },
        sceneStyle: {
          backgroundColor: "#0F172A",
        },
      }}
    >
      <Tabs.Screen name="events" options={{ title: "Events" }} />
      <Tabs.Screen name="active-event" options={{ title: "My QR" }} />
      <Tabs.Screen name="leaderboard" options={{ title: "Leaderboard" }} />
      <Tabs.Screen name="rewards" options={{ title: "Rewards" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
});
