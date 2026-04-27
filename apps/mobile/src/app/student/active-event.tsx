import { StyleSheet, Text } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { FoundationStatusCard } from "@/features/foundation/components/foundation-status-card";

export default function StudentActiveEventScreen() {
  return (
    <AppScreen>
      <InfoCard eyebrow="Student" title="My QR shell">
        <Text style={styles.bodyText}>
          QR generation stays server-owned. This tab is reserved for the active event card, dynamic QR refresh, and reward progress summary.
        </Text>
      </InfoCard>

      <FoundationStatusCard
        eyebrow="Security"
        title="QR constraints already fixed in backend"
        items={[
          {
            label: "QR issuance",
            value: "Edge Function only. No client-side signing secrets.",
            state: "ready",
          },
          {
            label: "Refresh cadence",
            value: "The product plan keeps QR refresh on a short rolling window.",
            state: "pending",
          },
          {
            label: "Scan feedback",
            value: "Will arrive with the business scanner slice.",
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
