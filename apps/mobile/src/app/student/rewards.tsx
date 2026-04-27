import { StyleSheet, Text } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { FoundationStatusCard } from "@/features/foundation/components/foundation-status-card";

export default function StudentRewardsScreen() {
  return (
    <AppScreen>
      <InfoCard eyebrow="Student" title="Rewards shell">
        <Text style={styles.bodyText}>
          Reward state will come from the existing claim and stamp backend. This tab is ready for tier progress and claim eligibility UI.
        </Text>
      </InfoCard>

      <FoundationStatusCard
        eyebrow="Dependencies"
        title="Reward flow status"
        items={[
          {
            label: "Claim RPC",
            value: "claim_reward_atomic is already merged and smoke tested.",
            state: "ready",
          },
          {
            label: "Tier progress UI",
            value: "Arrives once event detail and stamp queries are wired.",
            state: "pending",
          },
          {
            label: "Club handoff",
            value: "Physical reward confirmation belongs to the club staff slice.",
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
