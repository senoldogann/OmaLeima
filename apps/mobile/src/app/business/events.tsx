import { useMemo } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import {
  useJoinBusinessEventMutation,
  useLeaveBusinessEventMutation,
} from "@/features/business/business-events";
import { useBusinessHomeOverviewQuery } from "@/features/business/business-home";
import type {
  BusinessJoinEventStatus,
  BusinessLeaveEventStatus,
  BusinessOpportunitySummary,
  BusinessJoinedEventSummary,
} from "@/features/business/types";
import type { MobileTheme } from "@/features/foundation/theme";
import { interactiveSurfaceShadowStyle } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

type FeedbackState = {
  tone: "ready" | "warning";
  title: string;
  message: string;
};

const formatDateTime = (formatter: Intl.DateTimeFormat, value: string): string =>
  formatter.format(new Date(value));

const createJoinResultMessages = (
  language: "fi" | "en"
): Record<BusinessJoinEventStatus, string> => ({
  SUCCESS:
    language === "fi"
      ? "Yritys liitettiin tapahtumaan onnistuneesti."
      : "Business joined the event successfully.",
  ALREADY_JOINED:
    language === "fi"
      ? "Yritys on jo liitetty tähän tapahtumaan."
      : "This business already joined the event.",
  EVENT_NOT_FOUND:
    language === "fi"
      ? "Tapahtumaa ei enää löytynyt."
      : "The event was not found anymore.",
  EVENT_NOT_AVAILABLE:
    language === "fi"
      ? "Tapahtumaa ei voi liittää yritykselle juuri nyt."
      : "This event is not available for business joining.",
  EVENT_JOIN_CLOSED:
    language === "fi"
      ? "Liittymisikkuna on jo sulkeutunut."
      : "Join window has already closed for this event.",
  BUSINESS_NOT_ACTIVE:
    language === "fi"
      ? "Valittu yritys ei ole enää aktiivinen."
      : "The target business is not active anymore.",
  BUSINESS_STAFF_NOT_ALLOWED:
    language === "fi"
      ? "Tällä tunnuksella ei voi liittää tätä yritystä tapahtumaan."
      : "This account cannot join events for that business.",
  PROFILE_NOT_ACTIVE:
    language === "fi"
      ? "Profiili ei ole aktiivinen."
      : "The profile is no longer active.",
  PROFILE_NOT_FOUND:
    language === "fi"
      ? "Profiilia ei löytynyt."
      : "The profile could not be found.",
  VENUE_REMOVED:
    language === "fi"
      ? "Tämä piste on poistettu tapahtumasta eikä sitä voi liittää uudelleen."
      : "This venue was removed from the event and cannot self-rejoin.",
  AUTH_REQUIRED:
    language === "fi" ? "Kirjaudu sisään uudelleen." : "Sign in again.",
  ACTOR_NOT_ALLOWED:
    language === "fi"
      ? "Toimijalla ei ole oikeutta tähän pyyntöön."
      : "The current actor is not allowed to do this.",
});

const createLeaveResultMessages = (
  language: "fi" | "en"
): Record<BusinessLeaveEventStatus, string> => ({
  SUCCESS:
    language === "fi"
      ? "Yritys poistui tapahtumasta ennen live-vaihetta."
      : "Business left the event before the live window started.",
  EVENT_NOT_FOUND:
    language === "fi"
      ? "Tapahtumaa ei enää löytynyt."
      : "The event was not found anymore.",
  EVENT_LEAVE_CLOSED:
    language === "fi"
      ? "Poistumisikkuna sulkeutui, koska tapahtuma on jo alkanut tai tila muuttui."
      : "Leave window closed because the event has already started or changed state.",
  BUSINESS_NOT_ACTIVE:
    language === "fi"
      ? "Valittu yritys ei ole enää aktiivinen."
      : "The target business is not active anymore.",
  BUSINESS_STAFF_NOT_ALLOWED:
    language === "fi"
      ? "Tällä tunnuksella ei voi poistaa tätä yritystä tapahtumasta."
      : "This account cannot leave events for that business.",
  VENUE_NOT_FOUND:
    language === "fi"
      ? "Tälle yritykselle ei löytynyt pistettä tapahtumasta."
      : "No venue row was found for this business on that event.",
  VENUE_NOT_JOINED:
    language === "fi"
      ? "Yritys ei ole tällä hetkellä mukana tässä tapahtumassa."
      : "This business is not currently joined to that event.",
  VENUE_ALREADY_LEFT:
    language === "fi"
      ? "Yritys on jo poistunut tästä tulevasta tapahtumasta."
      : "This business already left that upcoming event.",
  VENUE_REMOVED:
    language === "fi"
      ? "Tämä piste on poistettu tapahtumasta eikä sitä voi hallita itse."
      : "This venue was removed from the event and cannot self-manage anymore.",
  PROFILE_NOT_FOUND:
    language === "fi" ? "Profiilia ei löytynyt." : "The profile could not be found.",
  PROFILE_NOT_ACTIVE:
    language === "fi" ? "Profiili ei ole aktiivinen." : "The profile is no longer active.",
  AUTH_REQUIRED:
    language === "fi" ? "Kirjaudu sisään uudelleen." : "Sign in again.",
  ACTOR_NOT_ALLOWED:
    language === "fi"
      ? "Toimijalla ei ole oikeutta tähän pyyntöön."
      : "The current actor is not allowed to do this.",
});

const createFeedback = (
  language: "fi" | "en",
  joinStatus: BusinessJoinEventStatus | undefined,
  leaveStatus: BusinessLeaveEventStatus | undefined
): FeedbackState | null => {
  if (typeof joinStatus !== "undefined") {
    const messages = createJoinResultMessages(language);

    return {
      tone: joinStatus === "SUCCESS" || joinStatus === "ALREADY_JOINED" ? "ready" : "warning",
      title: joinStatus,
      message: messages[joinStatus],
    };
  }

  if (typeof leaveStatus !== "undefined") {
    const messages = createLeaveResultMessages(language);

    return {
      tone: leaveStatus === "SUCCESS" ? "ready" : "warning",
      title: leaveStatus,
      message: messages[leaveStatus],
    };
  }

  return null;
};

const createEventMeta = (
  event: BusinessJoinedEventSummary | BusinessOpportunitySummary,
  formatter: Intl.DateTimeFormat,
  language: "fi" | "en"
): string => {
  const startsLabel = language === "fi" ? "Alkaa" : "Starts";

  return `${event.businessName} · ${event.city} · ${startsLabel} ${formatDateTime(formatter, event.startAt)}`;
};

export default function BusinessEventsScreen() {
  const router = useRouter();
  const styles = useThemeStyles(createStyles);
  const { session } = useSession();
  const { copy, language, localeTag, theme } = useUiPreferences();
  const userId = session?.user.id ?? null;

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [localeTag]
  );

  const labels = useMemo(
    () => ({
      loadingTitle: language === "fi" ? "Avataan tapahtumia" : "Opening business events",
      loadingBody:
        language === "fi"
          ? "Ladataan liittyneet tapahtumat ja avoimet mahdollisuudet."
          : "Loading joined events and public opportunities for this account.",
      errorTitle:
        language === "fi"
          ? "Yritystapahtumat eivät latautuneet"
          : "Could not load business events",
      requestFailedTitle: language === "fi" ? "Pyyntö epäonnistui" : "Request failed",
      updateEyebrow: language === "fi" ? "Päivitys" : "Update",
      queueEmptyBody: copy.business.noActiveEvents,
      joinedNextEmptyBody:
        language === "fi"
          ? "Ei vielä yhtään tulevaa liittynyttä tapahtumaa."
          : "No upcoming joined event yet.",
      availableEmptyBody:
        language === "fi"
          ? "Liitetyissä kaupungeissa ei ole juuri nyt avoimia julkisia tapahtumia."
          : "No joinable public event is visible in the linked business cities right now.",
      openScanner: copy.business.openScanner,
      openHistory: copy.business.history,
      leaveEvent: language === "fi" ? "Poistu tapahtumasta" : "Leave event",
      leavingEvent: language === "fi" ? "Poistutaan..." : "Leaving...",
      joinEvent: language === "fi" ? "Liity tapahtumaan" : "Join event",
      joiningEvent: language === "fi" ? "Liitytään..." : "Joining...",
      joinDeadline: language === "fi" ? "Liittyminen sulkeutuu" : "Join deadline",
    }),
    [copy.business.history, copy.business.noActiveEvents, copy.business.openScanner, language]
  );

  const homeOverviewQuery = useBusinessHomeOverviewQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });
  const joinMutation = useJoinBusinessEventMutation(userId ?? "");
  const leaveMutation = useLeaveBusinessEventMutation(userId ?? "");

  const activeJoinedEvents = homeOverviewQuery.data?.joinedActiveEvents ?? [];
  const upcomingJoinedEvents = homeOverviewQuery.data?.joinedUpcomingEvents ?? [];
  const cityOpportunities = homeOverviewQuery.data?.cityOpportunities ?? [];

  const activeJoinKey = joinMutation.variables
    ? `${joinMutation.variables.businessId}:${joinMutation.variables.eventId}`
    : null;
  const activeLeaveKey = leaveMutation.variables
    ? `${leaveMutation.variables.businessId}:${leaveMutation.variables.eventId}`
    : null;

  const feedback = useMemo(
    () => createFeedback(language, joinMutation.data?.status, leaveMutation.data?.status),
    [joinMutation.data?.status, language, leaveMutation.data?.status]
  );

  return (
    <AppScreen>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.push("/business/home")} style={styles.backButton}>
          <AppIcon color={theme.colors.textPrimary} name="chevron-left" size={18} />
        </Pressable>
        <View style={styles.topBarCopy}>
          <Text style={styles.screenTitle}>{copy.common.events}</Text>
          <Text style={styles.metaText}>{copy.business.eventsMeta}</Text>
        </View>
      </View>

      {homeOverviewQuery.isLoading ? (
        <InfoCard eyebrow={copy.common.loading} title={labels.loadingTitle}>
          <Text style={styles.bodyText}>{labels.loadingBody}</Text>
        </InfoCard>
      ) : null}

      {homeOverviewQuery.error ? (
        <InfoCard eyebrow={copy.common.error} title={labels.errorTitle}>
          <Text style={styles.bodyText}>{homeOverviewQuery.error.message}</Text>
          <Pressable onPress={() => void homeOverviewQuery.refetch()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{copy.common.retry}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {joinMutation.isError || leaveMutation.isError ? (
        <InfoCard eyebrow={copy.common.error} title={labels.requestFailedTitle}>
          <Text style={styles.bodyText}>
            {joinMutation.error?.message ?? leaveMutation.error?.message}
          </Text>
        </InfoCard>
      ) : null}

      {feedback ? (
        <InfoCard eyebrow={labels.updateEyebrow} title={feedback.title}>
          <View style={styles.feedbackRow}>
            <StatusBadge label={feedback.tone} state={feedback.tone} />
            <Text style={styles.bodyText}>{feedback.message}</Text>
          </View>
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <InfoCard eyebrow={copy.business.live} title={copy.business.scannerQueue}>
          {activeJoinedEvents.length === 0 ? (
            <Text style={styles.bodyText}>{labels.queueEmptyBody}</Text>
          ) : (
            <View style={styles.stack}>
              {activeJoinedEvents.map((event) => (
                <View key={event.eventVenueId} style={styles.rowCard}>
                  <Text style={styles.cardTitle}>{event.eventName}</Text>
                  <Text style={styles.metaText}>{createEventMeta(event, formatter, language)}</Text>
                  <Text style={styles.metaText}>
                    {(language === "fi" ? "Päättyy" : "Ends")} {formatDateTime(formatter, event.endAt)}
                    {event.stampLabel ? ` · ${event.stampLabel}` : ""}
                  </Text>
                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/business/scanner",
                          params: { eventVenueId: event.eventVenueId },
                        })
                      }
                      style={[styles.primaryButton, styles.actionFlex]}
                    >
                      <Text style={styles.primaryButtonText}>{labels.openScanner}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => router.push("/business/history")}
                      style={[styles.secondaryButton, styles.actionFlex]}
                    >
                      <Text style={styles.secondaryButtonText}>{labels.openHistory}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <InfoCard eyebrow={copy.business.upcoming} title={copy.business.joinedNext}>
          {upcomingJoinedEvents.length === 0 ? (
            <Text style={styles.bodyText}>{labels.joinedNextEmptyBody}</Text>
          ) : (
            <View style={styles.stack}>
              {upcomingJoinedEvents.map((event) => {
                const leaveKey = `${event.businessId}:${event.eventId}`;
                const isLeaving = leaveMutation.isPending && activeLeaveKey === leaveKey;

                return (
                  <View key={event.eventVenueId} style={styles.rowCard}>
                    <Text style={styles.cardTitle}>{event.eventName}</Text>
                    <Text style={styles.metaText}>{createEventMeta(event, formatter, language)}</Text>
                    <Text style={styles.metaText}>
                      {labels.joinDeadline} {formatDateTime(formatter, event.joinDeadlineAt)}
                    </Text>
                    <Pressable
                      disabled={userId === null || isLeaving}
                      onPress={() => {
                        if (userId === null) {
                          return;
                        }

                        void leaveMutation.mutateAsync({
                          eventId: event.eventId,
                          businessId: event.businessId,
                          staffUserId: userId,
                        });
                      }}
                      style={[styles.secondaryButton, isLeaving ? styles.disabledButton : null]}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {isLeaving ? labels.leavingEvent : labels.leaveEvent}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <InfoCard eyebrow={copy.common.manage} title={copy.business.availableToJoin}>
          {cityOpportunities.length === 0 ? (
            <Text style={styles.bodyText}>{labels.availableEmptyBody}</Text>
          ) : (
            <View style={styles.stack}>
              {cityOpportunities.map((event) => {
                const joinKey = `${event.businessId}:${event.eventId}`;
                const isPending = joinMutation.isPending && activeJoinKey === joinKey;

                return (
                  <View key={joinKey} style={styles.rowCard}>
                    <Text style={styles.cardTitle}>{event.eventName}</Text>
                    <Text style={styles.metaText}>{createEventMeta(event, formatter, language)}</Text>
                    <Text style={styles.metaText}>
                      {labels.joinDeadline} {formatDateTime(formatter, event.joinDeadlineAt)}
                    </Text>
                    <Pressable
                      disabled={userId === null || isPending}
                      onPress={() => {
                        if (userId === null) {
                          return;
                        }

                        void joinMutation.mutateAsync({
                          eventId: event.eventId,
                          businessId: event.businessId,
                          staffUserId: userId,
                        });
                      }}
                      style={[
                        styles.primaryButton,
                        styles.elevatedButton,
                        isPending ? styles.disabledButton : null,
                      ]}
                    >
                      <Text style={styles.primaryButtonText}>
                        {isPending ? labels.joiningEvent : labels.joinEvent}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </InfoCard>
      ) : null}
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    actionFlex: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    backButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    disabledButton: {
      opacity: 0.7,
    },
    elevatedButton: {
      ...interactiveSurfaceShadowStyle,
    },
    feedbackRow: {
      alignItems: "flex-start",
      gap: 8,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      minHeight: 46,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    primaryButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    rowCard: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      gap: 7,
      padding: 14,
    },
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: theme.radius.button,
      minHeight: 46,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    stack: {
      gap: 12,
    },
    topBar: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      marginBottom: 4,
    },
    topBarCopy: {
      flex: 1,
      gap: 6,
    },
  });
