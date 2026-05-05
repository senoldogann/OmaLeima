import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { StatusBadge } from "@/components/status-badge";
import { getEventCoverSource } from "@/features/events/event-visuals";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import type { StudentEventSummary } from "@/features/events/types";

type EventCardProps = {
  event: StudentEventSummary;
  isJoinPending?: boolean;
  onJoinPress?: () => void;
  onMapPress?: () => void;
  onPress: () => void;
  motionIndex?: number;
};

const getTimelineBadge = (
  event: StudentEventSummary,
  language: "fi" | "en"
): { label: string; state: "ready" | "pending" } => {
  if (event.timelineState === "ACTIVE") {
    return { label: language === "fi" ? "käynnissä" : "live now", state: "ready" };
  }

  return { label: language === "fi" ? "tulossa" : "upcoming", state: "pending" };
};

const getRegistrationBadge = (
  event: StudentEventSummary,
  language: "fi" | "en"
): { label: string; state: "ready" | "warning" | "pending" } => {
  if (event.registrationState === "REGISTERED") {
    return { label: language === "fi" ? "liitytty" : "registered", state: "ready" };
  }

  if (event.registrationState === "CANCELLED") {
    return { label: language === "fi" ? "peruttu" : "cancelled", state: "warning" };
  }

  if (event.registrationState === "BANNED") {
    return { label: language === "fi" ? "estetty" : "restricted", state: "warning" };
  }

  return { label: language === "fi" ? "ei liitytty" : "not joined", state: "pending" };
};

const canJoinEventFromCard = (event: StudentEventSummary, onJoinPress: (() => void) | undefined): boolean =>
  onJoinPress !== undefined && event.timelineState === "UPCOMING" && event.registrationState === "NOT_REGISTERED";

export const EventCard = ({ event, isJoinPending = false, onJoinPress, onPress }: EventCardProps) => {
  const { language, localeTag, theme } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const timelineBadge = getTimelineBadge(event, language);
  const registrationBadge = getRegistrationBadge(event, language);
  const coverSource = getEventCoverSource(event.coverImageUrl, `${event.id}:${event.name}`);
  const canJoinFromCard = canJoinEventFromCard(event, onJoinPress);

  const startDate = new Date(event.startAt);
  const dayNum = startDate.getDate().toString();
  const monthAbbr = new Intl.DateTimeFormat(localeTag, { month: "short" })
    .format(startDate)
    .toUpperCase()
    .replace(".", "");

  const handleJoinPress = (pressEvent: GestureResponderEvent): void => {
    pressEvent.stopPropagation();
    onJoinPress?.();
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
    >
      {/* Kapa görseli + tarih rozeti */}
      <View style={styles.thumbWrap}>
        <CoverImageSurface imageStyle={styles.thumbImage} source={coverSource} style={styles.thumb}>
          <View style={styles.thumbOverlay} />
          <View style={styles.dateBadge}>
            <Text style={styles.dateDay}>{dayNum}</Text>
            <Text style={styles.dateMonth}>{monthAbbr}</Text>
          </View>
        </CoverImageSurface>
      </View>

      {/* İçerik: başlık, konum, rozetler */}
      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.eventName}>{event.name}</Text>
        <View style={styles.locationRow}>
          <AppIcon color={theme.colors.textMuted} name="map-pin" size={11} />
          <Text numberOfLines={1} style={styles.locationText}>
            {event.city}{event.country.length > 0 ? `, ${event.country}` : ""}
          </Text>
        </View>
        <View style={styles.badgeRow}>
          <StatusBadge label={timelineBadge.label} state={timelineBadge.state} />
          {event.registrationState === "REGISTERED" ? (
            <StatusBadge label={registrationBadge.label} state={registrationBadge.state} />
          ) : null}
        </View>
      </View>

      {/* Sağ taraf: katıl butonu veya ok */}
      {canJoinFromCard ? (
        <Pressable
          disabled={isJoinPending}
          onPress={handleJoinPress}
          style={[styles.joinButton, isJoinPending ? styles.joinButtonDisabled : null]}
        >
          <Text style={styles.joinButtonText}>
            {isJoinPending
              ? "..."
              : language === "fi" ? "Liity" : "Join"}
          </Text>
        </Pressable>
      ) : (
        <AppIcon color={theme.colors.textDim} name="chevron-right" size={18} />
      )}
    </Pressable>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 2,
    },
    card: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      flexDirection: "row",
      gap: 14,
      overflow: "hidden",
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    cardPressed: {
      transform: [{ translateY: 1.5 }, { scale: 0.992 }],
    },
    content: {
      flex: 1,
      gap: 5,
      minWidth: 0,
    },
    dateBadge: {
      alignItems: "center",
      bottom: 8,
      left: 8,
      position: "absolute",
    },
    dateDay: {
      color: "#FFFFFF",
      fontFamily: theme.typography.families.extrabold,
      fontSize: 22,
      lineHeight: 24,
    },
    dateMonth: {
      color: "rgba(255, 255, 255, 0.75)",
      fontFamily: theme.typography.families.bold,
      fontSize: 10,
      letterSpacing: 0.8,
      lineHeight: 13,
    },
    eventName: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: 15,
      lineHeight: 21,
    },
    joinButton: {
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      flexShrink: 0,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    joinButtonDisabled: {
      opacity: 0.62,
    },
    joinButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: 12,
      lineHeight: 16,
    },
    locationRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
    },
    locationText: {
      color: theme.colors.textMuted,
      flex: 1,
      fontFamily: theme.typography.families.medium,
      fontSize: 12,
      lineHeight: 17,
    },
    thumb: {
      height: 88,
      width: 88,
    },
    thumbImage: {
      borderRadius: theme.radius.inner,
    },
    thumbOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.38)",
    },
    thumbWrap: {
      borderRadius: theme.radius.inner,
      flexShrink: 0,
      height: 88,
      overflow: "hidden",
      width: 88,
    },
  });
