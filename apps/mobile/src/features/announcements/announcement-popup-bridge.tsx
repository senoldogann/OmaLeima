import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import {
  useAcknowledgeAnnouncementMutation,
  useActiveAnnouncementsQuery,
} from "@/features/announcements/announcements";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

export const AnnouncementPopupBridge = () => {
  const styles = useThemeStyles(createStyles);
  const { language, theme } = useUiPreferences();
  const { session, isLoading } = useSession();
  const userId = session?.user.id ?? "";
  const announcementsQuery = useActiveAnnouncementsQuery({
    isEnabled: !isLoading && session !== null,
    userId,
  });
  const acknowledgeMutation = useAcknowledgeAnnouncementMutation();
  const announcement = announcementsQuery.data?.[0] ?? null;

  const labels = {
    close: language === "fi" ? "Selvä" : "Got it",
    eyebrow: language === "fi" ? "Tiedote" : "Announcement",
    open: language === "fi" ? "Avaa" : "Open",
  };

  const handleClosePress = async (): Promise<void> => {
    if (announcement === null || session === null) {
      return;
    }

    await acknowledgeMutation.mutateAsync({
      announcementId: announcement.announcementId,
      userId: session.user.id,
    });
  };

  const handleCtaPress = async (): Promise<void> => {
    if (announcement === null || announcement.ctaUrl === null) {
      return;
    }

    await Linking.openURL(announcement.ctaUrl);
  };

  return (
    <Modal animationType="fade" transparent visible={announcement !== null}>
      <View style={styles.backdrop}>
        {announcement !== null ? (
          <View style={styles.card}>
            <View style={styles.iconBubble}>
              <AppIcon color={theme.colors.lime} name="bell" size={24} />
            </View>
            <View style={styles.copyStack}>
              <Text style={styles.eyebrow}>{announcement.clubName ?? labels.eyebrow}</Text>
              <Text style={styles.title}>{announcement.title}</Text>
              <Text style={styles.body}>{announcement.body}</Text>
            </View>
            <View style={styles.actionRow}>
              <Pressable
                disabled={acknowledgeMutation.isPending}
                onPress={() => void handleClosePress()}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>{labels.close}</Text>
              </Pressable>
              {announcement.ctaUrl !== null ? (
                <Pressable onPress={() => void handleCtaPress()} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>{announcement.ctaLabel ?? labels.open}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    actionRow: {
      flexDirection: "row",
      gap: 10,
    },
    backdrop: {
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.72)",
      flex: 1,
      justifyContent: "center",
      padding: 18,
    },
    body: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      textAlign: "center",
    },
    card: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: 34,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 18,
      maxWidth: 520,
      padding: 22,
      width: "100%",
    },
    copyStack: {
      alignItems: "center",
      gap: 8,
    },
    eyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.2,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textAlign: "center",
      textTransform: "uppercase",
    },
    iconBubble: {
      alignItems: "center",
      backgroundColor: theme.colors.limeSurface,
      borderRadius: 999,
      height: 58,
      justifyContent: "center",
      width: 58,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: 18,
      flex: 1,
      justifyContent: "center",
      minHeight: 54,
      paddingHorizontal: 16,
    },
    primaryButtonText: {
      color: "#071006",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      textAlign: "center",
    },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 18,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flex: 1,
      justifyContent: "center",
      minHeight: 54,
      paddingHorizontal: 16,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      textAlign: "center",
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
      textAlign: "center",
    },
  });
