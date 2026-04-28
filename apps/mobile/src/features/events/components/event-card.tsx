import { Pressable, StyleSheet, Text, View } from "react-native";

import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
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

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed ? styles.pressablePressed : null]}
    >
      <InfoCard eyebrow={event.city} motionIndex={motionIndex} title={event.name}>
        <View style={styles.badges}>
          <StatusBadge label={timelineBadge.label} state={timelineBadge.state} />
          <StatusBadge label={registrationBadge.label} state={registrationBadge.state} />
        </View>

        <Text style={styles.description}>
          {event.description ?? "Event description will be added by the organizer."}
        </Text>

        <View style={styles.metaGroup}>
          <Text style={styles.metaLine}>
            {formatDateTime(event.startAt)} - {formatDateTime(event.endAt)}
          </Text>
          <Text style={styles.metaLine}>{formatDeadline(event)}</Text>
          <Text style={styles.metaLine}>{formatCapacity(event)}</Text>
          <Text style={styles.metaLine}>Minimum leimat required: {event.minimumStampsRequired}</Text>
        </View>

        <View style={styles.actionRow}>
          <Text style={styles.actionText}>Open event</Text>
          <Text style={styles.actionMeta}>Tap to see venues, rewards, and join rules.</Text>
        </View>
      </InfoCard>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  actionMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  actionRow: {
    gap: 4,
  },
  actionText: {
    color: mobileTheme.colors.accentBlue,
    fontSize: 13,
    fontWeight: "700",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  description: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  metaGroup: {
    gap: 7,
  },
  metaLine: {
    color: mobileTheme.colors.textMuted,
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
