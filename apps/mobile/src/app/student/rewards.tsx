import { Pressable, StyleSheet, Text } from "react-native";

import { useRouter } from "expo-router";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { interactiveSurfaceShadowStyle, mobileTheme } from "@/features/foundation/theme";
import { RewardProgressCard } from "@/features/rewards/components/reward-progress-card";
import { useStudentRewardOverviewQuery } from "@/features/rewards/student-rewards";
import { useSession } from "@/providers/session-provider";

export default function StudentRewardsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const studentId = session?.user.id ?? null;
  const rewardOverviewQuery = useStudentRewardOverviewQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null,
  });
  const events = rewardOverviewQuery.data?.events ?? [];
  const registeredEventCount = rewardOverviewQuery.data?.registeredEventCount ?? 0;
  const claimableEventCount = events.filter((event) => event.claimableTierCount > 0).length;

  return (
    <AppScreen>
      <InfoCard eyebrow="Student" title="Reward progress">
        <Text style={styles.bodyText}>
          Track event rewards here. Claimable tiers still require club or venue staff handoff even when the mobile app shows that you are eligible.
        </Text>
      </InfoCard>

      {rewardOverviewQuery.isLoading ? (
        <InfoCard eyebrow="Loading" title="Opening rewards">
          <Text style={styles.bodyText}>Loading registered events, reward tiers, claims, and leima counts.</Text>
        </InfoCard>
      ) : null}

      {rewardOverviewQuery.error ? (
        <InfoCard eyebrow="Error" title="Could not load rewards">
          <Text style={styles.bodyText}>{rewardOverviewQuery.error.message}</Text>
          <Pressable onPress={() => void rewardOverviewQuery.refetch()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!rewardOverviewQuery.isLoading && !rewardOverviewQuery.error && events.length === 0 ? (
        <InfoCard eyebrow="Standby" title="No reward progress yet">
          {registeredEventCount === 0 ? (
            <>
              <Text style={styles.bodyText}>
                Join an event first. Once you are registered, this tab will show stamp progress and reward eligibility per event.
              </Text>
              <Pressable onPress={() => router.push("/student/events")} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Open events</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.bodyText}>
              You already have registered events, but none of them currently expose reward progress in the student view. Check again if the organizer republishes or reopens the event.
            </Text>
          )}
        </InfoCard>
      ) : null}

      {events.length > 0 ? (
        <InfoCard eyebrow="Summary" title="Reward status">
          <Text style={styles.bodyText}>
            {claimableEventCount > 0
              ? `${claimableEventCount} event${claimableEventCount === 1 ? "" : "s"} currently has at least one claimable reward tier.`
              : "No claimable reward tiers yet. Keep collecting leima at participating venues."}
          </Text>
        </InfoCard>
      ) : null}

      {events.map((event) => (
        <RewardProgressCard
          key={event.id}
          event={event}
          onOpenEvent={(eventId: string) => {
            router.push(`/student/events/${eventId}`);
          }}
        />
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.actionNeutral,
    borderColor: mobileTheme.colors.actionNeutralBorder,
    borderRadius: mobileTheme.radius.button,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...interactiveSurfaceShadowStyle,
  },
  secondaryButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
});
