import { useMemo } from "react";
import { ImageBackground, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useRouter } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { getEventCoverSource } from "@/features/events/event-visuals";
import { AutoAdvancingRail } from "@/features/foundation/components/auto-advancing-rail";
import { mobileTheme } from "@/features/foundation/theme";
import { useStudentRewardCelebration } from "@/features/notifications/student-reward-celebration";
import { RewardProgressCard } from "@/features/rewards/components/reward-progress-card";
import { useStudentRewardOverviewQuery } from "@/features/rewards/student-rewards";
import { useSession } from "@/providers/session-provider";

export default function StudentRewardsScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { session } = useSession();
  const { triggerRewardCelebration } = useStudentRewardCelebration();
  const studentId = session?.user.id ?? null;
  const rewardOverviewQuery = useStudentRewardOverviewQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null,
  });

  const events = useMemo(() => rewardOverviewQuery.data?.events ?? [], [rewardOverviewQuery.data]);
  const registeredEventCount = rewardOverviewQuery.data?.registeredEventCount ?? 0;
  const claimableCount = events.filter((event) => event.claimableTierCount > 0).length;
  const totalStamps = events.reduce((accumulator, event) => accumulator + event.stampCount, 0);
  const railCardWidth = Math.max(Math.min(windowWidth - 52, 420), 286);
  const featuredEvent = events[0] ?? null;
  const featuredHeroSource = getEventCoverSource(
    featuredEvent?.coverImageUrl ?? null,
    featuredEvent?.id ?? "rewards-hero"
  );
  const summaryLabel =
    claimableCount > 0
      ? `${claimableCount} event${claimableCount === 1 ? "" : "s"} ready for claim.`
      : registeredEventCount === 0
        ? "Leimat appear here after your first joined event."
        : `Across ${registeredEventCount} event${registeredEventCount === 1 ? "" : "s"}.`;

  const handlePreviewCelebration = (): void => {
    const previewEvent = featuredEvent ?? null;

    triggerRewardCelebration([
      {
        kind: "STAMP",
        key: "preview:reward",
        eventId: previewEvent?.id ?? "preview-event",
        eventName: previewEvent?.name ?? "OmaLeima night",
        coverImageUrl: previewEvent?.coverImageUrl ?? null,
        stampCount: Math.max((previewEvent?.stampCount ?? 0) + 1, 1),
      },
    ]);
  };

  return (
    <AppScreen>
      <View style={styles.screenHeader}>
        <Text style={styles.screenEyebrow}>Rewards</Text>
        <Text style={styles.screenTitle}>Rewards</Text>
        <Text style={styles.metaText}>Track collected leimas and see what is ready for claim.</Text>
        {__DEV__ ? (
          <Pressable onPress={handlePreviewCelebration} style={styles.previewButton}>
            <Text style={styles.previewButtonText}>Preview leima</Text>
          </Pressable>
        ) : null}
      </View>

      <ImageBackground imageStyle={styles.summaryHeroImage} source={featuredHeroSource} style={styles.summaryHero}>
        <View style={styles.summaryHeroOverlay} />
        <View style={styles.summaryLead}>
          <Text style={styles.summaryEyebrow}>Reward trail</Text>
          <Text style={styles.summaryTitle}>
            {featuredEvent?.name ?? "Your next unlock starts here"}
          </Text>
          <Text style={styles.summaryLabel}>{summaryLabel}</Text>
        </View>

        <View style={styles.summaryCountWrap}>
          <Text style={styles.summaryNumber}>{totalStamps}</Text>
          <Text style={styles.summaryCountLabel}>leimat</Text>
        </View>
      </ImageBackground>

      {claimableCount > 0 ? (
        <View style={styles.claimableAlert}>
          <Text style={styles.claimableAlertText}>
            {claimableCount} event{claimableCount === 1 ? "" : "s"} ready — go to venue to claim.
          </Text>
        </View>
      ) : null}

      {rewardOverviewQuery.isLoading ? (
        <InfoCard eyebrow="Loading" title="Opening rewards">
          <Text style={styles.bodyText}>Loading leima counts and tier status.</Text>
        </InfoCard>
      ) : null}

      {rewardOverviewQuery.error ? (
        <InfoCard eyebrow="Error" title="Could not load rewards">
          <Text style={styles.bodyText}>{rewardOverviewQuery.error.message}</Text>
          <Pressable onPress={() => void rewardOverviewQuery.refetch()} style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

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

      {events.length > 0 ? (
        <View style={styles.railSection}>
          <View style={styles.railHeader}>
            <View style={styles.railHeaderCopy}>
              <Text style={styles.railTitle}>Event rewards</Text>
              <Text style={styles.railMeta}>Slides automatically when idle.</Text>
            </View>
            <View style={styles.railHint}>
              <Text style={styles.railHintText}>Auto</Text>
              <AppIcon color={mobileTheme.colors.lime} name="chevron-right" size={16} />
            </View>
          </View>

          <AutoAdvancingRail
            contentContainerStyle={styles.railContent}
            intervalMs={3000}
            itemGap={14}
            items={events}
            itemWidth={railCardWidth}
            keyExtractor={(event) => event.id}
            railStyle={null}
            renderItem={(event) => (
              <View style={styles.railCardWrap}>
                <RewardProgressCard
                  event={event}
                  onOpenEvent={(eventId: string) => router.push(`/student/events/${eventId}`)}
                />
              </View>
            )}
            showsIndicators={false}
          />
        </View>
      ) : null}
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
    alignItems: "center",
    backgroundColor: mobileTheme.colors.limeSurface,
    borderRadius: 999,
    flexDirection: "row",
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
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderRadius: 999,
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
  previewButton: {
    alignSelf: "flex-start",
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderColor: mobileTheme.colors.limeBorder,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  previewButtonText: {
    color: mobileTheme.colors.lime,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.caption,
    lineHeight: mobileTheme.typography.lineHeights.caption,
  },
  primaryButtonText: {
    color: "#08090E",
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    letterSpacing: 0.3,
  },
  railCardWrap: {
    marginRight: 14,
  },
  railContent: {
    paddingRight: 6,
  },
  railHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  railHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  railHint: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  railHintText: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.caption,
    lineHeight: mobileTheme.typography.lineHeights.caption,
  },
  railMeta: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.caption,
    lineHeight: mobileTheme.typography.lineHeights.caption,
  },
  railSection: {
    gap: 12,
  },
  railTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.body,
    lineHeight: mobileTheme.typography.lineHeights.body,
  },
  screenEyebrow: {
    color: mobileTheme.colors.lime,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.eyebrow,
    letterSpacing: 1.2,
    lineHeight: mobileTheme.typography.lineHeights.eyebrow,
    textTransform: "uppercase",
  },
  screenHeader: {
    gap: 8,
    marginBottom: 6,
  },
  screenTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.extrabold,
    fontSize: mobileTheme.typography.sizes.titleLarge,
    letterSpacing: -0.9,
    lineHeight: mobileTheme.typography.lineHeights.titleLarge,
  },
  summaryCountLabel: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.caption,
    lineHeight: mobileTheme.typography.lineHeights.caption,
    textTransform: "uppercase",
  },
  summaryCountWrap: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0, 0, 0, 0.46)",
    borderRadius: 16,
    gap: 2,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    zIndex: 1,
  },
  summaryEyebrow: {
    color: mobileTheme.colors.lime,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.eyebrow,
    letterSpacing: 1.2,
    lineHeight: mobileTheme.typography.lineHeights.eyebrow,
    textTransform: "uppercase",
  },
  summaryHero: {
    borderRadius: mobileTheme.radius.scene,
    justifyContent: "space-between",
    minHeight: 228,
    overflow: "hidden",
    padding: 20,
    position: "relative",
  },
  summaryHeroImage: {
    borderRadius: mobileTheme.radius.scene,
  },
  summaryHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.58)",
  },
  summaryLabel: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.body,
    lineHeight: mobileTheme.typography.lineHeights.body,
  },
  summaryLead: {
    gap: 8,
    maxWidth: 250,
    zIndex: 1,
  },
  summaryNumber: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.extrabold,
    fontSize: 68,
    letterSpacing: -2.6,
    lineHeight: 68,
    fontVariant: ["tabular-nums"],
  },
  summaryTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.extrabold,
    fontSize: mobileTheme.typography.sizes.title,
    letterSpacing: -0.6,
    lineHeight: mobileTheme.typography.lineHeights.title,
  },
});
