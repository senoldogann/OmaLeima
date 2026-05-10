import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { usePathname, useRouter } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { useSessionAccessQuery } from "@/features/auth/session-access";
import {
  useAcknowledgeAnnouncementMutation,
  useActiveAnnouncementsQuery,
  useAnnouncementRealtimeInvalidation,
} from "@/features/announcements/announcements";
import { getFallbackCoverSource } from "@/features/events/event-visuals";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useIsScannerProvisioningActive } from "@/features/scanner/scanner-provisioning-state";
import { useSession } from "@/providers/session-provider";

const resolveAnnouncementReturnToPath = (
  area: "business" | "club" | "student" | "unsupported",
  currentPathname: string
): string | null => {
  if (currentPathname.endsWith("/announcement-detail")) {
    if (area === "business") {
      return "/business/updates";
    }

    if (area === "club") {
      return "/club/announcements";
    }

    if (area === "student") {
      return "/student/updates";
    }

    return null;
  }

  return currentPathname;
};

export const AnnouncementPopupBridge = () => {
  const currentPathname = usePathname();
  const router = useRouter();
  const styles = useThemeStyles(createStyles);
  const { language, theme } = useUiPreferences();
  const { session, isLoading } = useSession();
  const userId = session?.user.id ?? "";
  const isScannerProvisioningActive = useIsScannerProvisioningActive();
  const accessQuery = useSessionAccessQuery({
    isEnabled: !isLoading && session !== null && !isScannerProvisioningActive,
    userId,
  });
  const canShowAnnouncements =
    !isLoading &&
    session !== null &&
    !isScannerProvisioningActive &&
    typeof accessQuery.data !== "undefined" &&
    accessQuery.data.area !== "unsupported" &&
    !accessQuery.data.isBusinessScannerOnly;
  const announcementsQuery = useActiveAnnouncementsQuery({
    isEnabled: canShowAnnouncements,
    userId,
  });
  const acknowledgeMutation = useAcknowledgeAnnouncementMutation();
  const [dismissedAnnouncementId, setDismissedAnnouncementId] = useState<string | null>(null);
  const activeAnnouncement = announcementsQuery.data?.[0] ?? null;
  const announcement =
    canShowAnnouncements && activeAnnouncement !== null && activeAnnouncement.announcementId !== dismissedAnnouncementId
      ? activeAnnouncement
      : null;
  useAnnouncementRealtimeInvalidation({
    isEnabled: canShowAnnouncements,
    userId,
  });

  const labels = {
    close: language === "fi" ? "Selvä" : "Got it",
    eyebrow: language === "fi" ? "Tiedote" : "Announcement",
    more: language === "fi" ? "Näytä lisää" : "View more",
    open: language === "fi" ? "Avaa" : "Open",
    platformSender: "OmaLeima Support",
  };

  const handleClosePress = async (): Promise<void> => {
    if (announcement === null || session === null) {
      return;
    }

    const announcementId = announcement.announcementId;
    const userId = session.user.id;

    try {
      await acknowledgeMutation.mutateAsync({
        announcementId,
        userId,
      });
    } catch (error) {
      console.warn("announcement_popup_acknowledge_failed", {
        announcementId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setDismissedAnnouncementId(announcementId);
    }
  };

  const handleCtaPress = async (): Promise<void> => {
    if (announcement === null || announcement.ctaUrl === null) {
      return;
    }

    try {
      const canOpenUrl = await Linking.canOpenURL(announcement.ctaUrl);

      if (!canOpenUrl) {
        throw new Error(language === "fi" ? "Linkkiä ei voitu avata." : "Could not open the link.");
      }

      await Linking.openURL(announcement.ctaUrl);
    } catch (error) {
      console.warn("announcement_popup_cta_open_failed", {
        announcementId: announcement.announcementId,
        ctaUrl: announcement.ctaUrl,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleMorePress = (): void => {
    if (announcement === null) {
      return;
    }

    setDismissedAnnouncementId(announcement.announcementId);

    const area =
      currentPathname.startsWith("/business")
        ? "business"
        : currentPathname.startsWith("/club")
          ? "club"
          : currentPathname.startsWith("/student")
            ? "student"
            : (accessQuery.data?.area ?? "unsupported");
    const detailPathname =
      area === "business"
        ? "/business/announcement-detail"
        : area === "club"
          ? "/club/announcement-detail"
          : "/student/announcement-detail";
    const returnToPath = resolveAnnouncementReturnToPath(area, currentPathname);

    if (area === "unsupported" || returnToPath === null) {
      return;
    }

    router.push({
      pathname: detailPathname,
      params: {
        announcementId: announcement.announcementId,
        returnTo: returnToPath,
      },
    });
  };

  return (
    <Modal animationType="fade" transparent visible={announcement !== null}>
      <View style={styles.backdrop}>
        {announcement !== null ? (
          <View style={styles.card}>
            <View style={styles.iconBubble}>
              <AppIcon color={theme.colors.lime} name="bell" size={24} />
            </View>
            <CoverImageSurface
              fallbackSource={getFallbackCoverSource("eventDiscovery")}
              source={announcement.imageUrl === null ? null : { uri: announcement.imageUrl }}
              style={styles.heroImage}
            />
            <View style={styles.copyStack}>
              <Text style={styles.eyebrow}>{announcement.clubName ?? labels.platformSender}</Text>
              <Text style={styles.title}>{announcement.title}</Text>
              <Text numberOfLines={4} style={styles.body}>{announcement.body}</Text>
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
              <Pressable onPress={handleMorePress} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>{labels.more}</Text>
              </Pressable>
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
      flexWrap: "wrap",
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
    heroImage: {
      alignSelf: "stretch",
      borderRadius: 22,
      height: 160,
      overflow: "hidden",
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: 18,
      flexGrow: 1,
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
      flexGrow: 1,
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
