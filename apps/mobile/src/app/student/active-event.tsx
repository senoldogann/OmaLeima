import { useMemo } from "react";
import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";

import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { getEventCoverSource } from "@/features/events/event-visuals";
import { interactiveSurfaceShadowStyle, mobileTheme } from "@/features/foundation/theme";
import {
  selectStudentQrEvent,
  useActiveAppState,
  useCurrentTime,
  useGenerateQrTokenQuery,
  useQrCountdown,
  useQrScreenProtection,
  useQrSvgQuery,
  useStudentQrContextQuery,
} from "@/features/qr/student-qr";
import type { StudentRewardEventProgress } from "@/features/rewards/types";
import { useStudentRewardOverviewQuery } from "@/features/rewards/student-rewards";
import { useSession } from "@/providers/session-provider";

const dateTimeFormatter = new Intl.DateTimeFormat("en-FI", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const formatDateTime = (value: string): string => dateTimeFormatter.format(new Date(value));

const createProgressHeadline = (event: StudentRewardEventProgress): string => {
  if (event.claimableTierCount > 0) {
    return `${event.claimableTierCount} reward${event.claimableTierCount === 1 ? "" : "s"} ready for claim.`;
  }

  const nextTier = event.tiers.find((tier) => tier.state === "MORE_NEEDED") ?? null;

  if (nextTier !== null) {
    return `${nextTier.missingStampCount} leima left to the next unlock.`;
  }

  if (event.claimedTierCount > 0) {
    return `${event.claimedTierCount} reward${event.claimedTierCount === 1 ? "" : "s"} already claimed.`;
  }

  return "Collect leimas to unlock the next reward.";
};

const createProgressLabel = (event: StudentRewardEventProgress): string => {
  if (event.tiers.length === 0) {
    return "No reward tiers published yet.";
  }

  return `${event.tiers.length} tier${event.tiers.length === 1 ? "" : "s"} in this event.`;
};

export default function StudentActiveEventScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const isAppActive = useActiveAppState();
  const now = useCurrentTime(isFocused && isAppActive);
  const protection = useQrScreenProtection();
  const { session } = useSession();
  const studentId = session?.user.id ?? null;
  const accessToken = session?.access_token ?? null;

  const qrContextQuery = useStudentQrContextQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null,
  });

  const selectedEvent = useMemo(
    () => (qrContextQuery.data ? selectStudentQrEvent(qrContextQuery.data.registeredEvents, now) : null),
    [now, qrContextQuery.data]
  );

  const rewardOverviewQuery = useStudentRewardOverviewQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null,
  });

  const selectedRewardEvent = useMemo(
    () =>
      selectedEvent === null
        ? null
        : (rewardOverviewQuery.data?.events.find((event) => event.id === selectedEvent.id) ?? null),
    [rewardOverviewQuery.data, selectedEvent]
  );

  const shouldRefreshQr =
    selectedEvent !== null &&
    selectedEvent.viewState === "ACTIVE" &&
    accessToken !== null &&
    isFocused &&
    isAppActive;

  const qrTokenQuery = useGenerateQrTokenQuery({
    accessToken: accessToken ?? "",
    eventId: selectedEvent?.id ?? "",
    isEnabled: shouldRefreshQr,
  });

  const qrSvgQuery = useQrSvgQuery({
    token: qrTokenQuery.data?.qrPayload.token ?? "",
    isEnabled:
      typeof qrTokenQuery.data?.qrPayload.token === "string" &&
      qrTokenQuery.data.qrPayload.token.length > 0,
  });

  const refreshAfterSeconds = qrTokenQuery.data?.refreshAfterSeconds ?? null;
  const countdownSeconds = useQrCountdown(refreshAfterSeconds, qrTokenQuery.dataUpdatedAt, shouldRefreshQr);
  const refreshProgressRatio =
    refreshAfterSeconds === null || refreshAfterSeconds === 0 ? 0 : countdownSeconds / refreshAfterSeconds;
  const isQrLive = selectedEvent?.viewState === "ACTIVE" && !qrTokenQuery.isLoading && !qrTokenQuery.error;
  const showProtectionNotice = protection.status === "ERROR";
  const eventCoverSource = useMemo(
    () =>
      selectedEvent === null
        ? null
        : getEventCoverSource(selectedRewardEvent?.coverImageUrl ?? null, `${selectedEvent.id}:${selectedEvent.name}`),
    [selectedEvent, selectedRewardEvent?.coverImageUrl]
  );

  return (
    <AppScreen>
      {qrContextQuery.error ? (
        <InfoCard eyebrow="Error" motionIndex={0} title="Could not load QR context">
          <Text style={styles.bodyText}>{qrContextQuery.error.message}</Text>
          <Pressable onPress={() => void qrContextQuery.refetch()} style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!qrContextQuery.isLoading && selectedEvent === null ? (
        <InfoCard eyebrow="Standby" motionIndex={0} title="No registered event ready for QR">
          <Text style={styles.bodyText}>
            Join an event from the Events tab first. Once a registered event is active, this screen will start requesting rolling tokens.
          </Text>
          <Pressable onPress={() => router.push("/student/events")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Open events</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {selectedEvent !== null && eventCoverSource ? (
        <ImageBackground imageStyle={styles.eventHeroImage} source={eventCoverSource} style={styles.eventHero}>
          <View style={styles.eventHeroOverlay} />
          <View style={styles.eventHeroContent}>
            <Text style={styles.eventHeroEyebrow}>{selectedEvent.city}</Text>
            <Text style={styles.eventHeroTitle}>{selectedEvent.name}</Text>
            <Text style={styles.eventHeroMeta}>
              {selectedEvent.viewState === "ACTIVE"
                ? `Live now until ${formatDateTime(selectedEvent.endAt)}`
                : `Starts ${formatDateTime(selectedEvent.startAt)}`}
            </Text>
          </View>
        </ImageBackground>
      ) : null}

      {selectedEvent?.viewState === "UPCOMING" ? (
        <InfoCard eyebrow={selectedEvent.city} motionIndex={1} title={selectedEvent.name} variant="scene">
          <View style={styles.badges}>
            <StatusBadge label="registered" state="ready" />
            <StatusBadge label="upcoming" state="pending" />
          </View>

          <View style={styles.timeBlock}>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>STARTS</Text>
              <Text style={styles.timeValue}>{formatDateTime(selectedEvent.startAt)}</Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>ENDS</Text>
              <Text style={styles.timeValue}>{formatDateTime(selectedEvent.endAt)}</Text>
            </View>
          </View>

          <Text style={styles.bodyText}>
            QR refresh is paused until the event goes live. Come back when it starts.
          </Text>
          <Pressable onPress={() => router.push(`/student/events/${selectedEvent.id}`)} style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>View event details</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {selectedEvent?.viewState === "ACTIVE" ? (
        <>
          <View style={styles.activeSummaryBar}>
            <View style={styles.badges}>
              <StatusBadge label="active now" state="ready" />
              <StatusBadge
                label={qrTokenQuery.error ? "refresh error" : "live"}
                state={qrTokenQuery.error ? "error" : "ready"}
              />
            </View>

            <Text style={styles.identityMeta}>Until {formatDateTime(selectedEvent.endAt)}</Text>
          </View>

          <View style={styles.qrBlock}>
            <View style={styles.qrSceneHeader}>
              <View style={styles.qrSceneTitleGroup}>
                <Text style={styles.qrSceneEyebrow}>Active leima pass</Text>
                <Text style={styles.qrSceneTitle}>Show at the venue desk</Text>
              </View>
              {isQrLive ? (
                <View style={styles.qrLiveBadge}>
                  <View style={styles.qrLiveDot} />
                  <Text style={styles.qrLiveBadgeText}>LIVE</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.qrFrame}>
              <View style={[styles.qrCorner, styles.qrCornerTopLeft]} />
              <View style={[styles.qrCorner, styles.qrCornerTopRight]} />
              <View style={[styles.qrCorner, styles.qrCornerBottomLeft]} />
              <View style={[styles.qrCorner, styles.qrCornerBottomRight]} />
              <View style={styles.qrGuideLine} />

              <View style={styles.qrInner}>
                {qrTokenQuery.isLoading || qrSvgQuery.isLoading ? (
                  <View style={styles.qrPlaceholder}>
                    <Text style={styles.qrPlaceholderText}>Loading QR…</Text>
                  </View>
                ) : null}
                {qrSvgQuery.data ? <SvgXml height={272} width={272} xml={qrSvgQuery.data} /> : null}
                {qrTokenQuery.error ? (
                  <View style={styles.qrPlaceholder}>
                    <Text style={styles.qrErrorText}>Token refresh failed</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.qrFooter}>
              <Text style={styles.qrLiveText}>LEIMA QR</Text>
              {isQrLive ? (
                <Text style={styles.qrCountdownText}>refreshes in {countdownSeconds}s</Text>
              ) : null}
            </View>
          </View>

          {refreshAfterSeconds !== null ? (
            <View style={styles.progressSection}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(Math.min(refreshProgressRatio, 1), 0) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>Token window</Text>
            </View>
          ) : null}

          {qrTokenQuery.error ? (
            <Pressable onPress={() => void qrTokenQuery.refetch()} style={styles.ghostButton}>
              <Text style={styles.ghostButtonText}>Retry QR refresh</Text>
            </Pressable>
          ) : null}

          {selectedRewardEvent ? (
            <View style={styles.rewardSummaryCard}>
              <View style={styles.rewardSummaryHeader}>
                <View style={styles.rewardSummaryCopy}>
                  <Text style={styles.rewardSummaryEyebrow}>Event progress</Text>
                  <Text style={styles.rewardSummaryTitle}>{selectedRewardEvent.stampCount} leimat</Text>
                  <Text style={styles.rewardSummaryText}>{createProgressHeadline(selectedRewardEvent)}</Text>
                </View>
                <View style={styles.rewardSummaryBadge}>
                  <Text style={styles.rewardSummaryBadgeText}>{createProgressLabel(selectedRewardEvent)}</Text>
                </View>
              </View>

              <View style={styles.rewardSummaryTrack}>
                <View
                  style={[
                    styles.rewardSummaryFill,
                    { width: `${Math.max(Math.min(selectedRewardEvent.goalProgressRatio, 1), 0) * 100}%` },
                  ]}
                />
              </View>

              <Pressable onPress={() => router.push(`/student/events/${selectedRewardEvent.id}`)} style={styles.ghostButton}>
                <Text style={styles.ghostButtonText}>Open rewards</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.warningStrip}>
            <Text style={styles.warningText}>
              ⚠ {"Don't"} screenshot or record. Short-lived, single-use.
            </Text>
          </View>

          {showProtectionNotice ? (
            <InfoCard eyebrow="Notice" motionIndex={6} title="Screen capture protection is limited here">
              <Text style={styles.bodyText}>{protection.detail}</Text>
            </InfoCard>
          ) : null}
        </>
      ) : null}

      {selectedEvent !== null && rewardOverviewQuery.isLoading ? (
        <InfoCard eyebrow="Progress" motionIndex={7} title="Loading rewards">
          <Text style={styles.bodyText}>Fetching leima counts and tier status.</Text>
        </InfoCard>
      ) : null}

      {selectedEvent !== null && rewardOverviewQuery.error ? (
        <InfoCard eyebrow="Progress" motionIndex={7} title="Reward progress unavailable">
          <Text style={styles.bodyText}>{rewardOverviewQuery.error.message}</Text>
          <Pressable onPress={() => void rewardOverviewQuery.refetch()} style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  activeSummaryBar: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bodyText: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  eventHero: {
    minHeight: 182,
    marginHorizontal: -mobileTheme.spacing.screenHorizontal,
    marginTop: -mobileTheme.spacing.screenVertical,
    overflow: "hidden",
    position: "relative",
  },
  eventHeroContent: {
    gap: 8,
    justifyContent: "flex-end",
    minHeight: 182,
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 42,
  },
  eventHeroEyebrow: {
    color: mobileTheme.colors.lime,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.eyebrow,
    letterSpacing: 1.2,
    lineHeight: mobileTheme.typography.lineHeights.eyebrow,
    textTransform: "uppercase",
  },
  eventHeroImage: {
    borderRadius: 0,
  },
  eventHeroMeta: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    lineHeight: mobileTheme.typography.lineHeights.bodySmall,
  },
  eventHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.52)",
  },
  eventHeroTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.extrabold,
    fontSize: mobileTheme.typography.sizes.title,
    letterSpacing: -0.5,
    lineHeight: mobileTheme.typography.lineHeights.title,
  },
  ghostButton: {
    alignSelf: "flex-start",
    borderColor: mobileTheme.colors.borderStrong,
    borderRadius: mobileTheme.radius.button,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  ghostButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  identityMeta: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.caption,
    lineHeight: mobileTheme.typography.lineHeights.caption,
    maxWidth: 112,
    textAlign: "right",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.lime,
    borderRadius: mobileTheme.radius.button,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#08090E",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  progressFill: {
    backgroundColor: mobileTheme.colors.lime,
    borderRadius: 999,
    height: 4,
  },
  progressLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  progressSection: {
    gap: 8,
  },
  progressTrack: {
    backgroundColor: mobileTheme.colors.borderDefault,
    borderRadius: 999,
    height: 4,
    overflow: "hidden",
  },
  qrBlock: {
    backgroundColor: mobileTheme.colors.surfaceL1,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.scene,
    borderWidth: 1,
    overflow: "hidden",
    padding: 14,
    ...interactiveSurfaceShadowStyle,
  },
  qrCorner: {
    borderColor: mobileTheme.colors.lime,
    height: 28,
    position: "absolute",
    width: 28,
  },
  qrCornerBottomLeft: {
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    bottom: 12,
    left: 12,
  },
  qrCornerBottomRight: {
    borderBottomWidth: 2,
    borderRightWidth: 2,
    bottom: 12,
    right: 12,
  },
  qrCornerTopLeft: {
    borderLeftWidth: 2,
    borderTopWidth: 2,
    left: 12,
    top: 12,
  },
  qrCornerTopRight: {
    borderRightWidth: 2,
    borderTopWidth: 2,
    right: 12,
    top: 12,
  },
  qrCountdownText: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.caption,
    lineHeight: mobileTheme.typography.lineHeights.caption,
  },
  qrErrorText: {
    color: mobileTheme.colors.danger,
    fontSize: 15,
    fontWeight: "600",
  },
  qrFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingTop: 14,
  },
  qrFrame: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderColor: mobileTheme.colors.borderSubtle,
    borderRadius: mobileTheme.radius.qr,
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
    padding: 12,
    position: "relative",
  },
  qrGuideLine: {
    backgroundColor: mobileTheme.colors.limeBorder,
    height: 1,
    left: 34,
    position: "absolute",
    right: 34,
    top: "50%",
  },
  qrInner: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.qrCanvas,
    borderRadius: mobileTheme.radius.card,
    justifyContent: "center",
    minHeight: 272,
    padding: 12,
  },
  qrLiveBadge: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.limeSurface,
    borderColor: mobileTheme.colors.limeBorder,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  qrLiveBadgeText: {
    color: mobileTheme.colors.lime,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.caption,
    letterSpacing: 0.8,
    lineHeight: mobileTheme.typography.lineHeights.caption,
  },
  qrLiveDot: {
    backgroundColor: mobileTheme.colors.lime,
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  qrLiveText: {
    color: mobileTheme.colors.lime,
    flex: 1,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.caption,
    letterSpacing: 1.2,
    lineHeight: mobileTheme.typography.lineHeights.caption,
  },
  qrPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 272,
  },
  qrPlaceholderText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 15,
    fontWeight: "600",
  },
  qrSceneEyebrow: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.caption,
    letterSpacing: 1.0,
    lineHeight: mobileTheme.typography.lineHeights.caption,
    textTransform: "uppercase",
  },
  qrSceneHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 14,
  },
  qrSceneTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.body,
    lineHeight: mobileTheme.typography.lineHeights.body,
  },
  qrSceneTitleGroup: {
    flex: 1,
    gap: 4,
  },
  rewardSummaryBadge: {
    backgroundColor: mobileTheme.colors.surfaceL3,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rewardSummaryBadgeText: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.caption,
    lineHeight: mobileTheme.typography.lineHeights.caption,
  },
  rewardSummaryCard: {
    backgroundColor: mobileTheme.colors.surfaceL1,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.scene,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  rewardSummaryCopy: {
    flex: 1,
    gap: 4,
  },
  rewardSummaryEyebrow: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: mobileTheme.typography.sizes.eyebrow,
    letterSpacing: 1.1,
    lineHeight: mobileTheme.typography.lineHeights.eyebrow,
    textTransform: "uppercase",
  },
  rewardSummaryFill: {
    backgroundColor: mobileTheme.colors.lime,
    borderRadius: 999,
    height: 5,
  },
  rewardSummaryHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  rewardSummaryText: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    lineHeight: mobileTheme.typography.lineHeights.bodySmall,
  },
  rewardSummaryTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.extrabold,
    fontSize: mobileTheme.typography.sizes.title,
    letterSpacing: -0.5,
    lineHeight: mobileTheme.typography.lineHeights.title,
  },
  rewardSummaryTrack: {
    backgroundColor: mobileTheme.colors.progressTrack,
    borderRadius: 999,
    height: 5,
    overflow: "hidden",
  },
  timeBlock: {
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    overflow: "hidden",
  },
  timeDivider: {
    backgroundColor: mobileTheme.colors.borderDefault,
    height: 1,
  },
  timeLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.0,
  },
  timeRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  timeValue: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  warningStrip: {
    backgroundColor: mobileTheme.colors.amberSurface,
    borderColor: mobileTheme.colors.amberBorder,
    borderRadius: mobileTheme.radius.chip,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  warningText: {
    color: mobileTheme.colors.amber,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
});
