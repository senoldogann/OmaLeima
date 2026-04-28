import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
import {
  useStudentRewardInventoryRealtime,
  useStudentRewardProgressRealtime,
} from "@/features/realtime/student-realtime";
import { RewardProgressCard } from "@/features/rewards/components/reward-progress-card";
import { useStudentRewardEventQuery } from "@/features/rewards/student-rewards";
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

const mapProtectionState = (status: "ACTIVE" | "UNAVAILABLE" | "WEB_PREVIEW" | "ERROR"): AppReadinessState => {
  switch (status) {
    case "ACTIVE":
      return "ready";
    case "ERROR":
      return "error";
    case "UNAVAILABLE":
      return "warning";
    case "WEB_PREVIEW":
      return "pending";
  }
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
  const trackedInventoryEventIds = useMemo(
    () => (selectedEvent === null ? [] : [selectedEvent.id]),
    [selectedEvent]
  );

  const rewardEventQuery = useStudentRewardEventQuery({
    eventId: selectedEvent?.id ?? "",
    studentId: studentId ?? "",
    isEnabled: selectedEvent !== null && studentId !== null,
  });

  useStudentRewardProgressRealtime({
    eventId: selectedEvent?.id ?? null,
    studentId: studentId ?? "",
    isEnabled: selectedEvent !== null && studentId !== null && isFocused && isAppActive,
  });

  useStudentRewardInventoryRealtime({
    trackedEventIds: trackedInventoryEventIds,
    studentId: studentId ?? "",
    detailEventId: null,
    isEnabled: selectedEvent !== null && studentId !== null && isFocused && isAppActive,
  });

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
    isEnabled: typeof qrTokenQuery.data?.qrPayload.token === "string" && qrTokenQuery.data.qrPayload.token.length > 0,
  });

  const refreshAfterSeconds = qrTokenQuery.data?.refreshAfterSeconds ?? null;
  const countdownSeconds = useQrCountdown(refreshAfterSeconds, qrTokenQuery.dataUpdatedAt, shouldRefreshQr);
  const refreshProgressRatio =
    refreshAfterSeconds === null || refreshAfterSeconds === 0 ? 0 : countdownSeconds / refreshAfterSeconds;

  return (
    <AppScreen>
      <InfoCard eyebrow="Student" motionIndex={0} title="My QR">
        <Text style={styles.bodyText}>
          Your QR stays short-lived and server-owned. The app only renders the current token window and keeps the refresh rhythm in sync with the backend.
        </Text>
      </InfoCard>

      <FoundationStatusCard
        eyebrow="Status"
        title="QR screen readiness"
        items={[
          {
            label: "Registered event",
            value:
              selectedEvent === null
                ? "No registered active or upcoming event found for this student."
                : `${selectedEvent.name} (${selectedEvent.viewState.toLowerCase()})`,
            state: selectedEvent === null ? "warning" : "ready",
          },
          {
            label: "QR refresh",
            value:
              selectedEvent?.viewState === "UPCOMING"
                ? "Waiting for the event to start before QR refresh begins."
                : qrTokenQuery.isLoading
                  ? "Requesting the current QR token."
                  : qrTokenQuery.error?.message ?? "QR token refresh loop is ready.",
            state:
              selectedEvent?.viewState === "UPCOMING"
                ? "pending"
                : qrTokenQuery.isLoading
                  ? "loading"
                  : qrTokenQuery.error
                    ? "error"
                    : selectedEvent?.viewState === "ACTIVE"
                      ? "ready"
                      : "warning",
          },
          {
            label: "Capture protection",
            value: protection.detail,
            state: mapProtectionState(protection.status),
          },
        ]}
      />

      {qrContextQuery.error ? (
        <InfoCard eyebrow="Error" motionIndex={2} title="Could not load QR context">
          <Text style={styles.bodyText}>{qrContextQuery.error.message}</Text>
          <Pressable onPress={() => void qrContextQuery.refetch()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!qrContextQuery.isLoading && selectedEvent === null ? (
        <InfoCard eyebrow="Standby" motionIndex={3} title="No registered event ready for QR">
          <Text style={styles.bodyText}>
            Join an event from the Events tab first. Once a registered event is active, the QR screen will start requesting rolling tokens here.
          </Text>
          <Pressable onPress={() => router.push("/student/events")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Open events</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {selectedEvent?.viewState === "UPCOMING" ? (
        <>
          <InfoCard eyebrow={selectedEvent.city} motionIndex={4} title={selectedEvent.name}>
            <View style={styles.badges}>
              <StatusBadge label="registered" state="ready" />
              <StatusBadge label="upcoming" state="pending" />
            </View>
            <Text style={styles.bodyText}>
              QR refresh stays paused until the event is active. Come back once the event starts and the screen will immediately request a fresh token.
            </Text>
            <View style={styles.metaGroup}>
              <Text style={styles.metaLine}>Starts {formatDateTime(selectedEvent.startAt)}</Text>
              <Text style={styles.metaLine}>Ends {formatDateTime(selectedEvent.endAt)}</Text>
            </View>
            <Pressable
              onPress={() => router.push(`/student/events/${selectedEvent.id}`)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Open event detail</Text>
            </Pressable>
          </InfoCard>

        </>
      ) : null}

      {selectedEvent?.viewState === "ACTIVE" ? (
        <>
          <InfoCard eyebrow={selectedEvent.city} motionIndex={4} title={selectedEvent.name}>
            <View style={styles.badges}>
              <StatusBadge label="active now" state="ready" />
              <StatusBadge label={qrTokenQuery.error ? "refresh error" : "live token"} state={qrTokenQuery.error ? "error" : "ready"} />
            </View>

            <Text style={styles.metaLine}>Student: {qrContextQuery.data?.studentDisplayName ?? session?.user.email ?? "Unknown student"}</Text>
            <Text style={styles.metaLine}>Event ends {formatDateTime(selectedEvent.endAt)}</Text>

            <View style={styles.qrShell}>
              {qrTokenQuery.isLoading || qrSvgQuery.isLoading ? (
                <Text style={styles.qrPlaceholderText}>Loading QR...</Text>
              ) : null}

              {qrSvgQuery.data ? <SvgXml height={280} width={280} xml={qrSvgQuery.data} /> : null}

              {qrTokenQuery.error ? (
                <Text style={styles.qrPlaceholderText}>Could not refresh QR. Retry below.</Text>
              ) : null}
            </View>

            <View style={styles.metaGroup}>
              <Text style={styles.metaLine}>
                {refreshAfterSeconds === null
                  ? "Waiting for the first QR token."
                  : `Next refresh in ${countdownSeconds}s`}
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.refreshProgressFill,
                    { width: `${Math.max(Math.min(refreshProgressRatio, 1), 0) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.metaLine}>QR refreshes automatically while this screen stays foregrounded.</Text>
            </View>

            {qrTokenQuery.error ? (
              <Pressable onPress={() => void qrTokenQuery.refetch()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Retry QR refresh</Text>
              </Pressable>
            ) : null}
          </InfoCard>

          <InfoCard eyebrow="Safety" motionIndex={5} title="QR usage reminder">
            <Text style={styles.warningText}>
              Do not screenshot or screen-record this QR. It is short-lived and should only be shown to participating venues during the active event window.
            </Text>
          </InfoCard>
        </>
      ) : null}

      {selectedEvent !== null && rewardEventQuery.isLoading ? (
        <InfoCard eyebrow="Progress" motionIndex={6} title="Updating reward progress">
          <Text style={styles.bodyText}>Loading leima counts, reward tiers, and claimed state for this event.</Text>
        </InfoCard>
      ) : null}

      {selectedEvent !== null && rewardEventQuery.error ? (
        <InfoCard eyebrow="Progress" motionIndex={6} title="Reward progress unavailable">
          <Text style={styles.bodyText}>{rewardEventQuery.error.message}</Text>
          <Pressable onPress={() => void rewardEventQuery.refetch()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Retry reward progress</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {selectedEvent !== null && rewardEventQuery.data ? (
        <RewardProgressCard
          event={rewardEventQuery.data}
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
    lineHeight: 20,
  },
  metaGroup: {
    gap: 8,
  },
  metaLine: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.actionBlueStrong,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: mobileTheme.radius.button,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...interactiveSurfaceShadowStyle,
  },
  primaryButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  progressTrack: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 999,
    height: 8,
    overflow: "hidden",
  },
  qrPlaceholderText: {
    color: "#5E738A",
    fontSize: 16,
    fontWeight: "600",
  },
  qrShell: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.qrCanvas,
    borderColor: "rgba(255, 255, 255, 0.28)",
    borderRadius: mobileTheme.radius.qr,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 312,
    padding: 18,
    ...interactiveSurfaceShadowStyle,
  },
  refreshProgressFill: {
    backgroundColor: mobileTheme.colors.actionBlue,
    borderRadius: 999,
    height: 8,
  },
  secondaryButton: {
    alignSelf: "flex-start",
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
  warningText: {
    color: mobileTheme.colors.accentGold,
    fontSize: 13,
    lineHeight: 18,
  },
});
