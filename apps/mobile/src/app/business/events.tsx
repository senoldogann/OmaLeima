import { useMemo } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import {
  useJoinBusinessEventMutation,
  useLeaveBusinessEventMutation,
} from "@/features/business/business-events";
import { useBusinessHomeOverviewQuery } from "@/features/business/business-home";
import { interactiveSurfaceShadowStyle, mobileTheme } from "@/features/foundation/theme";
import { useSession } from "@/providers/session-provider";

type FeedbackState = {
  tone: "ready" | "warning";
  title: string;
  message: string;
};

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
  const router = useRouter();
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

  const feedback = useMemo<FeedbackState | null>(() => {
    if (joinMutation.data !== undefined) {
      return {
        tone:
          joinMutation.data.status === "SUCCESS" || joinMutation.data.status === "ALREADY_JOINED"
            ? "ready"
            : "warning",
        title: joinMutation.data.status,
        message:
          joinResultMessages[joinMutation.data.status] ??
          `Join returned ${joinMutation.data.status}.`,
      };
    }

    if (leaveMutation.data !== undefined) {
      return {
        tone: leaveMutation.data.status === "SUCCESS" ? "ready" : "warning",
        title: leaveMutation.data.status,
        message:
          leaveResultMessages[leaveMutation.data.status] ??
          `Leave returned ${leaveMutation.data.status}.`,
      };
    }

    return null;
  }, [joinMutation.data, leaveMutation.data]);

  return (
    <AppScreen>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Business events</Text>
        <Text style={styles.metaText}>Join what is next, scan what is live, leave what has not started.</Text>
      </View>

      {homeOverviewQuery.isLoading ? (
        <InfoCard eyebrow="Loading" title="Opening business events">
          <Text selectable style={styles.bodyText}>
            Loading joined events and public opportunities for this account.
          </Text>
        </InfoCard>
      ) : null}

      {homeOverviewQuery.error ? (
        <InfoCard eyebrow="Error" title="Could not load business events">
          <Text selectable style={styles.bodyText}>{homeOverviewQuery.error.message}</Text>
          <Pressable
            onPress={() => void homeOverviewQuery.refetch()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {joinMutation.isError || leaveMutation.isError ? (
        <InfoCard eyebrow="Error" title="Request failed">
          <Text selectable style={styles.bodyText}>
            {joinMutation.error?.message ?? leaveMutation.error?.message}
          </Text>
        </InfoCard>
      ) : null}

      {feedback ? (
        <InfoCard eyebrow="Update" title={feedback.title}>
          <View style={styles.feedbackRow}>
            <StatusBadge label={feedback.tone} state={feedback.tone} />
            <Text selectable style={styles.bodyText}>{feedback.message}</Text>
          </View>
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <InfoCard eyebrow="Live" title="Ready for scanning">
          {activeJoinedEvents.length === 0 ? (
            <Text selectable style={styles.bodyText}>
              No joined event is active right now.
            </Text>
          ) : (
            <View style={styles.stack}>
              {activeJoinedEvents.map((event) => (
                <View key={event.eventVenueId} style={styles.rowCard}>
                  <Text selectable style={styles.cardTitle}>{event.eventName}</Text>
                  <Text selectable style={styles.metaText}>
                    {event.businessName} · {event.city}
                  </Text>
                  <Text selectable style={styles.metaText}>
                    Ends {formatDateTime(event.endAt)}
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
                      <Text style={styles.primaryButtonText}>Open scanner</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => router.push("/business/history")}
                      style={[styles.secondaryButton, styles.actionFlex]}
                    >
                      <Text style={styles.secondaryButtonText}>History</Text>
                    </Pressable>
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
            <Text selectable style={styles.bodyText}>No upcoming joined event yet.</Text>
          ) : (
            <View style={styles.stack}>
              {upcomingJoinedEvents.map((event) => {
                const leaveKey = `${event.businessId}:${event.eventId}`;
                const isLeaving = leaveMutation.isPending && activeLeaveKey === leaveKey;

                return (
                  <View key={event.eventVenueId} style={styles.rowCard}>
                    <Text selectable style={styles.cardTitle}>{event.eventName}</Text>
                    <Text selectable style={styles.metaText}>
                      {event.businessName} · Starts {formatDateTime(event.startAt)}
                    </Text>
                    <Text selectable style={styles.metaText}>
                      Join deadline {formatDateTime(event.joinDeadlineAt)}
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
                        {isLeaving ? "Leaving..." : "Leave event"}
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
                    <Text selectable style={styles.cardTitle}>{event.eventName}</Text>
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
                      <Text style={styles.primaryButtonText}>
                        {isPending ? "Joining..." : "Join event"}
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

const styles = StyleSheet.create({
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
    color: mobileTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  cardTitle: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.7,
  },
  feedbackRow: {
    alignItems: "flex-start",
    gap: 8,
  },
  metaText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.lime,
    borderRadius: mobileTheme.radius.button,
    paddingHorizontal: 20,
    paddingVertical: 14,
    ...interactiveSurfaceShadowStyle,
  },
  primaryButtonText: {
    color: "#08090E",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  rowCard: {
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderRadius: mobileTheme.radius.inner,
    gap: 8,
    padding: 14,
    ...interactiveSurfaceShadowStyle,
  },
  screenHeader: {
    gap: 6,
    marginBottom: 4,
  },
  screenTitle: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderRadius: mobileTheme.radius.button,
    paddingHorizontal: 16,
    paddingVertical: 13,
    ...interactiveSurfaceShadowStyle,
  },
  secondaryButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  stack: {
    gap: 10,
  },
});
