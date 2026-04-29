import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { useBusinessHomeOverviewQuery } from "@/features/business/business-home";
import { interactiveSurfaceShadowStyle, mobileTheme } from "@/features/foundation/theme";
import { useSession } from "@/providers/session-provider";

const dateTimeFormatter = new Intl.DateTimeFormat("en-FI", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const formatDateTime = (value: string): string => dateTimeFormatter.format(new Date(value));

export default function BusinessHomeScreen() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const homeOverviewQuery = useBusinessHomeOverviewQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });

  const memberships = homeOverviewQuery.data?.memberships ?? [];
  const joinedActiveEvents = homeOverviewQuery.data?.joinedActiveEvents ?? [];
  const joinedUpcomingEvents = homeOverviewQuery.data?.joinedUpcomingEvents ?? [];
  const cityOpportunities = homeOverviewQuery.data?.cityOpportunities ?? [];

  return (
    <AppScreen>
      <InfoCard eyebrow="Business" title="Scanner home">
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <Text selectable style={styles.heroEyebrow}>Operator launchpad</Text>
          <Text selectable style={styles.heroTitle}>
            Keep the venue team close to the next scan, not buried in admin noise.
          </Text>
          <Text selectable style={styles.bodyText}>
            This route now acts as the business launchpad. Staff can jump into event joining or scanner work from here while still seeing the current joined-event context.
          </Text>
        </View>
        <View style={styles.actionRow}>
          <Link href="/business/events" asChild>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Manage events</Text>
            </Pressable>
          </Link>
          <Link href="/business/scanner" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Open scanner</Text>
            </Pressable>
          </Link>
        </View>
        <Link href="/business/history" asChild>
          <Pressable style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>Open scan history</Text>
          </Pressable>
        </Link>
      </InfoCard>

      {homeOverviewQuery.isLoading ? (
        <InfoCard eyebrow="Loading" title="Opening business home">
          <Text selectable style={styles.bodyText}>
            Loading staff memberships, joined event venues, and upcoming city opportunities.
          </Text>
        </InfoCard>
      ) : null}

      {homeOverviewQuery.error ? (
        <InfoCard eyebrow="Error" title="Could not load business home">
          <Text selectable style={styles.bodyText}>{homeOverviewQuery.error.message}</Text>
          <Pressable onPress={() => void homeOverviewQuery.refetch()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <InfoCard eyebrow="Access" title="Active business memberships">
          {memberships.length === 0 ? (
            <Text selectable style={styles.bodyText}>
              This signed-in account does not currently expose any active business memberships in the mobile app.
            </Text>
          ) : (
            <View style={styles.stack}>
              {memberships.map((membership) => (
                <View key={`${membership.businessId}-${membership.role}`} style={styles.rowCard}>
                  <Text selectable style={styles.cardTitle}>
                    {membership.businessName}
                  </Text>
                  <Text selectable style={styles.metaText}>
                    {membership.city} · {membership.role.toLowerCase()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <InfoCard eyebrow="Joined" title="Live joined events">
          {joinedActiveEvents.length === 0 ? (
            <Text selectable style={styles.bodyText}>
              No joined event is live right now for this business account.
            </Text>
          ) : (
            <View style={styles.stack}>
              {joinedActiveEvents.map((event) => (
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
                  <Link
                    href={{
                      pathname: "/business/scanner",
                      params: {
                        eventVenueId: event.eventVenueId,
                      },
                    }}
                    asChild
                  >
                    <Pressable style={styles.secondaryButton}>
                      <Text style={styles.secondaryButtonText}>Scan this event</Text>
                    </Pressable>
                  </Link>
                </View>
              ))}
            </View>
          )}
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <InfoCard eyebrow="Upcoming" title="Joined upcoming events">
          {joinedUpcomingEvents.length === 0 ? (
            <Text selectable style={styles.bodyText}>
              No upcoming joined events yet. The future join flow will let staff add new public events before they start.
            </Text>
          ) : (
            <View style={styles.stack}>
              {joinedUpcomingEvents.map((event) => (
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
                </View>
              ))}
            </View>
          )}
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <InfoCard eyebrow="Opportunities" title="Public events in your cities">
          {cityOpportunities.length === 0 ? (
            <Text selectable style={styles.bodyText}>
              No extra upcoming public event is visible in the cities linked to this business account right now.
            </Text>
          ) : (
            <View style={styles.stack}>
              {cityOpportunities.map((event) => (
                <View key={event.eventId} style={styles.rowCard}>
                  <Text selectable style={styles.cardTitle}>
                    {event.eventName}
                  </Text>
                  <Text selectable style={styles.metaText}>
                    {event.city} · Starts {formatDateTime(event.startAt)}
                  </Text>
                  <Text selectable style={styles.metaText}>
                    {event.businessName} · Join deadline {formatDateTime(event.joinDeadlineAt)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </InfoCard>
      ) : null}

      <InfoCard eyebrow="History" title="Recent scan history">
        <Text selectable style={styles.bodyText}>
          Staff can now review recent own scans in a dedicated history screen instead of relying on the live scanner route only.
        </Text>
        <Link href="/business/history" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>View scan history</Text>
          </Pressable>
        </Link>
      </InfoCard>

      <InfoCard eyebrow="Account" title="Session actions">
        <Text selectable style={styles.bodyText}>
          Signing out clears the local Supabase session and returns this device to the shared auth entry screen.
        </Text>
        <SignOutButton />
      </InfoCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
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
  ghostButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.actionNeutral,
    borderColor: mobileTheme.colors.actionNeutralBorder,
    borderRadius: mobileTheme.radius.button,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...interactiveSurfaceShadowStyle,
  },
  ghostButtonText: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  heroCard: {
    backgroundColor: "rgba(255, 255, 255, 0.045)",
    borderColor: mobileTheme.colors.cardBorder,
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    overflow: "hidden",
    padding: 18,
    position: "relative",
  },
  heroEyebrow: {
    color: mobileTheme.colors.accentBlue,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroGlow: {
    backgroundColor: mobileTheme.colors.chromeTint,
    borderRadius: 140,
    height: 152,
    opacity: 0.5,
    position: "absolute",
    right: -42,
    top: -58,
    width: 152,
  },
  heroTitle: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  metaText: {
    color: mobileTheme.colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.actionBlueStrong,
    borderRadius: mobileTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...interactiveSurfaceShadowStyle,
  },
  primaryButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.actionNeutral,
    borderColor: mobileTheme.colors.actionNeutralBorder,
    borderRadius: mobileTheme.radius.button,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...interactiveSurfaceShadowStyle,
  },
  secondaryButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  rowCard: {
    backgroundColor: mobileTheme.colors.cardBackgroundSoft,
    borderColor: mobileTheme.colors.cardBorder,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 16,
    ...interactiveSurfaceShadowStyle,
  },
  stack: {
    gap: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
});
