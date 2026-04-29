import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { interactiveSurfaceShadowStyle, mobileTheme } from "@/features/foundation/theme";
import { useJoinEventMutation, useStudentEventDetailQuery } from "@/features/events/student-event-detail";
import { useStudentRewardInventoryRealtime } from "@/features/realtime/student-realtime";
import { useActiveAppState } from "@/features/qr/student-qr";
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

const getRewardChipColor = (rewardTier: RewardTierSummary): string => {
  if (rewardTier.inventoryTotal === null) {
    return mobileTheme.colors.chromeTintIndigo;
  }

  if (rewardTier.inventoryClaimed >= rewardTier.inventoryTotal) {
    return mobileTheme.colors.dangerSurface;
  }

  return mobileTheme.colors.chromeTintWarm;
};

export default function StudentEventDetailScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const isAppActive = useActiveAppState();
  const params = useLocalSearchParams<EventDetailRouteParams>();
  const { session } = useSession();
  const eventId = typeof params.eventId === "string" ? params.eventId : null;
  const studentId = session?.user.id ?? null;
  const detailQuery = useStudentEventDetailQuery({
    eventId: eventId ?? "",
    studentId: studentId ?? "",
    isEnabled: eventId !== null && studentId !== null,
  });
  const trackedEventIds = useMemo(() => (eventId === null ? [] : [eventId]), [eventId]);

  useStudentRewardInventoryRealtime({
    trackedEventIds,
    studentId: studentId ?? "",
    detailEventId: eventId,
    isEnabled: eventId !== null && studentId !== null && isFocused && isAppActive,
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
            <View style={styles.heroCard}>
              <View style={styles.heroGlow} />
              <View style={styles.heroTopRow}>
                <Text style={styles.heroKicker}>{event.country}</Text>
                <View style={styles.badges}>
                  <StatusBadge label={event.status.toLowerCase()} state={event.status === "PUBLISHED" ? "ready" : "warning"} />
                  {registrationBadge ? (
                    <StatusBadge label={registrationBadge.label} state={registrationBadge.state} />
                  ) : null}
                </View>
              </View>

              <Text style={styles.heroSummary}>
                {event.description ?? "The organizer has not added a description for this event yet."}
              </Text>

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatCard}>
                  <Text style={styles.heroStatLabel}>Starts</Text>
                  <Text style={styles.heroStatValue}>{formatDateTime(event.startAt)}</Text>
                </View>
                <View style={styles.heroStatCard}>
                  <Text style={styles.heroStatLabel}>Join deadline</Text>
                  <Text style={styles.heroStatValue}>{formatDateTime(event.joinDeadlineAt)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.metaStrip}>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillValue}>
                  {event.maxParticipants === null ? "Open capacity" : `${event.maxParticipants} participant cap`}
                </Text>
              </View>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillValue}>Minimum {event.minimumStampsRequired} leima</Text>
              </View>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillValue}>Ends {formatDateTime(event.endAt)}</Text>
              </View>
            </View>
          </InfoCard>

          <InfoCard eyebrow="Registration" title={joinAvailability?.label ?? "Join event"}>
            <View style={styles.joinCallout}>
              <View style={styles.joinCopy}>
                <Text style={styles.bodyText}>{joinAvailability?.detail ?? "Registration state is loading."}</Text>
              </View>
              {joinAvailability ? <StatusBadge label={joinAvailability.state} state={joinAvailability.state} /> : null}
            </View>
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
                    <View style={styles.venueHeader}>
                      <View style={styles.venueOrderBubble}>
                        <Text style={styles.venueOrderText}>{venue.venueOrder ?? "-"}</Text>
                      </View>
                      <View style={styles.venueCopy}>
                        <Text style={styles.listTitle}>{venue.name}</Text>
                        <Text style={styles.metaLine}>{venue.city}</Text>
                      </View>
                    </View>
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
                    <View style={styles.rewardHeader}>
                      <View style={[styles.rewardRequirementBadge, { backgroundColor: getRewardChipColor(rewardTier) }]}>
                        <Text style={styles.rewardRequirementText}>{rewardTier.requiredStampCount} leima</Text>
                      </View>
                      <Text style={styles.listTitle}>{rewardTier.title}</Text>
                    </View>
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
    backgroundColor: mobileTheme.colors.actionNeutral,
    borderColor: mobileTheme.colors.actionNeutralBorder,
    borderRadius: mobileTheme.radius.button,
    borderWidth: 1,
    marginBottom: -4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...interactiveSurfaceShadowStyle,
  },
  backButtonText: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bodyText: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  heroCard: {
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderColor: mobileTheme.colors.limeBorder,
    borderRadius: mobileTheme.radius.scene,
    borderWidth: 1,
    gap: 16,
    overflow: "hidden",
    padding: 18,
    position: "relative",
  },
  heroGlow: {
    backgroundColor: mobileTheme.colors.limeSurface,
    borderRadius: 120,
    height: 144,
    opacity: 1,
    position: "absolute",
    right: -34,
    top: -48,
    width: 144,
  },
  heroKicker: {
    color: mobileTheme.colors.lime,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroSummary: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  heroTopRow: {
    gap: 12,
  },
  heroStatsRow: {
    gap: 10,
  },
  heroStatCard: {
    backgroundColor: mobileTheme.colors.surfaceL3,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  heroStatLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  heroStatValue: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  joinCallout: {
    alignItems: "flex-start",
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  joinCopy: {
    gap: 8,
  },
  listGroup: {
    gap: 10,
  },
  listRow: {
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    gap: 8,
    padding: 16,
    ...interactiveSurfaceShadowStyle,
  },
  listTitle: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  metaPill: {
    backgroundColor: mobileTheme.colors.surfaceL3,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaPillValue: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  metaStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaLine: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.cyan,
    borderRadius: mobileTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...interactiveSurfaceShadowStyle,
  },
  primaryButtonText: {
    color: mobileTheme.colors.screenBase,
    fontSize: 14,
    fontWeight: "800",
  },
  rewardHeader: {
    gap: 10,
  },
  rewardRequirementBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rewardRequirementText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  secondaryButton: {
    alignSelf: "flex-start",
    borderColor: mobileTheme.colors.borderStrong,
    borderRadius: mobileTheme.radius.button,
    borderWidth: 1,
    backgroundColor: mobileTheme.colors.surfaceL2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...interactiveSurfaceShadowStyle,
  },
  secondaryButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  venueCopy: {
    flex: 1,
    gap: 4,
  },
  venueHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  venueOrderBubble: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceL3,
    borderColor: mobileTheme.colors.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  venueOrderText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
});
