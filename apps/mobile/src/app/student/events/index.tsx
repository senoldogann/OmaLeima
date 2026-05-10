import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useIsFocused } from "@react-navigation/native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { EmptyStateCard } from "@/components/empty-state-card";
import { InfoCard } from "@/components/info-card";
import { MobileRoleSwitchCard } from "@/features/auth/components/mobile-role-switch-card";
import { EventCard } from "@/features/events/components/event-card";
import { StudentEventVenueMap } from "@/features/events/components/student-event-venue-map";
import { prefetchEventCoverUrls } from "@/features/events/event-visuals";
import { findOverlappingEvents } from "@/features/events/event-overlaps";
import type { MobileTheme } from "@/features/foundation/theme";
import { useJoinEventMutation, useStudentEventDetailQuery } from "@/features/events/student-event-detail";
import { rehydrateStudentEventsBuckets, useStudentEventsQuery } from "@/features/events/student-events";
import type { JoinEventResultStatus, StudentEventSummary } from "@/features/events/types";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useStudentRewardOverviewQuery } from "@/features/rewards/student-rewards";
import { useActiveAppState, useCurrentTime } from "@/features/qr/student-qr";
import { createUserSafeErrorMessage } from "@/features/foundation/user-safe-error";
import { useManualRefresh } from "@/features/foundation/use-manual-refresh";
import { useSession } from "@/providers/session-provider";

type ActionNotice = {
  body: string;
  title: string;
};

const createJoinActionNotice = (status: JoinEventResultStatus, language: "fi" | "en"): ActionNotice | null => {
  if (status === "SUCCESS" || status === "ALREADY_REGISTERED") {
    return null;
  }

  const notices: Record<Exclude<JoinEventResultStatus, "SUCCESS" | "ALREADY_REGISTERED">, ActionNotice> = {
    ACTOR_NOT_ALLOWED: {
      body:
        language === "fi"
          ? "Tällä tilillä ei ole oikeutta liittyä tapahtumaan."
          : "This account is not allowed to join the event.",
      title: language === "fi" ? "Liittyminen estetty" : "Registration blocked",
    },
    AUTH_REQUIRED: {
      body:
        language === "fi"
          ? "Kirjaudu sisään uudelleen ja yritä sitten uudestaan."
          : "Sign in again and then try one more time.",
      title: language === "fi" ? "Kirjautuminen vaaditaan" : "Sign-in required",
    },
    EVENT_FULL: {
      body: language === "fi" ? "Tapahtuma on saavuttanut kapasiteettinsa." : "The event has reached capacity.",
      title: language === "fi" ? "Tapahtuma täynnä" : "Event is full",
    },
    EVENT_NOT_FOUND: {
      body:
        language === "fi"
          ? "Tapahtumaa ei löytynyt enää. Päivitä lista ja yritä uudelleen."
          : "The event could not be found anymore. Refresh the list and try again.",
      title: language === "fi" ? "Tapahtuma puuttuu" : "Event not found",
    },
    EVENT_NOT_AVAILABLE: {
      body:
        language === "fi"
          ? "Tapahtuma ei ole enää avoin ilmoittautumiselle."
          : "This event is no longer available for registration.",
      title: language === "fi" ? "Ilmoittautuminen suljettu" : "Registration closed",
    },
    EVENT_REGISTRATION_CLOSED: {
      body:
        language === "fi"
          ? "Liittymisaika tai tapahtuman aloitus on jo mennyt."
          : "The join deadline or event start time has already passed.",
      title: language === "fi" ? "Liittymisaika päättynyt" : "Join window closed",
    },
    PROFILE_NOT_ACTIVE: {
      body:
        language === "fi"
          ? "Opiskelijaprofiili ei ole aktiivinen. Tarkista profiilin tila."
          : "The student profile is not active. Check the profile status first.",
      title: language === "fi" ? "Profiili ei ole aktiivinen" : "Profile is not active",
    },
    PROFILE_NOT_FOUND: {
      body:
        language === "fi"
          ? "Opiskelijaprofiilia ei löytynyt. Avaa profiili ja tarkista tiedot."
          : "The student profile could not be found. Open your profile and verify your details.",
      title: language === "fi" ? "Profiilia ei löytynyt" : "Profile not found",
    },
    ROLE_NOT_ALLOWED: {
      body:
        language === "fi"
          ? "Tämä rooli ei voi liittyä tapahtumaan."
          : "This role is not allowed to join the event.",
      title: language === "fi" ? "Rooli ei kelpaa" : "Role not allowed",
    },
    STUDENT_BANNED: {
      body:
        language === "fi"
          ? "Tällä profiililla ei voi liittyä tähän tapahtumaan."
          : "This profile is restricted for this event.",
      title: language === "fi" ? "Liittyminen estetty" : "Registration blocked",
    },
  };

  return (
    notices[status] ?? {
      body: language === "fi" ? `Palautuskoodi ${status}.` : `Registration returned ${status}.`,
      title: language === "fi" ? "Liittyminen epäonnistui" : "Could not join event",
    }
  );
};

const createErrorNotice = (error: unknown, language: "fi" | "en"): ActionNotice => ({
  body: createUserSafeErrorMessage(error, language, "action"),
  title: language === "fi" ? "Toiminto epäonnistui" : "Action failed",
});

const canShowJoinAction = (event: StudentEventSummary): boolean =>
  event.timelineState === "UPCOMING" && event.registrationState === "NOT_REGISTERED";

const eventCountdownWindowMs = 60 * 60 * 1000;

const createCountdownLabel = (
  event: StudentEventSummary,
  now: number,
  language: "fi" | "en"
): string | null => {
  if (event.registrationState !== "REGISTERED" || event.timelineState !== "UPCOMING") {
    return null;
  }

  const remainingMs = new Date(event.startAt).getTime() - now;

  if (remainingMs <= 0 || remainingMs > eventCountdownWindowMs) {
    return null;
  }

  const remainingMinutes = Math.max(Math.ceil(remainingMs / 60000), 1);
  const remainingHours = Math.floor(remainingMinutes / 60);
  const minuteRemainder = remainingMinutes % 60;

  if (remainingHours >= 1 && minuteRemainder > 0) {
    return language === "fi"
      ? `Alkaa ${remainingHours} t ${minuteRemainder} min`
      : `Starts in ${remainingHours}h ${minuteRemainder}m`;
  }

  if (remainingHours >= 1) {
    return language === "fi"
      ? `Alkaa ${remainingHours} tunnin päästä`
      : `Starts in ${remainingHours} ${remainingHours === 1 ? "hour" : "hours"}`;
  }

  return language === "fi"
    ? `Alkaa ${remainingMinutes} min päästä`
    : `Starts in ${remainingMinutes} min`;
};

export default function StudentEventsScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const isAppActive = useActiveAppState();
  const { session } = useSession();
  const { copy, language } = useUiPreferences();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const now = useCurrentTime(isFocused && isAppActive);
  const studentId = session?.user.id ?? null;
  const [mapPreviewEvent, setMapPreviewEvent] = useState<StudentEventSummary | null>(null);
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const [pendingJoinEventId, setPendingJoinEventId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "registered" | "active">("all");
  const eventsQuery = useStudentEventsQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null,
  });
  const rewardOverviewQuery = useStudentRewardOverviewQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null,
  });
  const refetchEventSurfaceAsync = useCallback(
    async (): Promise<void> => {
      await Promise.all([eventsQuery.refetch(), rewardOverviewQuery.refetch()]);
    },
    [eventsQuery, rewardOverviewQuery]
  );
  const manualRefresh = useManualRefresh(refetchEventSurfaceAsync);
  const joinMutation = useJoinEventMutation();
  const venueMapQuery = useStudentEventDetailQuery({
    eventId: mapPreviewEvent?.id ?? "",
    studentId: studentId ?? "",
    isEnabled: mapPreviewEvent !== null && studentId !== null,
  });
  const liveEventBuckets = useMemo(
    () =>
      eventsQuery.data === undefined
        ? { activeEvents: [], upcomingEvents: [] }
        : rehydrateStudentEventsBuckets(eventsQuery.data, now),
    [eventsQuery.data, now]
  );
  const activeEvents = liveEventBuckets.activeEvents;
  const upcomingEvents = liveEventBuckets.upcomingEvents;
  const coverImageUrls = useMemo(
    () => [...activeEvents, ...upcomingEvents].map((event) => event.coverImageUrl),
    [activeEvents, upcomingEvents]
  );
  const visibleEvents = useMemo(
    () => [...activeEvents, ...upcomingEvents],
    [activeEvents, upcomingEvents]
  );
  const rewardEventsById = useMemo(
    () => new Map((rewardOverviewQuery.data?.events ?? []).map((event) => [event.id, event] as const)),
    [rewardOverviewQuery.data?.events]
  );
  const hasEvents = activeEvents.length > 0 || upcomingEvents.length > 0;
  const overlappingEvents = useMemo(
    () =>
      findOverlappingEvents(
        visibleEvents.map((event) => ({
          endAt: event.endAt,
          id: event.id,
          name: event.name,
          startAt: event.startAt,
        }))
      ),
    [visibleEvents]
  );
  const registeredOverlappingEvents = useMemo(
    () =>
      overlappingEvents.filter((overlappingEvent) =>
        visibleEvents.some(
          (event) => event.id === overlappingEvent.id && event.registrationState === "REGISTERED"
        )
      ),
    [overlappingEvents, visibleEvents]
  );
  const filteredActive = useMemo(() => {
    let list = activeEvents;
    if (activeFilter === "registered") list = list.filter(e => e.registrationState === "REGISTERED");
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(q));
    }
    return list;
  }, [activeEvents, activeFilter, searchQuery]);

  const filteredUpcoming = useMemo(() => {
    let list = upcomingEvents;
    if (activeFilter === "registered") list = list.filter(e => e.registrationState === "REGISTERED");
    if (activeFilter === "active") return [];
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(q));
    }
    return list;
  }, [upcomingEvents, activeFilter, searchQuery]);

  const openEventDetail = (eventId: string): void => {
    router.push({
      pathname: "/student/events/[eventId]",
      params: { eventId },
    });
  };

  const openVenueMapPreview = (event: StudentEventSummary): void => {
    setMapPreviewEvent(event);
  };

  const joinEventFromCard = async (eventId: string): Promise<boolean> => {
    if (studentId === null || pendingJoinEventId !== null) {
      return false;
    }

    setPendingJoinEventId(eventId);
    setActionNotice(null);

    try {
      const result = await joinMutation.mutateAsync({
        eventId,
        studentId,
      });
      const notice = createJoinActionNotice(result.status, language);
      setActionNotice(notice);

      return notice === null;
    } catch (error) {
      setActionNotice(createErrorNotice(error, language));
      return false;
    } finally {
      setPendingJoinEventId(null);
    }
  };

  useEffect(() => {
    void prefetchEventCoverUrls(coverImageUrls);
  }, [coverImageUrls]);

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      refreshControl={
        <RefreshControl
          onRefresh={manualRefresh.refreshAsync}
          refreshing={manualRefresh.isRefreshing}
          tintColor={theme.colors.lime}
        />
      }
    >
      <View style={styles.appHeader}>
        <View style={styles.headerCopy}>
          <Text style={styles.screenTitle}>Approt</Text>
          <Text style={styles.screenSubtitle}>
            {language === "fi" ? "Tapahtumat ja oikea QR samassa paikassa." : "Events and the right QR in one place."}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel={language === "fi" ? "Ilmoitukset" : "Notifications"}
            onPress={() => router.push("/student/updates")}
            style={styles.headerIconButton}
          >
            <AppIcon color={theme.colors.textPrimary} name="bell" size={20} />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchBar}>
        <AppIcon color={theme.colors.textMuted} name="search" size={16} />
        <TextInput
          onChangeText={setSearchQuery}
          placeholder={language === "fi" ? "Etsi tapahtumia..." : "Search events..."}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.searchInput}
          value={searchQuery}
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery("")} style={styles.searchClearButton}>
            <AppIcon color={theme.colors.textMuted} name="x" size={14} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        contentContainerStyle={styles.chipsContent}
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
      >
        {(["all", "registered", "active"] as const).map((filter) => {
          const isChipActive = activeFilter === filter;
          const label = filter === "all"
            ? (language === "fi" ? "Kaikki" : "All")
            : filter === "registered"
            ? (language === "fi" ? "Liitytty" : "Joined")
            : (language === "fi" ? "Käynnissä" : "Live");
          return (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[styles.chip, isChipActive ? styles.chipActive : styles.chipInactive]}
            >
              {filter === "active" && isChipActive ? (
                <View style={styles.liveDot} />
              ) : null}
              <Text style={[styles.chipText, isChipActive ? styles.chipTextActive : styles.chipTextInactive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <MobileRoleSwitchCard currentArea="student" />

      {eventsQuery.error ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageEyebrow}>{copy.common.error}</Text>
          <Text style={styles.messageTitle}>
            {language === "fi" ? "Tapahtumia ei voitu ladata" : "Could not load events"}
          </Text>
          <Text style={styles.bodyText}>{createUserSafeErrorMessage(eventsQuery.error, language, "events")}</Text>
          <Pressable onPress={() => void eventsQuery.refetch()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>{copy.common.retry}</Text>
          </Pressable>
        </View>
      ) : null}

      {actionNotice !== null ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageEyebrow}>{copy.common.error}</Text>
          <Text style={styles.messageTitle}>{actionNotice.title}</Text>
          <Text style={styles.bodyText}>{actionNotice.body}</Text>
        </View>
      ) : null}

      {registeredOverlappingEvents.length > 1 ? (
        <InfoCard
          eyebrow={language === "fi" ? "Huomio" : "Heads up"}
          title={language === "fi" ? "Samanaikaisia tapahtumia" : "Overlapping events"}
          variant="subtle"
        >
          <Text style={styles.overlappingNoticeText}>
            {language === "fi"
              ? "Jos osallistut useaan tapahtumaan samaan aikaan, avaa oikean tapahtuman QR ennen skannausta. QR kertoo skannerille aina oikean tapahtuman."
              : "If you join overlapping events, open the correct event QR before scanning. The QR always tells the scanner which event to use."}
          </Text>
        </InfoCard>
      ) : null}

      {!eventsQuery.isLoading && !eventsQuery.error && !hasEvents ? (
        <EmptyStateCard
          body={
            language === "fi"
              ? "Kun järjestäjät julkaisevat seuraavan tapahtuman, se ilmestyy tänne."
              : "When organizers publish the next event, it will appear here."
          }
          eyebrow={copy.common.standby}
          iconName="calendar"
          title={language === "fi" ? "Ei aktiivisia tai tulevia tapahtumia" : "No active or upcoming events"}
        />
      ) : null}

      {hasEvents && filteredActive.length === 0 && filteredUpcoming.length === 0 ? (
        <EmptyStateCard
          body={language === "fi" ? "Kokeile eri hakusanaa tai poista suodatin." : "Try a different search or remove the filter."}
          eyebrow={language === "fi" ? "Ei tuloksia" : "No results"}
          iconName="search"
          title={language === "fi" ? "Ei tapahtumia haulle" : "No events found"}
        />
      ) : null}

      {filteredActive.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppIcon color={theme.colors.lime} name="zap" size={14} />
            <Text style={styles.sectionTitle}>{language === "fi" ? "Käynnissä nyt" : "Live now"}</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{filteredActive.length}</Text>
            </View>
          </View>
          {filteredActive.map((event, index) => (
            <EventCard
              countdownLabel={createCountdownLabel(event, now, language)}
              event={event}
              isJoinPending={pendingJoinEventId === event.id}
              key={event.id}
              motionIndex={index + 1}
              onJoinPress={canShowJoinAction(event) ? () => void joinEventFromCard(event.id) : undefined}
              onMapPress={() => openVenueMapPreview(event)}
              onPress={() => openEventDetail(event.id)}
              rewardProgress={rewardEventsById.get(event.id) ?? null}
            />
          ))}
        </View>
      ) : null}

      {filteredUpcoming.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppIcon color={theme.colors.textMuted} name="calendar" size={14} />
            <Text style={styles.sectionTitle}>{language === "fi" ? "Tulossa" : "Upcoming"}</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{filteredUpcoming.length}</Text>
            </View>
          </View>
          {filteredUpcoming.map((event, index) => (
            <EventCard
              countdownLabel={createCountdownLabel(event, now, language)}
              event={event}
              isJoinPending={pendingJoinEventId === event.id}
              key={event.id}
              motionIndex={filteredActive.length + index + 1}
              onJoinPress={() => void joinEventFromCard(event.id)}
              onMapPress={() => openVenueMapPreview(event)}
              onPress={() => openEventDetail(event.id)}
              rewardProgress={rewardEventsById.get(event.id) ?? null}
            />
          ))}
        </View>
      ) : null}

      <Modal
        animationType="fade"
        onRequestClose={() => setMapPreviewEvent(null)}
        transparent
        visible={mapPreviewEvent !== null}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {mapPreviewEvent !== null ? (
              <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.mapModalHeader}>
                  <View style={styles.mapModalCopy}>
                    <Text style={styles.previewEyebrow}>{language === "fi" ? "Tapahtumakartta" : "Event map"}</Text>
                    <Text style={styles.mapModalTitle}>{mapPreviewEvent.name}</Text>
                    <Text style={styles.previewMeta}>
                      {mapPreviewEvent.city}
                      {mapPreviewEvent.country.length > 0 ? ` · ${mapPreviewEvent.country}` : ""}
                    </Text>
                  </View>
                  <Pressable onPress={() => setMapPreviewEvent(null)} style={styles.mapCloseButton}>
                    <AppIcon color={theme.colors.textPrimary} name="x" size={18} />
                  </Pressable>
                </View>

                {venueMapQuery.isLoading ? (
                  <View style={styles.messageCard}>
                    <Text style={styles.messageEyebrow}>{copy.common.loading}</Text>
                    <Text style={styles.bodyText}>
                      {language === "fi" ? "Ladataan tapahtuman pisteitä." : "Loading event venues."}
                    </Text>
                  </View>
                ) : null}

                {venueMapQuery.error ? (
                  <View style={styles.messageCard}>
                    <Text style={styles.messageEyebrow}>{copy.common.error}</Text>
                    <Text style={styles.bodyText}>
                      {createUserSafeErrorMessage(venueMapQuery.error, language, "map")}
                    </Text>
                  </View>
                ) : null}

                {!venueMapQuery.isLoading && !venueMapQuery.error ? (
                  <StudentEventVenueMap venues={venueMapQuery.data?.venues ?? []} />
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
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
    overlappingNoticeText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    appHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    headerCopy: {
      flex: 1,
      gap: 4,
      minWidth: 0,
    },
    chip: {
      alignItems: "center",
      borderRadius: 999,
      borderWidth: 1.5,
      flexDirection: "row",
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    chipActive: {
      backgroundColor: theme.colors.lime,
      borderColor: theme.colors.lime,
    },
    chipInactive: {
      backgroundColor: "transparent",
      borderColor: theme.colors.borderStrong,
    },
    chipText: {
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    chipTextActive: {
      color: theme.colors.actionPrimaryText,
    },
    chipTextInactive: {
      color: theme.colors.textSecondary,
    },
    chipsContent: {
      gap: 8,
      paddingHorizontal: 0,
    },
    chipsScroll: {
      flexGrow: 0,
      marginHorizontal: 0,
    },
    headerIconButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    headerActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      paddingTop: 2,
    },
    liveDot: {
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      height: 6,
      width: 6,
    },
    searchBar: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderStrong,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    searchClearButton: {
      alignItems: "center",
      height: 24,
      justifyContent: "center",
      width: 24,
    },
    searchInput: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      paddingVertical: 0,
    },
    screenSubtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    messageCard: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 18,
    },
    messageEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.2,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    messageTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    mapCloseButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    mapModalCopy: {
      flex: 1,
      gap: 5,
      minWidth: 0,
    },
    mapModalHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    mapModalTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    modalBackdrop: {
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.72)",
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 18,
      paddingVertical: 32,
    },
    modalCloseButton: {
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.42)",
      borderRadius: 999,
      height: 38,
      justifyContent: "center",
      position: "absolute",
      right: 14,
      top: 14,
      width: 38,
      zIndex: 3,
    },
    modalScrollContent: {
      gap: 16,
      padding: 16,
    },
    modalSheet: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: theme.mode === "light" ? 1 : 0,
      maxHeight: "88%",
      overflow: "hidden",
      width: "100%",
    },
    previewActionFlex: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
      minWidth: 124,
    },
    previewActionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    previewButtonDisabled: {
      opacity: 0.62,
    },
    previewDescription: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    previewDetailGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    previewDetailTile: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flexBasis: "48%",
      flexGrow: 1,
      gap: 5,
      minWidth: 132,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    previewEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.2,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    previewFact: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flex: 1,
      gap: 4,
      paddingVertical: 14,
    },
    previewFactLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textAlign: "center",
    },
    previewFactNumber: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: 28,
      lineHeight: 32,
    },
    previewFactRow: {
      flexDirection: "row",
      gap: 10,
    },
    previewHero: {
      borderRadius: theme.radius.inner,
      minHeight: 236,
      overflow: "hidden",
      position: "relative",
    },
    previewHeroCopy: {
      bottom: 18,
      gap: 7,
      left: 18,
      position: "absolute",
      right: 18,
      zIndex: 2,
    },
    previewImage: {
      borderRadius: theme.radius.inner,
    },
    previewMeta: {
      color: "rgba(248, 250, 245, 0.8)",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    previewOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    previewPrimaryButton: {
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      minHeight: 48,
      paddingHorizontal: 14,
    },
    previewPrimaryButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      textAlign: "center",
    },
    previewSecondaryButton: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: theme.mode === "light" ? 1 : 0,
      minHeight: 48,
      paddingHorizontal: 14,
    },
    previewSecondaryButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      textAlign: "center",
    },
    previewSection: {
      gap: 8,
    },
    previewSectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    previewTileLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    previewTileValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    previewTitle: {
      color: "#F8FAF5",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    profileButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    retryButton: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    retryButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
    },
    section: {
      gap: theme.spacing.sectionGap,
    },
    sectionBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: 999,
      height: 20,
      justifyContent: "center",
      minWidth: 20,
      paddingHorizontal: 5,
    },
    sectionBadgeText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.bold,
      fontSize: 11,
      lineHeight: 14,
    },
    sectionHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    screenContent: {
      paddingBottom: 104,
    },
  });
