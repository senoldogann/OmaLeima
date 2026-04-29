import { Redirect, Tabs } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { SymbolView } from "expo-symbols";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { AccessIssueCard } from "@/features/auth/components/access-issue-card";
import { useSessionAccessQuery } from "@/features/auth/session-access";
import { GlassTabBarBackground } from "@/features/foundation/components/glass-tab-bar-background";
import { mobileTheme } from "@/features/foundation/theme";
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
  const { isAuthenticated, isLoading, session } = useSession();
  const accessQuery = useSessionAccessQuery({
    userId: session?.user.id ?? "",
    isEnabled: isAuthenticated && session !== null,
  });

  if (isLoading) {
    return (
      <AppScreen>
        <InfoCard eyebrow="Student" title="Checking session">
          <Text selectable style={styles.bodyText}>
            Confirming that the student area has an authenticated session.
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
        <InfoCard eyebrow="Student" title="Resolving access">
          <Text selectable style={styles.bodyText}>
            Checking whether this account should stay in the student area.
          </Text>
        </InfoCard>
      </AppScreen>
    );
  }

  if (accessQuery.error) {
    return (
      <AppScreen>
        <AccessIssueCard
          title="Student access check failed"
          detail={accessQuery.error.message}
          retryLabel="Retry access check"
          onRetry={() => void accessQuery.refetch()}
        />
      </AppScreen>
    );
  }

  if (accessQuery.data?.area === "business") {
    return <Redirect href="/business/home" />;
  }

  if (accessQuery.data?.area !== "student") {
    return (
      <AppScreen>
        <AccessIssueCard
          title="Student access not available"
          detail="This authenticated account is not currently allowed inside the student mobile area."
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
        tabBarActiveTintColor: mobileTheme.colors.textPrimary,
        tabBarInactiveTintColor: mobileTheme.colors.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: mobileTheme.typography.families.semibold,
          fontSize: mobileTheme.typography.sizes.eyebrow,
          marginBottom: 2,
        },
        tabBarItemStyle: {
          paddingTop: 8,
        },
        tabBarStyle: {
          backgroundColor: mobileTheme.colors.screenBase,
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
          backgroundColor: mobileTheme.colors.screenBase,
        },
      })}
    >
      <Tabs.Screen name="events" options={{ title: "Events" }} />
      <Tabs.Screen name="active-event" options={{ title: "My QR" }} />
      <Tabs.Screen name="leaderboard" options={{ title: "Leaderboard" }} />
      <Tabs.Screen name="rewards" options={{ title: "Rewards" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
