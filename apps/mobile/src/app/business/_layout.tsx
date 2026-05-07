import { Redirect, Tabs, usePathname } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { AccessIssueCard } from "@/features/auth/components/access-issue-card";
import { useSessionAccessQuery } from "@/features/auth/session-access";
import { GlassTabBarBackground } from "@/features/foundation/components/glass-tab-bar-background";
import { TabIcon } from "@/features/foundation/components/tab-icon";
import type { MobileTheme } from "@/features/foundation/theme";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

const getBusinessTabIconName = (routeName: string) => {
  switch (routeName) {
    case "home":
      return { ios: "house.fill", android: "home", web: "home" } as const;
    case "events":
      return { ios: "sparkles.rectangle.stack.fill", android: "event", web: "event" } as const;
    case "scanner":
      return { ios: "qrcode.viewfinder", android: "qr-code-scanner", web: "qr-code-scanner" } as const;
    case "reports":
      return { ios: "chart.bar.xaxis", android: "analytics", web: "analytics" } as const;
    default:
      return { ios: "person.crop.circle.fill", android: "account-circle", web: "account-circle" } as const;
  }
};

export default function BusinessLayout() {
  const theme = useAppTheme();
  const { copy, language } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const pathname = usePathname();
  const { isAuthenticated, isLoading, session } = useSession();
  const accessQuery = useSessionAccessQuery({
    userId: session?.user.id ?? "",
    isEnabled: isAuthenticated && session !== null,
  });

  if (isLoading) {
    return (
      <AppScreen>
        <InfoCard eyebrow={copy.common.business} title={copy.common.loading}>
          <Text selectable style={styles.bodyText}>
            {copy.business.accessChecking}
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
        <InfoCard eyebrow={copy.common.business} title={copy.common.loading}>
          <Text selectable style={styles.bodyText}>
            {copy.business.accessResolving}
          </Text>
        </InfoCard>
      </AppScreen>
    );
  }

  if (accessQuery.error) {
    return (
      <AppScreen>
        <AccessIssueCard
          title={copy.business.accessResolving}
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

  if (accessQuery.data?.area === "club") {
    return <Redirect href="/club/home" />;
  }

  if (accessQuery.data?.area !== "business") {
    return (
      <AppScreen>
        <AccessIssueCard
          title={copy.business.accessMissing}
          detail={copy.business.accessMissing}
          retryLabel={null}
          onRetry={null}
        />
      </AppScreen>
    );
  }

  const isBusinessScannerOnly = accessQuery.data.isBusinessScannerOnly;
  const isScannerOnlyPathAllowed = pathname === "/business/scanner" || pathname === "/business/history";

  if (isBusinessScannerOnly && !isScannerOnlyPathAllowed) {
    return <Redirect href="/business/scanner" />;
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
          <TabIcon color={color} focused={focused} name={getBusinessTabIconName(route.name)} size={size} />
        ),
        sceneStyle: {
          backgroundColor: theme.colors.screenBase,
        },
      })}
    >
      <Tabs.Screen
        name="home"
        options={{ href: isBusinessScannerOnly ? null : undefined, title: language === "fi" ? "Koti" : "Home" }}
      />
      <Tabs.Screen
        name="events"
        options={{ href: isBusinessScannerOnly ? null : undefined, title: copy.common.events }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: language === "fi" ? "Skanneri" : "Scanner",
          tabBarIcon: ({ focused }) => (
            <View style={styles.scannerTabButton}>
              <TabIcon
                color={focused ? theme.colors.actionPrimaryText : theme.colors.actionPrimaryText}
                focused={focused}
                name={getBusinessTabIconName("scanner")}
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
      <Tabs.Screen
        name="reports"
        options={{ href: isBusinessScannerOnly ? null : undefined, title: language === "fi" ? "ROI" : "ROI" }}
      />
      <Tabs.Screen
        name="profile"
        options={{ href: isBusinessScannerOnly ? null : undefined, title: copy.common.profile }}
      />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="updates" options={{ href: null }} />
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
    scannerTabButton: {
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
