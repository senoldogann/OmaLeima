import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { useJoinEventMutation, useStudentEventDetailQuery } from "@/features/events/student-event-detail";
import { useSession } from "@/providers/session-provider";
import type { AppReadinessState } from "@/types/app";
import type {
  EventRegistrationState,
  EventRuleValue,
  JoinEventResult,
  RewardTierSummary,
  StudentEventDetail,
} from "@/features/events/types";

type EventDetailRouteParams = {
  eventId?: string;
};

type JoinAvailability = {
  canJoin: boolean;
  label: string;
  detail: string;
  state: AppReadinessState;
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-FI", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const formatDateTime = (value: string): string => dateTimeFormatter.format(new Date(value));

const formatRuleValue = (value: EventRuleValue): string => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return String(value);
  }

  return JSON.stringify(value);
};

const getRegistrationBadge = (
  registrationState: EventRegistrationState
): { label: string; state: AppReadinessState } => {
  if (registrationState === "REGISTERED") {
    return { label: "registered", state: "ready" };
  }

  if (registrationState === "CANCELLED") {
    return { label: "cancelled", state: "warning" };
  }

  if (registrationState === "BANNED") {
    return { label: "restricted", state: "error" };
  }

  return { label: "not joined", state: "pending" };
};

const getJoinAvailability = (event: StudentEventDetail): JoinAvailability => {
  if (event.registrationState === "REGISTERED") {
    return {
      canJoin: false,
      label: "Already joined",
      detail: "This student session is already registered and can move on to the QR flow when that screen lands.",
      state: "ready",
    };
  }

  if (event.registrationState === "BANNED") {
    return {
      canJoin: false,
      label: "Registration blocked",
      detail: "This profile is marked as restricted for this event.",
      state: "error",
    };
  }

  if (event.status !== "PUBLISHED") {
    return {
      canJoin: false,
      label: "Registration closed",
      detail: "This event is no longer in a pre-start join state.",
      state: "warning",
    };
  }

  const now = Date.now();
  const startTime = new Date(event.startAt).getTime();
  const joinDeadlineTime = new Date(event.joinDeadlineAt).getTime();

  if (now >= joinDeadlineTime || now >= startTime) {
    return {
      canJoin: false,
      label: "Join window closed",
      detail: `Join deadline passed at ${formatDateTime(event.joinDeadlineAt)}.`,
      state: "warning",
    };
  }

  return {
    canJoin: true,
    label: "Join event",
    detail:
      event.maxParticipants === null
        ? "Registration is open. Capacity is unlimited for this event."
        : `Registration is open. Capacity is capped at ${event.maxParticipants} participants and enforced when you join.`,
    state: "ready",
  };
};

const getJoinResultPresentation = (result: JoinEventResult | undefined): { title: string; body: string; state: AppReadinessState } | null => {
  if (typeof result === "undefined") {
    return null;
  }

  switch (result.status) {
    case "SUCCESS":
      return {
        title: "Joined successfully",
        body: "The student is now registered for this event.",
        state: "ready",
      };
    case "ALREADY_REGISTERED":
      return {
        title: "Already registered",
        body: "This session was already registered before the latest join attempt.",
        state: "ready",
      };
    case "EVENT_FULL":
      return {
        title: "Event is full",
        body: `The event has reached capacity${typeof result.maxParticipants === "number" ? ` (${result.maxParticipants})` : ""}.`,
        state: "warning",
      };
    case "EVENT_REGISTRATION_CLOSED":
      return {
        title: "Registration closed",
        body: "The join deadline or event start time has already passed.",
        state: "warning",
      };
    case "STUDENT_BANNED":
      return {
        title: "Registration blocked",
        body: "This student profile is restricted for this event.",
        state: "error",
      };
    default:
      return {
        title: "Join failed",
        body: `Registration RPC returned ${result.status}.`,
        state: "error",
      };
  }
};

const getRewardInventoryCopy = (rewardTier: RewardTierSummary): string => {
  if (rewardTier.inventoryTotal === null) {
    return "Unlimited reward stock";
  }

  const remaining = rewardTier.inventoryTotal - rewardTier.inventoryClaimed;

  if (remaining <= 0) {
    return "Out of stock";
  }

  return `${remaining} reward(s) left`;
};

export default function StudentEventDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<EventDetailRouteParams>();
  const { session } = useSession();
  const eventId = typeof params.eventId === "string" ? params.eventId : null;
  const studentId = session?.user.id ?? null;
  const detailQuery = useStudentEventDetailQuery({
    eventId: eventId ?? "",
    studentId: studentId ?? "",
    isEnabled: eventId !== null && studentId !== null,
  });
  const joinMutation = useJoinEventMutation();

  if (eventId === null) {
    return (
      <AppScreen>
        <InfoCard eyebrow="Route" title="Event detail is missing an id">
          <Text style={styles.bodyText}>The event id was not present in the route parameters.</Text>
        </InfoCard>
      </AppScreen>
    );
  }

  const event = detailQuery.data ?? null;
  const registrationBadge = event ? getRegistrationBadge(event.registrationState) : null;
  const joinAvailability = event ? getJoinAvailability(event) : null;
  const joinPresentation = getJoinResultPresentation(joinMutation.data);

  const handleJoinPress = async (): Promise<void> => {
    if (studentId === null || event === null) {
      return;
    }

    await joinMutation.mutateAsync({
      eventId: event.id,
      studentId,
    });
  };

  return (
    <AppScreen>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>Back to events</Text>
      </Pressable>

      {detailQuery.isLoading ? (
        <InfoCard eyebrow="Loading" title="Opening event detail">
          <Text style={styles.bodyText}>Loading event overview, venues, rewards, and registration state.</Text>
        </InfoCard>
      ) : null}

      {detailQuery.error ? (
        <InfoCard eyebrow="Error" title="Could not load event detail">
          <Text style={styles.bodyText}>{detailQuery.error.message}</Text>
          <Pressable onPress={() => void detailQuery.refetch()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {event ? (
        <>
          <InfoCard eyebrow={event.city} title={event.name}>
            <View style={styles.badges}>
              <StatusBadge label={event.status.toLowerCase()} state={event.status === "PUBLISHED" ? "ready" : "warning"} />
              {registrationBadge ? (
                <StatusBadge label={registrationBadge.label} state={registrationBadge.state} />
              ) : null}
            </View>

            <Text style={styles.bodyText}>
              {event.description ?? "The organizer has not added a description for this event yet."}
            </Text>

            <View style={styles.metaGroup}>
              <Text style={styles.metaLine}>Starts {formatDateTime(event.startAt)}</Text>
              <Text style={styles.metaLine}>Ends {formatDateTime(event.endAt)}</Text>
              <Text style={styles.metaLine}>Join deadline {formatDateTime(event.joinDeadlineAt)}</Text>
              <Text style={styles.metaLine}>
                {event.maxParticipants === null ? "Open capacity" : `${event.maxParticipants} participant cap`}
              </Text>
              <Text style={styles.metaLine}>Minimum leimat required: {event.minimumStampsRequired}</Text>
            </View>
          </InfoCard>

          <InfoCard eyebrow="Registration" title={joinAvailability?.label ?? "Join event"}>
            <Text style={styles.bodyText}>{joinAvailability?.detail ?? "Registration state is loading."}</Text>
            <Pressable
              disabled={!joinAvailability?.canJoin || joinMutation.isPending}
              onPress={() => void handleJoinPress()}
              style={[
                styles.primaryButton,
                (!joinAvailability?.canJoin || joinMutation.isPending) ? styles.disabledButton : null,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {joinMutation.isPending ? "Joining..." : joinAvailability?.label ?? "Join event"}
              </Text>
            </Pressable>
          </InfoCard>

          {joinPresentation ? (
            <InfoCard eyebrow="Join result" title={joinPresentation.title}>
              <View style={styles.badges}>
                <StatusBadge label={joinPresentation.state} state={joinPresentation.state} />
              </View>
              <Text style={styles.bodyText}>{joinPresentation.body}</Text>
            </InfoCard>
          ) : null}

          <InfoCard eyebrow="Venues" title="Joined venues">
            {event.venues.length === 0 ? (
              <Text style={styles.bodyText}>No joined venues are visible yet for this event.</Text>
            ) : (
              <View style={styles.listGroup}>
                {event.venues.map((venue) => (
                  <View key={venue.id} style={styles.listRow}>
                    <Text style={styles.listTitle}>
                      {venue.venueOrder ?? "-"} . {venue.name}
                    </Text>
                    <Text style={styles.metaLine}>{venue.city}</Text>
                    {venue.stampLabel ? <Text style={styles.metaLine}>Stamp label: {venue.stampLabel}</Text> : null}
                    {venue.customInstructions ? <Text style={styles.metaLine}>{venue.customInstructions}</Text> : null}
                  </View>
                ))}
              </View>
            )}
          </InfoCard>

          <InfoCard eyebrow="Rewards" title="Reward tiers">
            {event.rewardTiers.length === 0 ? (
              <Text style={styles.bodyText}>No active reward tiers are published yet.</Text>
            ) : (
              <View style={styles.listGroup}>
                {event.rewardTiers.map((rewardTier) => (
                  <View key={rewardTier.id} style={styles.listRow}>
                    <Text style={styles.listTitle}>
                      {rewardTier.requiredStampCount} leima - {rewardTier.title}
                    </Text>
                    <Text style={styles.metaLine}>{rewardTier.rewardType}</Text>
                    <Text style={styles.metaLine}>{getRewardInventoryCopy(rewardTier)}</Text>
                    {rewardTier.description ? <Text style={styles.metaLine}>{rewardTier.description}</Text> : null}
                    {rewardTier.claimInstructions ? (
                      <Text style={styles.metaLine}>{rewardTier.claimInstructions}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </InfoCard>

          <InfoCard eyebrow="Rules" title="Organizer rules">
            {Object.entries(event.rules).length === 0 ? (
              <Text style={styles.bodyText}>No structured rules are published for this event yet.</Text>
            ) : (
              <View style={styles.listGroup}>
                {Object.entries(event.rules).map(([key, value]) => (
                  <View key={key} style={styles.listRow}>
                    <Text style={styles.listTitle}>{key}</Text>
                    <Text style={styles.metaLine}>{formatRuleValue(value)}</Text>
                  </View>
                ))}
              </View>
            )}
          </InfoCard>
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
    borderRadius: 8,
    borderColor: "#334155",
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "700",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bodyText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
  disabledButton: {
    backgroundColor: "#334155",
  },
  listGroup: {
    gap: 10,
  },
  listRow: {
    gap: 4,
    paddingBottom: 2,
  },
  listTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "600",
  },
  metaGroup: {
    gap: 6,
  },
  metaLine: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#1D4ED8",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: "#1E293B",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
});
