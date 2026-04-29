import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { useBusinessHomeOverviewQuery } from "@/features/business/business-home";
import { mobileTheme } from "@/features/foundation/theme";
import type { BusinessJoinedEventSummary } from "@/features/business/types";
import { useSession } from "@/providers/session-provider";

const dateTimeFormatter = new Intl.DateTimeFormat("en-FI", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const formatDateTime = (value: string): string => dateTimeFormatter.format(new Date(value));

const getTimelineBadge = (
  event: BusinessJoinedEventSummary
): { label: string; state: "ready" | "pending" | "warning" } => {
  switch (event.timelineState) {
    case "ACTIVE":
      return { label: "live", state: "ready" };
    case "UPCOMING":
      return { label: "upcoming", state: "pending" };
    case "COMPLETED":
      return { label: "completed", state: "warning" };
  }
};

export default function BusinessHomeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  const homeOverviewQuery = useBusinessHomeOverviewQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });

  const activeJoinedEvents = homeOverviewQuery.data?.joinedActiveEvents ?? [];
  const joinedUpcomingEvents = homeOverviewQuery.data?.joinedUpcomingEvents ?? [];
  const joinedEvents = [...activeJoinedEvents, ...joinedUpcomingEvents];

  return (
    <AppScreen>
      {/* Identity hero */}
      <View style={styles.identityHero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {session?.user.email?.[0]?.toUpperCase() ?? "B"}
          </Text>
        </View>
        <Text style={styles.emailText}>{session?.user.email}</Text>
        <Text style={styles.roleLabel}>BUSINESS ACCOUNT</Text>
      </View>

      {/* Loading */}
      {homeOverviewQuery.isLoading ? (
        <InfoCard eyebrow="LOADING" title="Fetching overview">
          <Text style={styles.bodyText}>Loading business profile and active events.</Text>
        </InfoCard>
      ) : null}

      {/* Error */}
      {homeOverviewQuery.error ? (
        <InfoCard eyebrow="ERROR" title="Overview unavailable">
          <Text style={styles.bodyText}>{homeOverviewQuery.error.message}</Text>
          <Pressable onPress={() => void homeOverviewQuery.refetch()} style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {/* Active events scanner access */}
      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <InfoCard
          eyebrow="SCANNER"
          title={activeJoinedEvents.length > 0 ? "Scanner ready" : "No active events"}
          variant={activeJoinedEvents.length > 0 ? "scene" : "card"}
        >
          {activeJoinedEvents.length > 0 ? (
            <>
              <Text style={styles.bodyText}>
                You have {activeJoinedEvents.length} active event{activeJoinedEvents.length === 1 ? "" : "s"} live right now.
              </Text>
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.primaryButton, styles.actionFlex]}
                  onPress={() => router.push("/business/scanner")}
                >
                  <AppIcon color={mobileTheme.colors.screenBase} name="scan" size={18} />
                  <Text style={styles.primaryButtonText}>Open scanner</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push("/business/history")}
                  style={[styles.ghostButton, styles.actionFlex]}
                >
                  <AppIcon color={mobileTheme.colors.textPrimary} name="history" size={17} />
                  <Text style={styles.ghostButtonText}>Scan history</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.bodyText}>
                There are no active events for your business right now. You cannot use the scanner until an event starts.
              </Text>
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => router.push("/business/events")}
                  style={[styles.primaryButton, styles.actionFlex]}
                >
                  <AppIcon color={mobileTheme.colors.screenBase} name="calendar" size={18} />
                  <Text style={styles.primaryButtonText}>Manage events</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push("/business/history")}
                  style={[styles.ghostButton, styles.actionFlex]}
                >
                  <AppIcon color={mobileTheme.colors.textPrimary} name="history" size={17} />
                  <Text style={styles.ghostButtonText}>Scan history</Text>
                </Pressable>
              </View>
            </>
          )}
        </InfoCard>
      ) : null}

      {/* Joined Events List */}
      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error && joinedEvents.length > 0 ? (
        <InfoCard eyebrow="DIRECTORY" title="Your joined events">
          <View style={styles.eventList}>
            {joinedEvents.map((event) => {
              const timelineBadge = getTimelineBadge(event);
              const isActive = event.timelineState === "ACTIVE";

              return (
                <View key={event.eventVenueId} style={styles.eventRow}>
                  <View style={styles.eventRowHeader}>
                    <Text style={styles.eventRowTitle}>{event.eventName}</Text>
                    <StatusBadge label={timelineBadge.label} state={timelineBadge.state} />
                  </View>
                  <Text style={styles.eventRowMeta}>
                    {event.businessName} · {event.city}
                  </Text>
                  <Text style={styles.eventRowMeta}>
                    {isActive ? "Ends" : event.timelineState === "UPCOMING" ? "Starts" : "Ended"}{" "}
                    {formatDateTime(isActive ? event.endAt : event.startAt)}
                  </Text>
                  {event.stampLabel ? (
                    <Text style={styles.eventRowStamp}>{event.stampLabel}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>

          <Pressable onPress={() => router.push("/business/events")} style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>View all events</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      <View style={styles.dangerZone}>
        <SignOutButton />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  // --- Identity hero ---
  identityHero: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: mobileTheme.colors.surfaceL2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: {
    color: mobileTheme.colors.lime,
    fontSize: 28,
    fontWeight: "800",
  },
  emailText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  roleLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },

  // --- Actions ---
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  actionFlex: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.lime,
    borderRadius: mobileTheme.radius.button,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#08090E",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  ghostButton: {
    alignItems: "center",
    borderRadius: mobileTheme.radius.button,
    backgroundColor: mobileTheme.colors.surfaceL2,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  ghostButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },

  // --- Event List ---
  eventList: {
    gap: 8,
  },
  eventRow: {
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.inner,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  eventRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventRowTitle: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  eventRowMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
  },
  eventRowStamp: {
    color: mobileTheme.colors.lime,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  dangerZone: {
    alignItems: "center",
    marginTop: 16,
  },
});
