import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Link, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { businessScanHistoryQueryKey } from "@/features/business/business-history";
import { useBusinessHomeOverviewQuery } from "@/features/business/business-home";
import { mobileTheme } from "@/features/foundation/theme";
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

// Tone config: STARK colors for each scan result tone
const toneConfig: Record<
  ScannerAttemptResult["tone"],
  {
    eyebrow: string;
    bg: string;
    border: string;
    accentColor: string;
    icon: string;
  }
> = {
  success: {
    eyebrow: "SUCCESS",
    bg: mobileTheme.colors.successSurface,
    border: mobileTheme.colors.successBorder,
    accentColor: mobileTheme.colors.success,
    icon: "✓",
  },
  warning: {
    eyebrow: "WARNING",
    bg: mobileTheme.colors.warningSurface,
    border: mobileTheme.colors.warningBorder,
    accentColor: mobileTheme.colors.warning,
    icon: "⚠",
  },
  danger: {
    eyebrow: "ERROR",
    bg: mobileTheme.colors.dangerSurface,
    border: mobileTheme.colors.dangerBorder,
    accentColor: mobileTheme.colors.danger,
    icon: "✕",
  },
  neutral: {
    eyebrow: "RESULT",
    bg: mobileTheme.colors.surfaceL3,
    border: mobileTheme.colors.borderDefault,
    accentColor: mobileTheme.colors.textMuted,
    icon: "·",
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

// Scan result appearance animation hook
const useScanResultAnimation = (result: ScannerAttemptResult | null) => {
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (result === null) {
      scale.setValue(0.95);
      opacity.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        damping: 20,
        stiffness: 200,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [result, scale, opacity]);

  return { scale, opacity };
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

  const { scale: resultScale, opacity: resultOpacity } = useScanResultAnimation(lastResult);

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
      {/* Loading */}
      {homeOverviewQuery.isLoading ? (
        <InfoCard eyebrow="LOADING" title="Opening scanner">
          <Text style={styles.bodyText}>Loading active joined events before camera opens.</Text>
        </InfoCard>
      ) : null}

      {/* Error */}
      {homeOverviewQuery.error ? (
        <InfoCard eyebrow="ERROR" title="Could not load scanner context">
          <Text style={styles.bodyText}>{homeOverviewQuery.error.message}</Text>
          <Pressable onPress={() => void homeOverviewQuery.refetch()} style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {/* Event selector */}
      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <InfoCard
          eyebrow="CONTEXT"
          title={activeJoinedEvents.length === 0 ? "No active events" : "Select event"}
          variant={activeJoinedEvents.length > 0 ? "scene" : "card"}
        >
          {activeJoinedEvents.length === 0 ? (
            <Text style={styles.bodyText}>
              No joined event is active right now. Join or wait for an upcoming event to become live.
            </Text>
          ) : (
            <View style={styles.eventSelectorStack}>
              {activeJoinedEvents.map((event) => {
                const isSelected = selectedEventVenueId === event.eventVenueId;

                return (
                  <Pressable
                    key={event.eventVenueId}
                    onPress={() => setSelectedEventVenueId(event.eventVenueId)}
                    style={[
                      styles.eventSelectorCard,
                      isSelected ? styles.eventSelectorCardSelected : null,
                    ]}
                  >
                    <View style={styles.eventSelectorHeader}>
                      <Text style={styles.eventSelectorTitle}>{event.eventName}</Text>
                      {isSelected ? (
                        <View style={styles.selectedBadge}>
                          <Text style={styles.selectedBadgeText}>SELECTED</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.eventSelectorMeta}>
                      {event.businessName} · {event.city}
                    </Text>
                    <Text style={styles.eventSelectorMeta}>
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

      {/* Live camera */}
      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error && selectedEvent !== null ? (
        <InfoCard eyebrow="CAMERA" title={isScannerLocked ? "Scanner locked" : "Aim and scan"}>
          {permission === null ? (
            <Text style={styles.bodyText}>Camera permission state is loading.</Text>
          ) : permission.granted ? (
            <View style={styles.cameraStack}>
              <View style={[styles.cameraOuter, isScannerLocked ? styles.cameraOuterLocked : null]}>
                {/* STARK scan brackets: thin cyan lines */}
                {!isScannerLocked && (
                  <>
                    <View style={[styles.scanBracket, styles.scanBracketTL]} />
                    <View style={[styles.scanBracket, styles.scanBracketTR]} />
                    <View style={[styles.scanBracket, styles.scanBracketBL]} />
                    <View style={[styles.scanBracket, styles.scanBracketBR]} />
                  </>
                )}

                <CameraView
                  active={!isScannerLocked}
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={isScannerLocked ? undefined : handleBarcodeScanned}
                  style={styles.cameraView}
                />

                {/* Locked overlay */}
                {isScannerLocked ? (
                  <View style={styles.lockedOverlay}>
                    <Text style={styles.lockedOverlayText}>
                      {isSubmitting ? "PROCESSING" : "REVIEW"}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.cameraHint}>
                {isScannerLocked
                  ? "Review result below."
                  : "Aim at QR. Locks after one read."}
              </Text>
            </View>
          ) : (
            <View style={styles.cameraStack}>
              <Text style={styles.bodyText}>Camera permission is not granted.</Text>
              <Pressable onPress={() => void requestPermission()} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Grant camera access</Text>
              </Pressable>
            </View>
          )}
        </InfoCard>
      ) : null}

      {/* Scan result */}
      {lastResult !== null ? (
        <Animated.View style={{ transform: [{ scale: resultScale }], opacity: resultOpacity }}>
          <InfoCard
            eyebrow={toneConfig[lastResult.tone].eyebrow}
            title={scanResultTitles[lastResult.status]}
          >
            <View
              style={[
                styles.resultHeroCard,
                {
                  backgroundColor: toneConfig[lastResult.tone].bg,
                  borderColor: toneConfig[lastResult.tone].border,
                },
              ]}
            >
              <Text style={[styles.resultIcon, { color: toneConfig[lastResult.tone].accentColor }]}>
                {toneConfig[lastResult.tone].icon}
              </Text>

              {lastResult.status === "SUCCESS" && typeof lastResult.stampCount === "number" ? (
                <View style={styles.stampCountBlock}>
                  <Text style={[styles.stampCountNumber, { color: toneConfig[lastResult.tone].accentColor }]}>
                    {lastResult.stampCount}
                  </Text>
                  <Text style={styles.stampCountLabel}>STAMPS</Text>
                </View>
              ) : null}

              <Text style={[styles.resultMessage, { color: toneConfig[lastResult.tone].accentColor }]}>
                {lastResult.message}
              </Text>
            </View>

            <Text style={styles.bodyText}>{scanResultDetails[lastResult.status]}</Text>
            <Text style={styles.metaText}>CODE: {lastResult.status}</Text>

            <View style={styles.actionRow}>
              <Pressable onPress={resetScanner} style={[styles.primaryButton, styles.actionFlex]}>
                <Text style={styles.primaryButtonText}>Scan again</Text>
              </Pressable>
              <Link href="/business/history" asChild>
                <Pressable style={[styles.ghostButton, styles.actionFlex]}>
                  <Text style={styles.ghostButtonText}>History</Text>
                </Pressable>
              </Link>
            </View>
          </InfoCard>
        </Animated.View>
      ) : null}

      {/* Submit error */}
      {submitError !== null ? (
        <InfoCard eyebrow="ERROR" title="Request failed">
          <Text style={styles.bodyText}>{submitError}</Text>
        </InfoCard>
      ) : null}

      {/* Manual fallback */}
      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error && selectedEvent !== null ? (
        <InfoCard eyebrow="FALLBACK" title="Manual entry">
          <Text style={styles.bodyText}>Paste a student token here.</Text>
          <TextInput
            editable={!isSubmitting}
            multiline
            onChangeText={setManualToken}
            placeholder="Paste LEIMA_STAMP_QR token"
            placeholderTextColor={mobileTheme.colors.textDim}
            style={styles.textArea}
            value={manualToken}
          />
          <Pressable
            disabled={manualToken.trim().length === 0 || isSubmitting || isScannerLocked}
            onPress={() => void submitScanAsync(manualToken.trim())}
            style={[
              styles.primaryButton,
              manualToken.trim().length === 0 || isSubmitting || isScannerLocked ? styles.disabledButton : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>{isSubmitting ? "Scanning…" : "Scan pasted token"}</Text>
          </Pressable>
        </InfoCard>
      ) : null}
    </AppScreen>
  );
}

const BRACKET_SIZE = 24;
const BRACKET_THICKNESS = 2;
const BRACKET_COLOR = mobileTheme.colors.cyan;

const styles = StyleSheet.create({
  bodyText: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  metaText: {
    color: mobileTheme.colors.textDim,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.0,
  },

  // --- Event selector ---
  eventSelectorStack: {
    gap: 8,
  },
  eventSelectorCard: {
    backgroundColor: mobileTheme.colors.surfaceL1,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.inner,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  eventSelectorCardSelected: {
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderColor: mobileTheme.colors.limeBorder,
  },
  eventSelectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventSelectorTitle: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  selectedBadge: {
    backgroundColor: mobileTheme.colors.lime,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedBadgeText: {
    color: "#08090E",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.0,
  },
  eventSelectorMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
  },

  // --- Camera ---
  cameraStack: {
    gap: 12,
  },
  cameraOuter: {
    aspectRatio: 3 / 4,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.inner,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    backgroundColor: mobileTheme.colors.screenBase,
  },
  cameraOuterLocked: {
    borderColor: mobileTheme.colors.borderMuted,
  },
  cameraView: {
    flex: 1,
  },

  scanBracket: {
    position: "absolute",
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
    zIndex: 10,
  },
  scanBracketTL: {
    top: 16,
    left: 16,
    borderTopWidth: BRACKET_THICKNESS,
    borderLeftWidth: BRACKET_THICKNESS,
    borderColor: BRACKET_COLOR,
  },
  scanBracketTR: {
    top: 16,
    right: 16,
    borderTopWidth: BRACKET_THICKNESS,
    borderRightWidth: BRACKET_THICKNESS,
    borderColor: BRACKET_COLOR,
  },
  scanBracketBL: {
    bottom: 16,
    left: 16,
    borderBottomWidth: BRACKET_THICKNESS,
    borderLeftWidth: BRACKET_THICKNESS,
    borderColor: BRACKET_COLOR,
  },
  scanBracketBR: {
    bottom: 16,
    right: 16,
    borderBottomWidth: BRACKET_THICKNESS,
    borderRightWidth: BRACKET_THICKNESS,
    borderColor: BRACKET_COLOR,
  },

  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 9, 14, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  lockedOverlayText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2.0,
  },
  cameraHint: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },

  // --- Scan result card ---
  resultHeroCard: {
    borderRadius: mobileTheme.radius.inner,
    borderWidth: 1,
    gap: 10,
    alignItems: "center",
    padding: 24,
  },
  resultIcon: {
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 48,
  },
  stampCountBlock: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  stampCountNumber: {
    fontSize: 48,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  stampCountLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  resultMessage: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionFlex: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    paddingVertical: 13,
  },
  ghostButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },

  // --- Misc ---
  textArea: {
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.inner,
    borderWidth: 1,
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    minHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
});
