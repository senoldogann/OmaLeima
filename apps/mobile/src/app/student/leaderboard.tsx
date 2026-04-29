import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useIsFocused } from "@react-navigation/native";

import { AppScreen } from "@/components/app-screen";
import { AppIcon } from "@/components/app-icon";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { LeaderboardEntryCard } from "@/features/leaderboard/components/leaderboard-entry-card";
import type { MobileTheme } from "@/features/foundation/theme";
import { interactiveSurfaceShadowStyle } from "@/features/foundation/theme";
import {
  hydrateRegisteredLeaderboardEvents,
  selectDefaultLeaderboardEvent,
  useEventLeaderboardQuery,
  useStudentLeaderboardOverviewQuery,
} from "@/features/leaderboard/student-leaderboard";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useStudentEventLeaderboardRealtime } from "@/features/realtime/student-realtime";
import { useSession } from "@/providers/session-provider";
import { useActiveAppState, useCurrentTime } from "@/features/qr/student-qr";

const createDateTimeFormatter = (localeTag: string): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(localeTag, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const getFreshnessBadge = (
  refreshedAt: string | null,
  language: "fi" | "en"
): { label: string; state: "ready" | "pending" } =>
  refreshedAt === null
    ? { label: language === "fi" ? "päivitys odottaa" : "refresh pending", state: "pending" }
    : { label: language === "fi" ? "päivitetty" : "refreshed", state: "ready" };

const getPodiumHeight = (rank: number): number => {
  if (rank === 1) return 166;
  if (rank === 2) return 134;
  return 118;
};

const getPodiumInitials = (value: string | null, rank: number): string => {
  const source = value?.trim() ?? `Student ${rank}`;
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return `${rank}`;
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

const createLeaderboardHeroLabel = (
  selectedEventName: string | null,
  top10Count: number,
  currentRank: number | null,
  language: "fi" | "en"
): string => {
  if (selectedEventName === null) {
    return language === "fi"
      ? "Valitse tapahtuma nähdäksesi tilanteen."
      : "Choose an event to see the live standings.";
  }

  if (top10Count === 0) {
    return language === "fi"
      ? `${selectedEventName} on käynnissä, mutta lista on vielä tyhjä.`
      : `${selectedEventName} is live, but the standings are still empty.`;
  }

  if (currentRank !== null) {
    return language === "fi"
      ? `${selectedEventName} on käynnissä. Sijoituksesi on nyt #${currentRank}.`
      : `${selectedEventName} top 10 is live. Your current place is #${currentRank}.`;
  }

  return language === "fi"
    ? `${selectedEventName} top 10 on nyt auki.`
    : `${selectedEventName} top 10 is live now.`;
};

export default function StudentLeaderboardScreen() {
  const isFocused = useIsFocused();
  const isAppActive = useActiveAppState();
  const { session } = useSession();
  const { copy, language, localeTag } = useUiPreferences();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const formatter = useMemo(() => createDateTimeFormatter(localeTag), [localeTag]);
  const now = useCurrentTime(isFocused && isAppActive);
  const studentId = session?.user.id ?? null;
  const overviewQuery = useStudentLeaderboardOverviewQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null,
  });
  const overviewData = overviewQuery.data;
  const events = useMemo(
    () => hydrateRegisteredLeaderboardEvents(overviewData?.events ?? [], now),
    [now, overviewData]
  );
  const registeredEventCount = overviewData?.registeredEventCount ?? 0;
  const defaultEvent = useMemo(() => selectDefaultLeaderboardEvent(events), [events]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedEventId === null && defaultEvent !== null) {
      setSelectedEventId(defaultEvent.id);
      return;
    }

    if (selectedEventId !== null && !events.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(defaultEvent?.id ?? null);
    }
  }, [defaultEvent, events, selectedEventId]);

  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ?? defaultEvent ?? null;

  const leaderboardQuery = useEventLeaderboardQuery({
    eventId: selectedEvent?.id ?? "",
    studentId: studentId ?? "",
    isEnabled: selectedEvent !== null && studentId !== null,
  });

  useStudentEventLeaderboardRealtime({
    eventId: selectedEvent?.id ?? "",
    studentId: studentId ?? "",
    isEnabled: selectedEvent !== null && studentId !== null && isFocused && isAppActive,
  });

  const top10 = leaderboardQuery.data?.top10 ?? [];
  const currentUser = leaderboardQuery.data?.currentUser ?? null;
  const podiumEntries = top10.slice(0, 3);
  const standingsEntries = top10.slice(3);
  const leaderboardRefreshedAt = leaderboardQuery.data?.refreshedAt ?? null;
  const freshness = getFreshnessBadge(leaderboardRefreshedAt, language);
  const heroLabel = createLeaderboardHeroLabel(selectedEvent?.name ?? null, top10.length, currentUser?.rank ?? null, language);

  const overviewState = overviewQuery.error
    ? "error"
    : overviewQuery.isLoading
      ? "loading"
      : events.length === 0
        ? "empty"
        : "ready";
  const rankingState =
    selectedEvent === null
      ? "idle"
      : leaderboardQuery.error
        ? "error"
        : leaderboardQuery.isLoading
          ? "loading"
          : top10.length === 0
            ? "empty"
            : "ready";

  return (
    <AppScreen>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>{copy.common.leaderboard}</Text>
        <Text style={styles.metaText}>{copy.student.leaderboardMeta}</Text>
      </View>

      {overviewState !== "ready" ? (
        <InfoCard
          eyebrow={overviewState === "error" ? copy.common.error : overviewState === "loading" ? copy.common.loading : copy.common.standby}
          title={
            overviewState === "error"
              ? language === "fi"
                ? "Tulostaulua ei voitu avata"
                : "Could not open leaderboard"
              : overviewState === "loading"
                ? language === "fi"
                  ? "Avataan tulostaulua"
                  : "Opening leaderboard"
                : language === "fi"
                  ? "Ei tulostaulua vielä"
                  : "No leaderboard event ready"
          }
        >
          {overviewState === "error" ? (
            <Text selectable style={styles.bodyText}>{overviewQuery.error?.message}</Text>
          ) : overviewState === "loading" ? (
            <Text selectable style={styles.bodyText}>
              {language === "fi"
                ? "Ladataan ilmoittautumiset ja valitaan sopivin tapahtuma."
                : "Loading registered events and choosing the most relevant scope."}
            </Text>
          ) : (
            <Text selectable style={styles.bodyText}>
              {registeredEventCount === 0
                ? language === "fi"
                  ? "Liity ensin tapahtumaan. Julkinen tulostaulu näkyy täällä, kun sellainen on käytössä."
                  : "Join an event first. Once you are registered for a public event, its leaderboard appears here."
                : language === "fi"
                  ? "Sinulla on ilmoittautumisia, mutta mikään niistä ei julkaise tulostaulua juuri nyt."
                  : "You still have registrations, but none of those events expose a public leaderboard right now."}
            </Text>
          )}
        </InfoCard>
      ) : null}

      {events.length > 0 ? (
        <>
          <View style={styles.heroBand}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>{copy.student.liveStandings}</Text>
              <Text style={styles.heroTitle}>{selectedEvent?.name ?? copy.common.leaderboard}</Text>
              <Text style={styles.heroMeta}>{heroLabel}</Text>
            </View>

            <View style={styles.badges}>
              {selectedEvent ? (
                <StatusBadge
                  label={
                    selectedEvent.timelineState === "ACTIVE"
                      ? language === "fi"
                        ? "käynnissä"
                        : "active"
                      : selectedEvent.timelineState === "UPCOMING"
                        ? language === "fi"
                          ? "tulossa"
                          : "upcoming"
                        : language === "fi"
                          ? "päättynyt"
                          : "completed"
                  }
                  state={
                    selectedEvent.timelineState === "ACTIVE"
                      ? "ready"
                      : selectedEvent.timelineState === "UPCOMING"
                        ? "pending"
                        : "warning"
                  }
                />
              ) : null}
              <StatusBadge label={freshness.label} state={freshness.state} />
            </View>
          </View>

          <View style={styles.eventSelectorSection}>
            <View style={styles.eventSelectorHeader}>
              <Text style={styles.sectionKicker}>{copy.student.chooseEvent}</Text>
              {leaderboardRefreshedAt !== null ? (
                <Text style={styles.eventSelectorMeta}>
                  {language === "fi" ? "Päivitetty" : "Refreshed"} {formatter.format(new Date(leaderboardRefreshedAt))}
                </Text>
              ) : null}
            </View>

            <ScrollView
              contentContainerStyle={styles.eventSelector}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {events.map((event) => (
                <Pressable
                  key={event.id}
                  onPress={() => setSelectedEventId(event.id)}
                  style={[
                    styles.eventChip,
                    selectedEvent?.id === event.id ? styles.selectedEventChip : null,
                  ]}
                >
                  <Text style={styles.eventChipTitle}>{event.name}</Text>
                  <View style={styles.eventChipRow}>
                    <Text style={styles.eventChipMeta}>
                      {event.timelineState === "ACTIVE"
                        ? language === "fi"
                          ? "käynnissä"
                          : "active"
                        : event.timelineState === "UPCOMING"
                          ? language === "fi"
                            ? "tulossa"
                            : "upcoming"
                          : language === "fi"
                            ? "päättynyt"
                            : "completed"}
                    </Text>
                    <AppIcon color={theme.colors.textMuted} name="chevron-right" size={14} />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </>
      ) : null}

      {rankingState === "loading" || rankingState === "error" || rankingState === "empty" ? (
        <InfoCard
          eyebrow={rankingState === "error" ? copy.common.error : rankingState === "loading" ? copy.common.loading : copy.common.standby}
          title={
            rankingState === "error"
              ? language === "fi"
                ? "Sijoitusta ei voitu ladata"
                : "Could not load ranking"
              : rankingState === "loading"
                ? language === "fi"
                  ? "Ladataan sijoitusta"
                  : "Loading ranking"
                : language === "fi"
                  ? "Lista on vielä tyhjä"
                  : "Standings are still empty"
          }
        >
          <Text style={styles.bodyText}>
            {rankingState === "error"
              ? leaderboardQuery.error?.message ?? ""
              : rankingState === "loading"
                ? language === "fi"
                  ? "Haetaan tämän tapahtuman top 10."
                  : "Fetching the live top 10 for this event."
                : language === "fi"
                  ? "Tähän tapahtumaan ei ole vielä kertynyt näkyviä sijoituksia."
                  : "No visible leaderboard entries yet for this event."}
          </Text>
        </InfoCard>
      ) : null}

      {rankingState === "ready" ? (
        <>
          {podiumEntries.length > 0 ? (
            <View style={styles.podiumSection}>
              <Text style={styles.sectionKicker}>{language === "fi" ? "Podium" : "Podium"}</Text>
              <View style={styles.podiumRow}>
                {[1, 0, 2].map((podiumIndex) => {
                  const entry = podiumEntries[podiumIndex] ?? null;

                  if (entry === null) {
                    return <View key={`empty-${podiumIndex}`} style={styles.podiumSpacer} />;
                  }

                  return (
                    <View key={entry.studentId} style={[styles.podiumCard, { height: getPodiumHeight(entry.rank) }]}>
                      <View style={styles.podiumBadge}>
                        <Text style={styles.podiumBadgeText}>{entry.rank}</Text>
                      </View>
                      <View style={styles.podiumAvatar}>
                        <Text style={styles.podiumAvatarText}>
                          {getPodiumInitials(entry.displayName, entry.rank)}
                        </Text>
                      </View>
                      <Text numberOfLines={1} style={styles.podiumName}>
                        {entry.displayName ?? (language === "fi" ? "Opiskelija" : "Student")}
                      </Text>
                      <Text style={styles.podiumScore}>{entry.stampCount}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {currentUser ? (
            <View style={styles.currentUserBlock}>
              <Text style={styles.sectionKicker}>{language === "fi" ? "Sinun tilanteesi" : "Your position"}</Text>
              <LeaderboardEntryCard entry={currentUser} isCurrentUser />
            </View>
          ) : null}

          {standingsEntries.length > 0 ? (
            <View style={styles.standingsBlock}>
              <Text style={styles.sectionKicker}>{language === "fi" ? "Muut sijoitukset" : "Standings"}</Text>
              <View style={styles.standingsList}>
                {standingsEntries.map((entry) => (
                  <LeaderboardEntryCard
                    entry={entry}
                    isCurrentUser={currentUser?.studentId === entry.studentId}
                    key={entry.studentId}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    badges: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    currentUserBlock: {
      gap: 10,
    },
    eventChip: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      gap: 8,
      minWidth: 180,
      padding: 14,
    },
    eventChipMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    eventChipRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    eventChipTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    eventSelector: {
      gap: 10,
      paddingRight: 8,
    },
    eventSelectorHeader: {
      gap: 4,
    },
    eventSelectorMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    eventSelectorSection: {
      gap: 12,
    },
    heroBand: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.scene,
      borderWidth: 1,
      gap: 14,
      padding: 18,
      ...interactiveSurfaceShadowStyle,
    },
    heroCopy: {
      gap: 6,
    },
    heroEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.1,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    heroMeta: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    heroTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      maxWidth: 320,
    },
    podiumAvatar: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL4,
      borderColor: theme.colors.limeBorder,
      borderRadius: 999,
      borderWidth: 1,
      height: 58,
      justifyContent: "center",
      width: 58,
    },
    podiumAvatarText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    podiumBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      height: 36,
      justifyContent: "center",
      position: "absolute",
      right: 12,
      top: 12,
      width: 36,
    },
    podiumBadgeText: {
      color: theme.colors.screenBase,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
    },
    podiumCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.scene,
      borderWidth: 1,
      flex: 1,
      justifyContent: "flex-end",
      paddingBottom: 16,
      paddingHorizontal: 12,
      position: "relative",
    },
    podiumName: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      marginTop: 10,
      maxWidth: "100%",
    },
    podiumRow: {
      alignItems: "flex-end",
      flexDirection: "row",
      gap: 10,
    },
    podiumScore: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
      marginTop: 4,
    },
    podiumSection: {
      gap: 12,
    },
    podiumSpacer: {
      flex: 1,
    },
    screenHeader: {
      gap: 6,
    },
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    sectionKicker: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.1,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    selectedEventChip: {
      borderColor: theme.colors.limeBorder,
      backgroundColor: theme.colors.limeSurface,
    },
    standingsBlock: {
      gap: 10,
    },
    standingsList: {
      gap: 10,
    },
  });
