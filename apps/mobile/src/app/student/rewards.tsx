import { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useRouter } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { SkeletonCard } from "@/components/skeleton-block";
import {
  getEventCoverSource,
  getEventCoverSourceWithFallback,
  prefetchEventCoverUrls,
} from "@/features/events/event-visuals";
import { AutoAdvancingRail } from "@/features/foundation/components/auto-advancing-rail";
import type { MobileTheme } from "@/features/foundation/theme";
import { createUserSafeErrorMessage } from "@/features/foundation/user-safe-error";
import { RewardProgressCard } from "@/features/rewards/components/reward-progress-card";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { StudentProfileHeaderAction } from "@/features/profile/components/student-profile-header-action";
import { useStudentRewardOverviewQuery } from "@/features/rewards/student-rewards";
import { useSession } from "@/providers/session-provider";

export default function StudentRewardsScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { session } = useSession();
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
  const summaryFontSize = totalStamps >= 1000 ? 44 : totalStamps >= 100 ? 54 : 72;
  const summaryLineHeight = totalStamps >= 1000 ? 48 : totalStamps >= 100 ? 58 : 76;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const featuredEvent = events[0] ?? null;
  const featuredHeroSource =
    featuredEvent === null
      ? getEventCoverSourceWithFallback(null, "rewards")
      : getEventCoverSource(featuredEvent.coverImageUrl, `${featuredEvent.id}:${featuredEvent.name}`);

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

  useEffect(() => {
    void prefetchEventCoverUrls(events.map((event) => event.coverImageUrl));
  }, [events]);

  useEffect(() => {
    if (claimableCount === 0) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.72, duration: 900, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [claimableCount, pulseAnim]);

  return (
    <AppScreen>
      <View style={styles.screenHeaderRow}>
        <View style={styles.screenHeader}>
          <Text style={styles.screenEyebrow}>{language === "fi" ? "Palkinnot" : "Rewards"}</Text>
          <Text style={styles.screenTitle}>{copy.common.rewards}</Text>
          <Text style={styles.metaText}>{copy.student.rewardsMeta}</Text>
        </View>
        <StudentProfileHeaderAction />
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
            <Text style={[styles.summaryNumber, { fontSize: summaryFontSize, lineHeight: summaryLineHeight }]}>{totalStamps}</Text>
            <Text style={styles.summaryCountLabel}>{language === "fi" ? "leimaa" : "leimat"}</Text>
          </View>
        </View>
      </CoverImageSurface>

      {claimableCount > 0 ? (
        <Animated.View style={[styles.claimableAlert, { opacity: pulseAnim }]}>
          <AppIcon color={theme.colors.lime} name="gift" size={16} />
          <Text style={styles.claimableAlertText}>
            {language === "fi"
              ? `${claimableCount} tapahtumaa valmiina — lunasta paikan päällä.`
              : `${claimableCount} event${claimableCount === 1 ? "" : "s"} ready — go to venue to claim.`}
          </Text>
        </Animated.View>
      ) : null}

      {rewardOverviewQuery.isLoading ? (
        <SkeletonCard rows={3} hasHeader />
      ) : null}

      {rewardOverviewQuery.error ? (
        <InfoCard eyebrow={copy.common.error} title={language === "fi" ? "Palkintoja ei voitu ladata" : "Could not load rewards"}>
          <Text style={styles.bodyText}>{createUserSafeErrorMessage(rewardOverviewQuery.error, language, "rewards")}</Text>
          <Pressable onPress={() => void rewardOverviewQuery.refetch()} style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>{copy.common.retry}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!rewardOverviewQuery.isLoading && !rewardOverviewQuery.error && events.length === 0 ? (
        <InfoCard eyebrow={copy.common.standby} title={language === "fi" ? "Ei palkintopolkuja vielä" : "No reward progress yet"}>
          {registeredEventCount === 0 ? (
            <>
              <View style={{ alignItems: "flex-start", flexDirection: "row", gap: 12 }}>
                <AppIcon color={theme.colors.textMuted} name="gift" size={16} />
                <Text style={[styles.bodyText, { flex: 1 }]}>{copy.student.noRewardProgress}</Text>
              </View>
              <Pressable onPress={() => router.push("/student/events")} style={styles.primaryButton}>
                <AppIcon color={theme.colors.actionPrimaryText} name="calendar" size={18} />
                <Text style={styles.primaryButtonText}>{copy.student.browseEvents}</Text>
              </Pressable>
            </>
          ) : (
            <View style={{ alignItems: "flex-start", flexDirection: "row", gap: 12 }}>
              <AppIcon color={theme.colors.textMuted} name="gift" size={16} />
              <Text style={[styles.bodyText, { flex: 1 }]}>
                {language === "fi"
                  ? "Olet jo ilmoittautunut, mutta palkintotasoja ei näy vielä. Tarkista myöhemmin uudelleen."
                  : "Registered for events, but none show reward progress yet. Check back after the organizer publishes tiers."}
              </Text>
            </View>
          )}
        </InfoCard>
      ) : null}

      {events.length > 0 ? (
        <View style={styles.railSection}>
          <View style={styles.railHeader}>
            <View style={styles.railHeaderCopy}>
              <Text style={styles.railEyebrow}>{language === "fi" ? "Palkinnot" : "Rewards"}</Text>
              <Text style={styles.railTitle}>{language === "fi" ? "Tapahtumapalkinnot" : "Event rewards"}</Text>
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
                  studentId={studentId}
                  visibleTierCount={2}
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
      borderColor: theme.colors.limeBorder,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
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
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      letterSpacing: 0.3,
    },
    profileButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      height: 42,
      justifyContent: "center",
      width: 42,
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
    railEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    railHeaderCopy: {
      flex: 1,
      gap: 2,
    },
    railSection: {
      gap: 16,
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
      letterSpacing: 1.4,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    screenHeader: {
      flex: 1,
      gap: 6,
    },
    screenHeaderRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.titleLarge,
      lineHeight: theme.typography.lineHeights.titleLarge,
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
      minHeight: 300,
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
      fontSize: 72,
      lineHeight: 76,
    },
    summaryTitle: {
      color: "#F8FAF5",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
      maxWidth: 260,
    },
  });
