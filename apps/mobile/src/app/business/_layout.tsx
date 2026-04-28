import { Redirect, Stack } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { AccessIssueCard } from "@/features/auth/components/access-issue-card";
import { useSessionAccessQuery } from "@/features/auth/session-access";
import { useSession } from "@/providers/session-provider";

export default function BusinessLayout() {
  const { isAuthenticated, isLoading, session } = useSession();
  const accessQuery = useSessionAccessQuery({
    userId: session?.user.id ?? "",
    isEnabled: isAuthenticated && session !== null,
  });

  if (isLoading) {
    return (
      <AppScreen>
        <InfoCard eyebrow="Business" title="Checking session">
          <Text selectable style={styles.bodyText}>
            Restoring the Supabase session before opening the business area.
          </Text>
        </InfoCard>
      </AppScreen>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  if (accessQuery.isLoading) {
    return (
      <AppScreen>
        <InfoCard eyebrow="Business" title="Resolving access">
          <Text selectable style={styles.bodyText}>
            Confirming that this account has active business staff access.
          </Text>
        </InfoCard>
      </AppScreen>
    );
  }

  if (accessQuery.error) {
    return (
      <AppScreen>
        <AccessIssueCard
          title="Business access check failed"
          detail={accessQuery.error.message}
          retryLabel="Retry access check"
          onRetry={() => void accessQuery.refetch()}
        />
      </AppScreen>
    );
  }

  if (accessQuery.data?.area === "student") {
    return <Redirect href="/student/events" />;
  }

  if (accessQuery.data?.area !== "business") {
    return (
      <AppScreen>
        <AccessIssueCard
          title="Business access not available"
          detail="This authenticated account does not currently have an active business membership tied to a readable active business."
          retryLabel={null}
          onRetry={null}
        />
      </AppScreen>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="events" />
      <Stack.Screen name="scanner" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
});
