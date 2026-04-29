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
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Business</Text>
        <Text style={styles.metaText}>Scanner, joined events, and event-day status.</Text>
      </View>

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <View style={styles.summaryStrip}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Live</Text>
            <Text style={styles.summaryValue}>{activeJoinedEvents.length}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Upcoming</Text>
            <Text style={styles.summaryValue}>{joinedUpcomingEvents.length}</Text>
          </View>
          <View style={styles.summaryCardWide}>
            <Text numberOfLines={1} style={styles.summaryEmail}>
              {session?.user.email ?? "business account"}
            </Text>
            <Text style={styles.summaryLabel}>signed in</Text>
          </View>
        </View>
      ) : null}

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
        >
          {activeJoinedEvents.length > 0 ? (
            <>
              <Text style={styles.bodyText}>Open the scanner and keep the line moving.</Text>
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
              <Text style={styles.bodyText}>The scanner opens automatically once a joined event is live.</Text>
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
        <InfoCard eyebrow="DIRECTORY" title="Joined events">
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
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.body,
    lineHeight: mobileTheme.typography.lineHeights.body,
  },
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
  metaText: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    lineHeight: mobileTheme.typography.lineHeights.bodySmall,
  },
  screenHeader: {
    gap: 4,
    marginBottom: 2,
  },
  screenTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.extrabold,
    fontSize: mobileTheme.typography.sizes.title,
    lineHeight: mobileTheme.typography.lineHeights.title,
  },
  summaryCard: {
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.inner,
    borderWidth: 1,
    gap: 6,
    minWidth: 88,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  summaryCardWide: {
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderColor: mobileTheme.colors.borderDefault,
    borderRadius: mobileTheme.radius.inner,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    justifyContent: "center",
    minHeight: 84,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  summaryEmail: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.body,
    lineHeight: mobileTheme.typography.lineHeights.body,
  },
  summaryLabel: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.caption,
    lineHeight: mobileTheme.typography.lineHeights.caption,
    textTransform: "uppercase",
  },
  summaryStrip: {
    flexDirection: "row",
    gap: 10,
  },
  summaryValue: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.extrabold,
    fontSize: 32,
    lineHeight: 36,
  },
});
