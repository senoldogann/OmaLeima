import { Tabs } from "expo-router";

export default function StudentTabsLayout() {
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
