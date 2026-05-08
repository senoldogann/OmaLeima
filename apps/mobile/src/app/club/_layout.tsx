import { Redirect, Tabs } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { AccessIssueCard } from "@/features/auth/components/access-issue-card";
import { useSessionAccessQuery } from "@/features/auth/session-access";
import { GlassTabBarBackground } from "@/features/foundation/components/glass-tab-bar-background";
import { TabIcon } from "@/features/foundation/components/tab-icon";
import type { MobileTheme } from "@/features/foundation/theme";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

const getClubTabIconName = (routeName: string) => {
  switch (routeName) {
    case "home":
      return { ios: "house.fill", android: "home", web: "home" } as const;
    case "events":
      return { ios: "calendar.badge.plus", android: "event", web: "event" } as const;
    case "announcements":
      return { ios: "megaphone.fill", android: "campaign", web: "campaign" } as const;
    case "upcoming":
      return { ios: "clock.badge.checkmark", android: "event-available", web: "event-available" } as const;
    case "reports":
      return { ios: "chart.bar.xaxis", android: "analytics", web: "analytics" } as const;
    case "claims":
      return { ios: "gift.fill", android: "redeem", web: "gift" } as const;
    default:
      return { ios: "person.crop.circle.fill", android: "account-circle", web: "account-circle" } as const;
  }
};

export default function ClubLayout() {
  const theme = useAppTheme();
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
    return <Redirect href={accessQuery.data.homeHref ?? "/business/home"} />;
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
    <Tabs
      initialRouteName="home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.textPrimary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: theme.typography.families.semibold,
          fontSize: theme.typography.sizes.eyebrow,
          marginBottom: 2,
        },
        tabBarItemStyle: {
          paddingTop: 8,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.screenBase,
          borderTopWidth: 0,
          bottom: 0,
          height: 78,
          left: 16,
          overflow: "visible",
          paddingBottom: 8,
          paddingTop: 8,
          position: "absolute",
          right: 16,
        },
        tabBarBackground: GlassTabBarBackground,
        tabBarIcon: ({ color, focused, size }) => (
          <TabIcon color={color} focused={focused} name={getClubTabIconName(route.name)} size={size} />
        ),
        sceneStyle: {
          backgroundColor: theme.colors.screenBase,
        },
      })}
    >
      <Tabs.Screen name="home" options={{ title: language === "fi" ? "Koti" : "Home" }} />
      <Tabs.Screen name="events" options={{ title: language === "fi" ? "Approt" : "Events" }} />
      <Tabs.Screen name="announcements" options={{ title: language === "fi" ? "Tiedotteet" : "Announcements" }} />
      <Tabs.Screen name="upcoming" options={{ title: language === "fi" ? "Tulossa" : "Upcoming" }} />
      <Tabs.Screen name="reports" options={{ title: language === "fi" ? "Raportit" : "Reports" }} />
      <Tabs.Screen name="profile" options={{ title: copy.common.profile }} />
      <Tabs.Screen name="announcement-detail" options={{ href: null }} />
      <Tabs.Screen name="claims" options={{ href: null }} />
    </Tabs>
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
