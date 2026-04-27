import { StyleSheet, Text } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { FoundationStatusCard } from "@/features/foundation/components/foundation-status-card";

export default function StudentEventsScreen() {
  return (
    <AppScreen>
      <InfoCard eyebrow="Student" title="Events shell">
        <Text style={styles.bodyText}>
          This tab is the landing surface for upcoming and active event discovery. Query wiring comes next after Google sign-in.
        </Text>
      </InfoCard>

      <FoundationStatusCard
        eyebrow="Next up"
        title="Planned event slice"
        items={[
          {
            label: "Auth gate",
            value: "Depends on Supabase Google sign-in integration.",
            state: "pending",
          },
          {
            label: "Event listing",
            value: "Will read active and upcoming events after auth is in place.",
            state: "pending",
          },
          {
            label: "Join flow",
            value: "Event registration UI will sit on top of the existing backend rules.",
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
