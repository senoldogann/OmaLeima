import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { InfoCard } from "@/components/info-card";
import {
  useAcknowledgeAnnouncementMutation,
  useAnnouncementFeedQuery,
  type AnnouncementFeedItem,
} from "@/features/announcements/announcements";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";

type AnnouncementFeedSectionProps = {
  compact: boolean;
  maxItems: number;
  title: string;
  userId: string | null;
};

const formatFeedDate = (localeTag: string, value: string): string =>
  new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "short",
  }).format(new Date(value));

export const AnnouncementFeedSection = ({
  compact,
  maxItems,
  title,
  userId,
}: AnnouncementFeedSectionProps) => {
  const styles = useThemeStyles(createStyles);
  const { language, localeTag, theme } = useUiPreferences();
  const feedQuery = useAnnouncementFeedQuery({
    isEnabled: userId !== null,
    userId: userId ?? "",
  });
  const acknowledgeMutation = useAcknowledgeAnnouncementMutation();
  const visibleItems = (feedQuery.data ?? []).slice(0, maxItems);

  const labels = {
    ctaFallback: language === "fi" ? "Avaa" : "Open",
    emptyBody:
      language === "fi"
        ? "Uudet tiedotteet näkyvät täällä, kun klubi tai OmaLeima julkaisee ne."
        : "New updates appear here when a club or OmaLeima publishes them.",
    eyebrow: language === "fi" ? "Tiedotteet" : "Updates",
    loading: language === "fi" ? "Haetaan tiedotteita." : "Loading updates.",
    markRead: language === "fi" ? "Merkitse luetuksi" : "Mark read",
    new: language === "fi" ? "Uusi" : "New",
    platform: "OmaLeima",
    read: language === "fi" ? "Luettu" : "Read",
    retry: language === "fi" ? "Yritä uudelleen" : "Retry",
  };

  const handleMarkReadPress = async (announcement: AnnouncementFeedItem): Promise<void> => {
    if (userId === null || announcement.isRead) {
      return;
    }

    await acknowledgeMutation.mutateAsync({
      announcementId: announcement.announcementId,
      userId,
    });
  };

  const handleCtaPress = async (announcement: AnnouncementFeedItem): Promise<void> => {
    if (announcement.ctaUrl === null) {
      return;
    }

    await Linking.openURL(announcement.ctaUrl);
  };

  if (userId === null) {
    return null;
  }

  return (
    <InfoCard eyebrow={labels.eyebrow} title={title} variant={compact ? "subtle" : "card"}>
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
        <Text style={styles.bodyText}>{labels.emptyBody}</Text>
      ) : null}

      {!feedQuery.isLoading && !feedQuery.error && visibleItems.length > 0 ? (
        <View style={styles.feedStack}>
          {visibleItems.map((announcement) => (
            <View key={announcement.announcementId} style={styles.feedItem}>
              <View style={styles.feedHeader}>
                <View style={styles.sourceRow}>
                  <View style={styles.iconBubble}>
                    <AppIcon color={theme.colors.lime} name="bell" size={15} />
                  </View>
                  <View style={styles.sourceCopy}>
                    <Text numberOfLines={1} style={styles.sourceName}>
                      {announcement.clubName ?? labels.platform}
                    </Text>
                    <Text style={styles.dateText}>{formatFeedDate(localeTag, announcement.startsAt)}</Text>
                  </View>
                </View>
                <View style={[styles.readPill, announcement.isRead ? styles.readPillMuted : null]}>
                  <Text style={[styles.readPillText, announcement.isRead ? styles.readPillTextMuted : null]}>
                    {announcement.isRead ? labels.read : labels.new}
                  </Text>
                </View>
              </View>

              <View style={styles.feedCopy}>
                <Text selectable numberOfLines={compact ? 2 : 3} style={styles.feedTitle}>
                  {announcement.title}
                </Text>
                <Text selectable numberOfLines={compact ? 3 : 5} style={styles.feedBody}>
                  {announcement.body}
                </Text>
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  disabled={announcement.isRead || acknowledgeMutation.isPending}
                  onPress={() => void handleMarkReadPress(announcement)}
                  style={[
                    styles.ackButton,
                    announcement.isRead || acknowledgeMutation.isPending ? styles.disabledButton : null,
                  ]}
                >
                  <Text style={styles.ackButtonText}>{announcement.isRead ? labels.read : labels.markRead}</Text>
                </Pressable>
                {announcement.ctaUrl !== null ? (
                  <Pressable onPress={() => void handleCtaPress(announcement)} style={styles.ctaButton}>
                    <Text style={styles.ctaButtonText}>{announcement.ctaLabel ?? labels.ctaFallback}</Text>
                    <AppIcon color={theme.colors.actionPrimaryText} name="chevron-right" size={15} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {acknowledgeMutation.error ? (
        <Text selectable style={styles.errorText}>{acknowledgeMutation.error.message}</Text>
      ) : null}
    </InfoCard>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    ackButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 16,
      borderWidth: theme.mode === "light" ? 1 : 0,
      justifyContent: "center",
      minHeight: 42,
      paddingHorizontal: 14,
    },
    ackButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    actionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    ctaButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: 16,
      flexDirection: "row",
      gap: 6,
      justifyContent: "center",
      minHeight: 42,
      paddingHorizontal: 14,
    },
    ctaButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    dateText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
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
      gap: 10,
      justifyContent: "space-between",
    },
    feedItem: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 12,
      padding: 14,
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
    iconBubble: {
      alignItems: "center",
      backgroundColor: theme.colors.limeSurface,
      borderRadius: 999,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    readPill: {
      backgroundColor: theme.colors.limeSurface,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    readPillMuted: {
      backgroundColor: theme.colors.surfaceL1,
    },
    readPillText: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textTransform: "uppercase",
    },
    readPillTextMuted: {
      color: theme.colors.textMuted,
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
    },
    sourceCopy: {
      flex: 1,
      gap: 2,
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
