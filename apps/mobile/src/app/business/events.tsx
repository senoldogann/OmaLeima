import { useMemo } from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { useJoinBusinessEventMutation, useLeaveBusinessEventMutation } from "@/features/business/business-events";
import { useBusinessHomeOverviewQuery } from "@/features/business/business-home";
import { useSession } from "@/providers/session-provider";

const dateTimeFormatter = new Intl.DateTimeFormat("en-FI", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const formatDateTime = (value: string): string => dateTimeFormatter.format(new Date(value));

const joinResultMessages: Record<string, string> = {
  SUCCESS: "Business joined the event successfully.",
  ALREADY_JOINED: "This business already joined the event.",
  EVENT_JOIN_CLOSED: "Join window has already closed for this event.",
  EVENT_NOT_AVAILABLE: "This event is not available for business joining.",
  BUSINESS_STAFF_NOT_ALLOWED: "This account cannot join events for that business.",
  BUSINESS_NOT_ACTIVE: "The target business is not active anymore.",
  VENUE_REMOVED: "This venue was removed from the event and cannot self-rejoin.",
};

const leaveResultMessages: Record<string, string> = {
  SUCCESS: "Business left the event before the live window started.",
  EVENT_LEAVE_CLOSED: "Leave window closed because the event has already started or changed state.",
  BUSINESS_STAFF_NOT_ALLOWED: "This account cannot leave events for that business.",
  BUSINESS_NOT_ACTIVE: "The target business is not active anymore.",
  VENUE_NOT_FOUND: "No venue row was found for this business on that event.",
  VENUE_NOT_JOINED: "This business is not currently joined to that event.",
  VENUE_ALREADY_LEFT: "This business already left that upcoming event.",
  VENUE_REMOVED: "This venue was removed from the event and cannot self-manage anymore.",
};

export default function BusinessEventsScreen() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
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

  const joinFeedback = useMemo(() => {
    if (joinMutation.data === undefined) {
      return null;
    }

    return {
      status: joinMutation.data.status,
      message: joinResultMessages[joinMutation.data.status] ?? `Join returned ${joinMutation.data.status}.`,
    };
  }, [joinMutation.data]);

  const leaveFeedback = useMemo(() => {
    if (leaveMutation.data === undefined) {
      return null;
    }

    return {
      status: leaveMutation.data.status,
      message: leaveResultMessages[leaveMutation.data.status] ?? `Leave returned ${leaveMutation.data.status}.`,
    };
  }, [leaveMutation.data]);

  return (
    <AppScreen>
      <InfoCard eyebrow="Business" title="Event participation">
        <Text selectable style={styles.bodyText}>
          This screen is the business-side control point for venue participation. Joinable public events stay grouped by business location, and live joined events can jump straight into the scanner.
        </Text>
      </InfoCard>

      {homeOverviewQuery.isLoading ? (
        <InfoCard eyebrow="Loading" title="Opening business events">
          <Text selectable style={styles.bodyText}>
            Loading joined events and public opportunities for every active business location on this account.
          </Text>
        </InfoCard>
      ) : null}

      {homeOverviewQuery.error ? (
        <InfoCard eyebrow="Error" title="Could not load business events">
          <Text selectable style={styles.bodyText}>{homeOverviewQuery.error.message}</Text>
          <Pressable onPress={() => void homeOverviewQuery.refetch()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {joinMutation.isError ? (
        <InfoCard eyebrow="Join" title="Join request failed">
          <Text selectable style={styles.bodyText}>{joinMutation.error.message}</Text>
        </InfoCard>
      ) : null}

      {leaveMutation.isError ? (
        <InfoCard eyebrow="Leave" title="Leave request failed">
          <Text selectable style={styles.bodyText}>{leaveMutation.error.message}</Text>
        </InfoCard>
      ) : null}

      {joinFeedback !== null ? (
        <InfoCard eyebrow="Join" title={`Result: ${joinFeedback.status}`}>
          <Text selectable style={styles.bodyText}>{joinFeedback.message}</Text>
        </InfoCard>
      ) : null}

      {leaveFeedback !== null ? (
        <InfoCard eyebrow="Leave" title={`Result: ${leaveFeedback.status}`}>
          <Text selectable style={styles.bodyText}>{leaveFeedback.message}</Text>
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <InfoCard eyebrow="Live" title="Joined events ready for scanning">
          {activeJoinedEvents.length === 0 ? (
            <Text selectable style={styles.bodyText}>
              No joined event is active yet. Scanner opens once at least one joined event is live.
            </Text>
          ) : (
            <View style={styles.stack}>
              {activeJoinedEvents.map((event) => (
                <View key={event.eventVenueId} style={styles.rowCard}>
                  <Text selectable style={styles.cardTitle}>
                    {event.eventName}
                  </Text>
                  <Text selectable style={styles.metaText}>
                    {event.businessName} · {event.city}
                  </Text>
                  <Text selectable style={styles.metaText}>
                    Ends {formatDateTime(event.endAt)}
                    {event.stampLabel ? ` · ${event.stampLabel}` : ""}
                  </Text>
                  <View style={styles.actionRow}>
                    <Link
                      href={{
                        pathname: "/business/scanner",
                        params: {
                          eventVenueId: event.eventVenueId,
                        },
                      }}
                      asChild
                    >
                      <Pressable style={styles.primaryButton}>
                        <Text style={styles.primaryButtonText}>Open scanner</Text>
                      </Pressable>
                    </Link>
                    <Link href="/business/history" asChild>
                      <Pressable style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>View history</Text>
                      </Pressable>
                    </Link>
                  </View>
                </View>
              ))}
            </View>
          )}
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <InfoCard eyebrow="Upcoming" title="Joined upcoming events">
          {upcomingJoinedEvents.length === 0 ? (
            <Text selectable style={styles.bodyText}>
              No upcoming joined event is attached to this account yet.
            </Text>
          ) : (
            <View style={styles.stack}>
              {upcomingJoinedEvents.map((event) => (
                (() => {
                  const leaveKey = `${event.businessId}:${event.eventId}`;
                  const isLeaving = leaveMutation.isPending && activeLeaveKey === leaveKey;

                  return (
                    <View key={event.eventVenueId} style={styles.rowCard}>
                      <Text selectable style={styles.cardTitle}>
                        {event.eventName}
                      </Text>
                      <Text selectable style={styles.metaText}>
                        {event.businessName} · Starts {formatDateTime(event.startAt)}
                      </Text>
                      <Text selectable style={styles.metaText}>
                        Join deadline {formatDateTime(event.joinDeadlineAt)}
                      </Text>
                      <Text selectable style={styles.metaText}>
                        Leave stays available only until the event start time.
                      </Text>
                      <View style={styles.actionRow}>
                        <Link href="/business/history" asChild>
                          <Pressable style={styles.secondaryButton}>
                            <Text style={styles.secondaryButtonText}>View history</Text>
                          </Pressable>
                        </Link>
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
                          style={[styles.dangerButton, isLeaving ? styles.disabledButton : null]}
                        >
                          <Text style={styles.dangerButtonText}>{isLeaving ? "Leaving..." : "Leave event"}</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })()
              ))}
            </View>
          )}
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <InfoCard eyebrow="Available" title="Joinable public events">
          {cityOpportunities.length === 0 ? (
            <Text selectable style={styles.bodyText}>
              No joinable public event is visible in the linked business cities right now.
            </Text>
          ) : (
            <View style={styles.stack}>
              {cityOpportunities.map((event) => {
                const joinKey = `${event.businessId}:${event.eventId}`;
                const isPending = joinMutation.isPending && activeJoinKey === joinKey;

                return (
                  <View key={joinKey} style={styles.rowCard}>
                    <Text selectable style={styles.cardTitle}>
                      {event.eventName}
                    </Text>
                    <Text selectable style={styles.metaText}>
                      {event.businessName} · {event.city}
                    </Text>
                    <Text selectable style={styles.metaText}>
                      Starts {formatDateTime(event.startAt)} · Join deadline {formatDateTime(event.joinDeadlineAt)}
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
                      style={[styles.primaryButton, isPending ? styles.disabledButton : null]}
                    >
                      <Text style={styles.primaryButtonText}>{isPending ? "Joining..." : "Join event"}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </InfoCard>
      ) : null}

      <InfoCard eyebrow="Next" title="Leave and history">
        <Text selectable style={styles.bodyText}>
          Upcoming joined events can now be left before start, and scan history lives in its own route for event-day follow-up.
        </Text>
        <Link href="/business/history" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Open scan history</Text>
          </Pressable>
        </Link>
      </InfoCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
  cardTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.7,
  },
  metaText: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  dangerButton: {
    alignItems: "center",
    backgroundColor: "#7F1D1D",
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dangerButtonText: {
    color: "#FEE2E2",
    fontSize: 14,
    fontWeight: "700",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#1D4ED8",
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  rowCard: {
    backgroundColor: "#0F172A",
    borderColor: "#1E293B",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  stack: {
    gap: 12,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderColor: "#334155",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "700",
  },
});
