import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
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
        <Text selectable style={styles.bodyText}>
          This is the first business-side home route. It shows the active staff memberships, the events this business already joined, and nearby public opportunities that the future join flow will target.
        </Text>
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

      <InfoCard eyebrow="Next" title="Scanner and join flow">
        <Text selectable style={styles.bodyText}>
          Camera scanning, join or leave actions, and scan history land next. This route now gives staff the event context they need before the scanner slice opens.
        </Text>
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
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
  cardTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
  },
  metaText: {
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
  rowCard: {
    backgroundColor: "#0F172A",
    borderColor: "#1E293B",
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  stack: {
    gap: 12,
  },
});
