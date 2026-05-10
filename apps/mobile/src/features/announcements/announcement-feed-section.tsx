import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { EmptyStateCard } from "@/components/empty-state-card";
import { InfoCard } from "@/components/info-card";
import {
  useAnnouncementFeedQuery,
  useAnnouncementRealtimeInvalidation,
  useRecordAnnouncementImpressionsMutation,
  useSetAnnouncementNotificationPreferenceMutation,
  type AnnouncementFeedItem,
} from "@/features/announcements/announcements";
import { AutoAdvancingRail } from "@/features/foundation/components/auto-advancing-rail";
import type { MobileTheme } from "@/features/foundation/theme";
import { getFallbackCoverSource } from "@/features/events/event-visuals";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";

type AnnouncementFeedSectionProps = {
  compact: boolean;
  detailPathname?: AnnouncementDetailPathname;
  maxItems: number;
  onViewAllPress?: () => void;
  presentation?: "stack" | "rail";
  returnToPathname?: string;
  title: string;
  userId: string | null;
  viewAllLabel?: string;
};

type AnnouncementDetailPathname =
  | "/business/announcement-detail"
  | "/club/announcement-detail"
  | "/student/announcement-detail";

const maxRecordedAnnouncementIds = 200;

const formatFeedDate = (localeTag: string, value: string): string =>
  new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export const AnnouncementFeedSection = ({
  compact,
  detailPathname,
  maxItems,
  onViewAllPress,
  presentation = "stack",
  returnToPathname,
  title,
  userId,
  viewAllLabel,
}: AnnouncementFeedSectionProps) => {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const styles = useThemeStyles(createStyles);
  const { language, localeTag, theme } = useUiPreferences();
  const feedQuery = useAnnouncementFeedQuery({
    isEnabled: userId !== null,
    userId: userId ?? "",
  });
  const preferenceMutation = useSetAnnouncementNotificationPreferenceMutation();
  const impressionMutation = useRecordAnnouncementImpressionsMutation();
  const recordedAnnouncementIdsRef = useRef<Set<string>>(new Set<string>());
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const visibleItems = (feedQuery.data ?? []).slice(0, maxItems);
  const visibleAnnouncementIds = useMemo(
    () => visibleItems.map((announcement) => announcement.announcementId),
    [visibleItems]
  );
  const announcementRailWidth = Math.min(360, Math.max(280, windowWidth - 88));
  const feedRailContentStyle = [
    styles.feedRailContent,
    visibleItems.length === 1 ? styles.feedRailContentSingle : null,
  ];

  useAnnouncementRealtimeInvalidation({
    isEnabled: userId !== null,
    userId: userId ?? "",
  });

  const labels = {
    ctaFallback: language === "fi" ? "Avaa" : "Open",
    emptyBody:
      language === "fi"
        ? "Uudet tiedotteet näkyvät täällä, kun klubi tai OmaLeima julkaisee ne."
        : "New updates appear here when a club or OmaLeima publishes them.",
    eyebrow: language === "fi" ? "Tiedotteet" : "Updates",
    loading: language === "fi" ? "Haetaan tiedotteita." : "Loading updates.",
    notificationsOff: language === "fi" ? "Ilmoitukset pois" : "Push off",
    notificationsOn: language === "fi" ? "Ilmoitukset päällä" : "Push on",
    platform: "OmaLeima",
    retry: language === "fi" ? "Yritä uudelleen" : "Retry",
    viewAll: viewAllLabel ?? (language === "fi" ? "Avaa koko feed" : "Open full feed"),
  };
  const resolvedTitle =
    title.trim().toLowerCase() === labels.eyebrow.toLowerCase()
      ? language === "fi"
        ? `${title} virta`
        : `${title} feed`
      : title;

  const rememberAnnouncementId = (announcementId: string): void => {
    recordedAnnouncementIdsRef.current.add(announcementId);

    if (recordedAnnouncementIdsRef.current.size <= maxRecordedAnnouncementIds) {
      return;
    }

    const oldestAnnouncementId = recordedAnnouncementIdsRef.current.values().next().value;

    if (typeof oldestAnnouncementId === "string") {
      recordedAnnouncementIdsRef.current.delete(oldestAnnouncementId);
    }
  };

  useEffect(() => {
    if (userId === null || visibleAnnouncementIds.length === 0) {
      return;
    }

    const unrecordedAnnouncementIds = visibleAnnouncementIds.filter(
      (announcementId) => !recordedAnnouncementIdsRef.current.has(announcementId)
    );

    if (unrecordedAnnouncementIds.length === 0) {
      return;
    }

    unrecordedAnnouncementIds.forEach((announcementId) => {
      rememberAnnouncementId(announcementId);
    });

    void impressionMutation
      .mutateAsync({
        announcementIds: unrecordedAnnouncementIds,
        userId,
      })
      .catch((error: unknown) => {
        console.warn("announcement_feed_impression_record_failed", {
          announcementIds: unrecordedAnnouncementIds,
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }, [impressionMutation, userId, visibleAnnouncementIds]);

  const handleCtaPress = async (announcement: AnnouncementFeedItem): Promise<void> => {
    if (announcement.ctaUrl === null) {
      return;
    }

    setInteractionError(null);

    try {
      const canOpenUrl = await Linking.canOpenURL(announcement.ctaUrl);

      if (!canOpenUrl) {
        throw new Error(language === "fi" ? "Linkkiä ei voitu avata." : "Could not open the link.");
      }

      await Linking.openURL(announcement.ctaUrl);
    } catch (error) {
      setInteractionError(error instanceof Error ? error.message : labels.retry);
    }
  };

  const handlePreferencePress = async (announcement: AnnouncementFeedItem): Promise<void> => {
    if (userId === null) {
      return;
    }

    setInteractionError(null);

    try {
      await preferenceMutation.mutateAsync({
        clubId: announcement.clubId,
        pushEnabled: !announcement.isPushEnabled,
        sourceType: announcement.sourceType,
        userId,
      });
    } catch (error) {
      setInteractionError(error instanceof Error ? error.message : labels.retry);
    }
  };

  const handleAnnouncementPress = (announcement: AnnouncementFeedItem): void => {
    if (typeof detailPathname === "undefined") {
      return;
    }

    router.push({
      pathname: detailPathname,
      params: {
        announcementId: announcement.announcementId,
        returnTo: returnToPathname,
      },
    });
  };

  if (userId === null) {
    return null;
  }

  const renderAnnouncementCard = (announcement: AnnouncementFeedItem) => {
    return (
      <View
        key={announcement.announcementId}
        style={[styles.feedItem, typeof detailPathname === "undefined" ? null : styles.feedItemInteractive]}
      >
        <Pressable
          accessibilityLabel={`${announcement.title}. ${announcement.clubName ?? labels.platform}`}
          accessibilityRole={typeof detailPathname === "undefined" ? undefined : "button"}
          accessibilityState={{ selected: false }}
          disabled={typeof detailPathname === "undefined"}
          onPress={typeof detailPathname === "undefined" ? undefined : () => handleAnnouncementPress(announcement)}
          style={({ pressed }) => [
            styles.feedTouchableArea,
            pressed ? styles.feedItemPressed : null,
          ]}
        >
          <CoverImageSurface
            fallbackSource={getFallbackCoverSource("eventDiscovery")}
            source={announcement.imageUrl === null ? null : { uri: announcement.imageUrl }}
            style={styles.feedImage}
          />
          <View style={styles.feedMain}>
            <View style={styles.feedHeader}>
              <View style={styles.sourceRow}>
              <View style={styles.sourceCopy}>
                <Text numberOfLines={1} style={styles.sourceName}>
                  {announcement.clubName ?? labels.platform}
                </Text>
                <View style={styles.dateRow}>
                  <AppIcon color={theme.colors.textMuted} name="calendar" size={13} />
                  <Text style={styles.dateText}>{formatFeedDate(localeTag, announcement.startsAt)}</Text>
                </View>
              </View>
            </View>
            <Pressable
                accessibilityLabel={announcement.isPushEnabled ? labels.notificationsOn : labels.notificationsOff}
                accessibilityRole="button"
                accessibilityState={{ disabled: preferenceMutation.isPending, selected: announcement.isPushEnabled }}
                disabled={preferenceMutation.isPending}
                onPress={() => void handlePreferencePress(announcement)}
                style={[
                  styles.preferenceIconButton,
                  announcement.isPushEnabled ? null : styles.preferenceIconButtonMuted,
                  preferenceMutation.isPending ? styles.disabledButton : null,
                ]}
              >
                <AppIcon
                  color={announcement.isPushEnabled ? theme.colors.lime : theme.colors.textMuted}
                  name="bell"
                  size={14}
                />
              </Pressable>
            </View>

            <View style={styles.feedCopy}>
              <Text selectable numberOfLines={1} style={styles.feedTitle}>
                {announcement.title}
              </Text>
              <Text selectable numberOfLines={3} style={styles.feedBody}>
                {announcement.body}
              </Text>
            </View>

            {announcement.ctaUrl !== null ? (
              <View style={styles.actionRow}>
                <Pressable onPress={() => void handleCtaPress(announcement)} style={styles.ctaButton}>
                  <Text style={styles.ctaButtonText}>{announcement.ctaLabel ?? labels.ctaFallback}</Text>
                  <AppIcon color={theme.colors.lime} name="chevron-right" size={15} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.ctaButtonPlaceholder} />
            )}
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <InfoCard
      eyebrow={labels.eyebrow}
      showBorder={false}
      title={resolvedTitle}
      variant={compact ? "subtle" : "card"}
    >
      {feedQuery.isLoading ? (
        <Text style={styles.bodyText}>{labels.loading}</Text>
      ) : null}

      {feedQuery.error ? (
        <View style={styles.stateStack}>
          <Text selectable style={styles.errorText}>{feedQuery.error.message}</Text>
          <Pressable onPress={() => void feedQuery.refetch()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{labels.retry}</Text>
          </Pressable>
        </View>
      ) : null}

      {!feedQuery.isLoading && !feedQuery.error && visibleItems.length === 0 ? (
        <EmptyStateCard body={labels.emptyBody} iconName="bell" />
      ) : null}

      {!feedQuery.isLoading && !feedQuery.error && visibleItems.length > 0 ? (
        presentation === "rail" ? (
          <AutoAdvancingRail
            contentContainerStyle={feedRailContentStyle}
            intervalMs={3600}
            itemGap={12}
            items={visibleItems}
            itemWidth={announcementRailWidth}
            keyExtractor={(announcement: AnnouncementFeedItem) => announcement.announcementId}
            railStyle={styles.feedRail}
            renderItem={(announcement: AnnouncementFeedItem) => renderAnnouncementCard(announcement)}
            shouldAdaptHeight={false}
            showsIndicators={false}
          />
        ) : (
          <View style={styles.feedStack}>{visibleItems.map((announcement) => renderAnnouncementCard(announcement))}</View>
        )
      ) : null}

      {preferenceMutation.error ? (
        <Text selectable style={styles.errorText}>{preferenceMutation.error.message}</Text>
      ) : null}
      {interactionError !== null ? <Text selectable style={styles.errorText}>{interactionError}</Text> : null}
      {onViewAllPress ? (
        <Pressable onPress={onViewAllPress} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{labels.viewAll}</Text>
        </Pressable>
      ) : null}
    </InfoCard>
  );
};

  const createStyles = (theme: MobileTheme) =>
    StyleSheet.create({
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 34,
      paddingTop: 2,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    ctaButton: {
      alignItems: "center",
      alignSelf: "stretch",
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: 16,
      flexDirection: "row",
      gap: 6,
      justifyContent: "center",
      minHeight: 34,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    ctaButtonText: {
      color: theme.colors.lime,
      flexShrink: 1,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
      textAlign: "center",
    },
    ctaButtonPlaceholder: {
      minHeight: 34,
      width: "100%",
    },
    dateText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    disabledButton: {
      opacity: 0.56,
    },
    errorText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    feedBody: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    feedCopy: {
      gap: 6,
    },
    feedHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      justifyContent: "space-between",
    },
    feedImage: {
      borderRadius: theme.radius.inner,
      height: 160,
      width: "100%",
      overflow: "hidden",
    },
    feedItemInteractive: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radius.card,
      borderWidth: 1,
    },
    feedItemPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.995 }],
    },
    feedRail: {
      marginHorizontal: -2,
    },
    feedRailContent: {
      paddingHorizontal: 2,
    },
    feedRailContentSingle: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 0,
    },
    feedItem: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      height: 330,
      gap: 8,
      padding: 10,
    },
    feedStack: {
      gap: 12,
    },
    feedTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    feedMain: {
      gap: 10,
      justifyContent: "space-between",
      minHeight: 158,
    },
    feedTouchableArea: {
      gap: 8,
    },
    iconBubble: {
      alignItems: "center",
      backgroundColor: theme.colors.limeSurface,
      borderRadius: 999,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    preferenceIconButton: {
      alignItems: "center",
      backgroundColor: theme.mode === "light" ? theme.colors.limeSurface : theme.colors.surfaceL2,
      borderColor: theme.colors.limeBorder,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    preferenceIconButtonMuted: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
    },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 16,
      borderWidth: theme.mode === "light" ? 1 : 0,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 14,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
      textAlign: "center",
    },
    sourceCopy: {
      flex: 1,
      gap: 2,
    },
    dateRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    sourceName: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    sourceRow: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: 9,
    },
    stateStack: {
      gap: 10,
    },
  });
