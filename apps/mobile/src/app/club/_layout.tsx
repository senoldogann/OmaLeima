import { Redirect, Stack } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { AccessIssueCard } from "@/features/auth/components/access-issue-card";
import { useSessionAccessQuery } from "@/features/auth/session-access";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

export default function ClubLayout() {
  const { copy, language } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const { isAuthenticated, isLoading, session } = useSession();
  const accessQuery = useSessionAccessQuery({
    userId: session?.user.id ?? "",
    isEnabled: isAuthenticated && session !== null,
  });

  if (isLoading) {
    return (
      <AppScreen>
        <InfoCard eyebrow="Club" title={copy.common.loading}>
          <Text selectable style={styles.bodyText}>
            {language === "fi" ? "Tarkistetaan järjestäjäoikeuksia." : "Checking organizer access."}
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
        <InfoCard eyebrow="Club" title={copy.common.loading}>
          <Text selectable style={styles.bodyText}>
            {language === "fi" ? "Haetaan klubin mobiilinäkymää." : "Loading the club mobile area."}
          </Text>
        </InfoCard>
      </AppScreen>
    );
  }

  if (accessQuery.error) {
    return (
      <AppScreen>
        <AccessIssueCard
          title={language === "fi" ? "Klubipääsy epäonnistui" : "Club access failed"}
          detail={accessQuery.error.message}
          retryLabel={copy.common.retry}
          onRetry={() => void accessQuery.refetch()}
        />
      </AppScreen>
    );
  }

  if (accessQuery.data?.area === "student") {
    return <Redirect href="/student/events" />;
  }

  if (accessQuery.data?.area === "business") {
    return <Redirect href="/business/home" />;
  }

  if (accessQuery.data?.area !== "club") {
    return (
      <AppScreen>
        <AccessIssueCard
          title={language === "fi" ? "Klubiroolia ei löydy" : "Club role missing"}
          detail={
            language === "fi"
              ? "Tällä tilillä ei ole aktiivista klubin mobiiliroolia."
              : "This account does not have an active club mobile role."
          }
          retryLabel={null}
          onRetry={null}
        />
      </AppScreen>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
    </Stack>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
  });
