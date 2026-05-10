import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { getEventCoverSource } from "@/features/events/event-visuals";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import type { StudentEventSummary } from "@/features/events/types";
import type { StudentRewardEventProgress } from "@/features/rewards/types";

type EventCardProps = {
  countdownLabel?: string | null;
  event: StudentEventSummary;
  isJoinPending?: boolean;
  onJoinPress?: () => void;
  onMapPress?: () => void;
  onPress: () => void;
  rewardProgress?: StudentRewardEventProgress | null;
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
  rewardProgress = null,
}: EventCardProps) => {
  const { language, localeTag, theme } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const coverSource = getEventCoverSource(event.coverImageUrl, `${event.id}:${event.name}`);
  const canJoinFromCard = canJoinEventFromCard(event, onJoinPress);
  const isActive = event.timelineState === "ACTIVE";
  const hasClaimableReward = (rewardProgress?.claimableTierCount ?? 0) > 0;
  const hasClaimedReward = (rewardProgress?.claimedTierCount ?? 0) > 0;
  const rewardGoal = Math.max(rewardProgress?.minimumStampsRequired ?? event.minimumStampsRequired, 1);
  const rewardStampCount = rewardProgress?.stampCount ?? 0;
  const rewardProgressRatio = Math.min(rewardStampCount / rewardGoal, 1);
  const shouldShowRewardProgress = rewardProgress !== null && rewardProgress.tiers.length > 0;

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
      style={({ pressed }) => [
        styles.card,
        hasClaimableReward ? styles.cardClaimable : null,
        hasClaimedReward && !hasClaimableReward ? styles.cardClaimed : null,
        pressed ? styles.cardPressed : null,
      ]}
    >
      <View style={styles.thumbWrap}>
        <CoverImageSurface imageStyle={styles.thumbImage} source={coverSource} style={styles.thumb}>
          <View style={styles.thumbShade} />
          <View style={styles.dateTextGroup}>
            <Text style={[styles.dateDayNum, isActive ? styles.dateDayNumActive : null]}>{dayNum}</Text>
            <Text style={styles.dateMonthAbbr}>{monthAbbr}</Text>
          </View>
        </CoverImageSurface>
      </View>

      <View style={styles.innerRow}>
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
          </View>
          {shouldShowRewardProgress ? (
            <View style={styles.rewardStrip}>
              <View style={styles.rewardStripHeader}>
                <View style={styles.rewardStripLabelRow}>
                  <AppIcon
                    color={hasClaimableReward ? theme.colors.lime : theme.colors.textMuted}
                    name="gift"
                    size={12}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.rewardStripLabel,
                      hasClaimableReward ? styles.rewardStripLabelReady : null,
                    ]}
                  >
                    {hasClaimableReward
                      ? language === "fi" ? "Palkinto valmis" : "Reward ready"
                      : hasClaimedReward
                        ? language === "fi" ? "Palkinto lunastettu" : "Reward claimed"
                        : `${rewardStampCount}/${rewardGoal} ${language === "fi" ? "leimaa" : "leimas"}`}
                  </Text>
                </View>
              </View>
              {!hasClaimableReward && !hasClaimedReward ? (
                <View style={styles.rewardTrack}>
                  <View style={[styles.rewardTrackFill, { width: `${rewardProgressRatio * 100}%` }]} />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.ticketActionColumn}>
        <View style={styles.ticketPerforation} />
        <View style={styles.ticketCutTop} />
        <View style={styles.ticketCutBottom} />
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
          <View style={styles.chevronWrap}>
            <AppIcon color={theme.colors.textDim} name="chevron-right" size={18} />
          </View>
        )}
      </View>
    </Pressable>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    card: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      overflow: "visible",
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    cardClaimable: {
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
    },
    cardClaimed: {
      borderColor: theme.colors.success,
    },
    cardPressed: {
      transform: [{ translateY: 1.5 }, { scale: 0.992 }],
    },
    content: {
      flex: 1,
      gap: 5,
      minWidth: 0,
    },
    chevronWrap: {
      alignItems: "center",
      height: 38,
      justifyContent: "center",
      width: "100%",
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
    dateTextGroup: {
      alignItems: "flex-start",
      bottom: 8,
      left: 8,
      minWidth: 46,
      position: "absolute",
    },
    dateDayNum: {
      color: "#F8FAF5",
      fontFamily: theme.typography.families.extrabold,
      fontSize: 18,
      lineHeight: 20,
      textShadowColor: "rgba(0, 0, 0, 0.72)",
      textShadowOffset: { height: 1, width: 0 },
      textShadowRadius: 6,
    },
    dateDayNumActive: {
      color: theme.colors.lime,
    },
    dateMonthAbbr: {
      color: "rgba(248, 250, 245, 0.82)",
      fontFamily: theme.typography.families.bold,
      fontSize: 10,
      letterSpacing: 0,
      lineHeight: 13,
      textShadowColor: "rgba(0, 0, 0, 0.72)",
      textShadowOffset: { height: 1, width: 0 },
      textShadowRadius: 6,
      textTransform: "uppercase",
    },
    innerRow: {
      alignItems: "flex-start",
      flex: 1,
      flexDirection: "row",
      gap: 0,
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
      alignItems: "center",
      justifyContent: "center",
      minHeight: 38,
      width: "100%",
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
      alignItems: "center",
      justifyContent: "center",
      minHeight: 38,
      width: "100%",
    },
    mapButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: 11,
      lineHeight: 14,
    },
    rewardStrip: {
      gap: 5,
      paddingTop: 2,
    },
    rewardStripHeader: {
      gap: 4,
    },
    rewardStripLabel: {
      color: theme.colors.textMuted,
      flexShrink: 1,
      fontFamily: theme.typography.families.bold,
      fontSize: 11,
      lineHeight: 14,
    },
    rewardStripLabelReady: {
      color: theme.colors.lime,
    },
    rewardStripLabelRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 5,
      minWidth: 0,
    },
    rewardTrack: {
      backgroundColor: theme.colors.surfaceL3,
      borderRadius: 999,
      height: 4,
      overflow: "hidden",
      width: "100%",
    },
    rewardTrackFill: {
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      height: "100%",
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
    thumbShade: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.18)",
    },
    ticketActionColumn: {
      alignItems: "center",
      alignSelf: "stretch",
      flexShrink: 0,
      gap: 8,
      justifyContent: "center",
      paddingLeft: 13,
      position: "relative",
      width: 70,
    },
    ticketCutBottom: {
      backgroundColor: theme.colors.screenBase,
      borderRadius: 999,
      bottom: -21,
      height: 24,
      left: -12,
      position: "absolute",
      width: 24,
    },
    ticketCutTop: {
      backgroundColor: theme.colors.screenBase,
      borderRadius: 999,
      height: 24,
      left: -12,
      position: "absolute",
      top: -21,
      width: 24,
    },
    ticketPerforation: {
      borderColor: theme.colors.borderStrong,
      borderLeftWidth: 1,
      borderStyle: "dashed",
      bottom: 4,
      left: 0,
      opacity: 0.72,
      position: "absolute",
      top: 4,
    },
  });
