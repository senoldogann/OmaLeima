import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";

import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { getEventCoverSource } from "@/features/events/event-visuals";
import { mobileTheme } from "@/features/foundation/theme";
import type { StudentEventSummary } from "@/features/events/types";

type EventCardProps = {
  event: StudentEventSummary;
  onPress: () => void;
  motionIndex?: number;
};

const timeFormatter = new Intl.DateTimeFormat("en-FI", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const formatDateTime = (value: string): string => timeFormatter.format(new Date(value));

const getTimelineBadge = (event: StudentEventSummary): { label: string; state: "ready" | "pending" } => {
  if (event.timelineState === "ACTIVE") {
    return { label: "live now", state: "ready" };
  }

  return { label: "upcoming", state: "pending" };
};

const getRegistrationBadge = (
  event: StudentEventSummary
): { label: string; state: "ready" | "warning" | "pending" } => {
  if (event.registrationState === "REGISTERED") {
    return { label: "registered", state: "ready" };
  }

  if (event.registrationState === "CANCELLED") {
    return { label: "cancelled", state: "warning" };
  }

  if (event.registrationState === "BANNED") {
    return { label: "restricted", state: "warning" };
  }

  return { label: "not joined", state: "pending" };
};

const formatCapacity = (event: StudentEventSummary): string =>
  event.maxParticipants === null ? "Open capacity" : `${event.maxParticipants} participant cap`;

const formatDeadline = (event: StudentEventSummary): string => `Join deadline ${formatDateTime(event.joinDeadlineAt)}`;

export const EventCard = ({ event, onPress, motionIndex }: EventCardProps) => {
  const timelineBadge = getTimelineBadge(event);
  const registrationBadge = getRegistrationBadge(event);
  const coverSource = getEventCoverSource(event.coverImageUrl, `${event.id}:${event.name}`);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed ? styles.pressablePressed : null]}
    >
      <InfoCard eyebrow={event.city} motionIndex={motionIndex} title={event.name}>
        <ImageBackground imageStyle={styles.heroImage} source={coverSource} style={styles.heroBand}>
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <View style={styles.badges}>
              <StatusBadge label={timelineBadge.label} state={timelineBadge.state} />
              <StatusBadge label={registrationBadge.label} state={registrationBadge.state} />
            </View>

            <View style={styles.heroCopy}>
              <Text style={styles.heroKicker}>{event.country}</Text>
              <Text style={styles.heroTimeline}>
                {formatDateTime(event.startAt)} - {formatDateTime(event.endAt)}
              </Text>
            </View>
          </View>
        </ImageBackground>

        <Text style={styles.description}>
          {event.description ?? "Event description will be added by the organizer."}
        </Text>

        <View style={styles.metaGroup}>
          <Text style={styles.metaLine}>{formatDeadline(event)}</Text>
          <Text style={styles.metaLine}>{formatCapacity(event)}</Text>
          <Text style={styles.metaLine}>Minimum leimat required: {event.minimumStampsRequired}</Text>
        </View>

        <View style={styles.actionRow}>
          <Text style={styles.actionText}>Open event</Text>
          <Text style={styles.actionMeta}>Venues, reward path, and join rules live here.</Text>
        </View>
      </InfoCard>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  actionMeta: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  actionRow: {
    gap: 4,
  },
  actionText: {
    color: mobileTheme.colors.lime,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  description: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.typography.families.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  heroBand: {
    borderRadius: mobileTheme.radius.scene,
    minHeight: 188,
    overflow: "hidden",
    position: "relative",
  },
  heroContent: {
    flex: 1,
    justifyContent: "space-between",
    padding: 18,
  },
  heroCopy: {
    gap: 6,
  },
  heroImage: {
    borderRadius: mobileTheme.radius.scene,
  },
  heroKicker: {
    color: "rgba(245, 247, 241, 0.72)",
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.52)",
  },
  heroTimeline: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: 16,
    lineHeight: 22,
  },
  metaGroup: {
    gap: 7,
  },
  metaLine: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  pressable: {
    borderRadius: mobileTheme.radius.card,
  },
  pressablePressed: {
    transform: [{ translateY: 1.5 }, { scale: 0.992 }],
  },
});
