import { Pressable, StyleSheet, Text, View } from "react-native";

import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { getEventCoverSource } from "@/features/events/event-visuals";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import type { StudentEventSummary } from "@/features/events/types";

type EventCardProps = {
  event: StudentEventSummary;
  onPress: () => void;
  motionIndex?: number;
};

const createDateTimeFormatter = (localeTag: string): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(localeTag, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

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

export const EventCard = ({ event, onPress, motionIndex }: EventCardProps) => {
  const { language, localeTag } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const timeFormatter = createDateTimeFormatter(localeTag);
  const timelineBadge = getTimelineBadge(event, language);
  const registrationBadge = getRegistrationBadge(event, language);
  const coverSource = getEventCoverSource(event.coverImageUrl, `${event.id}:${event.name}`);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed ? styles.pressablePressed : null]}
    >
      <InfoCard motionIndex={motionIndex} title={event.name}>
        <CoverImageSurface imageStyle={styles.heroImage} source={coverSource} style={styles.heroBand}>
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <View style={styles.badges}>
              <StatusBadge label={timelineBadge.label} state={timelineBadge.state} />
              <StatusBadge label={registrationBadge.label} state={registrationBadge.state} />
            </View>

            <View style={styles.heroCopy}>
              <Text style={styles.heroTimeline}>{timeFormatter.format(new Date(event.startAt))}</Text>
            </View>
          </View>
        </CoverImageSurface>

        <View style={styles.metaGroup}>
          <Text style={styles.metaLine}>
            {event.city}
            {event.country.length > 0 ? ` · ${event.country}` : ""}
          </Text>
          <Text style={styles.metaLine}>
            {language === "fi" ? "Ilmoittautuminen" : "Join before"}{" "}
            {timeFormatter.format(new Date(event.joinDeadlineAt))}
            {event.maxParticipants === null
              ? ""
              : language === "fi"
                ? ` · ${event.maxParticipants} henkeä`
                : ` · cap ${event.maxParticipants}`}
          </Text>
          {event.minimumStampsRequired > 0 ? (
            <Text style={styles.metaLine}>
              {language === "fi"
                ? `${event.minimumStampsRequired} leimaa ennen palkintoja`
                : `${event.minimumStampsRequired} leima needed before rewards unlock`}
            </Text>
          ) : null}
        </View>

        <View style={styles.actionRow}>
          <Text style={styles.actionText}>{language === "fi" ? "Avaa tapahtuma" : "Open event"}</Text>
        </View>
      </InfoCard>
    </Pressable>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
  actionRow: {
    gap: 0,
  },
  actionText: {
    color: theme.colors.lime,
    fontFamily: theme.typography.families.bold,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  heroBand: {
    borderRadius: theme.radius.scene,
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
    gap: 0,
  },
  heroImage: {
    borderRadius: theme.radius.scene,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.mode === "dark" ? "rgba(0, 0, 0, 0.56)" : "rgba(7, 10, 7, 0.54)",
  },
  heroTimeline: {
    color: "#F8FAF5",
    fontFamily: theme.typography.families.bold,
    fontSize: 16,
    lineHeight: 22,
  },
  metaGroup: {
    gap: 7,
  },
  metaLine: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.families.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  pressable: {
    borderRadius: theme.radius.card,
  },
  pressablePressed: {
    transform: [{ translateY: 1.5 }, { scale: 0.992 }],
  },
});
