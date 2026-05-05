import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { AnnouncementFeedSection } from "@/features/announcements/announcement-feed-section";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

export default function BusinessUpdatesScreen() {
  const router = useRouter();
  const styles = useThemeStyles(createStyles);
  const { language, theme } = useUiPreferences();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const handleBackPress = (): void => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/business/home");
  };

  return (
    <AppScreen>
      <View style={styles.topBar}>
        <Pressable onPress={handleBackPress} style={styles.backButton}>
          <AppIcon color={theme.colors.textPrimary} name="chevron-left" size={18} />
        </Pressable>
        <View style={styles.topBarCopy}>
          <Text style={styles.screenTitle}>{language === "fi" ? "Tiedotteet" : "Updates"}</Text>
          <Text style={styles.metaText}>
            {language === "fi"
              ? "OmaLeiman ja tapahtumien julkaisut yritystiimille."
              : "OmaLeima and event posts for the business team."}
          </Text>
        </View>
      </View>

      <AnnouncementFeedSection
        compact={false}
        detailPathname="/business/announcement-detail"
        maxItems={15}
        title={language === "fi" ? "Yrityksen tiedotevirta" : "Business update feed"}
        userId={userId}
      />
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    backButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    topBar: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      marginBottom: 4,
    },
    topBarCopy: {
      flex: 1,
      gap: 6,
    },
  });
