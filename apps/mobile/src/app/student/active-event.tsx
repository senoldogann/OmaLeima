import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { FoundationStatusCard } from "@/features/foundation/components/foundation-status-card";
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
import { RewardProgressCard } from "@/features/rewards/components/reward-progress-card";
import { useStudentRewardOverviewQuery } from "@/features/rewards/student-rewards";
import { useSession } from "@/providers/session-provider";
import type { AppReadinessState } from "@/types/app";

const dateTimeFormatter = new Intl.DateTimeFormat("en-FI", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const formatDateTime = (value: string): string => dateTimeFormatter.format(new Date(value));

const mapProtectionState = (
  status: "ACTIVE" | "UNAVAILABLE" | "WEB_PREVIEW" | "ERROR"
): AppReadinessState => {
  switch (status) {
    case "ACTIVE": return "ready";
    case "ERROR": return "error";
    case "UNAVAILABLE": return "warning";
    case "WEB_PREVIEW": return "pending";
  }
};

// Rotating border animation for live QR
const useRotatingBorder = (enabled: boolean) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled) {
      rotation.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    loop.start();
    return () => loop.stop();
  }, [enabled, rotation]);

  return rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
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
  const hostedSmokeToken = qrTokenQuery.data?.qrPayload.token ?? null;
  const showHostedSmokeCard =
    __DEV__ && selectedEvent?.viewState === "ACTIVE" && typeof hostedSmokeToken === "string";

  const isQrLive = selectedEvent?.viewState === "ACTIVE" && !qrTokenQuery.isLoading && !qrTokenQuery.error;
  const borderRotation = useRotatingBorder(isQrLive);

  return (
    <AppScreen>
      {/* ------------------------------------------------------------------ */}
      {/* Error                                                                */}
      {/* ------------------------------------------------------------------ */}
      {qrContextQuery.error ? (
        <InfoCard eyebrow="Error" motionIndex={0} title="Could not load QR context">
          <Text style={styles.bodyText}>{qrContextQuery.error.message}</Text>
          <Pressable onPress={() => void qrContextQuery.refetch()} style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* No event                                                             */}
      {/* ------------------------------------------------------------------ */}
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

      {/* ------------------------------------------------------------------ */}
      {/* UPCOMING                                                             */}
      {/* ------------------------------------------------------------------ */}
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
          <Pressable
            onPress={() => router.push(`/student/events/${selectedEvent.id}`)}
            style={styles.ghostButton}
          >
            <Text style={styles.ghostButtonText}>View event details</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* ACTIVE — hero QR presentation                                        */}
      {/* ------------------------------------------------------------------ */}
      {selectedEvent?.viewState === "ACTIVE" ? (
        <>
          {/* Event header */}
          <InfoCard
            eyebrow={selectedEvent.city}
            motionIndex={1}
            title={selectedEvent.name}
            variant="scene"
          >
            <View style={styles.badges}>
              <StatusBadge label="active now" state="ready" />
              <StatusBadge
                label={qrTokenQuery.error ? "refresh error" : "live"}
                state={qrTokenQuery.error ? "error" : "ready"}
              />
            </View>

            {/* Student identity */}
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>STUDENT</Text>
              <Text style={styles.identityValue} numberOfLines={1}>
                {qrContextQuery.data?.studentDisplayName ?? session?.user.email ?? "Unknown"}
              </Text>
              <Text style={styles.identityMeta}>Until {formatDateTime(selectedEvent.endAt)}</Text>
            </View>
          </InfoCard>

          {/* QR block — full width, stands on its own */}
          <View style={styles.qrBlock}>
            {/* Rotating lime corner indicator */}
            {isQrLive ? (
              <Animated.View
                style={[
                  styles.qrRotatingIndicator,
                  { transform: [{ rotate: borderRotation }] },
                ]}
              />
            ) : null}

            {/* QR canvas */}
            <View style={styles.qrInner}>
              {qrTokenQuery.isLoading || qrSvgQuery.isLoading ? (
                <View style={styles.qrPlaceholder}>
                  <Text style={styles.qrPlaceholderText}>Loading QR…</Text>
                </View>
              ) : null}
              {qrSvgQuery.data ? (
                <SvgXml height={272} width={272} xml={qrSvgQuery.data} />
              ) : null}
              {qrTokenQuery.error ? (
                <View style={styles.qrPlaceholder}>
                  <Text style={styles.qrErrorText}>Token refresh failed</Text>
                </View>
              ) : null}
            </View>

            {/* Live indicator strip under QR */}
            <View style={styles.qrFooter}>
              <View style={styles.qrLiveDot} />
              <Text style={styles.qrLiveText}>LEIMA QR</Text>
              {isQrLive ? (
                <Text style={styles.qrCountdownText}>
                  refreshes in {countdownSeconds}s
                </Text>
              ) : null}
            </View>
          </View>

          {/* Countdown progress bar */}
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

          {/* Retry button */}
          {qrTokenQuery.error ? (
            <Pressable onPress={() => void qrTokenQuery.refetch()} style={styles.ghostButton}>
              <Text style={styles.ghostButtonText}>Retry QR refresh</Text>
            </Pressable>
          ) : null}

          {/* Warning */}
          <View style={styles.warningStrip}>
            <Text style={styles.warningText}>
              ⚠ {"Don't"} screenshot or record. Short-lived, single-use.
            </Text>
          </View>

          {/* Diagnostics — only when protection is not ACTIVE */}
          {protection.status !== "ACTIVE" ? (
            <FoundationStatusCard
              eyebrow="Readiness"
              title="QR screen status"
              items={[
                {
                  label: "Registered event",
                  value:
                    selectedEvent === null
                      ? "No registered active or upcoming event found."
                      : `${selectedEvent.name} (${selectedEvent.viewState.toLowerCase()})`,
                  state: selectedEvent === null ? "warning" : "ready",
                },
                {
                  label: "QR refresh",
                  value:
                    qrTokenQuery.isLoading
                      ? "Requesting QR token."
                      : qrTokenQuery.error?.message ?? "Token refresh loop ready.",
                  state: qrTokenQuery.isLoading ? "loading" : qrTokenQuery.error ? "error" : "ready",
                },
                {
                  label: "Capture protection",
                  value: protection.detail,
                  state: mapProtectionState(protection.status),
                },
              ]}
            />
          ) : null}

          {/* Dev smoke */}
          {showHostedSmokeCard ? (
            <InfoCard eyebrow="Dev" motionIndex={6} title="Smoke token">
              <View style={styles.tokenBox}>
                <Text selectable style={styles.tokenText}>{hostedSmokeToken}</Text>
              </View>
              <Text style={styles.dimText}>Dev builds only.</Text>
            </InfoCard>
          ) : null}
        </>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Reward progress                                                      */}
      {/* ------------------------------------------------------------------ */}
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

      {selectedEvent !== null && selectedRewardEvent ? (
        <RewardProgressCard
          event={selectedRewardEvent}
          onOpenEvent={(eventId: string) => {
            router.push(`/student/events/${eventId}`);
          }}
        />
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
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
  dimText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },

  // --- Identity block ---
  identityRow: {
    gap: 4,
    borderLeftWidth: 3,
    borderLeftColor: mobileTheme.colors.lime,
    paddingLeft: 14,
  },
  identityLabel: {
    color: mobileTheme.colors.lime,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  identityValue: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  identityMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
  },

  // --- Time block (upcoming) ---
  timeBlock: {
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    overflow: "hidden",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  timeDivider: {
    height: 1,
    backgroundColor: mobileTheme.colors.borderDefault,
  },
  timeLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.0,
  },
  timeValue: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },

  // --- QR block ---
  qrBlock: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceL1,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.scene,
    borderWidth: 1,
    overflow: "hidden",
    ...interactiveSurfaceShadowStyle,
  },
  qrRotatingIndicator: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: mobileTheme.radius.scene + 2,
    borderWidth: 2,
    borderColor: "transparent",
    borderTopColor: mobileTheme.colors.lime,
    borderRightColor: "transparent",
  },
  qrInner: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.qrCanvas,
    justifyContent: "center",
    margin: 16,
    borderRadius: mobileTheme.radius.card,
    minHeight: 304,
    padding: 16,
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
  qrErrorText: {
    color: mobileTheme.colors.danger,
    fontSize: 15,
    fontWeight: "600",
  },
  qrFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
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
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  qrCountdownText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },

  // --- Progress ---
  progressSection: {
    gap: 8,
  },
  progressTrack: {
    backgroundColor: mobileTheme.colors.borderDefault,
    borderRadius: 999,
    height: 4,
    overflow: "hidden",
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

  // --- Warning ---
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

  // --- Buttons ---
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

  // --- Dev token ---
  tokenBox: {
    backgroundColor: mobileTheme.colors.surfaceL3,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.inner,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tokenText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: "monospace",
  },
});
