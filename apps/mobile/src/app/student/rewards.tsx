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
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalStamps}</Text>
          <Text style={styles.statLabel}>LEIMAT</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{registeredEventCount}</Text>
          <Text style={styles.statLabel}>EVENTS</Text>
        </View>
        {claimableCount > 0 ? (
          <>
            <View style={styles.statDivider} />
            <View style={[styles.statItem, styles.statItemLime]}>
              <Text style={[styles.statValue, styles.statValueLime]}>{claimableCount}</Text>
              <Text style={[styles.statLabel, styles.statLabelLime]}>CLAIMABLE</Text>
            </View>
          </>
        ) : null}
      </View>

      {/* Claimable alert */}
      {claimableCount > 0 ? (
        <View style={styles.claimableAlert}>
          <View style={styles.claimableAlertDot} />
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

  // --- Stats bar ---
  statsBar: {
    flexDirection: "row",
    backgroundColor: mobileTheme.colors.surfaceL1,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    overflow: "hidden",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    gap: 4,
  },
  statItemLime: {
    backgroundColor: mobileTheme.colors.limeSurface,
  },
  statValue: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
    lineHeight: 34,
  },
  statValueLime: {
    color: mobileTheme.colors.lime,
  },
  statLabel: {
    color: mobileTheme.colors.textDim,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  statLabelLime: {
    color: mobileTheme.colors.limeDim,
  },
  statDivider: {
    width: 1,
    backgroundColor: mobileTheme.colors.borderDefault,
    marginVertical: 14,
  },

  // --- Claimable alert ---
  claimableAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: mobileTheme.colors.limeSurface,
    borderColor: mobileTheme.colors.limeBorder,
    borderRadius: mobileTheme.radius.chip,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  claimableAlertDot: {
    backgroundColor: mobileTheme.colors.lime,
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  claimableAlertText: {
    color: mobileTheme.colors.lime,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },

  // --- Buttons ---
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
});
