import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useIsFocused } from "@react-navigation/native";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { getEventCoverSource } from "@/features/events/event-visuals";
import { LeaderboardEntryCard } from "@/features/leaderboard/components/leaderboard-entry-card";
import type { MobileTheme } from "@/features/foundation/theme";
import {
  hydrateRegisteredLeaderboardEvents,
  selectDefaultLeaderboardEvent,
  useEventLeaderboardQuery,
  useStudentLeaderboardOverviewQuery,
} from "@/features/leaderboard/student-leaderboard";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { StudentProfileHeaderAction } from "@/features/profile/components/student-profile-header-action";
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

const createDateFormatter = (localeTag: string): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(localeTag, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

type LeaderboardDateFilter = "ALL" | string;

type LeaderboardDateFilterOption = {
  count: number;
  key: LeaderboardDateFilter;
  label: string;
};

const createLocalDateKey = (isoDate: string): string => {
  const value = new Date(isoDate);
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const createDateFilterOptions = (
  events: {
    startAt: string;
  }[],
  language: "fi" | "en",
  formatter: Intl.DateTimeFormat
): LeaderboardDateFilterOption[] => {
  const seenKeys = new Set<string>();
  const options: LeaderboardDateFilterOption[] = [
    {
      count: events.length,
      key: "ALL",
      label: language === "fi" ? "Kaikki päivät" : "All dates",
    },
  ];

  for (const event of events) {
    const dateKey = createLocalDateKey(event.startAt);

    if (seenKeys.has(dateKey)) {
      continue;
    }

    seenKeys.add(dateKey);
    options.push({
      count: events.filter((candidate) => createLocalDateKey(candidate.startAt) === dateKey).length,
      key: dateKey,
      label: formatter.format(new Date(event.startAt)),
    });
  }

  return options;
};

const getFreshnessBadge = (
  refreshedAt: string | null,
  language: "fi" | "en"
): { label: string; state: "ready" | "pending" } =>
  refreshedAt === null
    ? { label: language === "fi" ? "päivitys odottaa" : "refresh pending", state: "pending" }
    : { label: language === "fi" ? "päivitetty" : "refreshed", state: "ready" };

const createEventChipMeta = (
  language: "fi" | "en",
  dateFormatter: Intl.DateTimeFormat,
  timeFormatter: Intl.DateTimeFormat,
  event: {
    city: string;
    country: string;
    endAt: string;
    startAt: string;
    timelineState: "ACTIVE" | "UPCOMING" | "COMPLETED";
  }
): string => {
  const location = event.country.length > 0 ? `${event.city} · ${event.country}` : event.city;

  if (event.timelineState === "COMPLETED") {
    return language === "fi"
      ? `${location} · päättyi ${dateFormatter.format(new Date(event.endAt))}`
      : `${location} · ended ${dateFormatter.format(new Date(event.endAt))}`;
  }

  return `${location} · ${timeFormatter.format(new Date(event.startAt))}`;
};

export default function StudentLeaderboardScreen() {
  const isFocused = useIsFocused();
  const isAppActive = useActiveAppState();
  const { session } = useSession();
  const { copy, language, localeTag } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const formatter = useMemo(() => createDateTimeFormatter(localeTag), [localeTag]);
  const dateFormatter = useMemo(() => createDateFormatter(localeTag), [localeTag]);
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
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState<LeaderboardDateFilter>("ALL");
  const dateFilterOptions = useMemo(
    () => createDateFilterOptions(events, language, dateFormatter),
    [dateFormatter, events, language]
  );
  const filteredEvents = useMemo(
    () =>
      selectedDateFilter === "ALL"
        ? events
        : events.filter((event) => createLocalDateKey(event.startAt) === selectedDateFilter),
    [events, selectedDateFilter]
  );
  const defaultEvent = useMemo(() => selectDefaultLeaderboardEvent(filteredEvents), [filteredEvents]);

  useEffect(() => {
    if (!dateFilterOptions.some((option) => option.key === selectedDateFilter)) {
      setSelectedDateFilter("ALL");
    }
  }, [dateFilterOptions, selectedDateFilter]);

  useEffect(() => {
    if (selectedEventId === null && defaultEvent !== null) {
      setSelectedEventId(defaultEvent.id);
      return;
    }

    if (selectedEventId !== null && !filteredEvents.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(defaultEvent?.id ?? null);
    }
  }, [defaultEvent, filteredEvents, selectedEventId]);

  const selectedEvent =
    filteredEvents.find((event) => event.id === selectedEventId) ?? defaultEvent ?? null;
  const screenMeta =
    events.length === 0
      ? language === "fi"
        ? "Valitse tapahtuma, kun julkinen tulostaulu avautuu."
        : "Choose an event once a public leaderboard becomes available."
      : language === "fi"
        ? `${events.length} tapahtumaa julkaisee tulostaulun`
        : `${events.length} event${events.length === 1 ? "" : "s"} publish standings`;

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
  const leaderboardRefreshedAt = leaderboardQuery.data?.refreshedAt ?? null;
  const freshness = getFreshnessBadge(leaderboardRefreshedAt, language);
  const selectedEventTimelineState = selectedEvent?.timelineState ?? null;
  const currentUserSpotlightTitle =
    currentUser === null
      ? null
      : selectedEventTimelineState === "COMPLETED"
        ? language === "fi"
          ? `Lopullinen sijasi oli #${currentUser.rank}`
          : `You finished at #${currentUser.rank}`
        : selectedEventTimelineState === "UPCOMING"
          ? language === "fi"
            ? `Tallennettu sijasi on #${currentUser.rank}`
            : `Your saved rank is #${currentUser.rank}`
          : language === "fi"
            ? `Sija #${currentUser.rank} juuri nyt`
            : `You are #${currentUser.rank} right now`;
  const overviewErrorBody =
    language === "fi"
      ? "Tulostaulun tapahtumia ei saatu ladattua juuri nyt. Yritä uudelleen hetken kuluttua."
      : "Could not load leaderboard events right now. Try again in a moment.";
  const rankingErrorBody =
    language === "fi"
      ? "Valitun tapahtuman sijoitusta ei saatu ladattua juuri nyt. Yritä uudelleen hetken kuluttua."
      : "Could not load standings for the selected event right now. Try again in a moment.";
  const currentUserSpotlightMeta =
    currentUser === null
      ? null
      : currentUser.lastStampAt === null
        ? selectedEvent?.name ?? null
        : language === "fi"
          ? `Viimeisin leima ${formatter.format(new Date(currentUser.lastStampAt))}`
          : `Latest stamp ${formatter.format(new Date(currentUser.lastStampAt))}`;

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
          : top10.length === 0 && currentUser === null
            ? "empty"
            : "ready";

  return (
    <AppScreen>
      <View style={styles.screenHeaderRow}>
        <View style={styles.screenHeader}>
          <Text style={styles.screenEyebrow}>{language === "fi" ? "Tulostaulut" : "Rankings"}</Text>
          <Text style={styles.screenTitle}>{copy.common.leaderboard}</Text>
          <Text style={styles.screenMeta}>{screenMeta}</Text>
        </View>
        <StudentProfileHeaderAction />
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
            <>
              <Text selectable style={styles.bodyText}>{overviewErrorBody}</Text>
              <Pressable onPress={() => void overviewQuery.refetch()} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>{copy.common.retry}</Text>
              </Pressable>
            </>
          ) : overviewState === "loading" ? (
            <Text selectable style={styles.bodyText}>
              {language === "fi"
                ? "Ladataan julkisia tulostauluja ja omaa tilannetta."
                : "Loading public leaderboards and your own ranking context."}
            </Text>
          ) : (
            <Text selectable style={styles.bodyText}>
              {registeredEventCount === 0
                ? language === "fi"
                  ? "Yhtaan julkista tulostaulua ei ole saatavilla juuri nyt."
                  : "No public leaderboard is available right now."
                : language === "fi"
                  ? "Sinulla on ilmoittautumisia, mutta mikään niistä ei julkaise tulostaulua juuri nyt."
                  : "You still have registrations, but none of those events expose a public leaderboard right now."}
            </Text>
          )}
        </InfoCard>
      ) : null}

      {events.length > 0 ? (
        <>
          <View style={styles.eventSelectorSection}>
            <View style={styles.eventSelectorHeader}>
              <View style={styles.selectorHeaderTop}>
                {selectedEvent !== null ? (
                  <Text style={styles.selectorEventTitle}>{selectedEvent.name}</Text>
                ) : (
                  <Text style={styles.selectorEventTitle}>{copy.student.chooseEvent}</Text>
                )}
                {selectedEvent !== null ? (
                  <View style={styles.selectorBadgeRow}>
                    <StatusBadge
                      label={
                        selectedEvent.timelineState === "ACTIVE"
                          ? language === "fi" ? "käynnissä" : "active"
                          : selectedEvent.timelineState === "UPCOMING"
                            ? language === "fi" ? "tulossa" : "upcoming"
                            : language === "fi" ? "päättynyt" : "completed"
                      }
                      state={
                        selectedEvent.timelineState === "ACTIVE"
                          ? "ready"
                          : selectedEvent.timelineState === "UPCOMING"
                            ? "pending"
                            : "warning"
                      }
                    />
                    <StatusBadge label={freshness.label} state={freshness.state} />
                  </View>
                ) : null}
              </View>
            </View>

            {dateFilterOptions.length > 2 ? (
              <ScrollView
                contentContainerStyle={styles.dateFilterRow}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {dateFilterOptions.map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => setSelectedDateFilter(option.key)}
                    style={[
                      styles.dateChip,
                      selectedDateFilter === option.key ? styles.selectedDateChip : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateChipText,
                        selectedDateFilter === option.key ? styles.selectedDateChipText : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            <ScrollView
              contentContainerStyle={styles.eventSelector}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {filteredEvents.map((event) => (
                <Pressable
                  key={event.id}
                  onPress={() => setSelectedEventId(event.id)}
                  style={[
                    styles.eventChip,
                    selectedEvent?.id === event.id ? styles.selectedEventChip : null,
                  ]}
                >
                  <CoverImageSurface
                    imageStyle={styles.eventChipImage}
                    source={getEventCoverSource(event.coverImageUrl, `${event.id}:${event.name}`)}
                    style={styles.eventChipVisual}
                  >
                    <View style={styles.eventChipOverlay} />
                    <View style={styles.eventChipContent}>
                      <StatusBadge
                        label={
                          event.timelineState === "ACTIVE"
                            ? language === "fi"
                              ? "käynnissä"
                              : "active"
                            : event.timelineState === "UPCOMING"
                              ? language === "fi"
                                ? "tulossa"
                                : "upcoming"
                              : language === "fi"
                                ? "päättynyt"
                                : "completed"
                        }
                        state={
                          event.timelineState === "ACTIVE"
                            ? "ready"
                            : event.timelineState === "UPCOMING"
                              ? "pending"
                              : "warning"
                        }
                      />
                      <View style={styles.eventChipFooter}>
                        <Text numberOfLines={2} style={styles.eventChipTitle}>{event.name}</Text>
                        <Text style={styles.eventChipMeta}>
                          {createEventChipMeta(language, dateFormatter, formatter, event)}
                        </Text>
                      </View>
                    </View>
                  </CoverImageSurface>
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
              ? rankingErrorBody
              : rankingState === "loading"
                ? language === "fi"
                  ? "Haetaan tämän tapahtuman top 10."
                  : "Fetching the live top 10 for this event."
                : language === "fi"
                  ? "Tähän tapahtumaan ei ole vielä kertynyt näkyviä sijoituksia."
                  : "No visible leaderboard entries yet for this event."}
          </Text>
          {rankingState === "error" ? (
            <Pressable onPress={() => void leaderboardQuery.refetch()} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>{copy.common.retry}</Text>
            </Pressable>
          ) : null}
        </InfoCard>
      ) : null}

      {rankingState === "ready" ? (
        <>
          {top10.length > 0 ? (
            <View style={styles.standingsBlock}>
              <View style={styles.standingsList}>
                {top10.map((entry) => (
                  <LeaderboardEntryCard
                    entry={entry}
                    isCurrentUser={currentUser?.studentId === entry.studentId}
                    key={entry.studentId}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {currentUser !== null && !top10.some((e) => e.studentId === currentUser.studentId) ? (
            <View style={styles.currentUserBlock}>
              <View style={styles.currentUserContent}>
                <View style={styles.currentUserHeader}>
                  <View style={styles.currentUserHeaderCopy}>
                    <Text style={styles.currentUserKicker}>{language === "fi" ? "Sinun sijasi" : "Your rank"}</Text>
                    {currentUserSpotlightTitle ? <Text style={styles.currentUserTitle}>{currentUserSpotlightTitle}</Text> : null}
                  </View>
                  <View style={styles.currentUserStampPill}>
                    <Text style={styles.currentUserStampPillText}>
                      {currentUser.stampCount} {language === "fi" ? "leimaa" : "stamps"}
                    </Text>
                  </View>
                </View>
                {currentUserSpotlightMeta ? <Text style={styles.currentUserMeta}>{currentUserSpotlightMeta}</Text> : null}
                <LeaderboardEntryCard entry={currentUser} isCurrentUser />
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
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    dateChip: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    dateChipText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    dateFilterRow: {
      gap: 8,
      paddingRight: 8,
    },
    currentUserBlock: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.limeBorder,
      borderRadius: theme.radius.scene,
      borderWidth: theme.mode === "light" ? 1 : 0,
      overflow: "hidden",
      position: "relative",
    },
    currentUserContent: {
      gap: 12,
      padding: 18,
    },
    currentUserHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    currentUserHeaderCopy: {
      flex: 1,
      gap: 4,
    },
    currentUserKicker: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.1,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    currentUserMeta: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
      maxWidth: 320,
    },
    currentUserStampPill: {
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    currentUserStampPillText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textTransform: "uppercase",
    },
    currentUserTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    eventChip: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      minWidth: 228,
      overflow: "hidden",
    },
    eventChipContent: {
      flex: 1,
      justifyContent: "space-between",
      padding: 14,
    },
    eventChipFooter: {
      gap: 4,
    },
    eventChipImage: {
      borderRadius: theme.radius.card,
    },
    eventChipMeta: {
      color: "#E6ECE0",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    eventChipOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.mode === "dark" ? "rgba(3, 7, 4, 0.52)" : "rgba(4, 8, 5, 0.46)",
    },
    eventChipTitle: {
      color: "#F8FAF5",
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    eventChipVisual: {
      minHeight: 164,
      position: "relative",
    },
    eventSelector: {
      gap: 10,
      paddingRight: 8,
    },
    eventSelectorHeader: {
      gap: 8,
    },
    eventSelectorSection: {
      gap: 12,
    },
    selectedDateChip: {
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
    },
    selectedDateChipText: {
      color: theme.colors.lime,
    },
    selectorHeaderTop: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "space-between",
    },
    selectorBadgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    selectorEventTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      letterSpacing: -0.3,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    screenEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.4,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    screenHeader: {
      flex: 1,
      gap: 6,
    },
    screenHeaderRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    screenMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    retryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      justifyContent: "center",
      minHeight: 40,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    retryButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    selectedEventChip: {
      borderColor: theme.colors.limeBorder,
      transform: [{ translateY: -1 }],
    },
    standingsBlock: {
      gap: 10,
    },
    standingsList: {
      gap: 10,
    },
  });
