import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  CameraView,
  type BarcodeScanningResult,
  useCameraPermissions,
} from "expo-camera";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { businessScanHistoryQueryKey } from "@/features/business/business-history";
import { useBusinessHomeOverviewQuery } from "@/features/business/business-home";
import type { MobileTheme } from "@/features/foundation/theme";
import { registerBusinessScannerDeviceAsync } from "@/features/scanner/scanner-device";
import { scanQrWithTimeoutAsync } from "@/features/scanner/scanner";
import type {
  ScannerAttemptResult,
  ScannerDeviceRegistration,
  ScannerLocationPayload,
} from "@/features/scanner/types";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

const scanTimeoutMs = 4_000;
const scannerKeepAwakeTag = "omaleima-event-day-scanner";

type ToneMeta = {
  eyebrow: string;
  backgroundColor: string;
  borderColor: string;
  accentColor: string;
  icon: string;
};

type ScannerDeviceState =
  | {
      device: null;
      error: null;
      status: "idle" | "registering";
    }
  | {
      device: ScannerDeviceRegistration;
      error: null;
      status: "ready";
    }
  | {
      device: null;
      error: string;
      status: "error";
    };

const emptyScannerLocation = {
  latitude: null,
  longitude: null,
} as const satisfies ScannerLocationPayload;

const formatDateTime = (formatter: Intl.DateTimeFormat, value: string): string =>
  formatter.format(new Date(value));

const createInitialScannerDeviceState = (): ScannerDeviceState => ({
  device: null,
  error: null,
  status: "idle",
});

const createToneConfig = (
  theme: MobileTheme,
  language: "fi" | "en"
): Record<ScannerAttemptResult["tone"], ToneMeta> => ({
  success: {
    eyebrow: language === "fi" ? "Onnistui" : "Success",
    backgroundColor: theme.colors.successSurface,
    borderColor: theme.colors.successBorder,
    accentColor: theme.colors.success,
    icon: "✓",
  },
  warning: {
    eyebrow: language === "fi" ? "Varoitus" : "Warning",
    backgroundColor: theme.colors.warningSurface,
    borderColor: theme.colors.warningBorder,
    accentColor: theme.colors.warning,
    icon: "!",
  },
  danger: {
    eyebrow: language === "fi" ? "Virhe" : "Error",
    backgroundColor: theme.colors.dangerSurface,
    borderColor: theme.colors.dangerBorder,
    accentColor: theme.colors.danger,
    icon: "✕",
  },
  neutral: {
    eyebrow: language === "fi" ? "Tulos" : "Result",
    backgroundColor: theme.colors.surfaceL3,
    borderColor: theme.colors.borderDefault,
    accentColor: theme.colors.textMuted,
    icon: "·",
  },
});

const createScanResultTitles = (
  language: "fi" | "en"
): Record<ScannerAttemptResult["status"], string> => ({
  SUCCESS: language === "fi" ? "Leima kirjattiin" : "Stamp recorded",
  QR_ALREADY_USED_OR_REPLAYED: language === "fi" ? "QR on jo käytetty" : "QR already used",
  ALREADY_STAMPED:
    language === "fi" ? "Opiskelija on jo leimattu" : "Student already stamped",
  EVENT_NOT_FOUND: language === "fi" ? "Tapahtumaa ei löytynyt" : "Event no longer exists",
  INVALID_QR: language === "fi" ? "QR ei kelpaa" : "QR is invalid",
  INVALID_QR_TYPE: language === "fi" ? "Väärä QR-tyyppi" : "Wrong QR type",
  QR_EXPIRED: language === "fi" ? "QR vanheni" : "QR expired",
  VENUE_NOT_IN_EVENT:
    language === "fi" ? "Väärä piste tälle QR:lle" : "Wrong venue for this QR",
  EVENT_NOT_ACTIVE:
    language === "fi" ? "Tapahtumaa ei voi skannata nyt" : "Event is not scannable",
  STUDENT_NOT_REGISTERED:
    language === "fi" ? "Opiskelija ei ole rekisteröitynyt" : "Student not registered",
  VENUE_JOINED_TOO_LATE:
    language === "fi" ? "Piste liittyi liian myöhään" : "Venue joined too late",
  BUSINESS_STAFF_NOT_ALLOWED:
    language === "fi" ? "Skanneritiliä ei hyväksytty" : "Scanner account not allowed",
  SCANNER_DEVICE_NOT_ALLOWED:
    language === "fi" ? "Skannerilaite ei kelpaa" : "Scanner device not allowed",
  SCANNER_PIN_REQUIRED:
    language === "fi" ? "Skannerin PIN puuttuu" : "Scanner PIN required",
  SCANNER_PIN_INVALID:
    language === "fi" ? "Skannerin PIN ei kelpaa" : "Scanner PIN invalid",
  NOT_BUSINESS_STAFF:
    language === "fi" ? "Yritysoikeus puuttuu" : "Business access missing",
  BUSINESS_CONTEXT_REQUIRED:
    language === "fi" ? "Skannerikonteksti puuttuu" : "Scanner context required",
  NETWORK_TIMEOUT: language === "fi" ? "Verkko aikakatkaistiin" : "Network timeout",
});

const createScanResultDetails = (
  language: "fi" | "en"
): Record<ScannerAttemptResult["status"], string> => ({
  SUCCESS:
    language === "fi"
      ? "Skanneri lukittuu onnistuneen luvun jälkeen, jotta tulos voidaan tarkistaa ennen jatkoa."
      : "Scanner locks after a successful read so staff can confirm the result before continuing.",
  QR_ALREADY_USED_OR_REPLAYED:
    language === "fi"
      ? "Pyydä opiskelijaa päivittämään QR-koodi."
      : "Ask the student to refresh the QR.",
  ALREADY_STAMPED:
    language === "fi"
      ? "Opiskelija on jo saanut tämän pisteen leiman tässä tapahtumassa."
      : "The student already received this venue stamp for the current event.",
  EVENT_NOT_FOUND:
    language === "fi"
      ? "Päivitä skannerin tapahtumakonteksti ennen uutta yritystä."
      : "Refresh the scanner context before trying again.",
  INVALID_QR:
    language === "fi"
      ? "Sisältö ei vastannut odotettua opiskelijan QR-muotoa."
      : "The payload did not match the expected student QR format.",
  INVALID_QR_TYPE:
    language === "fi"
      ? "Koodi luettiin, mutta se ei ollut opiskelijan leima-QR tähän käyttöön."
      : "The code was readable, but it was not a student stamp QR for this flow.",
  QR_EXPIRED:
    language === "fi"
      ? "Pyydä opiskelijaa avaamaan aktiivinen tapahtuma uudelleen ja näyttämään uusi QR."
      : "Ask the student to reopen the active event screen and generate a fresh QR.",
  VENUE_NOT_IN_EVENT:
    language === "fi"
      ? "Valittu piste ei vastaa QR-koodin tapahtumaa."
      : "The selected venue context does not match the event encoded in the QR.",
  EVENT_NOT_ACTIVE:
    language === "fi"
      ? "Skannaus on käytössä vain, kun valittu tapahtuma on käynnissä."
      : "Scanning is available only while the selected joined event is live.",
  STUDENT_NOT_REGISTERED:
    language === "fi"
      ? "Opiskelijan täytyy olla rekisteröitynyt tapahtumaan ennen leiman kirjausta."
      : "The student must be registered for the event before a stamp can be recorded.",
  VENUE_JOINED_TOO_LATE:
    language === "fi"
      ? "Tämä piste liittyi vasta, kun skannausikkuna oli jo auki."
      : "This venue joined after the event scan window had already opened.",
  BUSINESS_STAFF_NOT_ALLOWED:
    language === "fi"
      ? "Tällä tunnuksella ei ole skannerioikeutta valittuun yritykseen."
      : "This signed-in account does not have scanner permission for the selected business.",
  SCANNER_DEVICE_NOT_ALLOWED:
    language === "fi"
      ? "Tämä skannerilaite ei ole aktiivinen valitulle yritykselle. Päivitä skanneri tai kirjaudu uudelleen."
      : "This scanner device is not active for the selected business. Refresh the scanner or sign in again.",
  SCANNER_PIN_REQUIRED:
    language === "fi"
      ? "Syötä tämän skannerilaitteen henkilökunnan PIN ennen leiman kirjausta."
      : "Enter this scanner device staff PIN before recording a stamp.",
  SCANNER_PIN_INVALID:
    language === "fi"
      ? "PIN ei täsmännyt tähän skannerilaitteeseen. Tarkista koodi ja yritä uudelleen."
      : "PIN did not match this scanner device. Check the code and try again.",
  NOT_BUSINESS_STAFF:
    language === "fi"
      ? "Nykyinen istunto ei ole enää sidottu aktiiviseen henkilökuntatiliin."
      : "The current session is no longer attached to an active business staff record.",
  BUSINESS_CONTEXT_REQUIRED:
    language === "fi"
      ? "Valitse kelvollinen tapahtuma ennen skannausta."
      : "Pick a valid joined event before scanning.",
  NETWORK_TIMEOUT:
    language === "fi"
      ? "Vastausta ei saatu neljässä sekunnissa. Skannaa uusi QR, kun yhteys on vakaa."
      : "No response arrived within 4 seconds. Scan a fresh QR when the connection is stable.",
});

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
  }, [opacity, result, scale]);

  return { scale, opacity };
};

export default function BusinessScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ eventVenueId?: string }>();
  const queryClient = useQueryClient();
  const styles = useThemeStyles(createStyles);
  const { session } = useSession();
  const { copy, language, localeTag, theme } = useUiPreferences();
  const userId = session?.user.id ?? null;
  useKeepAwake(scannerKeepAwakeTag, { suppressDeactivateWarnings: true });

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [localeTag]
  );

  const toneConfig = useMemo(() => createToneConfig(theme, language), [language, theme]);
  const scanResultTitles = useMemo(() => createScanResultTitles(language), [language]);
  const scanResultDetails = useMemo(() => createScanResultDetails(language), [language]);

  const labels = useMemo(
    () => ({
      loadingTitle: language === "fi" ? "Avataan skanneria" : "Opening scanner",
      loadingBody:
        language === "fi"
          ? "Ladataan käynnissä olevat liittyneet tapahtumat ennen kameran avausta."
          : "Loading active joined events before camera opens.",
      errorTitle:
        language === "fi"
          ? "Skannerin konteksti ei latautunut"
          : "Could not load scanner context",
      scanTitle: copy.business.noActiveEvents,
      noActiveBody:
        language === "fi"
          ? "Yhtään liittynyttä tapahtumaa ei ole käynnissä juuri nyt. Liity ensin tapahtumaan tai odota sen alkamista."
          : "No joined event is active right now. Join or wait for an upcoming event to become live.",
      cameraPermissionLoading:
        language === "fi"
          ? "Kameran käyttöoikeuden tila latautuu."
          : "Camera permission state is loading.",
      cameraPermissionMissing:
        language === "fi" ? "Kameran käyttöoikeutta ei ole myönnetty." : "Camera permission is not granted.",
      grantCameraAccess:
        language === "fi" ? "Myönnä kameran käyttöoikeus" : "Grant camera access",
      reviewHint:
        language === "fi" ? "Tarkista tulos alta." : "Review the result below.",
      aimHint:
        language === "fi" ? "Kohdista kamera opiskelijan QR-koodiin." : "Aim the camera at the student QR.",
      processing: language === "fi" ? "KÄSITELLÄÄN" : "PROCESSING",
      reviewState: language === "fi" ? "TARKISTA" : "REVIEW",
      requestFailedTitle: language === "fi" ? "Pyyntö epäonnistui" : "Request failed",
      scanAgain: language === "fi" ? "Skannaa uudelleen" : "Scan again",
      stampCountLabel: language === "fi" ? "leimaa yhteensä" : "stamps total",
      endsLabel: language === "fi" ? "Päättyy" : "Ends",
      eventDayEyebrow: language === "fi" ? "Tapahtumapäivä" : "Event day",
      eventDayTitle: language === "fi" ? "Skanneri pysyy auki" : "Scanner stays awake",
      eventDayBody:
        language === "fi"
          ? "Pidä tämä näkymä auki tiskillä. Valittu piste pysyy paikallaan ja kamera on valmis seuraavalle opiskelijalle."
          : "Keep this view open at the desk. The selected checkpoint stays in place and the camera is ready for the next student.",
      queueReady: language === "fi" ? "Valmis jonolle" : "Ready for the line",
      selectedCheckpoint: language === "fi" ? "Valittu piste" : "Selected checkpoint",
      screenAwake: language === "fi" ? "Näyttö hereillä" : "Screen awake",
      scannerDevice: language === "fi" ? "Skannerilaite" : "Scanner device",
      scannerDeviceRegistering:
        language === "fi" ? "Rekisteröidään tätä laitetta…" : "Registering this device…",
      scannerDeviceReady: language === "fi" ? "Laite valmis" : "Device ready",
      scannerDeviceIdle: language === "fi" ? "Odotetaan tapahtumapistettä" : "Waiting for checkpoint",
      scannerDeviceError: language === "fi" ? "Laite ei rekisteröitynyt" : "Device did not register",
      scannerPin: language === "fi" ? "Henkilökunnan PIN" : "Staff PIN",
      scannerPinRequired:
        language === "fi"
          ? "Tämä laite vaatii PIN-koodin ennen skannausta."
          : "This device requires a PIN before scanning.",
      scannerPinPlaceholder: language === "fi" ? "4-8 numeroa" : "4-8 digits",
      scannerPinMissing:
        language === "fi"
          ? "Syötä skannerin PIN ennen skannausta."
          : "Enter the scanner PIN before scanning.",
      scannerDeviceRequired:
        language === "fi"
          ? "Skannerilaite täytyy rekisteröidä ennen leiman kirjausta."
          : "Scanner device must be registered before recording a stamp.",
      retryScannerDevice:
        language === "fi" ? "Yritä laiterekisteröintiä uudelleen" : "Retry device registration",
      alreadyStampedAt: language === "fi" ? "Kirjattu aiemmin" : "Already recorded",
    }),
    [copy.business.noActiveEvents, language]
  );

  const homeOverviewQuery = useBusinessHomeOverviewQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedEventVenueId, setSelectedEventVenueId] = useState<string | null>(null);
  const [scannerPin, setScannerPin] = useState<string>("");
  const [isScannerLocked, setIsScannerLocked] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ScannerAttemptResult | null>(null);
  const [scannerDeviceRetryNonce, setScannerDeviceRetryNonce] = useState<number>(0);
  const [scannerDeviceState, setScannerDeviceState] = useState<ScannerDeviceState>(
    createInitialScannerDeviceState
  );

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

    if (
      selectedEventVenueId !== null &&
      activeJoinedEvents.some((event) => event.eventVenueId === selectedEventVenueId)
    ) {
      return;
    }

    setSelectedEventVenueId(activeJoinedEvents[0].eventVenueId);
  }, [activeJoinedEvents, params.eventVenueId, selectedEventVenueId]);

  const selectedEvent = useMemo(
    () =>
      activeJoinedEvents.find((event) => event.eventVenueId === selectedEventVenueId) ?? null,
    [activeJoinedEvents, selectedEventVenueId]
  );
  const selectedBusinessId = selectedEvent?.businessId ?? null;
  const selectedBusinessName = selectedEvent?.businessName ?? null;
  const isScannerDeviceReady = scannerDeviceState.status === "ready";
  const isScannerPinRequired = scannerDeviceState.status === "ready" && scannerDeviceState.device.pinRequired;

  useEffect(() => {
    if (selectedBusinessId === null || selectedBusinessName === null) {
      setScannerDeviceState(createInitialScannerDeviceState());
      setScannerPin("");
      return;
    }

    let isActive = true;

    setScannerPin("");
    setScannerDeviceState({
      device: null,
      error: null,
      status: "registering",
    });

    const registerScannerDeviceAsync = async (): Promise<void> => {
      try {
        const device = await registerBusinessScannerDeviceAsync({
          businessId: selectedBusinessId,
          businessName: selectedBusinessName,
        });

        if (!isActive) {
          return;
        }

        setScannerDeviceState({
          device,
          error: null,
          status: "ready",
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setScannerDeviceState({
          device: null,
          error: error instanceof Error ? error.message : "Unknown scanner device registration error.",
          status: "error",
        });
      }
    };

    void registerScannerDeviceAsync();

    return () => {
      isActive = false;
    };
  }, [scannerDeviceRetryNonce, selectedBusinessId, selectedBusinessName]);

  const resetScanner = (): void => {
    setIsScannerLocked(false);
    setIsSubmitting(false);
    setSubmitError(null);
    setLastResult(null);
  };

  const submitScanAsync = async (qrToken: string): Promise<void> => {
    if (selectedEvent === null || isScannerLocked || isSubmitting) {
      return;
    }

    if (scannerDeviceState.status !== "ready") {
      setSubmitError(labels.scannerDeviceRequired);
      return;
    }

    if (scannerDeviceState.device.pinRequired && scannerPin.trim().length === 0) {
      setSubmitError(labels.scannerPinMissing);
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
          scannerDeviceId: scannerDeviceState.device.scannerDeviceId,
          scannerPin: scannerDeviceState.device.pinRequired ? scannerPin.trim() : null,
          scannerLocation: emptyScannerLocation,
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
      <View style={styles.topBar}>
        <Pressable onPress={() => router.push("/business/home")} style={styles.backButton}>
          <AppIcon color={theme.colors.textPrimary} name="chevron-left" size={18} />
        </Pressable>
        <View style={styles.topBarCopy}>
          <Text style={styles.screenTitle}>{copy.business.scanner}</Text>
          <Text style={styles.metaText}>{copy.business.scannerMeta}</Text>
        </View>
      </View>

      {homeOverviewQuery.isLoading ? (
        <InfoCard eyebrow={copy.common.loading} title={labels.loadingTitle}>
          <Text style={styles.bodyText}>{labels.loadingBody}</Text>
        </InfoCard>
      ) : null}

      {homeOverviewQuery.error ? (
        <InfoCard eyebrow={copy.common.error} title={labels.errorTitle}>
          <Text style={styles.bodyText}>{homeOverviewQuery.error.message}</Text>
          <Pressable onPress={() => void homeOverviewQuery.refetch()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{copy.common.retry}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <InfoCard eyebrow={copy.business.scanner} title={selectedEvent?.eventName ?? labels.scanTitle}>
          {activeJoinedEvents.length === 0 ? (
            <Text style={styles.bodyText}>{labels.noActiveBody}</Text>
          ) : (
            <>
              {selectedEvent ? (
                <View style={styles.scannerKiosk}>
                  {isScannerPinRequired ? (
                    <View style={styles.scannerPinBlock}>
                      <Text style={styles.eventDayEyebrow}>{labels.scannerPin}</Text>
                      <Text style={styles.metaText}>{labels.scannerPinRequired}</Text>
                      <TextInput
                        editable={!isSubmitting && !isScannerLocked}
                        keyboardType="number-pad"
                        maxLength={8}
                        onChangeText={setScannerPin}
                        placeholder={labels.scannerPinPlaceholder}
                        placeholderTextColor={theme.colors.textDim}
                        secureTextEntry
                        style={styles.pinInput}
                        value={scannerPin}
                      />
                    </View>
                  ) : null}

                  {permission === null ? (
                    <Text style={styles.bodyText}>{labels.cameraPermissionLoading}</Text>
                  ) : permission.granted && isScannerDeviceReady ? (
                    <View style={styles.cameraStack}>
                      <View
                        style={[
                          styles.cameraOuter,
                          isScannerLocked ? styles.cameraOuterLocked : null,
                        ]}
                      >
                        {!isScannerLocked ? (
                          <>
                            <View style={[styles.scanBracket, styles.scanBracketTL]} />
                            <View style={[styles.scanBracket, styles.scanBracketTR]} />
                            <View style={[styles.scanBracket, styles.scanBracketBL]} />
                            <View style={[styles.scanBracket, styles.scanBracketBR]} />
                          </>
                        ) : null}

                        <CameraView
                          active={!isScannerLocked}
                          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                          onBarcodeScanned={isScannerLocked ? undefined : handleBarcodeScanned}
                          style={styles.cameraView}
                        />

                        {isScannerLocked ? (
                          <View style={styles.lockedOverlay}>
                            <Text style={styles.lockedOverlayText}>
                              {isSubmitting ? labels.processing : labels.reviewState}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.cameraHint}>
                        {isScannerLocked ? labels.reviewHint : labels.aimHint}
                      </Text>
                    </View>
                  ) : permission.granted && !isScannerDeviceReady ? (
                    <View style={styles.cameraStack}>
                      <Text style={styles.bodyText}>
                        {scannerDeviceState.status === "registering"
                          ? labels.scannerDeviceRegistering
                          : scannerDeviceState.status === "error"
                            ? scannerDeviceState.error
                            : labels.scannerDeviceRequired}
                      </Text>
                      {scannerDeviceState.status === "error" ? (
                        <Pressable
                          disabled={isSubmitting}
                          onPress={() => setScannerDeviceRetryNonce((value) => value + 1)}
                          style={[styles.secondaryButton, isSubmitting ? styles.disabledButton : null]}
                        >
                          <Text style={styles.secondaryButtonText}>{labels.retryScannerDevice}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.cameraStack}>
                      <Text style={styles.bodyText}>{labels.cameraPermissionMissing}</Text>
                      <Pressable onPress={() => void requestPermission()} style={styles.primaryButton}>
                        <Text style={styles.primaryButtonText}>{labels.grantCameraAccess}</Text>
                      </Pressable>
                    </View>
                  )}

                  <View style={styles.scannerStatusBar}>
                    <View style={styles.scannerStatusCopy}>
                      <Text numberOfLines={1} style={styles.scannerStatusTitle}>
                        {selectedEvent.businessName}
                      </Text>
                      <Text numberOfLines={1} style={styles.scannerStatusMeta}>
                        {selectedEvent.eventName} · {labels.endsLabel}{" "}
                        {formatDateTime(formatter, selectedEvent.endAt)}
                      </Text>
                    </View>
                    <View style={styles.scannerReadyPill}>
                      <View style={styles.eventDayDot} />
                      <Text style={styles.scannerReadyText}>{labels.queueReady}</Text>
                    </View>
                  </View>
                </View>
              ) : null}

              {activeJoinedEvents.length > 1 ? (
                <View style={styles.eventSelectorStack}>
                  {activeJoinedEvents.map((event) => {
                    const isSelected = selectedEventVenueId === event.eventVenueId;

                    return (
                      <Pressable
                        key={event.eventVenueId}
                        disabled={isScannerLocked || isSubmitting}
                        onPress={() => setSelectedEventVenueId(event.eventVenueId)}
                        style={[
                          styles.eventSelectorCard,
                          isSelected ? styles.eventSelectorCardSelected : null,
                          isScannerLocked || isSubmitting ? styles.disabledButton : null,
                        ]}
                      >
                        <Text numberOfLines={1} style={styles.eventSelectorTitle}>
                          {event.eventName}
                        </Text>
                        <Text numberOfLines={1} style={styles.eventSelectorMeta}>
                          {event.businessName} · {event.city}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </>
          )}
        </InfoCard>
      ) : null}

      {lastResult !== null ? (
        <Animated.View style={{ opacity: resultOpacity, transform: [{ scale: resultScale }] }}>
          <InfoCard
            eyebrow={toneConfig[lastResult.tone].eyebrow}
            title={scanResultTitles[lastResult.status]}
          >
            <View
              style={[
                styles.resultHeroCard,
                {
                  backgroundColor: toneConfig[lastResult.tone].backgroundColor,
                  borderColor: toneConfig[lastResult.tone].borderColor,
                },
              ]}
            >
              <Text style={[styles.resultIcon, { color: toneConfig[lastResult.tone].accentColor }]}>
                {toneConfig[lastResult.tone].icon}
              </Text>

              {lastResult.status === "SUCCESS" && typeof lastResult.stampCount === "number" ? (
                <View style={styles.stampCountBlock}>
                  <Text
                    style={[
                      styles.stampCountNumber,
                      { color: toneConfig[lastResult.tone].accentColor },
                    ]}
                  >
                    {lastResult.stampCount}
                  </Text>
                  <Text style={styles.stampCountLabel}>{labels.stampCountLabel}</Text>
                </View>
              ) : null}

              <Text
                style={[
                  styles.resultMessage,
                  { color: toneConfig[lastResult.tone].accentColor },
                ]}
              >
                {lastResult.message}
              </Text>
            </View>

            <Text style={styles.bodyText}>{scanResultDetails[lastResult.status]}</Text>
            {lastResult.status === "ALREADY_STAMPED" && typeof lastResult.existingStampedAt === "string" ? (
              <Text style={styles.metaText}>
                {labels.alreadyStampedAt} {formatDateTime(formatter, lastResult.existingStampedAt)}
              </Text>
            ) : null}
            <View style={styles.actionRow}>
              <Pressable onPress={resetScanner} style={[styles.primaryButton, styles.actionFlex]}>
                <Text style={styles.primaryButtonText}>{labels.scanAgain}</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/business/history")}
                style={[styles.secondaryButton, styles.actionFlex]}
              >
                <Text style={styles.secondaryButtonText}>{copy.business.history}</Text>
              </Pressable>
            </View>
          </InfoCard>
        </Animated.View>
      ) : null}

      {submitError !== null ? (
        <InfoCard eyebrow={copy.common.error} title={labels.requestFailedTitle}>
          <Text style={styles.bodyText}>{submitError}</Text>
        </InfoCard>
      ) : null}

    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) => {
  const bracketColor = theme.colors.lime;

  return StyleSheet.create({
    actionFlex: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    backButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    businessHero: {
      borderRadius: theme.radius.inner,
      minHeight: 128,
      overflow: "hidden",
      position: "relative",
    },
    businessHeroContent: {
      alignItems: "flex-end",
      bottom: 14,
      flexDirection: "row",
      gap: 10,
      left: 14,
      position: "absolute",
      right: 14,
      zIndex: 2,
    },
    businessHeroCopy: {
      flex: 1,
      gap: 2,
    },
    businessHeroMeta: {
      color: "rgba(255, 255, 255, 0.78)",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    businessHeroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.42)",
      zIndex: 1,
    },
    businessHeroTitle: {
      color: "#FFFFFF",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    businessLogo: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: "rgba(255, 255, 255, 0.52)",
      borderRadius: 14,
      borderWidth: 1,
      height: 50,
      justifyContent: "center",
      overflow: "hidden",
      position: "relative",
      width: 50,
    },
    businessDetailStack: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 5,
      padding: 12,
    },
    businessDetailText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    cameraHint: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    cameraOuter: {
      aspectRatio: 3 / 4,
      backgroundColor: theme.colors.screenBase,
      borderRadius: theme.radius.inner,
      overflow: "hidden",
      position: "relative",
    },
    cameraOuterLocked: {
      opacity: 0.9,
    },
    cameraStack: {
      gap: 12,
    },
    cameraView: {
      flex: 1,
    },
    disabledButton: {
      opacity: 0.5,
    },
    eventSelectorCard: {
      backgroundColor: theme.colors.surfaceL1,
      borderRadius: theme.radius.inner,
      gap: 4,
      padding: 14,
    },
    eventSelectorCardSelected: {
      backgroundColor: theme.colors.surfaceL2,
    },
    eventSelectorMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    eventSelectorStack: {
      gap: 8,
    },
    eventSelectorTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    deviceCopy: {
      flex: 1,
      gap: 4,
    },
    deviceHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between",
    },
    devicePanel: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 12,
      padding: 14,
    },
    deviceStatus: {
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 6,
    },
    deviceStatusReady: {
      backgroundColor: theme.colors.lime,
    },
    deviceStatusText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.bold,
      fontSize: 10,
      lineHeight: 13,
      textTransform: "uppercase",
    },
    deviceStatusTextReady: {
      color: theme.colors.actionPrimaryText,
    },
    eventDayBody: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    eventDayCopy: {
      flex: 1,
      gap: 1,
    },
    eventDayDot: {
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      height: 7,
      width: 7,
    },
    eventDayEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.2,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    eventDayFooter: {
      flexDirection: "row",
      gap: 10,
    },
    eventDayHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
    },
    eventDayIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    eventDayPanel: {
      backgroundColor: theme.mode === "dark" ? "rgba(200, 255, 71, 0.08)" : "rgba(200, 255, 71, 0.2)",
      borderColor: theme.colors.limeBorder,
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      gap: 12,
      padding: 14,
    },
    eventDayPill: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flex: 1,
      gap: 2,
      minWidth: 0,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    eventDayPillLabel: {
      color: theme.colors.textDim,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 0.9,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    eventDayPillValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    eventDayReady: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    eventDayReadyText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    eventDayState: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: 999,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 9,
      paddingVertical: 6,
    },
    eventDayStateText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: 10,
      lineHeight: 13,
    },
    eventDayTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    kioskCopy: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    kioskHeader: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flexDirection: "row",
      gap: 12,
      padding: 14,
    },
    kioskIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    kioskState: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: 999,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    kioskStateText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: 10,
      lineHeight: 13,
      textTransform: "uppercase",
    },
    kioskTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    ghostButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: theme.radius.button,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    ghostButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    lockedOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      backgroundColor: theme.mode === "light" ? "rgba(245, 248, 245, 0.74)" : "rgba(8, 9, 14, 0.85)",
      justifyContent: "center",
      zIndex: 5,
    },
    lockedOverlayText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: 16,
      letterSpacing: 2,
      lineHeight: 20,
    },
    locationProofCopy: {
      flex: 1,
      gap: 4,
    },
    locationProofHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between",
    },
    locationProofPanel: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 12,
      padding: 14,
    },
    locationProofStatus: {
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 6,
    },
    locationProofStatusReady: {
      backgroundColor: theme.colors.lime,
    },
    locationProofStatusText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.bold,
      fontSize: 10,
      lineHeight: 13,
      textTransform: "uppercase",
    },
    locationProofStatusTextReady: {
      color: theme.colors.actionPrimaryText,
    },
    metaText: {
      color: theme.colors.textDim,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    primaryButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    pinInput: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: theme.mode === "light" ? 1 : 0,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      minHeight: 46,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    resultHeroCard: {
      alignItems: "center",
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      gap: 10,
      padding: 24,
      position: "relative",
      zIndex: 2,
    },
    resultIcon: {
      fontFamily: theme.typography.families.extrabold,
      fontSize: 42,
      lineHeight: 48,
    },
    resultMessage: {
      fontFamily: theme.typography.families.bold,
      fontSize: 16,
      lineHeight: 22,
      textAlign: "center",
    },
    scanBracket: {
      height: 24,
      position: "absolute",
      width: 24,
      zIndex: 10,
    },
    scanBracketBL: {
      borderBottomWidth: 2,
      borderColor: bracketColor,
      borderLeftWidth: 2,
      bottom: 16,
      left: 16,
    },
    scanBracketBR: {
      borderBottomWidth: 2,
      borderColor: bracketColor,
      borderRightWidth: 2,
      bottom: 16,
      right: 16,
    },
    scanBracketTL: {
      borderColor: bracketColor,
      borderLeftWidth: 2,
      borderTopWidth: 2,
      left: 16,
      top: 16,
    },
    scanBracketTR: {
      borderColor: bracketColor,
      borderRightWidth: 2,
      borderTopWidth: 2,
      right: 16,
      top: 16,
    },
    scannerPinBlock: {
      gap: 8,
    },
    scannerKiosk: {
      gap: 12,
    },
    scannerReadyPill: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    scannerReadyText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: 10,
      lineHeight: 13,
      textTransform: "uppercase",
    },
    scannerStatusBar: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    scannerStatusCopy: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    scannerStatusMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    scannerStatusTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    topBar: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      marginBottom: 4,
    },
    topBarCopy: {
      flex: 1,
      gap: 6,
    },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: theme.radius.button,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    selectedMetaRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between",
    },
    stampLabel: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      letterSpacing: 1.1,
      lineHeight: theme.typography.lineHeights.caption,
      textTransform: "uppercase",
    },
    stampCountBlock: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    stampCountLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.bold,
      fontSize: 11,
      letterSpacing: 1.5,
      lineHeight: 14,
    },
    stampCountNumber: {
      fontFamily: theme.typography.families.extrabold,
      fontSize: 48,
      fontVariant: ["tabular-nums"],
      lineHeight: 52,
    },
  });
};
