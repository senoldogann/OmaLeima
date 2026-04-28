import { useEffect, useMemo, useState } from "react";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { useBusinessHomeOverviewQuery } from "@/features/business/business-home";
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

export default function BusinessScannerScreen() {
  const params = useLocalSearchParams<{ eventVenueId?: string }>();
  const { session } = useSession();
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
        <Text selectable style={styles.bodyText}>
          Active joined events can scan now. The scanner locks after a read and waits for a result or timeout before staff can explicitly scan again.
        </Text>
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
        <InfoCard eyebrow={toneStyles[lastResult.tone].eyebrow} title={lastResult.status}>
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
            {typeof lastResult.stampCount === "number" ? (
              <Text selectable style={styles.metaText}>
                Student stamp count: {lastResult.stampCount}
              </Text>
            ) : null}
            <Text selectable style={styles.metaText}>
              {lastResult.status === "NETWORK_TIMEOUT"
                ? "Network response did not arrive within 4 seconds."
                : "Scanner stays locked until staff chooses to scan again."}
            </Text>
          </View>
          <Pressable onPress={resetScanner} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Scan again</Text>
          </Pressable>
        </InfoCard>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
  cameraFrame: {
    aspectRatio: 3 / 4,
    backgroundColor: "#020617",
    borderColor: "#1E293B",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  cameraView: {
    flex: 1,
  },
  cardTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.7,
  },
  eventSelectorCard: {
    backgroundColor: "#0F172A",
    borderColor: "#1E293B",
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  eventSelectorCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#172554",
  },
  metaText: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#1D4ED8",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  resultCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  stack: {
    gap: 12,
  },
  textArea: {
    backgroundColor: "#0F172A",
    borderColor: "#334155",
    borderRadius: 8,
    borderWidth: 1,
    color: "#F8FAFC",
    fontSize: 14,
    minHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
});
