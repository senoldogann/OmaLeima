import { Redirect, Slot } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { AccessIssueCard } from "@/features/auth/components/access-issue-card";
import { useSessionAccessQuery } from "@/features/auth/session-access";
import { useSession } from "@/providers/session-provider";

export default function AuthLayout() {
  const { isAuthenticated, isLoading, session } = useSession();
  const accessQuery = useSessionAccessQuery({
    userId: session?.user.id ?? "",
    isEnabled: isAuthenticated && session !== null,
  });

  if (isLoading) {
    return (
      <AppScreen>
        <InfoCard eyebrow="Auth" title="Checking session">
          <Text selectable style={styles.bodyText}>
            Restoring the Supabase session before showing the login flow.
          </Text>
        </InfoCard>
      </AppScreen>
    );
  }

  if (isAuthenticated) {
    if (accessQuery.isLoading) {
      return (
        <AppScreen>
          <InfoCard eyebrow="Auth" title="Resolving destination">
            <Text selectable style={styles.bodyText}>
              This authenticated user is signed in. OmaLeima is choosing the correct mobile area now.
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

    if (accessQuery.data?.homeHref !== null && typeof accessQuery.data !== "undefined") {
      return <Redirect href={accessQuery.data.homeHref} />;
    }

    return (
      <AppScreen>
        <AccessIssueCard
          title="This account is not allowed here"
          detail="This authenticated account cannot enter the shared mobile auth flow because it does not have an active student, business, or club mobile role."
          retryLabel={null}
          onRetry={null}
        />
      </AppScreen>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  bodyText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
});
