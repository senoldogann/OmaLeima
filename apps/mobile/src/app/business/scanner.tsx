import { useEffect, useMemo, useState } from "react";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { businessScanHistoryQueryKey } from "@/features/business/business-history";
import { useBusinessHomeOverviewQuery } from "@/features/business/business-home";
import { interactiveSurfaceShadowStyle, mobileTheme } from "@/features/foundation/theme";
import { scanQrWithTimeoutAsync } from "@/features/scanner/scanner";
import type { ScannerAttemptResult } from "@/features/scanner/types";
import { useSession } from "@/providers/session-provider";

const scanTimeoutMs = 4_000;
const isWeb = process.env.EXPO_OS === "web";

const dateTimeFormatter = new Intl.DateTimeFormat("en-FI", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const formatDateTime = (value: string): string => dateTimeFormatter.format(new Date(value));

const toneStyles: Record<ScannerAttemptResult["tone"], { eyebrow: string; borderColor: string; backgroundColor: string }> = {
  success: {
    eyebrow: "Success",
    borderColor: "#166534",
    backgroundColor: "#052E16",
  },
  warning: {
    eyebrow: "Warning",
    borderColor: "#92400E",
    backgroundColor: "#451A03",
  },
  danger: {
    eyebrow: "Error",
    borderColor: "#991B1B",
    backgroundColor: "#450A0A",
  },
  neutral: {
    eyebrow: "Result",
    borderColor: "#475569",
    backgroundColor: "#0F172A",
  },
};

const scanResultTitles: Record<ScannerAttemptResult["status"], string> = {
  SUCCESS: "Stamp recorded",
  QR_ALREADY_USED_OR_REPLAYED: "QR already used",
  ALREADY_STAMPED: "Student already stamped",
  EVENT_NOT_FOUND: "Event no longer exists",
  INVALID_QR: "QR is invalid",
  INVALID_QR_TYPE: "Wrong QR type",
  QR_EXPIRED: "QR expired",
  VENUE_NOT_IN_EVENT: "Wrong venue for this QR",
  EVENT_NOT_ACTIVE: "Event is not scannable",
  STUDENT_NOT_REGISTERED: "Student not registered",
  VENUE_JOINED_TOO_LATE: "Venue joined too late",
  BUSINESS_STAFF_NOT_ALLOWED: "Scanner account not allowed",
  NOT_BUSINESS_STAFF: "Business access missing",
  BUSINESS_CONTEXT_REQUIRED: "Scanner context required",
  NETWORK_TIMEOUT: "Network timeout",
};

const scanResultDetails: Record<ScannerAttemptResult["status"], string> = {
  SUCCESS: "Scanner is locked after a successful read so staff can confirm the result before continuing.",
  QR_ALREADY_USED_OR_REPLAYED: "This token should not be retried. Ask the student to refresh the QR in the app.",
  ALREADY_STAMPED: "The student already received this venue stamp for the current event.",
  EVENT_NOT_FOUND: "The event referenced by this QR is no longer available. Refresh the scanner context before trying again.",
  INVALID_QR: "The payload did not match the expected student QR format.",
  INVALID_QR_TYPE: "The code was readable, but it was not a student stamp QR for this scanner flow.",
  QR_EXPIRED: "Ask the student to reopen the active event screen and generate a fresh QR.",
  VENUE_NOT_IN_EVENT: "The selected venue context does not match the event encoded in the student QR.",
  EVENT_NOT_ACTIVE: "Scanning is available only while the selected joined event is live.",
  STUDENT_NOT_REGISTERED: "The student must be registered for the event before a stamp can be recorded.",
  VENUE_JOINED_TOO_LATE: "This venue joined after the event scan window had already opened.",
  BUSINESS_STAFF_NOT_ALLOWED: "This signed-in account does not have scanner permission for the selected business.",
  NOT_BUSINESS_STAFF: "The current session is no longer attached to an active business staff record. Sign in again.",
  BUSINESS_CONTEXT_REQUIRED: "Pick a valid joined business event context before scanning or refresh the scanner route.",
  NETWORK_TIMEOUT: "No response arrived within 4 seconds. Retry or use manual fallback when the connection settles.",
};

export default function BusinessScannerScreen() {
  const params = useLocalSearchParams<{ eventVenueId?: string }>();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? null;
  const homeOverviewQuery = useBusinessHomeOverviewQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedEventVenueId, setSelectedEventVenueId] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState<string>("");
  const [isScannerLocked, setIsScannerLocked] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ScannerAttemptResult | null>(null);

  const activeJoinedEvents = useMemo(
    () => homeOverviewQuery.data?.joinedActiveEvents ?? [],
    [homeOverviewQuery.data?.joinedActiveEvents]
  );

  useEffect(() => {
    if (activeJoinedEvents.length === 0) {
      setSelectedEventVenueId(null);
      return;
    }

    if (
      typeof params.eventVenueId === "string" &&
      activeJoinedEvents.some((event) => event.eventVenueId === params.eventVenueId)
    ) {
      setSelectedEventVenueId(params.eventVenueId);
      return;
    }

    if (selectedEventVenueId !== null && activeJoinedEvents.some((event) => event.eventVenueId === selectedEventVenueId)) {
      return;
    }

    setSelectedEventVenueId(activeJoinedEvents[0].eventVenueId);
  }, [activeJoinedEvents, params.eventVenueId, selectedEventVenueId]);

  const selectedEvent = useMemo(
    () => activeJoinedEvents.find((event) => event.eventVenueId === selectedEventVenueId) ?? null,
    [activeJoinedEvents, selectedEventVenueId]
  );

  const resetScanner = (): void => {
    setIsScannerLocked(false);
    setIsSubmitting(false);
    setSubmitError(null);
    setLastResult(null);
    setManualToken("");
  };

  const submitScanAsync = async (qrToken: string): Promise<void> => {
    if (selectedEvent === null || isScannerLocked || isSubmitting) {
      return;
    }

    setIsScannerLocked(true);
    setIsSubmitting(true);
    setSubmitError(null);
    setLastResult(null);

    try {
      const result = await scanQrWithTimeoutAsync(
        {
          qrToken,
          businessId: selectedEvent.businessId,
          scannerDeviceId: isWeb ? "web-preview" : null,
        },
        scanTimeoutMs
      );

      setLastResult(result);

      if (result.status === "SUCCESS" && userId !== null) {
        await queryClient.invalidateQueries({
          queryKey: businessScanHistoryQueryKey(userId),
        });
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unknown scanner error.");
      setIsScannerLocked(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult): void => {
    if (isScannerLocked || result.data.trim().length === 0) {
      return;
    }

    void submitScanAsync(result.data.trim());
  };

  return (
    <AppScreen>
      <InfoCard eyebrow="Scanner" title="QR scanner">
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <Text selectable style={styles.heroEyebrow}>Event-day mode</Text>
          <Text selectable style={styles.heroTitle}>
            Keep the scanner focused, fast, and obvious even when the bar gets crowded.
          </Text>
          <Text selectable style={styles.bodyText}>
            Active joined events can scan now. The scanner locks after a read and waits for a result or timeout before staff can explicitly scan again.
          </Text>
        </View>
      </InfoCard>

      {homeOverviewQuery.isLoading ? (
        <InfoCard eyebrow="Loading" title="Opening scanner">
          <Text selectable style={styles.bodyText}>
            Loading active joined events before camera and scan controls open.
          </Text>
        </InfoCard>
      ) : null}

      {homeOverviewQuery.error ? (
        <InfoCard eyebrow="Error" title="Could not load scanner context">
          <Text selectable style={styles.bodyText}>{homeOverviewQuery.error.message}</Text>
          <Pressable onPress={() => void homeOverviewQuery.refetch()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <InfoCard eyebrow="Event" title="Selected active event">
          {activeJoinedEvents.length === 0 ? (
            <Text selectable style={styles.bodyText}>
              No joined event is active right now. Join or wait for an upcoming event to become live before scanning.
            </Text>
          ) : (
            <View style={styles.stack}>
              {activeJoinedEvents.map((event) => {
                const isSelected = selectedEventVenueId === event.eventVenueId;

                return (
                  <Pressable
                    key={event.eventVenueId}
                    onPress={() => setSelectedEventVenueId(event.eventVenueId)}
                    style={[styles.eventSelectorCard, isSelected ? styles.eventSelectorCardSelected : null]}
                  >
                    <Text selectable style={styles.cardTitle}>
                      {event.eventName}
                    </Text>
                    <Text selectable style={styles.metaText}>
                      {event.businessName} · {event.city}
                    </Text>
                    <Text selectable style={styles.metaText}>
                      Ends {formatDateTime(event.endAt)}
                      {event.stampLabel ? ` · ${event.stampLabel}` : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error && selectedEvent !== null ? (
        <InfoCard eyebrow="Camera" title="Live camera scanner">
          {permission === null ? (
            <Text selectable style={styles.bodyText}>Camera permission state is loading.</Text>
          ) : permission.granted ? (
            <View style={styles.stack}>
              <View style={styles.cameraFrame}>
                <CameraView
                  active={!isScannerLocked}
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={isScannerLocked ? undefined : handleBarcodeScanned}
                  style={styles.cameraView}
                />
              </View>
              <Text selectable style={styles.metaText}>
                {isScannerLocked
                  ? "Scanner is locked until you review the latest result or manually unlock it."
                  : "Aim at the student QR. The scanner locks immediately after one read."}
              </Text>
            </View>
          ) : (
            <View style={styles.stack}>
              <Text selectable style={styles.bodyText}>
                Camera permission is not granted on this device yet.
              </Text>
              <Pressable onPress={() => void requestPermission()} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Grant camera access</Text>
              </Pressable>
            </View>
          )}
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error && selectedEvent !== null ? (
        <InfoCard eyebrow="Fallback" title="Manual QR token scan">
          <Text selectable style={styles.bodyText}>
            Web preview and event-day fallback can still hit the real `scan-qr` path by pasting a student token here.
          </Text>
          {__DEV__ ? (
            <Text selectable style={styles.metaText}>
              Same-device hosted smoke: sign in as a student first, copy the active token from My QR, then sign back in here with the current hosted scanner account and paste it below.
            </Text>
          ) : null}
          <TextInput
            editable={!isSubmitting}
            multiline
            onChangeText={setManualToken}
            placeholder="Paste a LEIMA_STAMP_QR JWT token"
            placeholderTextColor="#64748B"
            style={styles.textArea}
            value={manualToken}
          />
          <Pressable
            disabled={manualToken.trim().length === 0 || isSubmitting || isScannerLocked}
            onPress={() => void submitScanAsync(manualToken.trim())}
            style={[styles.primaryButton, manualToken.trim().length === 0 || isSubmitting || isScannerLocked ? styles.disabledButton : null]}
          >
            <Text style={styles.primaryButtonText}>{isSubmitting ? "Scanning..." : "Scan pasted token"}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {submitError !== null ? (
        <InfoCard eyebrow="Scanner" title="Request failed">
          <Text selectable style={styles.bodyText}>{submitError}</Text>
        </InfoCard>
      ) : null}

      {lastResult !== null ? (
        <InfoCard eyebrow={toneStyles[lastResult.tone].eyebrow} title={scanResultTitles[lastResult.status]}>
          <View
            style={[
              styles.resultCard,
              {
                backgroundColor: toneStyles[lastResult.tone].backgroundColor,
                borderColor: toneStyles[lastResult.tone].borderColor,
              },
            ]}
          >
            <Text selectable style={styles.cardTitle}>
              {lastResult.message}
            </Text>
            <Text selectable style={styles.metaText}>Status code: {lastResult.status}</Text>
            {typeof lastResult.stampCount === "number" ? (
              <Text selectable style={styles.metaText}>
                Student stamp count: {lastResult.stampCount}
              </Text>
            ) : null}
            <Text selectable style={styles.metaText}>{scanResultDetails[lastResult.status]}</Text>
          </View>
          <View style={styles.actionRow}>
            <Pressable onPress={resetScanner} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Scan again</Text>
            </Pressable>
            <Link href="/business/history" asChild>
              <Pressable style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Open history</Text>
              </Pressable>
            </Link>
          </View>
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <InfoCard eyebrow="History" title="Need a past scan?">
          <Text selectable style={styles.bodyText}>
            Recent scan outcomes are available in a separate route so staff can review them without keeping the camera open.
          </Text>
          <Link href="/business/history" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>View scan history</Text>
            </Pressable>
          </Link>
        </InfoCard>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  bodyText: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  cameraFrame: {
    aspectRatio: 3 / 4,
    backgroundColor: mobileTheme.colors.screenElevated,
    borderColor: mobileTheme.colors.cardBorderStrong,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    overflow: "hidden",
    ...interactiveSurfaceShadowStyle,
  },
  cameraView: {
    flex: 1,
  },
  cardTitle: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.7,
  },
  eventSelectorCard: {
    backgroundColor: mobileTheme.colors.cardBackgroundSoft,
    borderColor: mobileTheme.colors.cardBorder,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 16,
    ...interactiveSurfaceShadowStyle,
  },
  eventSelectorCardSelected: {
    borderColor: mobileTheme.colors.accentBlue,
    backgroundColor: "rgba(105, 189, 255, 0.12)",
  },
  heroCard: {
    backgroundColor: "rgba(255, 255, 255, 0.045)",
    borderColor: mobileTheme.colors.cardBorder,
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    overflow: "hidden",
    padding: 18,
    position: "relative",
  },
  heroEyebrow: {
    color: mobileTheme.colors.accentBlue,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroGlow: {
    backgroundColor: mobileTheme.colors.chromeTint,
    borderRadius: 140,
    height: 152,
    opacity: 0.48,
    position: "absolute",
    right: -44,
    top: -60,
    width: 152,
  },
  heroTitle: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  metaText: {
    color: mobileTheme.colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.actionBlueStrong,
    borderRadius: mobileTheme.radius.button,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...interactiveSurfaceShadowStyle,
  },
  primaryButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  resultCard: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 16,
    ...interactiveSurfaceShadowStyle,
  },
  stack: {
    gap: 12,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.actionNeutral,
    borderColor: mobileTheme.colors.actionNeutralBorder,
    borderRadius: mobileTheme.radius.button,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...interactiveSurfaceShadowStyle,
  },
  secondaryButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  textArea: {
    backgroundColor: mobileTheme.colors.actionNeutral,
    borderColor: mobileTheme.colors.actionNeutralBorder,
    borderRadius: 24,
    borderWidth: 1,
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    minHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
});
