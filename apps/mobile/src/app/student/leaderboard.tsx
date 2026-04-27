import { StyleSheet, Text } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { FoundationStatusCard } from "@/features/foundation/components/foundation-status-card";

export default function StudentLeaderboardScreen() {
  return (
    <AppScreen>
      <InfoCard eyebrow="Student" title="Leaderboard shell">
        <Text style={styles.bodyText}>
          The backend refresh job is already in place. This tab will later subscribe to event-scoped leaderboard updates and render rank context.
        </Text>
      </InfoCard>

      <FoundationStatusCard
        eyebrow="Backend ready"
        title="Leaderboard dependencies"
        items={[
          {
            label: "Aggregation job",
            value: "Scheduled leaderboard refresh is already merged in Phase 2.",
            state: "ready",
          },
          {
            label: "Realtime hook",
            value: "Client subscription helper will be added with data fetch work.",
            state: "pending",
          },
          {
            label: "Department tags",
            value: "Primary tag display is planned after the schema foundation lands.",
            state: "pending",
          },
        ]}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
});
