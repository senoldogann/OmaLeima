import { Redirect, Tabs } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { SymbolView } from "expo-symbols";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { AccessIssueCard } from "@/features/auth/components/access-issue-card";
import { useSessionAccessQuery } from "@/features/auth/session-access";
import { GlassTabBarBackground } from "@/features/foundation/components/glass-tab-bar-background";
import { type MobileTheme } from "@/features/foundation/theme";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

const getTabIconName = (routeName: string) => {
  switch (routeName) {
    case "events":
      return { ios: "sparkles.rectangle.stack.fill", android: "event", web: "event" } as const;
    case "active-event":
      return { ios: "qrcode.viewfinder", android: "qr_code_scanner", web: "qr_code_scanner" } as const;
    case "leaderboard":
      return { ios: "chart.bar.fill", android: "leaderboard", web: "leaderboard" } as const;
    case "rewards":
      return { ios: "gift.fill", android: "redeem", web: "redeem" } as const;
    default:
      return { ios: "person.crop.circle.fill", android: "account_circle", web: "account_circle" } as const;
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
    return <Redirect href="/business/home" />;
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
          bottom: 16,
          height: 78,
          left: 16,
          paddingBottom: 8,
          paddingTop: 8,
          position: "absolute",
          right: 16,
        },
        tabBarBackground: GlassTabBarBackground,
        tabBarIcon: ({ color, focused, size }) => (
          <SymbolView
            animationSpec={
              focused
                ? {
                    effect: {
                      type: "bounce",
                      wholeSymbol: true,
                    },
                    speed: 0.9,
                  }
                : undefined
            }
            name={getTabIconName(route.name)}
            size={size}
            tintColor={color}
            type="hierarchical"
          />
        ),
        sceneStyle: {
          backgroundColor: theme.colors.screenBase,
        },
      })}
    >
      <Tabs.Screen name="events" options={{ title: copy.common.events }} />
      <Tabs.Screen name="active-event" options={{ title: copy.common.myQr }} />
      <Tabs.Screen name="leaderboard" options={{ title: copy.common.leaderboard }} />
      <Tabs.Screen name="rewards" options={{ title: copy.common.rewards }} />
      <Tabs.Screen name="profile" options={{ title: copy.common.profile }} />
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
  });
