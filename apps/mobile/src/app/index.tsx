import { Redirect } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { AccessIssueCard } from "@/features/auth/components/access-issue-card";
import { InfoCard } from "@/components/info-card";
import { useSessionAccessQuery } from "@/features/auth/session-access";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

export default function IndexRoute() {
  const { copy } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const { isAuthenticated, isLoading, session } = useSession();
  const accessQuery = useSessionAccessQuery({
    userId: session?.user.id ?? "",
    isEnabled: isAuthenticated && session !== null,
  });

  if (isLoading) {
    return (
      <AppScreen>
        <InfoCard eyebrow={copy.auth.accessEyebrow} title={copy.auth.opening}>
          <Text selectable style={styles.bodyText}>
            {copy.auth.openingMessage}
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
        <InfoCard eyebrow={copy.auth.accessEyebrow} title={copy.common.loading}>
          <Text selectable style={styles.bodyText}>
            {copy.student.accessResolving}
          </Text>
        </InfoCard>
      </AppScreen>
    );
  }

  if (accessQuery.error) {
    return (
      <AppScreen>
        <AccessIssueCard
          title={copy.student.accessChecking}
          detail={accessQuery.error.message}
          retryLabel={copy.common.retry}
          onRetry={() => void accessQuery.refetch()}
        />
      </AppScreen>
    );
  }

  if (accessQuery.data?.homeHref === null || typeof accessQuery.data === "undefined") {
    return (
      <AppScreen>
        <AccessIssueCard
          title={copy.student.accessMissing}
          detail="The current authenticated account does not have an active student, business, or club mobile role."
          retryLabel={null}
          onRetry={null}
        />
      </AppScreen>
    );
  }

  return <Redirect href={accessQuery.data.homeHref} />;
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    bodyText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
  });
