import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { EventCard } from "@/features/events/components/event-card";
import { FoundationStatusCard } from "@/features/foundation/components/foundation-status-card";
import { useStudentEventsQuery } from "@/features/events/student-events";
import { useSession } from "@/providers/session-provider";

export default function StudentEventsScreen() {
  const { session } = useSession();
  const studentId = session?.user.id ?? null;
  const eventsQuery = useStudentEventsQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null,
  });

  const activeEvents = eventsQuery.data?.activeEvents ?? [];
  const upcomingEvents = eventsQuery.data?.upcomingEvents ?? [];
  const hasEvents = activeEvents.length > 0 || upcomingEvents.length > 0;

  return (
    <AppScreen>
      <InfoCard eyebrow="Student" title="Event discovery">
        <Text style={styles.bodyText}>
          Active and upcoming public events now come from Supabase. Registration actions and event detail stay for the next slice.
        </Text>
      </InfoCard>

      <FoundationStatusCard
        eyebrow="Status"
        title="Student events query"
        items={[
          {
            label: "Session",
            value: studentId ?? "No authenticated student session.",
            state: studentId ? "ready" : "error",
          },
          {
            label: "Event listing",
            value: eventsQuery.isLoading
              ? "Loading public active and upcoming events."
              : eventsQuery.error?.message ?? `${activeEvents.length + upcomingEvents.length} visible events loaded.`,
            state: eventsQuery.isLoading ? "loading" : eventsQuery.error ? "error" : "ready",
          },
          {
            label: "Registration state",
            value: "Card badges already show whether the signed-in student is registered for an event.",
            state: "pending",
          },
        ]}
      />

      {eventsQuery.error ? (
        <InfoCard eyebrow="Error" title="Could not load events">
          <Text style={styles.bodyText}>
            {eventsQuery.error.message}
          </Text>
          <Pressable onPress={() => void eventsQuery.refetch()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!eventsQuery.isLoading && !eventsQuery.error && !hasEvents ? (
        <InfoCard eyebrow="Empty" title="No active or upcoming events">
          <Text style={styles.bodyText}>
            Nothing is visible for this student yet. When organizers publish the next appro, it will appear here.
          </Text>
        </InfoCard>
      ) : null}

      {activeEvents.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live now</Text>
          {activeEvents.map((event) => (
            <EventCard event={event} key={event.id} />
          ))}
        </View>
      ) : null}

      {upcomingEvents.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coming up</Text>
          {upcomingEvents.map((event) => (
            <EventCard event={event} key={event.id} />
          ))}
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: "#1D4ED8",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
  },
});
