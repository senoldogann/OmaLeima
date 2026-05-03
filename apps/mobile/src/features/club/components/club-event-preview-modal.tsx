import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { StatusBadge } from "@/components/status-badge";
import type { ClubDashboardEventSummary, ClubDashboardTimelineState } from "@/features/club/types";
import { getEventCoverSourceWithFallback } from "@/features/events/event-visuals";
import type { MobileTheme } from "@/features/foundation/theme";
import type { AppLanguage } from "@/features/i18n/translations";
import { useThemeStyles } from "@/features/preferences/ui-preferences-provider";

type ClubEventPreviewModalProps = {
  event: ClubDashboardEventSummary | null;
  formatter: Intl.DateTimeFormat;
  language: AppLanguage;
  onClose: () => void;
  onEditPress: (eventId: string) => void;
};

type PreviewBadge = {
  label: string;
  state: "pending" | "ready" | "warning";
};

const getTimelineBadge = (
  timelineState: ClubDashboardTimelineState,
  labels: Record<ClubDashboardTimelineState, string>
): PreviewBadge => {
  switch (timelineState) {
    case "LIVE":
      return { label: labels.LIVE, state: "ready" };
    case "UPCOMING":
      return { label: labels.UPCOMING, state: "pending" };
    case "DRAFT":
      return { label: labels.DRAFT, state: "pending" };
    case "CANCELLED":
      return { label: labels.CANCELLED, state: "warning" };
    case "COMPLETED":
      return { label: labels.COMPLETED, state: "warning" };
  }
};

const formatDateTime = (formatter: Intl.DateTimeFormat, value: string): string =>
  formatter.format(new Date(value));

export const ClubEventPreviewModal = ({
  event,
  formatter,
  language,
  onClose,
  onEditPress,
}: ClubEventPreviewModalProps) => {
  const styles = useThemeStyles(createStyles);

  const labels = {
    close: language === "fi" ? "Sulje" : "Close",
    edit: language === "fi" ? "Muokkaa" : "Edit",
    ends: language === "fi" ? "Päättyy" : "Ends",
    minimum: language === "fi" ? "minimi" : "minimum",
    participants: language === "fi" ? "osallistujaa" : "participants",
    preview: language === "fi" ? "Esikatselu" : "Preview",
    starts: language === "fi" ? "Alkaa" : "Starts",
    venues: language === "fi" ? "rastia" : "venues",
    status: {
      CANCELLED: language === "fi" ? "Peruttu" : "Cancelled",
      COMPLETED: language === "fi" ? "Päättynyt" : "Completed",
      DRAFT: language === "fi" ? "Luonnos" : "Draft",
      LIVE: language === "fi" ? "Live" : "Live",
      UPCOMING: language === "fi" ? "Tulossa" : "Upcoming",
    } satisfies Record<ClubDashboardTimelineState, string>,
  };

  const badge = event === null ? null : getTimelineBadge(event.timelineState, labels.status);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={event !== null}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        {event !== null && badge !== null ? (
          <Pressable onPress={() => undefined} style={styles.sheet}>
            <CoverImageSurface
              source={getEventCoverSourceWithFallback(event.coverImageUrl, "clubControl")}
              style={styles.cover}
            >
              <View style={styles.coverOverlay} />
              <View style={styles.coverContent}>
                <View style={styles.coverTopRow}>
                  <Text style={styles.eyebrow}>{labels.preview}</Text>
                  <StatusBadge label={badge.label} state={badge.state} />
                </View>
                <View style={styles.titleGroup}>
                  <Text numberOfLines={2} style={styles.title}>{event.name}</Text>
                  <Text numberOfLines={1} style={styles.meta}>{event.clubName} · {event.city}</Text>
                </View>
              </View>
            </CoverImageSurface>

            <View style={styles.dateGrid}>
              <View style={styles.datePill}>
                <Text style={styles.dateLabel}>{labels.starts}</Text>
                <Text style={styles.dateValue}>{formatDateTime(formatter, event.startAt)}</Text>
              </View>
              <View style={styles.datePill}>
                <Text style={styles.dateLabel}>{labels.ends}</Text>
                <Text style={styles.dateValue}>{formatDateTime(formatter, event.endAt)}</Text>
              </View>
            </View>

            {event.description !== null && event.description.length > 0 ? (
              <Text numberOfLines={4} style={styles.description}>{event.description}</Text>
            ) : null}

            <View style={styles.metricRow}>
              <View style={styles.metricPill}>
                <Text style={styles.metricValue}>{event.registeredParticipantCount}</Text>
                <Text style={styles.metricLabel}>{labels.participants}</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricValue}>{event.joinedVenueCount}</Text>
                <Text style={styles.metricLabel}>{labels.venues}</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricValue}>{event.minimumStampsRequired}</Text>
                <Text style={styles.metricLabel}>{labels.minimum}</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Pressable onPress={onClose} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>{labels.close}</Text>
              </Pressable>
              <Pressable onPress={() => onEditPress(event.eventId)} style={styles.primaryButton}>
                <AppIcon color="#071006" name="calendar" size={18} />
                <Text style={styles.primaryButtonText}>{labels.edit}</Text>
              </Pressable>
            </View>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    actionRow: {
      flexDirection: "row",
      gap: 10,
    },
    backdrop: {
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.72)",
      flex: 1,
      justifyContent: "center",
      padding: 18,
    },
    cover: {
      borderRadius: 28,
      minHeight: 210,
      overflow: "hidden",
      position: "relative",
    },
    coverContent: {
      flex: 1,
      justifyContent: "space-between",
      padding: 18,
    },
    coverOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.48)",
    },
    coverTopRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    dateGrid: {
      flexDirection: "row",
      gap: 10,
    },
    dateLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textTransform: "uppercase",
    },
    datePill: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 18,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flex: 1,
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    dateValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    description: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    eyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.2,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    meta: {
      color: "rgba(255,255,255,0.78)",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    metricLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textAlign: "center",
    },
    metricPill: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 18,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flex: 1,
      gap: 2,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    metricRow: {
      flexDirection: "row",
      gap: 10,
    },
    metricValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
      textAlign: "center",
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: 18,
      flex: 1,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      minHeight: 54,
      paddingHorizontal: 16,
    },
    primaryButtonText: {
      color: "#071006",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 18,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flex: 1,
      justifyContent: "center",
      minHeight: 54,
      paddingHorizontal: 16,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    sheet: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: 34,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 14,
      maxWidth: 560,
      padding: 12,
      width: "100%",
    },
    title: {
      color: "#FFFFFF",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    titleGroup: {
      gap: 6,
    },
  });
