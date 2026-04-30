import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { useBusinessHomeOverviewQuery } from "@/features/business/business-home";
import type { BusinessMembershipSummary } from "@/features/business/types";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { SupportRequestSheet } from "@/features/support/components/support-request-sheet";
import type { BusinessSupportOption } from "@/features/support/types";
import { useSession } from "@/providers/session-provider";

type PreferenceSheet = "language" | "theme" | null;

const createMembershipSummary = (memberships: BusinessMembershipSummary[], language: "fi" | "en"): string => {
  if (memberships.length === 0) {
    return language === "fi" ? "Ei aktiivisia yritysrooleja." : "No active business memberships.";
  }

  if (memberships.length === 1) {
    const membership = memberships[0];
    return `${membership.businessName} · ${membership.city} · ${membership.role}`;
  }

  return language === "fi"
    ? `${memberships.length} aktiivista yritysroolia`
    : `${memberships.length} active business memberships`;
};

const mapSupportOptions = (memberships: BusinessMembershipSummary[]): BusinessSupportOption[] =>
  memberships.map((membership) => ({
    businessId: membership.businessId,
    businessName: membership.businessName,
    city: membership.city,
    role: membership.role,
  }));

export default function BusinessProfileScreen() {
  const { session } = useSession();
  const { copy, language, setLanguage, setThemeMode, theme, themeMode } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const userId = session?.user.id ?? null;
  const [preferenceSheet, setPreferenceSheet] = useState<PreferenceSheet>(null);
  const [isSupportVisible, setIsSupportVisible] = useState<boolean>(false);

  const homeOverviewQuery = useBusinessHomeOverviewQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });

  const memberships = useMemo<BusinessMembershipSummary[]>(
    () => homeOverviewQuery.data?.memberships ?? [],
    [homeOverviewQuery.data?.memberships]
  );
  const supportOptions = useMemo(() => mapSupportOptions(memberships), [memberships]);
  const selectedThemeLabel = themeMode === "dark" ? copy.common.darkMode : copy.common.lightMode;
  const selectedLanguageLabel = language === "fi" ? copy.common.finnish : copy.common.english;

  return (
    <AppScreen>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>{copy.common.profile}</Text>
        <Text style={styles.metaText}>{copy.business.profileMeta}</Text>
      </View>

      {homeOverviewQuery.isLoading ? (
        <InfoCard eyebrow={copy.common.loading} title={copy.common.business}>
          <Text style={styles.bodyText}>
            {language === "fi"
              ? "Ladataan yritysroolit ja asetukset."
              : "Loading business memberships and settings."}
          </Text>
        </InfoCard>
      ) : null}

      {homeOverviewQuery.error ? (
        <InfoCard eyebrow={copy.common.error} title={copy.common.business}>
          <Text style={styles.bodyText}>{homeOverviewQuery.error.message}</Text>
          <Pressable onPress={() => void homeOverviewQuery.refetch()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{copy.common.retry}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error ? (
        <>
          <InfoCard eyebrow={copy.common.business} title={session?.user.email ?? copy.common.business}>
            <Text style={styles.bodyText}>{createMembershipSummary(memberships, language)}</Text>
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
            </View>

            <View style={styles.preferenceDivider} />

            <View style={styles.preferenceSection}>
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
            </View>

            <View style={styles.preferenceDivider} />

            <View style={styles.preferenceSection}>
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
            </View>

            <View style={styles.preferenceDivider} />

            <View style={styles.preferenceSection}>
              <SignOutButton />
            </View>
          </InfoCard>
        </>
      ) : null}

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
        area="BUSINESS"
        businessOptions={supportOptions}
        isVisible={isSupportVisible}
        onClose={() => setIsSupportVisible(false)}
        userId={userId}
      />
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    modalBackdrop: {
      backgroundColor: theme.mode === "dark" ? "rgba(0, 0, 0, 0.66)" : "rgba(12, 16, 12, 0.22)",
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 20,
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
      backgroundColor: theme.colors.borderSubtle,
      height: 1,
    },
    preferenceIconWrap: {
      alignItems: "center",
      justifyContent: "center",
      width: 22,
    },
    preferenceModalCard: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radius.card,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 16,
      padding: 18,
    },
    preferenceOption: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
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
    },
    preferenceSection: {
      gap: 12,
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
      gap: 8,
    },
    preferenceValueText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    screenHeader: {
      gap: 6,
      marginBottom: 4,
    },
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: theme.radius.button,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
  });
