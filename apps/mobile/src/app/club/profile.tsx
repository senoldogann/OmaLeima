import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { useClubDashboardQuery } from "@/features/club/club-dashboard";
import type { ClubMembershipSummary } from "@/features/club/types";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { SupportRequestSheet } from "@/features/support/components/support-request-sheet";
import type { ClubSupportOption } from "@/features/support/types";
import { useSession } from "@/providers/session-provider";

type PreferenceSheet = "language" | "theme" | null;

const mapClubSupportOptions = (memberships: ClubMembershipSummary[]): ClubSupportOption[] =>
  memberships.map((membership) => ({
    city: membership.city,
    clubId: membership.clubId,
    clubName: membership.clubName,
    role: membership.membershipRole,
  }));

export default function ClubProfileScreen() {
  const router = useRouter();
  const { copy, language, setLanguage, setThemeMode, theme, themeMode } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [preferenceSheet, setPreferenceSheet] = useState<PreferenceSheet>(null);
  const [isSupportVisible, setIsSupportVisible] = useState<boolean>(false);
  const dashboardQuery = useClubDashboardQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });
  const memberships = useMemo(
    () => dashboardQuery.data?.memberships ?? [],
    [dashboardQuery.data?.memberships]
  );
  const clubSupportOptions = useMemo(() => mapClubSupportOptions(memberships), [memberships]);
  const selectedThemeLabel = themeMode === "dark" ? copy.common.darkMode : copy.common.lightMode;
  const selectedLanguageLabel = language === "fi" ? copy.common.finnish : copy.common.english;

  return (
    <AppScreen>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.push("/club/home")} style={styles.backButton}>
          <AppIcon color={theme.colors.textPrimary} name="chevron-left" size={18} />
        </Pressable>
        <View style={styles.topBarCopy}>
          <Text style={styles.screenTitle}>{language === "fi" ? "Järjestäjä" : "Organizer"}</Text>
          <Text style={styles.metaText}>
            {language === "fi" ? "Asetukset, tuki ja klubiroolit." : "Preferences, support, and club roles."}
          </Text>
        </View>
      </View>

      <InfoCard eyebrow="Club" title={language === "fi" ? "Omat klubit" : "Your clubs"}>
        {dashboardQuery.isLoading ? (
          <Text style={styles.bodyText}>{language === "fi" ? "Ladataan..." : "Loading..."}</Text>
        ) : null}
        {dashboardQuery.error ? <Text style={styles.errorText}>{dashboardQuery.error.message}</Text> : null}
        {!dashboardQuery.isLoading && !dashboardQuery.error ? (
          <View style={styles.clubStack}>
            {memberships.map((membership) => (
              <View key={membership.clubId} style={styles.clubRow}>
                <View style={styles.clubAvatar}>
                  <AppIcon color={theme.colors.actionPrimaryText} name="calendar" size={18} />
                </View>
                <View style={styles.clubCopy}>
                  <Text numberOfLines={1} style={styles.clubName}>
                    {membership.clubName}
                  </Text>
                  <Text numberOfLines={1} style={styles.clubMeta}>
                    {[membership.city, membership.membershipRole].filter(Boolean).join(" · ")}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </InfoCard>

      <InfoCard eyebrow={language === "fi" ? "Asetukset" : "Preferences"} title={copy.common.profile}>
        <View style={styles.preferenceSection}>
          <Pressable onPress={() => setPreferenceSheet("theme")} style={styles.preferenceRow}>
            <View style={styles.preferenceIconWrap}>
              <AppIcon color={theme.colors.lime} name="palette" size={16} />
            </View>
            <Text style={styles.preferenceTitle}>{copy.common.theme}</Text>
            <View style={styles.preferenceValue}>
              <Text style={styles.preferenceValueText}>{selectedThemeLabel}</Text>
              <AppIcon color={theme.colors.textMuted} name="chevron-down" size={16} />
            </View>
          </Pressable>

          <View style={styles.preferenceDivider} />

          <Pressable onPress={() => setPreferenceSheet("language")} style={styles.preferenceRow}>
            <View style={styles.preferenceIconWrap}>
              <AppIcon color={theme.colors.lime} name="globe" size={16} />
            </View>
            <Text style={styles.preferenceTitle}>{copy.common.language}</Text>
            <View style={styles.preferenceValue}>
              <Text style={styles.preferenceValueText}>{selectedLanguageLabel}</Text>
              <AppIcon color={theme.colors.textMuted} name="chevron-down" size={16} />
            </View>
          </Pressable>

          <View style={styles.preferenceDivider} />

          <Pressable onPress={() => setIsSupportVisible(true)} style={styles.preferenceRow}>
            <View style={styles.preferenceIconWrap}>
              <AppIcon color={theme.colors.lime} name="support" size={16} />
            </View>
            <Text style={styles.preferenceTitle}>{copy.common.support}</Text>
            <View style={styles.preferenceValue}>
              <Text style={styles.preferenceValueText}>{copy.common.open}</Text>
              <AppIcon color={theme.colors.textMuted} name="chevron-right" size={16} />
            </View>
          </Pressable>

          <View style={styles.preferenceDivider} />

          <SignOutButton />
        </View>
      </InfoCard>

      <Modal
        animationType="fade"
        onRequestClose={() => setPreferenceSheet(null)}
        transparent
        visible={preferenceSheet !== null}
      >
        <Pressable onPress={() => setPreferenceSheet(null)} style={styles.modalBackdrop}>
          <Pressable onPress={() => {}} style={styles.preferenceModalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalEyebrow}>{language === "fi" ? "Asetus" : "Setting"}</Text>
                <Text style={styles.modalTitle}>
                  {preferenceSheet === "theme" ? copy.common.theme : copy.common.language}
                </Text>
              </View>
              <Pressable onPress={() => setPreferenceSheet(null)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>{language === "fi" ? "Valmis" : "Done"}</Text>
              </Pressable>
            </View>

            <View style={styles.preferenceOptionList}>
              {preferenceSheet === "theme" ? (
                <>
                  <Pressable
                    onPress={() => {
                      void setThemeMode("dark");
                      setPreferenceSheet(null);
                    }}
                    style={[styles.preferenceOption, themeMode === "dark" ? styles.preferenceOptionActive : null]}
                  >
                    <Text style={styles.preferenceOptionTitle}>{copy.common.darkMode}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void setThemeMode("light");
                      setPreferenceSheet(null);
                    }}
                    style={[styles.preferenceOption, themeMode === "light" ? styles.preferenceOptionActive : null]}
                  >
                    <Text style={styles.preferenceOptionTitle}>{copy.common.lightMode}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    onPress={() => {
                      void setLanguage("fi");
                      setPreferenceSheet(null);
                    }}
                    style={[styles.preferenceOption, language === "fi" ? styles.preferenceOptionActive : null]}
                  >
                    <Text style={styles.preferenceOptionTitle}>{copy.common.finnish}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void setLanguage("en");
                      setPreferenceSheet(null);
                    }}
                    style={[styles.preferenceOption, language === "en" ? styles.preferenceOptionActive : null]}
                  >
                    <Text style={styles.preferenceOptionTitle}>{copy.common.english}</Text>
                  </Pressable>
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <SupportRequestSheet
        area="CLUB"
        businessOptions={[]}
        clubOptions={clubSupportOptions}
        isVisible={isSupportVisible}
        onClose={() => setIsSupportVisible(false)}
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
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    clubAvatar: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    clubCopy: {
      flex: 1,
      gap: 4,
    },
    clubMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    clubName: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    clubRow: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flexDirection: "row",
      gap: 12,
      padding: 12,
    },
    clubStack: {
      gap: 10,
    },
    errorText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    modalBackdrop: {
      alignItems: "center",
      backgroundColor: theme.mode === "dark" ? "rgba(0, 0, 0, 0.66)" : "rgba(12, 16, 12, 0.22)",
      flex: 1,
      justifyContent: "center",
      padding: 20,
    },
    modalCloseButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL3,
      borderRadius: 999,
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    modalCloseText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
    },
    modalEyebrow: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.1,
      textTransform: "uppercase",
    },
    modalHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    modalHeaderCopy: {
      flex: 1,
      gap: 4,
    },
    modalTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    preferenceDivider: {
      backgroundColor: theme.colors.borderDefault,
      height: StyleSheet.hairlineWidth,
    },
    preferenceIconWrap: {
      alignItems: "center",
      backgroundColor: theme.colors.limeSurface,
      borderRadius: 999,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    preferenceModalCard: {
      alignSelf: "stretch",
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radius.card,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 18,
      padding: 18,
    },
    preferenceOption: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    preferenceOptionActive: {
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
    },
    preferenceOptionList: {
      gap: 10,
    },
    preferenceOptionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    preferenceRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      minHeight: 48,
    },
    preferenceSection: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      padding: 12,
    },
    preferenceTitle: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    preferenceValue: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    preferenceValueText: {
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
    },
    topBarCopy: {
      flex: 1,
      gap: 6,
    },
  });
