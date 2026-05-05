import { StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { AnnouncementFeedSection } from "@/features/announcements/announcement-feed-section";
import { PublicClubDirectorySection } from "@/features/club/public-club-directory-section";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { StudentProfileHeaderAction } from "@/features/profile/components/student-profile-header-action";
import { useSession } from "@/providers/session-provider";

export default function StudentUpdatesScreen() {
  const styles = useThemeStyles(createStyles);
  const { language } = useUiPreferences();
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  return (
    <AppScreen>
      <View style={styles.topBar}>
        <View style={styles.topBarCopy}>
          <Text style={styles.screenEyebrow}>{language === "fi" ? "Leima" : "OmaLeima"}</Text>
          <Text style={styles.screenTitle}>{language === "fi" ? "Yhteisö" : "Community"}</Text>
          <Text style={styles.metaText}>
            {language === "fi"
              ? "Tiedotteet ja opiskelijaklubit yhdessä paikassa."
              : "Updates and student clubs in one place."}
          </Text>
        </View>
        <StudentProfileHeaderAction />
      </View>

      <AnnouncementFeedSection
        compact={false}
        detailPathname="/student/announcement-detail"
        maxItems={15}
        title={language === "fi" ? "Ajankohtaista" : "Latest updates"}
        userId={userId}
      />

      <PublicClubDirectorySection isEnabled={userId !== null} />
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    screenEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.titleLarge,
      letterSpacing: -0.8,
      lineHeight: theme.typography.lineHeights.titleLarge,
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
