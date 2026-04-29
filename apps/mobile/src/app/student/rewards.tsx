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

  return (
    <AppScreen>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Rewards</Text>
        <Text style={styles.metaText}>Track what you have earned and what is ready to claim.</Text>
      </View>

      <View style={styles.summaryHero}>
        <View style={styles.summaryLead}>
          <Text style={styles.summaryNumber}>{totalStamps}</Text>
          <Text style={styles.summaryLabel}>leimat collected</Text>
        </View>
        <View style={styles.summaryPills}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillValue}>{registeredEventCount}</Text>
            <Text style={styles.summaryPillLabel}>events</Text>
          </View>
          {claimableCount > 0 ? (
            <View style={[styles.summaryPill, styles.summaryPillLime]}>
              <Text style={[styles.summaryPillValue, styles.summaryPillValueLime]}>{claimableCount}</Text>
              <Text style={[styles.summaryPillLabel, styles.summaryPillLabelLime]}>claimable</Text>
            </View>
          ) : null}
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
    fontSize: 14,
    lineHeight: 21,
  },
  claimableAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: mobileTheme.colors.limeSurface,
    borderRadius: mobileTheme.radius.chip,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  claimableAlertText: {
    color: mobileTheme.colors.lime,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  ghostButton: {
    alignSelf: "flex-start",
    borderRadius: mobileTheme.radius.button,
    backgroundColor: mobileTheme.colors.surfaceL2,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  ghostButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  metaText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.lime,
    borderRadius: mobileTheme.radius.button,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#08090E",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  screenHeader: {
    gap: 6,
    marginBottom: 2,
  },
  screenTitle: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  summaryHero: {
    gap: 14,
    paddingVertical: 8,
  },
  summaryLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  summaryLead: {
    gap: 2,
  },
  summaryNumber: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 56,
    fontWeight: "800",
    letterSpacing: -1.8,
    fontVariant: ["tabular-nums"],
    lineHeight: 58,
  },
  summaryPill: {
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderRadius: mobileTheme.radius.chip,
    gap: 2,
    minWidth: 92,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  summaryPillLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  summaryPillLabelLime: {
    color: mobileTheme.colors.limeDim,
  },
  summaryPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryPillLime: {
    backgroundColor: mobileTheme.colors.limeSurface,
  },
  summaryPillValue: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  summaryPillValueLime: {
    color: mobileTheme.colors.lime,
  },
});
