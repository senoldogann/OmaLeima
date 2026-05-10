import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { hapticImpact, hapticNotification, ImpactStyle, NotificationType } from "@/features/foundation/safe-haptics";
import { SvgXml } from "react-native-svg";
import { useQueryClient } from "@tanstack/react-query";

import { AppScreen } from "@/components/app-screen";
import { AppIcon } from "@/components/app-icon";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import {
  getEventCoverSource,
  prefetchEventCoverUrls,
} from "@/features/events/event-visuals";
import { useStudentEventDetailQuery } from "@/features/events/student-event-detail";
import { triggerScanFeedback } from "@/features/foundation/safe-scan-feedback";
import type { MobileTheme } from "@/features/foundation/theme";
import { interactiveSurfaceShadowStyle } from "@/features/foundation/theme";
import { createUserSafeErrorMessage } from "@/features/foundation/user-safe-error";
import { useStudentRewardCelebration } from "@/features/notifications/student-reward-celebration";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import {
  selectStudentQrEvents,
  useActiveAppState,
  useCurrentTime,
  useGenerateQrTokenQuery,
  useQrCountdown,
  useQrScreenProtection,
  useQrSvgQuery,
  useStudentEventStampCountQuery,
  useStudentQrContextQuery,
} from "@/features/qr/student-qr";
import { useStudentStampCelebrationRealtime } from "@/features/realtime/student-realtime";
import { StudentLeimaPassCard } from "@/features/rewards/components/student-leima-pass-card";
import type { StudentRewardEventProgress } from "@/features/rewards/types";
import { useStudentRewardOverviewQuery } from "@/features/rewards/student-rewards";
import { useSession } from "@/providers/session-provider";

type ActivePassSide = "QR" | "LEIMA";
type LeimaShareAction = "SAVE" | "SHARE";

type ObservedStampState = {
  eventId: string;
  stampCount: number;
};

type LeimaShareNotice = {
  tone: "success" | "error";
  message: string;
};

type CaptureRefOptions = {
  fileName: string;
  format: "png";
  quality: number;
  result: "tmpfile";
};

type CaptureRefFunction = (target: unknown, options: CaptureRefOptions) => Promise<string>;

type MediaLibraryPermission = {
  granted: boolean;
};

type MediaLibraryAccess = {
  requestPermissionsAsync: (writeOnly: boolean, granularPermissions: string[]) => Promise<MediaLibraryPermission>;
  saveToLibraryAsync: (localUri: string) => Promise<void>;
};

type UnknownRecord = Record<string, unknown>;
type CaptureRefCarrier = {
  captureRef: CaptureRefFunction;
};

type MediaLibraryCarrier = {
  requestPermissionsAsync: (writeOnly: boolean, granularPermissions: string[]) => Promise<unknown>;
  saveToLibraryAsync: (localUri: string) => Promise<unknown>;
};

const passFlipPerspective = 900;

const createDateTimeFormatter = (localeTag: string): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(localeTag, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const createNativeShareModuleError = (moduleName: string, language: "fi" | "en"): Error =>
  new Error(
    language === "fi"
      ? `${moduleName} ei ole mukana tässä sovellusversiossa. Asenna uusin OmaLeima-kehitys- tai kauppaversio ja yritä uudelleen.`
      : `${moduleName} is not included in this app build. Install the latest OmaLeima development or store build and try again.`
  );

const resolveQrTokenErrorMessage = (error: Error, language: "fi" | "en"): string => {
  if (error.message.startsWith("QR_RATE_LIMITED:")) {
    return language === "fi"
      ? "QR päivittyy hetken päästä automaattisesti. Pidä tämä näkymä auki."
      : "QR will refresh automatically in a moment. Keep this screen open.";
  }

  return createUserSafeErrorMessage(error, language, "qrToken");
};

const isUnknownRecord = (value: unknown): value is UnknownRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const readDefaultCandidate = (moduleValue: unknown): unknown => {
  if (!isUnknownRecord(moduleValue)) {
    return null;
  }

  return moduleValue.default ?? null;
};

const hasMediaLibraryAccess = (value: unknown): value is MediaLibraryCarrier =>
  isUnknownRecord(value) &&
  typeof value.requestPermissionsAsync === "function" &&
  typeof value.saveToLibraryAsync === "function";

const hasCaptureRef = (value: unknown): value is CaptureRefCarrier =>
  isUnknownRecord(value) && typeof value.captureRef === "function";

const resolveMediaLibraryAccess = (moduleValue: unknown, language: "fi" | "en"): MediaLibraryAccess => {
  const candidates = [moduleValue, readDefaultCandidate(moduleValue)];
  const candidate = candidates.find(hasMediaLibraryAccess);

  if (typeof candidate === "undefined") {
    throw createNativeShareModuleError("ExpoMediaLibrary", language);
  }

  return {
    requestPermissionsAsync: async (writeOnly, granularPermissions) => {
      const result = await candidate.requestPermissionsAsync(writeOnly, granularPermissions);

      if (!isUnknownRecord(result) || typeof result.granted !== "boolean") {
        throw new Error(
          language === "fi"
            ? "Kuvakirjaston lupavastausta ei voitu lukea."
            : "Photo library permission response could not be read."
        );
      }

      return { granted: result.granted };
    },
    saveToLibraryAsync: async (localUri) => {
      await candidate.saveToLibraryAsync(localUri);
    },
  };
};

const loadMediaLibraryAccessAsync = async (language: "fi" | "en"): Promise<MediaLibraryAccess> => {
  try {
    const moduleValue: unknown = await import("expo-media-library");

    return resolveMediaLibraryAccess(moduleValue, language);
  } catch {
    throw createNativeShareModuleError("ExpoMediaLibrary", language);
  }
};

const resolveCaptureRef = (moduleValue: unknown, language: "fi" | "en"): CaptureRefFunction => {
  const candidates = [moduleValue, readDefaultCandidate(moduleValue)];
  const candidate = candidates.find(hasCaptureRef);

  if (typeof candidate === "undefined") {
    throw createNativeShareModuleError("react-native-view-shot", language);
  }

  return async (target, options) => {
    let result: string;

    try {
      result = await candidate.captureRef(target, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";

      if (message.includes("RNViewShot is undefined") || message.toLowerCase().includes("linked")) {
        throw createNativeShareModuleError("react-native-view-shot", language);
      }

      throw error;
    }

    if (typeof result !== "string" || result.length === 0) {
      throw new Error(
        language === "fi"
          ? "Leimakortin kuvakaappausta ei voitu luoda."
          : "The leima card snapshot could not be created."
      );
    }

    return result;
  };
};

const loadCaptureRefAsync = async (language: "fi" | "en"): Promise<CaptureRefFunction> => {
  try {
    const moduleValue: unknown = await import("react-native-view-shot");

    return resolveCaptureRef(moduleValue, language);
  } catch {
    throw createNativeShareModuleError("react-native-view-shot", language);
  }
};

const createProgressHeadline = (event: StudentRewardEventProgress, language: "fi" | "en"): string => {
  if (event.claimableTierCount > 0) {
    return language === "fi"
      ? `${event.claimableTierCount} palkintoa valmiina noutoon.`
      : `${event.claimableTierCount} reward${event.claimableTierCount === 1 ? "" : "s"} ready for claim.`;
  }

  const nextTier = event.tiers.find((tier) => tier.state === "MORE_NEEDED") ?? null;

  if (nextTier !== null) {
    return language === "fi"
      ? `${nextTier.missingStampCount} leimaa seuraavaan avaukseen.`
      : `${nextTier.missingStampCount} leima left to the next unlock.`;
  }

  if (event.claimedTierCount > 0) {
    return language === "fi"
      ? `${event.claimedTierCount} palkintoa jo lunastettu.`
      : `${event.claimedTierCount} reward${event.claimedTierCount === 1 ? "" : "s"} already claimed.`;
  }

  return language === "fi"
    ? "Kerää leimoja avataksesi seuraavan palkinnon."
    : "Collect leimas to unlock the next reward.";
};

const getHighestRewardRequirement = (event: StudentRewardEventProgress | null): number => {
  if (event === null || event.tiers.length === 0) {
    return 0;
  }

  return Math.max(...event.tiers.map((tier) => tier.requiredStampCount));
};

export default function StudentActiveEventScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isFocused = useIsFocused();
  const isAppActive = useActiveAppState();
  const { width: windowWidth } = useWindowDimensions();
  const now = useCurrentTime(isFocused && isAppActive);
  const { session } = useSession();
  const { triggerRewardCelebration } = useStudentRewardCelebration();
  const { copy, language, localeTag, theme } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const formatter = useMemo(() => createDateTimeFormatter(localeTag), [localeTag]);
  const studentId = session?.user.id ?? null;
  const accessToken = session?.access_token ?? null;
  const lastCelebratedStampKeyRef = useRef<string | null>(null);
  const lastObservedRewardStampRef = useRef<ObservedStampState | null>(null);
  const lastPolledStampCountRef = useRef<ObservedStampState | null>(null);
  const previousSelectedEventIdRef = useRef<string | null>(null);
  const selectedRewardEventRef = useRef<StudentRewardEventProgress | null>(null);
  const eventHeroScrollRef = useRef<ScrollView | null>(null);
  const leimaShareCardRef = useRef<View | null>(null);
  const passFlipProgress = useRef(new Animated.Value(0)).current;
  const [activePassSide, setActivePassSide] = useState<ActivePassSide>("QR");
  const [isProtectingQrFlipTransition, setIsProtectingQrFlipTransition] = useState(false);
  const [leimaShareNotice, setLeimaShareNotice] = useState<LeimaShareNotice | null>(null);
  const [leimaShareAction, setLeimaShareAction] = useState<LeimaShareAction | null>(null);
  const [selectedQrEventId, setSelectedQrEventId] = useState<string | null>(null);

  const qrContextQuery = useStudentQrContextQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null,
  });

  const qrEventCandidates = useMemo(
    () => (qrContextQuery.data ? selectStudentQrEvents(qrContextQuery.data.registeredEvents, now) : []),
    [now, qrContextQuery.data]
  );
  const selectedEvent = useMemo(
    () =>
      selectedQrEventId === null
        ? (qrEventCandidates[0] ?? null)
        : (qrEventCandidates.find((event) => event.id === selectedQrEventId) ?? qrEventCandidates[0] ?? null),
    [qrEventCandidates, selectedQrEventId]
  );
  const selectedEventId = selectedEvent?.id ?? null;
  const selectedEventName = selectedEvent?.name ?? null;
  const shouldProtectQrScreen =
    isFocused &&
    selectedEvent?.viewState === "ACTIVE" &&
    (activePassSide === "QR" || isProtectingQrFlipTransition);
  const protection = useQrScreenProtection(shouldProtectQrScreen);
  const eventHeroWidth = Math.max(280, windowWidth);
  const selectedEventIndex = useMemo(() => {
    const foundIndex = qrEventCandidates.findIndex((event) => event.id === selectedEventId);

    return foundIndex < 0 ? 0 : foundIndex;
  }, [qrEventCandidates, selectedEventId]);

  const rewardOverviewQuery = useStudentRewardOverviewQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null,
  });
  const rewardEventsById = useMemo(
    () => new Map((rewardOverviewQuery.data?.events ?? []).map((event) => [event.id, event])),
    [rewardOverviewQuery.data?.events]
  );

  const selectedRewardEvent = useMemo(
    () =>
      selectedEventId === null
        ? null
        : (rewardOverviewQuery.data?.events.find((event) => event.id === selectedEventId) ?? null),
    [rewardOverviewQuery.data, selectedEventId]
  );

  const selectedEventDetailQuery = useStudentEventDetailQuery({
    eventId: selectedEventId ?? "",
    studentId: studentId ?? "",
    isEnabled: selectedEventId !== null && studentId !== null,
  });
  const shouldMonitorLiveStamps =
    selectedEvent !== null &&
    selectedEvent.viewState === "ACTIVE" &&
    selectedEventId !== null &&
    studentId !== null &&
    isFocused &&
    isAppActive;
  const liveStampCountQuery = useStudentEventStampCountQuery({
    eventId: selectedEventId ?? "",
    studentId: studentId ?? "",
    isEnabled: shouldMonitorLiveStamps,
    refetchIntervalMs: shouldMonitorLiveStamps ? 2000 : false,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
  });

  const shouldRefreshQr =
    selectedEvent !== null &&
    selectedEvent.viewState === "ACTIVE" &&
    accessToken !== null &&
    isFocused &&
    isAppActive &&
    (activePassSide === "QR" || isProtectingQrFlipTransition);

  const qrTokenQuery = useGenerateQrTokenQuery({
    accessToken: accessToken ?? "",
    eventId: selectedEvent?.id ?? "",
    isEnabled: shouldRefreshQr,
    sessionCacheKey: studentId ?? "anonymous",
  });

  const qrSvgQuery = useQrSvgQuery({
    eventId: selectedEventId ?? "",
    token: qrTokenQuery.data?.qrPayload.token ?? "",
    tokenVersion: qrTokenQuery.data?.expiresAt ?? "missing",
    isEnabled:
      shouldProtectQrScreen &&
      selectedEventId !== null &&
      typeof qrTokenQuery.data?.qrPayload.token === "string" &&
      qrTokenQuery.data.qrPayload.token.length > 0,
  });

  const prevQrDataRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (qrSvgQuery.data !== undefined && prevQrDataRef.current === undefined) {
      hapticImpact(ImpactStyle.Light);
    }
    prevQrDataRef.current = qrSvgQuery.data;
  }, [qrSvgQuery.data]);

  const countdownSeconds = useQrCountdown(qrTokenQuery.data?.expiresAt ?? null, shouldRefreshQr);
  const isQrLive = selectedEvent?.viewState === "ACTIVE" && !qrTokenQuery.isLoading && !qrTokenQuery.error;
  const qrCountdownColor =
    isQrLive && countdownSeconds <= 3
      ? theme.colors.danger
      : isQrLive && countdownSeconds <= 5
        ? "#F59E0B"
        : theme.colors.textMuted;

  useEffect(() => {
    if (!isQrLive) return;
    if (countdownSeconds === 5) hapticNotification(NotificationType.Warning);
    else if (countdownSeconds === 3) hapticNotification(NotificationType.Error);
  }, [countdownSeconds, isQrLive]);
  const canRenderQrSvg = shouldProtectQrScreen && activePassSide === "QR" && isFocused && isAppActive;
  const showProtectionNotice = protection.status === "ERROR";
  const selectedDetailMinimumStampsRequired = selectedEventDetailQuery.data?.minimumStampsRequired ?? 0;
  const selectedPassMinimumStampsRequired = Math.max(
    selectedDetailMinimumStampsRequired,
    selectedRewardEvent?.minimumStampsRequired ?? 0,
    selectedEvent?.minimumStampsRequired ?? 0
  );
  const selectedPassTargetStampCount = Math.max(
    selectedPassMinimumStampsRequired,
    getHighestRewardRequirement(selectedRewardEvent)
  );
  const qrFaceAnimatedStyle = useMemo(
    () => ({
      opacity: passFlipProgress.interpolate({
        inputRange: [0, 0.49, 0.5, 1],
        outputRange: [1, 1, 0, 0],
      }),
      transform: [
        { perspective: passFlipPerspective },
        {
          rotateY: passFlipProgress.interpolate({
            inputRange: [0, 1],
            outputRange: ["0deg", "180deg"],
          }),
        },
      ],
    }),
    [passFlipProgress]
  );
  const leimaFaceAnimatedStyle = useMemo(
    () => ({
      opacity: passFlipProgress.interpolate({
        inputRange: [0, 0.49, 0.5, 1],
        outputRange: [0, 0, 1, 1],
      }),
      transform: [
        { perspective: passFlipPerspective },
        {
          rotateY: passFlipProgress.interpolate({
            inputRange: [0, 1],
            outputRange: ["-180deg", "0deg"],
          }),
        },
      ],
    }),
    [passFlipProgress]
  );

  const setPassSide = useCallback(
    (nextSide: ActivePassSide): void => {
      setIsProtectingQrFlipTransition(nextSide === "LEIMA");
      setActivePassSide(nextSide);
      Animated.spring(passFlipProgress, {
        toValue: nextSide === "LEIMA" ? 1 : 0,
        damping: 18,
        stiffness: 160,
        mass: 0.9,
        useNativeDriver: false,
      }).start((result) => {
        if (nextSide === "LEIMA" || !result.finished) {
          setIsProtectingQrFlipTransition(false);
        }
      });
    },
    [passFlipProgress]
  );

  const handleHeroMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
      if (qrEventCandidates.length <= 1) {
        return;
      }

      const rawIndex = Math.max(
        0,
        Math.min(qrEventCandidates.length - 1, Math.round(event.nativeEvent.contentOffset.x / eventHeroWidth))
      );
      const indexDelta = rawIndex > selectedEventIndex ? 1 : rawIndex < selectedEventIndex ? -1 : 0;
      const nextIndex = Math.max(0, Math.min(qrEventCandidates.length - 1, selectedEventIndex + indexDelta));
      const nextEvent = qrEventCandidates[nextIndex];

      if (typeof nextEvent === "undefined" || nextEvent.id === selectedQrEventId) {
        return;
      }

      setSelectedQrEventId(nextEvent.id);
    },
    [eventHeroWidth, qrEventCandidates, selectedEventIndex, selectedQrEventId]
  );

  useEffect(() => {
    if (qrEventCandidates.length === 0) {
      if (selectedQrEventId !== null) {
        setSelectedQrEventId(null);
      }

      return;
    }

    const isSelectedQrEventStillAvailable =
      selectedQrEventId !== null && qrEventCandidates.some((event) => event.id === selectedQrEventId);

    if (isSelectedQrEventStillAvailable) {
      return;
    }

    const nextSelectedEvent = qrEventCandidates[0];

    if (typeof nextSelectedEvent === "undefined") {
      return;
    }

    setSelectedQrEventId(nextSelectedEvent.id);
  }, [qrEventCandidates, selectedQrEventId]);

  useEffect(() => {
    if (previousSelectedEventIdRef.current === selectedEventId) {
      return;
    }

    previousSelectedEventIdRef.current = selectedEventId;

    if (activePassSide === "LEIMA") {
      setPassSide("QR");
    }
  }, [activePassSide, selectedEventId, setPassSide]);

  const triggerStampCelebration = useCallback(
    (stampCount: number, coverImageUrl: string | null): void => {
      if (selectedEventId === null || selectedEventName === null) {
        return;
      }

      const celebrationKey = `stamp:${selectedEventId}:${stampCount}`;

      if (lastCelebratedStampKeyRef.current === celebrationKey) {
        return;
      }

      lastCelebratedStampKeyRef.current = celebrationKey;
      triggerScanFeedback("success");
      void qrTokenQuery.refetch();
      triggerRewardCelebration([
        {
          kind: "STAMP",
          key: celebrationKey,
          eventId: selectedEventId,
          eventName: selectedEventName,
          coverImageUrl,
          stampCount,
        },
      ]);
    },
    [qrTokenQuery, selectedEventId, selectedEventName, triggerRewardCelebration]
  );

  const handleRealtimeLeima = useCallback(
    (eventId: string): void => {
      if (selectedEventId === null || selectedEventId !== eventId) {
        return;
      }

      void liveStampCountQuery.refetch();
    },
    [liveStampCountQuery, selectedEventId]
  );

  useEffect(() => {
    selectedRewardEventRef.current = selectedRewardEvent;
  }, [selectedRewardEvent]);

  useEffect(() => {
    const currentStampCount = selectedRewardEvent?.stampCount ?? 0;

    if (selectedEventId === null || selectedEvent?.viewState !== "ACTIVE") {
      lastObservedRewardStampRef.current = null;
      return;
    }

    const previousObserved = lastObservedRewardStampRef.current;

    if (previousObserved === null || previousObserved.eventId !== selectedEventId) {
      lastObservedRewardStampRef.current = {
        eventId: selectedEventId,
        stampCount: currentStampCount,
      };
      return;
    }

    if (isFocused && isAppActive && currentStampCount > previousObserved.stampCount) {
      triggerStampCelebration(currentStampCount, selectedRewardEvent?.coverImageUrl ?? null);
    }

    lastObservedRewardStampRef.current = {
      eventId: selectedEventId,
      stampCount: currentStampCount,
    };
  }, [
    isAppActive,
    isFocused,
    selectedEvent?.viewState,
    selectedEventId,
    selectedRewardEvent?.coverImageUrl,
    selectedRewardEvent?.stampCount,
    triggerStampCelebration,
  ]);

  useEffect(() => {
    const polledStampCount = liveStampCountQuery.data?.stampCount;

    if (selectedEventId === null || !shouldMonitorLiveStamps || typeof polledStampCount !== "number") {
      if (selectedEventId === null || selectedEvent?.viewState !== "ACTIVE") {
        lastPolledStampCountRef.current = null;
      }

      return;
    }

    const previousPolledStampCount = lastPolledStampCountRef.current;

    if (previousPolledStampCount === null || previousPolledStampCount.eventId !== selectedEventId) {
      lastPolledStampCountRef.current = {
        eventId: selectedEventId,
        stampCount: polledStampCount,
      };
      return;
    }

    if (polledStampCount > previousPolledStampCount.stampCount) {
      lastObservedRewardStampRef.current = {
        eventId: selectedEventId,
        stampCount: polledStampCount,
      };
      triggerStampCelebration(polledStampCount, selectedRewardEventRef.current?.coverImageUrl ?? null);
      void rewardOverviewQuery.refetch();
      void selectedEventDetailQuery.refetch();
    }

    lastPolledStampCountRef.current = {
      eventId: selectedEventId,
      stampCount: polledStampCount,
    };
  }, [
    liveStampCountQuery.data?.stampCount,
    rewardOverviewQuery,
    selectedEvent?.viewState,
    selectedEventDetailQuery,
    selectedEventId,
    shouldMonitorLiveStamps,
    triggerStampCelebration,
  ]);

  useStudentStampCelebrationRealtime({
    eventId: selectedEventId ?? "",
    studentId: studentId ?? "",
    isEnabled: selectedEvent?.viewState === "ACTIVE" && studentId !== null && isFocused && isAppActive,
    onValidStamp: handleRealtimeLeima,
  });

  useEffect(() => {
    void prefetchEventCoverUrls([selectedRewardEvent?.coverImageUrl ?? null]);
  }, [selectedRewardEvent?.coverImageUrl]);

  useEffect(() => {
    if (shouldRefreshQr || selectedEventId === null) {
      return;
    }

    queryClient.removeQueries({
      exact: false,
      queryKey: ["student-generate-qr-token", selectedEventId],
    });
    queryClient.removeQueries({
      exact: false,
      queryKey: ["student-qr-svg", selectedEventId],
    });
  }, [queryClient, selectedEventId, shouldRefreshQr]);

  const captureLeimaShareCardAsync = useCallback(async (): Promise<string> => {
    if (leimaShareCardRef.current === null) {
      throw new Error(
        language === "fi"
          ? "Jaettavaa leimakorttia ei voitu valmistella."
          : "The shareable leima card could not be prepared."
      );
    }

    const captureRef = await loadCaptureRefAsync(language);

    return captureRef(leimaShareCardRef, {
      fileName: `omaleima-${selectedEventId ?? "pass"}`,
      format: "png",
      quality: 1,
      result: "tmpfile",
    });
  }, [language, selectedEventId]);

  const handleSaveLeimaCardPress = useCallback(async (): Promise<void> => {
    setLeimaShareAction("SAVE");
    setLeimaShareNotice(null);

    try {
      const MediaLibrary = await loadMediaLibraryAccessAsync(language);
      const uri = await captureLeimaShareCardAsync();
      const permission = await MediaLibrary.requestPermissionsAsync(true, ["photo"]);

      if (!permission.granted) {
        throw new Error(
          language === "fi"
            ? "Kuvakirjaston tallennuslupa tarvitaan leimakortin tallentamiseen."
            : "Photo library save permission is required to save the leima card."
        );
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      setLeimaShareNotice({
        message: language === "fi" ? "Leimakortti tallennettu kuviin." : "Leima card saved to photos.",
        tone: "success",
      });
    } catch (error) {
      setLeimaShareNotice({
        message:
          error instanceof Error
            ? error.message
            : language === "fi"
              ? "Leimakortin tallennus epäonnistui."
              : "Saving the leima card failed.",
        tone: "error",
      });
    } finally {
      setLeimaShareAction(null);
    }
  }, [captureLeimaShareCardAsync, language]);

  const handleShareLeimaCardPress = useCallback(async (): Promise<void> => {
    setLeimaShareAction("SHARE");
    setLeimaShareNotice(null);

    try {
      const uri = await captureLeimaShareCardAsync();

      await Share.share({
        message:
          language === "fi"
            ? `OmaLeima-korttini: ${selectedEventName ?? "OmaLeima"}`
            : `My OmaLeima card: ${selectedEventName ?? "OmaLeima"}`,
        title: language === "fi" ? "Jaa OmaLeima-kortti" : "Share OmaLeima card",
        url: uri,
      });
    } catch (error) {
      setLeimaShareNotice({
        message:
          error instanceof Error
            ? error.message
            : language === "fi"
              ? "Leimakortin jakaminen epäonnistui."
              : "Sharing the leima card failed.",
        tone: "error",
      });
    } finally {
      setLeimaShareAction(null);
    }
  }, [captureLeimaShareCardAsync, language, selectedEventName]);

  return (
    <AppScreen>
      {qrContextQuery.error ? (
        <InfoCard eyebrow={copy.common.error} motionIndex={0} title={language === "fi" ? "QR-tilannetta ei voitu ladata" : "Could not load QR context"}>
          <Text style={styles.bodyText}>{createUserSafeErrorMessage(qrContextQuery.error, language, "qrContext")}</Text>
          <Pressable onPress={() => void qrContextQuery.refetch()} style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>{copy.common.retry}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!qrContextQuery.isLoading && selectedEvent === null ? (
        <InfoCard eyebrow={copy.common.standby} motionIndex={0} title={copy.student.qrNoEventTitle}>
          <Text style={styles.bodyText}>{copy.student.qrNoEventBody}</Text>
          <Pressable onPress={() => router.push("/student/events")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{copy.student.qrOpenEvents}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {selectedEvent !== null && qrEventCandidates.length > 0 ? (
        <View style={styles.eventHeroRail}>
          <ScrollView
            decelerationRate="fast"
            horizontal
            onMomentumScrollEnd={handleHeroMomentumEnd}
            pagingEnabled
            ref={eventHeroScrollRef}
            scrollEnabled={qrEventCandidates.length > 1}
            showsHorizontalScrollIndicator={false}
            snapToAlignment="start"
            snapToInterval={eventHeroWidth}
          >
            {qrEventCandidates.map((event, index) => {
              const rewardEvent = rewardEventsById.get(event.id) ?? null;
              const isSelected = event.id === selectedEventId;
              const eventCoverSource = getEventCoverSource(rewardEvent?.coverImageUrl ?? null, `${event.id}:${event.name}`);

              return (
                <Pressable
                  accessibilityHint={
                    qrEventCandidates.length > 1
                      ? language === "fi"
                        ? "Pyyhkäise tai napauta vaihtaaksesi QR-tapahtumaa."
                        : "Swipe or tap to switch QR event."
                      : undefined
                  }
                  accessibilityLabel={`${event.name}, ${event.city}. ${index + 1}/${qrEventCandidates.length}. ${isSelected ? (language === "fi" ? "Valittu" : "Selected") : ""}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={event.id}
                  onPress={() => setSelectedQrEventId(event.id)}
                  style={{ width: eventHeroWidth }}
                >
                  <CoverImageSurface
                    imageStyle={styles.eventHeroImage}
                    source={eventCoverSource}
                    style={styles.eventHero}
                  >
                    <View style={styles.eventHeroOverlay} />
                    <View style={styles.eventHeroContent}>
                      <View style={styles.eventHeroTopRow}>
                        <StatusBadge
                          label={event.viewState === "ACTIVE" ? (language === "fi" ? "käynnissä" : "active") : language === "fi" ? "tulossa" : "upcoming"}
                          state={event.viewState === "ACTIVE" ? "ready" : "pending"}
                        />
                        {qrEventCandidates.length > 1 ? (
                          <View style={styles.eventHeroCounter}>
                            <Text style={styles.eventHeroCounterText}>{index + 1}/{qrEventCandidates.length}</Text>
                          </View>
                        ) : null}
                      </View>
                      <View>
                        <Text style={styles.eventHeroEyebrow}>{event.city}</Text>
                        <Text style={styles.eventHeroTitle}>{event.name}</Text>
                        <Text style={styles.eventHeroMeta}>
                          {event.viewState === "ACTIVE"
                            ? `${language === "fi" ? "Käynnissä" : "Live now until"} ${formatter.format(new Date(event.endAt))}`
                            : `${language === "fi" ? "Alkaa" : "Starts"} ${formatter.format(new Date(event.startAt))}`}
                        </Text>
                        {qrEventCandidates.length > 1 && isSelected ? (
                          <Text style={styles.eventHeroSwipeHint}>
                            {language === "fi"
                              ? "Pyyhkäise kuvaa vaihtaaksesi QR-tapahtumaa"
                              : "Swipe the image to switch QR event"}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </CoverImageSurface>
                </Pressable>
              );
            })}
          </ScrollView>
          {qrEventCandidates.length > 1 ? (
            <View style={styles.eventHeroDots}>
              {qrEventCandidates.map((event) => (
                <View
                  key={event.id}
                  style={[styles.eventHeroDot, event.id === selectedEventId ? styles.eventHeroDotActive : null]}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {selectedEvent?.viewState === "UPCOMING" ? (
        <InfoCard motionIndex={1} title={selectedEvent.name} variant="scene">
          <View style={styles.badges}>
            <StatusBadge label={language === "fi" ? "liitytty" : "registered"} state="ready" />
            <StatusBadge label={language === "fi" ? "tulossa" : "upcoming"} state="pending" />
          </View>

          <Text style={styles.bodyText}>
            {language === "fi"
              ? `QR avautuu, kun tapahtuma alkaa ${formatter.format(new Date(selectedEvent.startAt))}.`
              : `QR opens when the event goes live at ${formatter.format(new Date(selectedEvent.startAt))}.`}
          </Text>
          <Pressable onPress={() => router.push(`/student/events/${selectedEvent.id}`)} style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>
              {language === "fi" ? "Tapahtuman tiedot" : "View event details"}
            </Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {selectedEvent?.viewState === "ACTIVE" ? (
        <>
          <View style={styles.activeSummaryBar}>
            <View style={styles.activeSummaryTopRow}>
              <View style={styles.badges}>
                <StatusBadge label={language === "fi" ? "käynnissä" : "active now"} state="ready" />
                <StatusBadge
                  label={qrTokenQuery.error ? (language === "fi" ? "virhe" : "refresh error") : "live"}
                  state={qrTokenQuery.error ? "error" : "ready"}
                />
              </View>
              <Text style={styles.identityMeta}>
                {language === "fi" ? "Päättyy" : "Until"} {formatter.format(new Date(selectedEvent.endAt))}
              </Text>
            </View>
          </View>

          <View accessibilityLiveRegion="polite" style={styles.flipScene}>
            <Animated.View
              pointerEvents={activePassSide === "QR" ? "auto" : "none"}
              style={[
                styles.flipFace,
                activePassSide === "LEIMA" ? styles.flipFaceOverlay : null,
                qrFaceAnimatedStyle,
              ]}
            >
              <Pressable
                accessibilityHint={language === "fi" ? "Avaa leimakortti" : "Open leima card"}
                accessibilityRole="button"
                onPress={() => { hapticImpact(ImpactStyle.Light); setPassSide("LEIMA"); }}
                style={styles.qrBlock}
              >
                <View style={styles.qrSceneHeader}>
                  <View style={styles.qrSceneTitleGroup}>
                    <Text style={styles.qrSceneEyebrow}>{language === "fi" ? "Aktiivinen passi" : "Active leima pass"}</Text>
                    <Text style={styles.qrSceneTitle}>{language === "fi" ? "Näytä tiskillä" : "Show at the venue desk"}</Text>
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

                  <View style={styles.qrInner}>
                    {qrTokenQuery.isLoading || qrSvgQuery.isLoading ? (
                      <View style={styles.qrPlaceholder}>
                        <Text style={styles.qrPlaceholderText}>{language === "fi" ? "Ladataan QR..." : "Loading QR..."}</Text>
                      </View>
                    ) : null}
                    {canRenderQrSvg && qrSvgQuery.data ? <SvgXml height={272} width={272} xml={qrSvgQuery.data} /> : null}
                    {qrTokenQuery.error ? (
                      <View style={styles.qrPlaceholder}>
                        <Text style={styles.qrErrorText}>{language === "fi" ? "QR päivittyy" : "QR is catching up"}</Text>
                        <Text selectable style={styles.qrErrorDetailText}>{resolveQrTokenErrorMessage(qrTokenQuery.error, language)}</Text>
                        <Pressable onPress={() => void qrTokenQuery.refetch()} style={styles.ghostButton}>
                          <Text style={styles.ghostButtonText}>{copy.common.retry}</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.qrFooter}>
                  <View style={styles.qrFooterCopy}>
                    <Text style={styles.qrLiveText}>LEIMA QR</Text>
                    <Text style={styles.qrProgressMeta}>
                      {selectedRewardEvent?.stampCount ?? 0} {language === "fi" ? "leimaa" : "leimas"} ·{" "}
                      {selectedRewardEvent?.tiers.length ?? 0} {language === "fi" ? "tasoa" : "tiers"}
                    </Text>
                    {isQrLive ? (
                      <Text style={[styles.qrCountdownText, { color: qrCountdownColor }]}>
                        {language === "fi" ? `päivittyy ${countdownSeconds}s` : `refreshes in ${countdownSeconds}s`}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    accessibilityLabel={language === "fi" ? "Leimakortti" : "Leima card"}
                    onPress={() => { hapticImpact(ImpactStyle.Light); setPassSide("LEIMA"); }}
                    style={styles.passSwitchButton}
                  >
                    <AppIcon color={theme.colors.actionPrimaryText} name="id-card" size={15} />
                    <Text style={styles.passSwitchButtonText}>{language === "fi" ? "Leimakortti" : "Leima card"}</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Animated.View>

            <Animated.View
              pointerEvents={activePassSide === "LEIMA" ? "auto" : "none"}
              style={[
                styles.flipFace,
                activePassSide === "QR" ? styles.flipFaceOverlay : null,
                leimaFaceAnimatedStyle,
              ]}
            >
              <Pressable
                accessibilityHint={language === "fi" ? "Palaa QR-koodiin" : "Return to QR code"}
                accessibilityRole="button"
                onPress={() => { hapticImpact(ImpactStyle.Light); setPassSide("QR"); }}
                style={styles.leimaFaceContent}
              >
                <View style={styles.qrSceneHeader}>
                  <View style={styles.qrSceneTitleGroup}>
                    <Text style={styles.qrSceneEyebrow}>{copy.student.rewardTrail}</Text>
                    <Text style={styles.qrSceneTitle}>{language === "fi" ? "Illan leimat" : "Tonight's leimas"}</Text>
                  </View>
                  <View style={styles.leimaHeaderActions}>
                    <Pressable
                      accessibilityLabel={language === "fi" ? "Jaa leimakortti" : "Share leima card"}
                      disabled={leimaShareAction !== null}
                      onPress={() => void handleShareLeimaCardPress()}
                      style={[styles.shareIconButton, leimaShareAction !== null ? styles.shareButtonDisabled : null]}
                    >
                      <AppIcon color={theme.colors.textPrimary} name="send" size={15} />
                    </Pressable>
                    <Pressable onPress={() => { hapticImpact(ImpactStyle.Light); setPassSide("QR"); }} style={styles.passSwitchButton}>
                      <Text style={styles.passSwitchButtonText}>QR</Text>
                    </Pressable>
                  </View>
                </View>

                <Text style={styles.progressHeadline}>
                  {selectedRewardEvent === null
                    ? language === "fi"
                      ? "Kerää leimoja tapahtuman pisteiltä."
                      : "Collect leimas from the event venues."
                    : createProgressHeadline(selectedRewardEvent, language)}
                </Text>

                <StudentLeimaPassCard
                  minimumStampsRequired={selectedPassMinimumStampsRequired}
                  targetStampCount={selectedPassTargetStampCount}
                  venues={selectedEventDetailQuery.data?.venues ?? []}
                />

                <View style={styles.leimaSharePanel}>
                  <Pressable
                    disabled={leimaShareAction !== null}
                    onPress={() => void handleSaveLeimaCardPress()}
                    style={[styles.shareActionButton, leimaShareAction !== null ? styles.shareButtonDisabled : null]}
                  >
                    <AppIcon color={theme.colors.actionPrimaryText} name="check-circle" size={15} />
                    <Text style={styles.shareActionButtonText}>
                      {leimaShareAction === "SAVE"
                        ? language === "fi" ? "Tallennetaan..." : "Saving..."
                        : language === "fi" ? "Tallenna kuva" : "Save image"}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={leimaShareAction !== null}
                    onPress={() => void handleShareLeimaCardPress()}
                    style={[styles.shareActionButtonSecondary, leimaShareAction !== null ? styles.shareButtonDisabled : null]}
                  >
                    <AppIcon color={theme.colors.textPrimary} name="send" size={15} />
                    <Text style={styles.shareActionButtonSecondaryText}>
                      {leimaShareAction === "SHARE"
                        ? language === "fi" ? "Avataan..." : "Opening..."
                        : language === "fi" ? "Jaa kortti" : "Share card"}
                    </Text>
                  </Pressable>
                </View>

                {leimaShareNotice !== null ? (
                  <Text
                    accessibilityLiveRegion="polite"
                    style={[
                      styles.shareNoticeText,
                      leimaShareNotice.tone === "error" ? styles.shareNoticeTextError : null,
                    ]}
                  >
                    {leimaShareNotice.message}
                  </Text>
                ) : null}
              </Pressable>
            </Animated.View>
          </View>

          {showProtectionNotice ? (
            <InfoCard eyebrow={copy.common.error} title={language === "fi" ? "Näytön suojaus epäonnistui" : "Screen protection failed"}>
              <Text style={styles.bodyText}>{protection.detail}</Text>
            </InfoCard>
          ) : null}

        </>
      ) : null}

      {selectedEvent !== null ? (
        <View pointerEvents="none" style={styles.shareCaptureStage}>
          <View collapsable={false} ref={leimaShareCardRef} style={styles.shareCard}>
            <View style={styles.shareCardGlow} />
            <View style={styles.shareCardHeader}>
              <View>
                <Text style={styles.shareCardEyebrow}>OmaLeima</Text>
                <Text style={styles.shareCardTitle}>{selectedEvent.name}</Text>
              </View>
              <View style={styles.shareCardBadge}>
                <Text style={styles.shareCardBadgeText}>
                  {selectedRewardEvent?.stampCount ?? 0}/{selectedEventDetailQuery.data?.venues.length ?? 0}
                </Text>
              </View>
            </View>
            <Text style={styles.shareCardSubtitle}>
              {language === "fi"
                ? "Digitaalinen leimapassi · jaettu ilman QR-koodia"
                : "Digital leima pass · shared without QR code"}
            </Text>
            <StudentLeimaPassCard
              minimumStampsRequired={selectedPassMinimumStampsRequired}
              targetStampCount={selectedPassTargetStampCount}
              venues={selectedEventDetailQuery.data?.venues ?? []}
            />
            <Text style={styles.shareCardFooter}>
              {language === "fi" ? "Kerätty OmaLeimalla" : "Collected with OmaLeima"}
            </Text>
          </View>
        </View>
      ) : null}
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    activeSummaryBar: {
      gap: 0,
    },
    activeSummaryTopRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    badges: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    eventHero: {
      minHeight: 280,
      overflow: "hidden",
    },
    eventHeroContent: {
      flex: 1,
      justifyContent: "flex-end",
      padding: 20,
      paddingTop: 64,
    },
    eventHeroEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    eventHeroImage: {
      borderRadius: 0,
    },
    eventHeroCounter: {
      backgroundColor: "rgba(0, 0, 0, 0.48)",
      borderColor: "rgba(255, 255, 255, 0.2)",
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    eventHeroCounterText: {
      color: "#F8FAF5",
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    eventHeroDot: {
      backgroundColor: theme.colors.borderDefault,
      borderRadius: 999,
      height: 6,
      width: 18,
    },
    eventHeroDotActive: {
      backgroundColor: theme.colors.lime,
      width: 30,
    },
    eventHeroDots: {
      alignItems: "center",
      flexDirection: "row",
      gap: 7,
      justifyContent: "center",
      paddingTop: 10,
    },
    eventHeroMeta: {
      color: "rgba(248, 250, 245, 0.84)",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
      marginTop: 6,
    },
    eventHeroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.mode === "dark" ? "rgba(0, 0, 0, 0.58)" : "rgba(7, 10, 7, 0.5)",
    },
    eventHeroRail: {
      marginHorizontal: -theme.spacing.screenHorizontal,
      overflow: "hidden",
    },
    eventHeroSwipeHint: {
      color: "rgba(248, 250, 245, 0.76)",
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      marginTop: 10,
    },
    eventHeroTitle: {
      color: "#F8FAF5",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
      marginTop: 4,
    },
    eventHeroTopRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    flipFace: {
      backfaceVisibility: "hidden",
    },
    flipFaceOverlay: {
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
      zIndex: 0,
    },
    flipScene: {
      minHeight: 448,
      position: "relative",
    },
    ghostButton: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: theme.radius.button,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    ghostButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
    },
    identityMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    leimaFaceContent: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.scene,
      borderWidth: 1,
      gap: 16,
      padding: 18,
      ...interactiveSurfaceShadowStyle,
    },
    leimaHeaderActions: {
      alignItems: "center",
      flexDirection: "row",
      flexShrink: 0,
      gap: 8,
    },
    leimaSharePanel: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    passSwitchButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      flexDirection: "row",
      gap: 6,
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    passSwitchButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textAlign: "center",
    },
    shareActionButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      flex: 1,
      flexDirection: "row",
      gap: 7,
      justifyContent: "center",
      minHeight: 44,
      minWidth: 150,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    shareActionButtonSecondary: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: 1,
      flex: 1,
      flexDirection: "row",
      gap: 7,
      justifyContent: "center",
      minHeight: 44,
      minWidth: 150,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    shareActionButtonSecondaryText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textAlign: "center",
    },
    shareActionButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textAlign: "center",
    },
    shareButtonDisabled: {
      opacity: 0.62,
    },
    shareCaptureStage: {
      left: -10000,
      position: "absolute",
      top: 0,
      width: 390,
    },
    shareCard: {
      backgroundColor: "#050705",
      borderColor: "rgba(200, 255, 71, 0.36)",
      borderRadius: 34,
      borderWidth: 1,
      gap: 16,
      overflow: "hidden",
      padding: 22,
      width: 390,
    },
    shareCardBadge: {
      alignItems: "center",
      backgroundColor: "#C8FF47",
      borderRadius: 999,
      justifyContent: "center",
      minWidth: 58,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    shareCardBadgeText: {
      color: "#10150C",
      fontFamily: theme.typography.families.extrabold,
      fontSize: 15,
      lineHeight: 19,
    },
    shareCardEyebrow: {
      color: "#C8FF47",
      fontFamily: theme.typography.families.bold,
      fontSize: 12,
      letterSpacing: 1.6,
      lineHeight: 15,
      textTransform: "uppercase",
    },
    shareCardFooter: {
      color: "rgba(248, 250, 245, 0.62)",
      fontFamily: theme.typography.families.semibold,
      fontSize: 12,
      lineHeight: 16,
      textAlign: "center",
    },
    shareCardGlow: {
      backgroundColor: "rgba(200, 255, 71, 0.14)",
      borderRadius: 999,
      height: 190,
      position: "absolute",
      right: -78,
      top: -84,
      width: 190,
    },
    shareCardHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    shareCardSubtitle: {
      color: "rgba(248, 250, 245, 0.72)",
      fontFamily: theme.typography.families.medium,
      fontSize: 13,
      lineHeight: 18,
    },
    shareCardTitle: {
      color: "#F8FAF5",
      fontFamily: theme.typography.families.extrabold,
      fontSize: 25,
      lineHeight: 30,
      marginTop: 4,
    },
    shareIconButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: 1,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    shareNoticeText: {
      color: theme.colors.success,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    shareNoticeTextError: {
      color: theme.colors.danger,
    },
    primaryButton: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    primaryButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      textAlign: "center",
    },
    progressHeadline: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    qrBlock: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.limeBorder,
      borderRadius: theme.radius.scene,
      borderWidth: 1,
      gap: 16,
      padding: 18,
      ...interactiveSurfaceShadowStyle,
    },
    qrCorner: {
      borderColor: theme.colors.lime,
      height: 34,
      position: "absolute",
      width: 34,
      zIndex: 2,
    },
    qrCornerBottomLeft: {
      borderBottomWidth: 4,
      borderLeftWidth: 4,
      bottom: 8,
      left: 8,
    },
    qrCornerBottomRight: {
      borderBottomWidth: 4,
      borderRightWidth: 4,
      bottom: 8,
      right: 8,
    },
    qrCornerTopLeft: {
      borderLeftWidth: 4,
      borderTopWidth: 4,
      left: 8,
      top: 8,
    },
    qrCornerTopRight: {
      borderRightWidth: 4,
      borderTopWidth: 4,
      right: 8,
      top: 8,
    },
    qrCountdownText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    qrErrorText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    qrErrorDetailText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      marginTop: 6,
      textAlign: "center",
    },
    qrFooter: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    qrFooterCopy: {
      flex: 1,
      gap: 3,
      minWidth: 0,
    },
    qrFrame: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.qr,
      borderWidth: 1,
      padding: 18,
      position: "relative",
    },
    qrInner: {
      alignItems: "center",
      backgroundColor: theme.colors.qrCanvas,
      borderRadius: theme.radius.card,
      justifyContent: "center",
      minHeight: 292,
      overflow: "hidden",
      position: "relative",
      zIndex: 1,
    },
    qrLiveBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    qrLiveBadgeText: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    qrLiveDot: {
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      height: 6,
      width: 6,
    },
    qrLiveText: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textTransform: "uppercase",
    },
    qrProgressMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    qrPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 272,
      minWidth: 272,
    },
    qrPlaceholderText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    qrSceneEyebrow: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    qrSceneHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    qrSceneTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    qrSceneTitleGroup: {
      gap: 4,
    },
  });
