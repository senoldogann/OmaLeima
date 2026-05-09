import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { getEventCoverSource } from "@/features/events/event-visuals";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import type { StudentEventSummary } from "@/features/events/types";

type EventCardProps = {
  countdownLabel?: string | null;
  event: StudentEventSummary;
  isJoinPending?: boolean;
  onJoinPress?: () => void;
  onMapPress?: () => void;
  onPress: () => void;
  motionIndex?: number;
};

const canJoinEventFromCard = (event: StudentEventSummary, onJoinPress: (() => void) | undefined): boolean =>
  onJoinPress !== undefined && event.timelineState === "UPCOMING" && event.registrationState === "NOT_REGISTERED";

export const EventCard = ({
  countdownLabel = null,
  event,
  isJoinPending = false,
  onJoinPress,
  onMapPress,
  onPress,
}: EventCardProps) => {
  const { language, localeTag, theme } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const coverSource = getEventCoverSource(event.coverImageUrl, `${event.id}:${event.name}`);
  const canJoinFromCard = canJoinEventFromCard(event, onJoinPress);
  const isActive = event.timelineState === "ACTIVE";

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

  const handleMapPress = (pressEvent: GestureResponderEvent): void => {
    pressEvent.stopPropagation();
    onMapPress?.();
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
    >
      {/* Clean thumbnail — no overlay */}
      <View style={styles.thumbWrap}>
        <CoverImageSurface imageStyle={styles.thumbImage} source={coverSource} style={styles.thumb} />
      </View>

      {/* Date column + content, grouped to control inner gap independently */}
      <View style={styles.innerRow}>
        <View style={styles.dateCol}>
          <Text style={[styles.dateDayNum, isActive ? styles.dateDayNumActive : null]}>{dayNum}</Text>
          <Text style={styles.dateMonthAbbr}>{monthAbbr}</Text>
        </View>

        <View style={styles.content}>
          {isActive ? (
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveLabel}>{language === "fi" ? "käynnissä" : "LIVE"}</Text>
            </View>
          ) : null}
          <Text numberOfLines={2} style={styles.eventName}>{event.name}</Text>
          {countdownLabel !== null ? (
            <View style={styles.countdownPill}>
              <Text numberOfLines={1} style={styles.countdownPillText}>{countdownLabel}</Text>
            </View>
          ) : null}
          <View style={styles.locationRow}>
            <AppIcon color={theme.colors.textMuted} name="map-pin" size={11} />
            <Text numberOfLines={1} style={styles.locationText}>
              {event.city}{event.country.length > 0 ? `, ${event.country}` : ""}
            </Text>
            {onMapPress !== undefined ? (
              <Pressable
                accessibilityLabel={language === "fi" ? "Avaa kartta" : "Open map"}
                accessibilityRole="button"
                onPress={handleMapPress}
                style={styles.mapButton}
              >
                <Text style={styles.mapButtonText}>{language === "fi" ? "Kartta" : "Map"}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {/* Right action: join button or disclosure chevron */}
      {canJoinFromCard ? (
        <Pressable
          disabled={isJoinPending}
          onPress={handleJoinPress}
          style={[styles.joinButton, isJoinPending ? styles.joinButtonDisabled : null]}
        >
          <Text style={styles.joinButtonText}>
            {isJoinPending
              ? language === "fi" ? "Liittyy..." : "Joining..."
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
    countdownPill: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    countdownPillText: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: 11,
      lineHeight: 14,
      textTransform: "uppercase",
    },
    dateCol: {
      alignItems: "center",
      flexShrink: 0,
      gap: 1,
      minWidth: 32,
    },
    dateDayNum: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: 22,
      lineHeight: 24,
    },
    dateDayNumActive: {
      color: theme.colors.lime,
    },
    dateMonthAbbr: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.bold,
      fontSize: 10,
      letterSpacing: 0.8,
      lineHeight: 13,
      textTransform: "uppercase",
    },
    innerRow: {
      alignItems: "flex-start",
      flex: 1,
      flexDirection: "row",
      gap: 10,
    },
    liveLabel: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: 11,
      letterSpacing: 0.5,
      lineHeight: 14,
      textTransform: "uppercase",
    },
    liveDot: {
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      height: 6,
      width: 6,
    },
    liveRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 5,
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
    mapButton: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    mapButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: 11,
      lineHeight: 14,
    },
    thumb: {
      height: 92,
      width: 92,
    },
    thumbImage: {
      borderRadius: theme.radius.inner,
    },
    thumbWrap: {
      borderRadius: theme.radius.inner,
      flexShrink: 0,
      height: 92,
      overflow: "hidden",
      width: 92,
    },
  });
