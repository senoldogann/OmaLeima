import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";

import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import {
  getEventCoverSource,
  prefetchEventCoverUrls,
} from "@/features/events/event-visuals";
import { useStudentEventDetailQuery } from "@/features/events/student-event-detail";
import type { MobileTheme } from "@/features/foundation/theme";
import { interactiveSurfaceShadowStyle } from "@/features/foundation/theme";
import { useStudentRewardCelebration } from "@/features/notifications/student-reward-celebration";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { StudentProfileHeaderAction } from "@/features/profile/components/student-profile-header-action";
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

type ObservedStampState = {
  eventId: string;
  stampCount: number;
};

const passFlipAnimationDurationMs = 420;
const passFlipPerspective = 900;

const createDateTimeFormatter = (localeTag: string): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(localeTag, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

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

export default function StudentActiveEventScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const isAppActive = useActiveAppState();
  const { width: windowWidth } = useWindowDimensions();
  const now = useCurrentTime(isFocused && isAppActive);
  const protection = useQrScreenProtection();
  const { session } = useSession();
  const { triggerRewardCelebration } = useStudentRewardCelebration();
  const { copy, language, localeTag } = useUiPreferences();
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
  const passFlipProgress = useRef(new Animated.Value(0)).current;
  const [activePassSide, setActivePassSide] = useState<ActivePassSide>("QR");
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

  const countdownSeconds = useQrCountdown(qrTokenQuery.data?.expiresAt ?? null, shouldRefreshQr);
  const isQrLive = selectedEvent?.viewState === "ACTIVE" && !qrTokenQuery.isLoading && !qrTokenQuery.error;
  const showProtectionNotice = protection.status === "ERROR";
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
      setActivePassSide(nextSide);
      Animated.timing(passFlipProgress, {
        duration: passFlipAnimationDurationMs,
        toValue: nextSide === "LEIMA" ? 1 : 0,
        useNativeDriver: true,
      }).start();
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
    if (qrEventCandidates.length <= 1) {
      return;
    }

    eventHeroScrollRef.current?.scrollTo({
      animated: true,
      x: selectedEventIndex * eventHeroWidth,
      y: 0,
    });
  }, [eventHeroWidth, qrEventCandidates.length, selectedEventIndex]);

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
    [selectedEventId, selectedEventName, triggerRewardCelebration]
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

  return (
    <AppScreen>
      {selectedEvent === null || qrEventCandidates.length === 0 ? (
        <View style={styles.profileFallbackBar}>
          <StudentProfileHeaderAction />
        </View>
      ) : null}

      {qrContextQuery.error ? (
        <InfoCard eyebrow={copy.common.error} motionIndex={0} title={language === "fi" ? "QR-tilannetta ei voitu ladata" : "Could not load QR context"}>
          <Text style={styles.bodyText}>{qrContextQuery.error.message}</Text>
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
          <View pointerEvents="box-none" style={styles.profileHeroOverlay}>
            <StudentProfileHeaderAction />
          </View>
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
                onPress={() => setPassSide("LEIMA")}
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
                    {qrSvgQuery.data ? <SvgXml height={272} width={272} xml={qrSvgQuery.data} /> : null}
                    {qrTokenQuery.error ? (
                      <View style={styles.qrPlaceholder}>
                        <Text style={styles.qrErrorText}>{language === "fi" ? "QR päivitys epäonnistui" : "Token refresh failed"}</Text>
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
                      <Text style={styles.qrCountdownText}>
                        {language === "fi" ? `päivittyy ${countdownSeconds}s` : `refreshes in ${countdownSeconds}s`}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable onPress={() => setPassSide("LEIMA")} style={styles.passSwitchButton}>
                    <Text style={styles.passSwitchButtonText}>{language === "fi" ? "Leimakortti" : "Preview leima"}</Text>
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
                onPress={() => setPassSide("QR")}
                style={styles.leimaFaceContent}
              >
                <View style={styles.qrSceneHeader}>
                  <View style={styles.qrSceneTitleGroup}>
                    <Text style={styles.qrSceneEyebrow}>{copy.student.rewardTrail}</Text>
                    <Text style={styles.qrSceneTitle}>{language === "fi" ? "Illan leimat" : "Tonight's leimas"}</Text>
                  </View>
                  <Pressable onPress={() => setPassSide("QR")} style={styles.passSwitchButton}>
                    <Text style={styles.passSwitchButtonText}>QR</Text>
                  </Pressable>
                </View>

                <Text style={styles.progressHeadline}>
                  {selectedRewardEvent === null
                    ? language === "fi"
                      ? "Kerää leimoja tapahtuman pisteiltä."
                      : "Collect leimas from the event venues."
                    : createProgressHeadline(selectedRewardEvent, language)}
                </Text>

                <StudentLeimaPassCard
                  minimumStampsRequired={selectedRewardEvent?.minimumStampsRequired ?? selectedEvent.minimumStampsRequired}
                  venues={selectedEventDetailQuery.data?.venues ?? []}
                />
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
      minHeight: 216,
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
      marginBottom: 42,
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
    passSwitchButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      justifyContent: "center",
      minHeight: 36,
      paddingHorizontal: 13,
      paddingVertical: 8,
    },
    passSwitchButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textAlign: "center",
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
    profileHeroOverlay: {
      position: "absolute",
      right: theme.spacing.screenHorizontal,
      top: 14,
      zIndex: 5,
    },
    profileFallbackBar: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "flex-end",
      marginBottom: 8,
    },
    progressHeadline: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    qrBlock: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
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
