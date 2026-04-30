import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useRouter } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { getEventCoverSource, prefetchEventCoverUrls } from "@/features/events/event-visuals";
import { AutoAdvancingRail } from "@/features/foundation/components/auto-advancing-rail";
import type { MobileTheme } from "@/features/foundation/theme";
import { RewardProgressCard } from "@/features/rewards/components/reward-progress-card";
import { useStudentRewardCelebration } from "@/features/notifications/student-reward-celebration";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useStudentRewardOverviewQuery } from "@/features/rewards/student-rewards";
import { useSession } from "@/providers/session-provider";

export default function StudentRewardsScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { session } = useSession();
  const { triggerRewardCelebration } = useStudentRewardCelebration();
  const { copy, language } = useUiPreferences();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const studentId = session?.user.id ?? null;
  const rewardOverviewQuery = useStudentRewardOverviewQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null,
  });

  const events = useMemo(() => rewardOverviewQuery.data?.events ?? [], [rewardOverviewQuery.data]);
  const registeredEventCount = rewardOverviewQuery.data?.registeredEventCount ?? 0;
  const claimableCount = events.filter((event) => event.claimableTierCount > 0).length;
  const totalStamps = events.reduce((accumulator, event) => accumulator + event.stampCount, 0);
  const railCardWidth = Math.max(Math.min(windowWidth - 52, 420), 286);
  const featuredEvent = events[0] ?? null;
  const featuredHeroSource = getEventCoverSource(
    featuredEvent?.coverImageUrl ?? null,
    featuredEvent?.id ?? "rewards-hero"
  );

  const summaryLabel =
    claimableCount > 0
      ? language === "fi"
        ? `${claimableCount} tapahtumaa valmiina noutoon.`
        : `${claimableCount} event${claimableCount === 1 ? "" : "s"} ready for claim.`
      : registeredEventCount === 0
        ? copy.student.noRewardProgress
        : language === "fi"
          ? `${registeredEventCount} tapahtumaa seurannassa.`
          : `Across ${registeredEventCount} event${registeredEventCount === 1 ? "" : "s"}.`;

  const handlePreviewCelebration = (): void => {
    const previewEvent = featuredEvent ?? null;

    triggerRewardCelebration([
      {
        kind: "STAMP",
        key: "preview:reward",
        eventId: previewEvent?.id ?? "preview-event",
        eventName: previewEvent?.name ?? "OmaLeima night",
        coverImageUrl: previewEvent?.coverImageUrl ?? null,
        stampCount: Math.max((previewEvent?.stampCount ?? 0) + 1, 1),
      },
    ]);
  };

  useEffect(() => {
    void prefetchEventCoverUrls(events.map((event) => event.coverImageUrl));
  }, [events]);

  return (
    <AppScreen>
      <View style={styles.screenHeader}>
        <Text style={styles.screenEyebrow}>{copy.student.rewardTrail}</Text>
        <Text style={styles.screenTitle}>{copy.common.rewards}</Text>
        <Text style={styles.metaText}>{copy.student.rewardsMeta}</Text>
        {__DEV__ ? (
          <Pressable onPress={handlePreviewCelebration} style={styles.previewButton}>
            <Text style={styles.previewButtonText}>
              {language === "fi" ? "Esikatsele leima" : "Preview leima"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <CoverImageSurface imageStyle={styles.summaryHeroImage} source={featuredHeroSource} style={styles.summaryHero}>
        <View style={styles.summaryHeroOverlay} />
        <View style={styles.summaryHeroContent}>
          <View style={styles.summaryLead}>
            <Text style={styles.summaryEyebrow}>{copy.student.rewardTrail}</Text>
            <Text style={styles.summaryTitle}>
              {featuredEvent?.name ?? (language === "fi" ? "Seuraava avaus alkaa tästä" : "Your next unlock starts here")}
            </Text>
            <Text style={styles.summaryLabel}>{summaryLabel}</Text>
          </View>

          <View style={styles.summaryCountWrap}>
            <Text style={styles.summaryNumber}>{totalStamps}</Text>
            <Text style={styles.summaryCountLabel}>{language === "fi" ? "leimaa" : "leimat"}</Text>
          </View>
        </View>
      </CoverImageSurface>

      {claimableCount > 0 ? (
        <View style={styles.claimableAlert}>
          <Text style={styles.claimableAlertText}>
            {language === "fi"
              ? `${claimableCount} tapahtumaa valmiina — lunasta paikan päällä.`
              : `${claimableCount} event${claimableCount === 1 ? "" : "s"} ready — go to venue to claim.`}
          </Text>
        </View>
      ) : null}

      {rewardOverviewQuery.isLoading ? (
        <InfoCard eyebrow={copy.common.loading} title={language === "fi" ? "Avataan palkintoja" : "Opening rewards"}>
          <Text style={styles.bodyText}>
            {language === "fi"
              ? "Ladataan leimat ja palkintotasot."
              : "Loading leima counts and tier status."}
          </Text>
        </InfoCard>
      ) : null}

      {rewardOverviewQuery.error ? (
        <InfoCard eyebrow={copy.common.error} title={language === "fi" ? "Palkintoja ei voitu ladata" : "Could not load rewards"}>
          <Text style={styles.bodyText}>{rewardOverviewQuery.error.message}</Text>
          <Pressable onPress={() => void rewardOverviewQuery.refetch()} style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>{copy.common.retry}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!rewardOverviewQuery.isLoading && !rewardOverviewQuery.error && events.length === 0 ? (
        <InfoCard eyebrow={copy.common.standby} title={language === "fi" ? "Ei palkintopolkuja vielä" : "No reward progress yet"}>
          {registeredEventCount === 0 ? (
            <>
              <Text style={styles.bodyText}>{copy.student.noRewardProgress}</Text>
              <Pressable onPress={() => router.push("/student/events")} style={styles.primaryButton}>
                <AppIcon color={theme.colors.screenBase} name="calendar" size={18} />
                <Text style={styles.primaryButtonText}>{copy.student.browseEvents}</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.bodyText}>
              {language === "fi"
                ? "Olet jo ilmoittautunut, mutta palkintotasoja ei näy vielä. Tarkista myöhemmin uudelleen."
                : "Registered for events, but none show reward progress yet. Check back after the organizer publishes tiers."}
            </Text>
          )}
        </InfoCard>
      ) : null}

      {events.length > 0 ? (
        <View style={styles.railSection}>
          <View style={styles.railHeader}>
            <View style={styles.railHeaderCopy}>
              <Text style={styles.railTitle}>{language === "fi" ? "Tapahtumapalkinnot" : "Event rewards"}</Text>
              <Text style={styles.railMeta}>
                {language === "fi" ? "Liukuu automaattisesti, jos et selaa." : "Slides automatically when idle."}
              </Text>
            </View>
            <View style={styles.railHint}>
              <Text style={styles.railHintText}>Auto</Text>
              <AppIcon color={theme.colors.lime} name="chevron-right" size={16} />
            </View>
          </View>

          <AutoAdvancingRail
            contentContainerStyle={styles.railContent}
            intervalMs={3000}
            itemGap={14}
            items={events}
            itemWidth={railCardWidth}
            keyExtractor={(event) => event.id}
            railStyle={null}
            renderItem={(event) => (
              <View style={styles.railCardWrap}>
                <RewardProgressCard
                  event={event}
                  onOpenEvent={(eventId: string) => router.push(`/student/events/${eventId}`)}
                />
              </View>
            )}
            showsIndicators={false}
          />
        </View>
      ) : null}
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    claimableAlert: {
      alignItems: "center",
      backgroundColor: theme.colors.limeSurface,
      borderRadius: 999,
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 11,
    },
    claimableAlertText: {
      color: theme.colors.lime,
      flex: 1,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
    },
    ghostButton: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: 999,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    ghostButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      maxWidth: 320,
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
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    primaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 22,
      paddingVertical: 14,
    },
    primaryButtonText: {
      color: theme.colors.screenBase,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      letterSpacing: 0.3,
    },
    railCardWrap: {
      marginRight: 14,
    },
    railContent: {
      paddingRight: 6,
    },
    railHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    railHeaderCopy: {
      flex: 1,
      gap: 2,
    },
    railHint: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
    },
    railHintText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    railMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    railSection: {
      gap: 12,
    },
    railTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    screenEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.1,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    screenHeader: {
      gap: 6,
    },
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    summaryCountLabel: {
      color: "rgba(248, 250, 245, 0.74)",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textTransform: "uppercase",
    },
    summaryCountWrap: {
      alignItems: "flex-end",
      gap: 2,
    },
    summaryEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.2,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    summaryHero: {
      minHeight: 232,
      overflow: "hidden",
      position: "relative",
    },
    summaryHeroContent: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 16,
      padding: 20,
      alignItems: "flex-end",
    },
    summaryHeroImage: {
      borderRadius: theme.radius.scene,
    },
    summaryHeroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.mode === "dark" ? "rgba(0, 0, 0, 0.56)" : "rgba(7, 10, 7, 0.5)",
    },
    summaryLabel: {
      color: "rgba(248, 250, 245, 0.84)",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      maxWidth: 260,
    },
    summaryLead: {
      gap: 8,
    },
    summaryNumber: {
      color: "#F8FAF5",
      fontFamily: theme.typography.families.extrabold,
      fontSize: 52,
      lineHeight: 56,
    },
    summaryTitle: {
      color: "#F8FAF5",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
      maxWidth: 260,
    },
  });
