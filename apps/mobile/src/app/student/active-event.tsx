import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";

import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { getEventCoverSourceWithFallback, prefetchEventCoverUrls } from "@/features/events/event-visuals";
import type { MobileTheme } from "@/features/foundation/theme";
import { interactiveSurfaceShadowStyle } from "@/features/foundation/theme";
import { useStudentRewardCelebration } from "@/features/notifications/student-reward-celebration";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
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
  const now = useCurrentTime(isFocused && isAppActive);
  const protection = useQrScreenProtection();
  const { session } = useSession();
  const { triggerRewardCelebration } = useStudentRewardCelebration();
  const { copy, language, localeTag } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const formatter = useMemo(() => createDateTimeFormatter(localeTag), [localeTag]);
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

  const countdownSeconds = useQrCountdown(qrTokenQuery.data?.expiresAt ?? null, shouldRefreshQr);
  const isQrLive = selectedEvent?.viewState === "ACTIVE" && !qrTokenQuery.isLoading && !qrTokenQuery.error;
  const showProtectionNotice = protection.status === "ERROR";
  const eventCoverSource = useMemo(
    () =>
      selectedEvent === null
        ? null
        : getEventCoverSourceWithFallback(selectedRewardEvent?.coverImageUrl ?? null, "qrPass"),
    [selectedEvent, selectedRewardEvent?.coverImageUrl]
  );

  const handlePreviewLeima = (): void => {
    if (selectedEvent === null) {
      return;
    }

    triggerRewardCelebration([
      {
        kind: "STAMP",
        key: `preview:stamp:${selectedEvent.id}`,
        eventId: selectedEvent.id,
        eventName: selectedEvent.name,
        coverImageUrl: selectedRewardEvent?.coverImageUrl ?? null,
        stampCount: Math.max((selectedRewardEvent?.stampCount ?? 0) + 1, 1),
      },
    ]);
  };

  useEffect(() => {
    void prefetchEventCoverUrls([selectedRewardEvent?.coverImageUrl ?? null]);
  }, [selectedRewardEvent?.coverImageUrl]);

  return (
    <AppScreen>
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

      {selectedEvent !== null && eventCoverSource ? (
        <CoverImageSurface imageStyle={styles.eventHeroImage} source={eventCoverSource} style={styles.eventHero}>
          <View style={styles.eventHeroOverlay} />
          <View style={styles.eventHeroContent}>
            <Text style={styles.eventHeroEyebrow}>{selectedEvent.city}</Text>
            <Text style={styles.eventHeroTitle}>{selectedEvent.name}</Text>
            <Text style={styles.eventHeroMeta}>
              {selectedEvent.viewState === "ACTIVE"
                ? `${language === "fi" ? "Käynnissä" : "Live now until"} ${formatter.format(new Date(selectedEvent.endAt))}`
                : `${language === "fi" ? "Alkaa" : "Starts"} ${formatter.format(new Date(selectedEvent.startAt))}`}
            </Text>
          </View>
        </CoverImageSurface>
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

          {__DEV__ ? (
            <Pressable onPress={handlePreviewLeima} style={styles.previewButton}>
              <Text style={styles.previewButtonText}>{language === "fi" ? "Esikatsele leima" : "Preview leima"}</Text>
            </Pressable>
          ) : null}

          <View style={styles.qrBlock}>
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
                    <Text style={styles.qrPlaceholderText}>{language === "fi" ? "Ladataan QR..." : "Loading QR…"}</Text>
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
              <Text style={styles.qrLiveText}>LEIMA QR</Text>
              {isQrLive ? (
                <Text style={styles.qrCountdownText}>
                  {language === "fi" ? `päivittyy ${countdownSeconds}s` : `refreshes in ${countdownSeconds}s`}
                </Text>
              ) : null}
            </View>
          </View>

          {showProtectionNotice ? (
            <InfoCard eyebrow={copy.common.error} title={language === "fi" ? "Näytön suojaus epäonnistui" : "Screen protection failed"}>
              <Text style={styles.bodyText}>{protection.detail}</Text>
            </InfoCard>
          ) : null}

          {selectedRewardEvent ? (
            <InfoCard eyebrow={copy.student.rewardTrail} title={language === "fi" ? "Tämän illan eteneminen" : "Tonight's progress"}>
              <Text style={styles.progressHeadline}>{createProgressHeadline(selectedRewardEvent, language)}</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${selectedRewardEvent.goalProgressRatio * 100}%` },
                  ]}
                />
              </View>
              <View style={styles.progressStats}>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatValue}>{selectedRewardEvent.stampCount}</Text>
                  <Text style={styles.progressStatLabel}>{language === "fi" ? "leimaa" : "leimat"}</Text>
                </View>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatValue}>{selectedRewardEvent.tiers.length}</Text>
                  <Text style={styles.progressStatLabel}>{language === "fi" ? "tasoa" : "tiers"}</Text>
                </View>
              </View>
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
      marginHorizontal: -theme.spacing.screenHorizontal,
      marginTop: -theme.spacing.screenVertical,
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
    eventHeroTitle: {
      color: "#F8FAF5",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
      marginTop: 4,
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
    previewButton: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.limeBorder,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    previewButtonText: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
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
    },
    progressFill: {
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      height: "100%",
    },
    progressHeadline: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    progressStat: {
      gap: 4,
    },
    progressStatLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textTransform: "uppercase",
    },
    progressStatValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    progressStats: {
      flexDirection: "row",
      gap: 24,
    },
    progressTrack: {
      backgroundColor: theme.colors.progressTrack,
      borderRadius: 999,
      height: 8,
      overflow: "hidden",
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
      height: 26,
      position: "absolute",
      width: 26,
    },
    qrCornerBottomLeft: {
      borderBottomWidth: 3,
      borderLeftWidth: 3,
      bottom: 14,
      left: 14,
    },
    qrCornerBottomRight: {
      borderBottomWidth: 3,
      borderRightWidth: 3,
      bottom: 14,
      right: 14,
    },
    qrCornerTopLeft: {
      borderLeftWidth: 3,
      borderTopWidth: 3,
      left: 14,
      top: 14,
    },
    qrCornerTopRight: {
      borderRightWidth: 3,
      borderTopWidth: 3,
      right: 14,
      top: 14,
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
      justifyContent: "space-between",
    },
    qrFrame: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.qr,
      borderWidth: 1,
      padding: 12,
      position: "relative",
    },
    qrInner: {
      alignItems: "center",
      backgroundColor: theme.colors.qrCanvas,
      borderRadius: theme.radius.card,
      justifyContent: "center",
      minHeight: 292,
      overflow: "hidden",
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
