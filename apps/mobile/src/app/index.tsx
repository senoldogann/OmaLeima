import { Redirect } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { AccessIssueCard } from "@/features/auth/components/access-issue-card";
import { InfoCard } from "@/components/info-card";
import { useSessionAccessQuery } from "@/features/auth/session-access";
import { useSession } from "@/providers/session-provider";

export default function IndexRoute() {
  const { isAuthenticated, isLoading, session } = useSession();
  const accessQuery = useSessionAccessQuery({
    userId: session?.user.id ?? "",
    isEnabled: isAuthenticated && session !== null,
  });

  if (isLoading) {
    return (
      <AppScreen>
        <InfoCard eyebrow="Auth" title="Restoring session">
          <Text selectable style={styles.bodyText}>
            Reading the persisted Supabase session before choosing the correct mobile area.
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
        <InfoCard eyebrow="Routing" title="Resolving access">
          <Text selectable style={styles.bodyText}>
            Checking whether this authenticated user belongs in the student or business mobile flow.
          </Text>
        </InfoCard>
      </AppScreen>
    );
  }

  if (accessQuery.error) {
    return (
      <AppScreen>
        <AccessIssueCard
          title="Access check failed"
          detail={accessQuery.error.message}
          retryLabel="Retry access check"
          onRetry={() => void accessQuery.refetch()}
        />
      </AppScreen>
    );
  }

  if (accessQuery.data?.homeHref === null || typeof accessQuery.data === "undefined") {
    return (
      <AppScreen>
        <AccessIssueCard
          title="This account is not allowed here"
          detail="The current authenticated account does not have an active student or business mobile role. Sign out and use a supported account."
          retryLabel={null}
          onRetry={null}
        />
      </AppScreen>
    );
  }

  return <Redirect href={accessQuery.data.homeHref} />;
}

const styles = StyleSheet.create({
  bodyText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
});
