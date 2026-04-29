import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useRouter } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { mobileTheme } from "@/features/foundation/theme";
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

  const events = useMemo(() => rewardOverviewQuery.data?.events ?? [], [rewardOverviewQuery.data]);
  const registeredEventCount = rewardOverviewQuery.data?.registeredEventCount ?? 0;
  const claimableCount = events.filter((e) => e.claimableTierCount > 0).length;
  const totalStamps = events.reduce((acc, e) => acc + e.stampCount, 0);
  const summaryLabel =
    registeredEventCount === 0
      ? "Leimat appear here after your first joined event."
      : `Across ${registeredEventCount} event${registeredEventCount === 1 ? "" : "s"}.`;

  return (
    <AppScreen>
      <View style={styles.screenHeader}>
        <Text style={styles.screenEyebrow}>Rewards</Text>
        <Text style={styles.screenTitle}>Rewards</Text>
        <Text style={styles.metaText}>Track collected leimas and see what is ready for claim.</Text>
      </View>

      <View style={styles.summaryHero}>
        <View style={styles.summaryLead}>
          <Text style={styles.summaryNumber}>{totalStamps}</Text>
          <Text style={styles.summaryLabel}>{summaryLabel}</Text>
        </View>
      </View>

      {claimableCount > 0 ? (
        <View style={styles.claimableAlert}>
          <Text style={styles.claimableAlertText}>
            {claimableCount} event{claimableCount === 1 ? "" : "s"} ready — go to venue to claim.
          </Text>
        </View>
      ) : null}

      {/* Loading */}
      {rewardOverviewQuery.isLoading ? (
        <InfoCard eyebrow="Loading" title="Opening rewards">
          <Text style={styles.bodyText}>Loading leima counts and tier status.</Text>
        </InfoCard>
      ) : null}

      {/* Error */}
      {rewardOverviewQuery.error ? (
        <InfoCard eyebrow="Error" title="Could not load rewards">
          <Text style={styles.bodyText}>{rewardOverviewQuery.error.message}</Text>
          <Pressable onPress={() => void rewardOverviewQuery.refetch()} style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {/* Empty */}
      {!rewardOverviewQuery.isLoading && !rewardOverviewQuery.error && events.length === 0 ? (
        <InfoCard eyebrow="Standby" title="No reward progress yet">
          {registeredEventCount === 0 ? (
            <>
              <Text style={styles.bodyText}>
                Join an event first. Once registered, stamp progress and reward tiers appear here.
              </Text>
              <Pressable onPress={() => router.push("/student/events")} style={styles.primaryButton}>
                <AppIcon color={mobileTheme.colors.screenBase} name="calendar" size={18} />
                <Text style={styles.primaryButtonText}>Browse events</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.bodyText}>
              Registered for events, but none show reward progress yet. Check back after the organizer publishes tiers.
            </Text>
          )}
        </InfoCard>
      ) : null}

      {/* Event cards */}
      {events.map((event) => (
        <RewardProgressCard
          key={event.id}
          event={event}
          onOpenEvent={(eventId: string) => router.push(`/student/events/${eventId}`)}
        />
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.typography.families.regular,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    lineHeight: mobileTheme.typography.lineHeights.bodySmall,
  },
  claimableAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: mobileTheme.colors.limeSurface,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  claimableAlertText: {
    color: mobileTheme.colors.lime,
    flex: 1,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.bodySmall,
  },
  ghostButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: mobileTheme.colors.surfaceL2,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  ghostButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.bodySmall,
  },
  metaText: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.regular,
    fontSize: mobileTheme.typography.sizes.body,
    lineHeight: mobileTheme.typography.lineHeights.body,
    maxWidth: 320,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.lime,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#08090E",
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    letterSpacing: 0.3,
  },
  screenHeader: {
    gap: 8,
    marginBottom: 6,
  },
  screenEyebrow: {
    color: mobileTheme.colors.lime,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.eyebrow,
    letterSpacing: 1.2,
    lineHeight: mobileTheme.typography.lineHeights.eyebrow,
    textTransform: "uppercase",
  },
  screenTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.extrabold,
    fontSize: mobileTheme.typography.sizes.titleLarge,
    lineHeight: mobileTheme.typography.lineHeights.titleLarge,
    letterSpacing: -0.9,
  },
  summaryHero: {
    gap: 12,
    paddingBottom: 6,
    paddingTop: 2,
  },
  summaryLabel: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.body,
    lineHeight: mobileTheme.typography.lineHeights.body,
  },
  summaryLead: {
    gap: 4,
  },
  summaryNumber: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.extrabold,
    fontSize: mobileTheme.typography.sizes.number,
    fontWeight: "800",
    letterSpacing: -2.2,
    fontVariant: ["tabular-nums"],
    lineHeight: mobileTheme.typography.lineHeights.number,
  },
});
