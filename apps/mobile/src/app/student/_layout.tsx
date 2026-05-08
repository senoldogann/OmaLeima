import { Redirect, Tabs } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { AccessIssueCard } from "@/features/auth/components/access-issue-card";
import { useSessionAccessQuery } from "@/features/auth/session-access";
import { GlassTabBarBackground } from "@/features/foundation/components/glass-tab-bar-background";
import { TabIcon } from "@/features/foundation/components/tab-icon";
import { type MobileTheme } from "@/features/foundation/theme";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

const getTabIconName = (routeName: string) => {
  switch (routeName) {
    case "events":
      return { ios: "sparkles.rectangle.stack.fill", android: "event", web: "event" } as const;
    case "active-event":
      return { ios: "qrcode.viewfinder", android: "qr-code-scanner", web: "qr-code-scanner" } as const;
    case "leaderboard":
      return { ios: "medal.fill", android: "leaderboard", web: "leaderboard" } as const;
    case "rewards":
      return { ios: "gift.fill", android: "redeem", web: "redeem" } as const;
    case "updates":
      return { ios: "person.3.fill", android: "groups", web: "groups" } as const;
    default:
      return { ios: "person.crop.circle.fill", android: "account-circle", web: "account-circle" } as const;
  }
};

export default function StudentTabsLayout() {
  const theme = useAppTheme();
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
        <InfoCard eyebrow={copy.common.student} title={copy.common.loading}>
          <Text selectable style={styles.bodyText}>
            {copy.student.accessChecking}
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
        <InfoCard eyebrow={copy.common.student} title={copy.common.loading}>
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
          title={copy.student.accessResolving}
          detail={accessQuery.error.message}
          retryLabel={copy.common.retry}
          onRetry={() => void accessQuery.refetch()}
        />
      </AppScreen>
    );
  }

  if (accessQuery.data?.area === "business") {
    return <Redirect href={accessQuery.data.homeHref ?? "/business/home"} />;
  }

  if (accessQuery.data?.area === "club") {
    return <Redirect href="/club/home" />;
  }

  if (accessQuery.data?.area !== "student") {
    return (
      <AppScreen>
        <AccessIssueCard
          title={copy.student.accessMissing}
          detail={copy.student.accessMissing}
          retryLabel={null}
          onRetry={null}
        />
      </AppScreen>
    );
  }

  return (
    <Tabs
      initialRouteName="events"
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
          <TabIcon color={color} focused={focused} name={getTabIconName(route.name)} size={size} />
        ),
        sceneStyle: {
          backgroundColor: theme.colors.screenBase,
        },
      })}
    >
      <Tabs.Screen name="events" options={{ title: copy.common.events }} />
      <Tabs.Screen
        name="active-event"
        options={{
          title: copy.common.myQr,
          tabBarIcon: ({ focused }) => (
            <View style={styles.qrTabButton}>
              <TabIcon
                color={theme.colors.actionPrimaryText}
                focused={focused}
                name={getTabIconName("active-event")}
                size={26}
              />
            </View>
          ),
          tabBarItemStyle: {
            paddingTop: 0,
          },
          tabBarLabelStyle: {
            display: "none",
          },
        }}
      />
      <Tabs.Screen name="leaderboard" options={{ title: copy.common.leaderboard }} />
      <Tabs.Screen name="rewards" options={{ title: copy.common.rewards }} />
      <Tabs.Screen name="updates" options={{ title: copy.common.community }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="announcement-detail" options={{ href: null }} />
    </Tabs>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    bodyText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    qrTabButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      bottom: 8,
      height: 56,
      justifyContent: "center",
      position: "relative",
      width: 56,
    },
  });
