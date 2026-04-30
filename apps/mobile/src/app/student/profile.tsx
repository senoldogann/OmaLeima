import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { interactiveSurfaceShadowStyle, type MobileTheme } from "@/features/foundation/theme";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { ProfileTagCard } from "@/features/profile/components/profile-tag-card";
import {
  useAttachDepartmentTagMutation,
  useCreateCustomDepartmentTagMutation,
  useRemoveDepartmentTagMutation,
  useSetPrimaryDepartmentTagMutation,
  useStudentProfileOverviewQuery,
} from "@/features/profile/student-profile";
import type { DepartmentTagSuggestion, StudentProfileTag } from "@/features/profile/types";
import { useRegisterPushDeviceMutation, type PushDeviceRegistrationResult } from "@/features/push/device-registration";
import { useNativePushDiagnostics } from "@/features/push/native-push-diagnostics";
import { useSession } from "@/providers/session-provider";

type PreferenceSheet = "language" | "theme" | null;

const createTagSummary = (language: "fi" | "en", count: number, remainingTagSlots: number): string => {
  if (language === "fi") {
    if (count === 0) {
      return "Valitse tähän omat tagisi.";
    }

    if (remainingTagSlots === 0) {
      return "Kaikki kolme tagipaikkaa ovat käytössä.";
    }

    return `${count} tagia valittu, ${remainingTagSlots} paikkaa jäljellä.`;
  }

  if (count === 0) {
    return "No department tags selected yet.";
  }

  if (remainingTagSlots === 0) {
    return "All three tag slots are in use.";
  }

  return `${count} tags selected, ${remainingTagSlots} slots left.`;
};

const createSuggestionMeta = (tag: DepartmentTagSuggestion): string => {
  const locationParts = [tag.universityName, tag.city].filter(
    (part): part is string => part !== null && part.length > 0
  );

  if (locationParts.length === 0) {
    return tag.slug;
  }

  return `${locationParts.join(" · ")} · ${tag.slug}`;
};

const createMutationError = (errors: (string | null)[]): string | null =>
  errors.find((error): error is string => error !== null) ?? null;

const createPushPreferenceSummary = (
  language: "fi" | "en",
  permissionState: "granted" | "denied" | "undetermined" | "provisional" | "unavailable",
  pushState: PushDeviceRegistrationResult | null
): string => {
  if (pushState?.state === "registered") {
    return language === "fi" ? "Ilmoitukset ovat käytössä tällä laitteella." : "Notifications are active on this device.";
  }

  if (language === "fi") {
    switch (permissionState) {
      case "granted":
        return "Ilmoituslupa on myönnetty.";
      case "provisional":
        return "Ilmoituslupa on iOS-laitteessa väliaikaisesti myönnetty.";
      case "denied":
        return "Ilmoituslupa on estetty tällä laitteella.";
      case "undetermined":
        return "Ilmoituslupaa ei ole vielä myönnetty tässä istunnossa.";
      case "unavailable":
        return "Ilmoitukset eivät ole käytettävissä tässä ympäristössä.";
    }
  }

  switch (permissionState) {
    case "granted":
      return "Notification permission is granted.";
    case "provisional":
      return "Notification permission is provisionally granted on iOS.";
    case "denied":
      return "Notification permission is denied on this device.";
    case "undetermined":
      return "Notification permission has not been granted yet in this app session.";
    case "unavailable":
      return "Notification permission is unavailable in this runtime.";
  }
};

export default function StudentProfileScreen() {
  const theme = useAppTheme();
  const { copy, language, themeMode, setLanguage, setThemeMode } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const { session } = useSession();
  const { diagnostics, refreshPushPermissionStateAsync } = useNativePushDiagnostics();
  const studentId = session?.user.id ?? null;
  const [customTitle, setCustomTitle] = useState<string>("");
  const [pushState, setPushState] = useState<PushDeviceRegistrationResult | null>(null);
  const [isTagModalVisible, setIsTagModalVisible] = useState<boolean>(false);
  const [preferenceSheet, setPreferenceSheet] = useState<PreferenceSheet>(null);

  const profileOverviewQuery = useStudentProfileOverviewQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null,
  });
  const attachTagMutation = useAttachDepartmentTagMutation();
  const createCustomTagMutation = useCreateCustomDepartmentTagMutation();
  const setPrimaryTagMutation = useSetPrimaryDepartmentTagMutation();
  const removeTagMutation = useRemoveDepartmentTagMutation();
  const registerPushMutation = useRegisterPushDeviceMutation();

  const profileOverview = profileOverviewQuery.data ?? null;
  const selectedTags = profileOverview?.selectedTags ?? [];
  const primaryTag = selectedTags.find((tag) => tag.isPrimary) ?? null;
  const suggestedTags = profileOverview?.suggestedTags ?? [];
  const remainingTagSlots = profileOverview?.remainingTagSlots ?? 3;
  const isTagMutationPending =
    attachTagMutation.isPending ||
    createCustomTagMutation.isPending ||
    setPrimaryTagMutation.isPending ||
    removeTagMutation.isPending;

  const latestTagMutationError = useMemo(
    () =>
      createMutationError([
        attachTagMutation.error?.message ?? null,
        createCustomTagMutation.error?.message ?? null,
        setPrimaryTagMutation.error?.message ?? null,
        removeTagMutation.error?.message ?? null,
      ]),
    [
      attachTagMutation.error?.message,
      createCustomTagMutation.error?.message,
      removeTagMutation.error?.message,
      setPrimaryTagMutation.error?.message,
    ]
  );
  const selectedThemeLabel = themeMode === "dark" ? copy.common.darkMode : copy.common.lightMode;
  const selectedLanguageLabel = language === "fi" ? copy.common.finnish : copy.common.english;

  const handleRegisterPushPress = async (): Promise<void> => {
    const result = await registerPushMutation.mutateAsync({
      accessToken: session?.access_token ?? "",
    });
    setPushState(result);
    await refreshPushPermissionStateAsync();
  };

  const handleAttachSuggestedTagPress = async (tag: DepartmentTagSuggestion): Promise<void> => {
    if (studentId === null) {
      return;
    }

    await attachTagMutation.mutateAsync({
      studentId,
      departmentTagId: tag.id,
      currentTags: selectedTags,
    });
  };

  const handleCreateCustomTagPress = async (): Promise<void> => {
    if (studentId === null) {
      return;
    }

    await createCustomTagMutation.mutateAsync({
      studentId,
      title: customTitle,
      currentTags: selectedTags,
    });
    setCustomTitle("");
  };

  const handleSetPrimaryTagPress = async (tag: StudentProfileTag): Promise<void> => {
    if (studentId === null || tag.isPrimary) {
      return;
    }

    await setPrimaryTagMutation.mutateAsync({
      studentId,
      linkId: tag.linkId,
    });
  };

  const handleRemoveTagPress = async (tag: StudentProfileTag): Promise<void> => {
    if (studentId === null) {
      return;
    }

    await removeTagMutation.mutateAsync({
      studentId,
      tag,
      remainingTags: selectedTags.filter((selectedTag) => selectedTag.linkId !== tag.linkId),
    });
  };

  return (
    <AppScreen>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>{copy.common.profile}</Text>
        <Text style={styles.metaText}>{copy.student.profileMeta}</Text>
      </View>

      {profileOverviewQuery.isLoading ? (
        <InfoCard eyebrow={copy.common.loading} title={copy.common.profile}>
          <Text selectable style={styles.bodyText}>
            {language === "fi"
              ? "Ladataan profiili, tagit ja ehdotukset."
              : "Loading profile identity, tags, and suggestions."}
          </Text>
        </InfoCard>
      ) : null}

      {profileOverviewQuery.error ? (
        <InfoCard eyebrow={copy.common.error} title={copy.common.profile}>
          <Text selectable style={styles.bodyText}>{profileOverviewQuery.error.message}</Text>
          <Pressable onPress={() => void profileOverviewQuery.refetch()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{copy.common.retry}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {profileOverview ? (
        <View style={styles.profileStage}>
          <View style={styles.profileHero}>
            <View style={styles.avatarShell}>
              <View style={styles.avatarCore}>
                <AppIcon color={theme.colors.screenBase} name="user" size={34} />
              </View>
            </View>

            <View style={styles.profileCopy}>
              <Text selectable style={styles.profileName}>
                {profileOverview.displayName ?? (language === "fi" ? "Opiskelijaprofiili" : "Student profile")}
              </Text>
              <Text selectable style={styles.accountEmail}>{profileOverview.email}</Text>
              <Text selectable style={styles.roleLine}>
                {primaryTag?.title ?? (language === "fi" ? "Opiskelija" : "Student")}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {latestTagMutationError ? <Text selectable style={styles.errorText}>{latestTagMutationError}</Text> : null}

      <InfoCard
        eyebrow={language === "fi" ? "Asetukset" : "Preferences"}
        title={language === "fi" ? "Profiilin asetukset" : "Profile settings"}
      >
        {!profileOverviewQuery.isLoading && !profileOverviewQuery.error ? (
          <>
            <View style={styles.preferenceSection}>
              <Pressable onPress={() => setIsTagModalVisible(true)} style={styles.tagsPreferenceRow}>
                <View style={styles.preferenceIconWrap}>
                  <AppIcon color={theme.colors.lime} name="user" size={16} />
                </View>
                <View style={styles.preferenceHeaderCopy}>
                  <Text selectable style={styles.preferenceTitle}>{copy.student.departmentTags}</Text>
                  <Text numberOfLines={1} selectable style={styles.preferenceSummaryText}>
                    {createTagSummary(language, selectedTags.length, remainingTagSlots)}
                  </Text>
                </View>
                <AppIcon color={theme.colors.textMuted} name="chevron-right" size={16} />
              </Pressable>
            </View>

            <View style={styles.preferenceDivider} />
          </>
        ) : null}

        <View style={styles.preferenceSection}>
          <Pressable onPress={() => setPreferenceSheet("theme")} style={styles.preferenceSelectRow}>
            <View style={styles.preferenceIconWrap}>
              <AppIcon color={theme.colors.lime} name="palette" size={16} />
            </View>
            <View style={styles.preferenceHeaderCopy}>
              <Text selectable style={styles.preferenceTitle}>{copy.common.theme}</Text>
            </View>
            <View style={styles.preferenceSelectValue}>
              <Text selectable style={styles.preferenceSelectValueText}>{selectedThemeLabel}</Text>
              <AppIcon color={theme.colors.textMuted} name="chevron-down" size={16} />
            </View>
          </Pressable>
        </View>

        <View style={styles.preferenceDivider} />

        <View style={styles.preferenceSection}>
          <Pressable onPress={() => setPreferenceSheet("language")} style={styles.preferenceSelectRow}>
            <View style={styles.preferenceIconWrap}>
              <AppIcon color={theme.colors.lime} name="globe" size={16} />
            </View>
            <View style={styles.preferenceHeaderCopy}>
              <Text selectable style={styles.preferenceTitle}>{copy.common.language}</Text>
            </View>
            <View style={styles.preferenceSelectValue}>
              <Text selectable style={styles.preferenceSelectValueText}>{selectedLanguageLabel}</Text>
              <AppIcon color={theme.colors.textMuted} name="chevron-down" size={16} />
            </View>
          </Pressable>
        </View>

        <View style={styles.preferenceDivider} />

        <View style={styles.preferenceSection}>
          <View style={styles.preferenceHeader}>
            <View style={styles.preferenceIconWrap}>
              <AppIcon color={theme.colors.lime} name="bell" size={16} />
            </View>
            <View style={styles.preferenceHeaderCopy}>
              <Text selectable style={styles.preferenceTitle}>{copy.common.notifications}</Text>
              <Text selectable style={styles.metaText}>
                {createPushPreferenceSummary(language, diagnostics.permissionState, pushState)}
              </Text>
              {pushState !== null ? (
                <Text selectable style={pushState.state === "error" ? styles.errorText : styles.metaText}>
                  {pushState.detail}
                </Text>
              ) : null}
            </View>
          </View>
          <Pressable
            disabled={registerPushMutation.isPending}
            onPress={handleRegisterPushPress}
            style={[styles.primaryButton, registerPushMutation.isPending ? styles.disabledButton : null]}
          >
            <Text style={styles.primaryButtonText}>
              {registerPushMutation.isPending
                ? language === "fi"
                  ? "Otetaan ilmoitukset käyttöön..."
                  : "Enabling notifications..."
                : language === "fi"
                  ? "Ota ilmoitukset käyttöön"
                  : "Enable notifications"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.preferenceDivider} />

        <View style={styles.preferenceSection}>
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

      <Modal
        animationType="slide"
        onRequestClose={() => setIsTagModalVisible(false)}
        transparent
        visible={isTagModalVisible}
      >
        <Pressable onPress={() => setIsTagModalVisible(false)} style={styles.modalBackdrop}>
          <Pressable onPress={() => {}} style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalEyebrow}>{copy.student.departmentTags}</Text>
                <Text style={styles.modalTitle}>
                  {language === "fi" ? "Hallitse tageja" : "Manage tags"}
                </Text>
              </View>
              <Pressable onPress={() => setIsTagModalVisible(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>{language === "fi" ? "Valmis" : "Done"}</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {selectedTags.length > 0 ? (
                <View style={styles.stack}>
                  {selectedTags.map((tag) => (
                    <ProfileTagCard
                      key={tag.linkId}
                      isBusy={isTagMutationPending}
                      onRemove={handleRemoveTagPress}
                      onSetPrimary={handleSetPrimaryTagPress}
                      tag={tag}
                    />
                  ))}
                </View>
              ) : (
                <Text selectable style={styles.bodyText}>
                  {language === "fi" ? "Tagit näkyvät täällä, kun valitset ensimmäisen." : "Tags appear here after your first selection."}
                </Text>
              )}

              {suggestedTags.length > 0 ? (
                <View style={styles.suggestionGroup}>
                  <Text style={styles.sectionLabel}>{language === "fi" ? "Ehdotukset" : "Suggestions"}</Text>
                  <View style={styles.suggestionList}>
                    {suggestedTags.map((tag) => (
                      <Pressable
                        key={tag.id}
                        disabled={isTagMutationPending || remainingTagSlots === 0}
                        onPress={() => void handleAttachSuggestedTagPress(tag)}
                        style={[
                          styles.suggestionChip,
                          isTagMutationPending || remainingTagSlots === 0 ? styles.disabledButton : null,
                        ]}
                      >
                        <Text style={styles.suggestionTitle}>{tag.title}</Text>
                        <Text style={styles.metaText}>{createSuggestionMeta(tag)}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              {remainingTagSlots > 0 ? (
                <View style={styles.createGroup}>
                  <Text style={styles.sectionLabel}>{language === "fi" ? "Luo oma tagi" : "Create a custom tag"}</Text>
                  <TextInput
                    autoCapitalize="words"
                    editable={!isTagMutationPending}
                    onChangeText={setCustomTitle}
                    placeholder={language === "fi" ? "Esim. Tieto- ja viestintätekniikka" : "Example: Information technology"}
                    placeholderTextColor={theme.colors.textDim}
                    style={styles.input}
                    value={customTitle}
                  />
                  <Pressable
                    disabled={isTagMutationPending || customTitle.trim().length === 0}
                    onPress={() => void handleCreateCustomTagPress()}
                    style={[
                      styles.secondaryButton,
                      isTagMutationPending || customTitle.trim().length === 0 ? styles.disabledButton : null,
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>{language === "fi" ? "Luo tagi" : "Create tag"}</Text>
                  </Pressable>
                </View>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    accountEmail: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    avatarCore: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      height: 72,
      justifyContent: "center",
      width: 72,
    },
    avatarShell: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderStrong,
      borderRadius: 999,
      borderWidth: 1,
      height: 88,
      justifyContent: "center",
      width: 88,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    createGroup: {
      gap: 10,
    },
    disabledButton: {
      opacity: 0.6,
    },
    errorText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    input: {
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: theme.radius.button,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.body,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    modalBackdrop: {
      backgroundColor: theme.mode === "dark" ? "rgba(0, 0, 0, 0.66)" : "rgba(12, 16, 12, 0.22)",
      flex: 1,
      justifyContent: "flex-end",
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
    modalScrollContent: {
      gap: 16,
      paddingBottom: 20,
    },
    modalSheet: {
      backgroundColor: theme.colors.surfaceL1,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      gap: 16,
      maxHeight: "82%",
      paddingBottom: 28,
      paddingHorizontal: 20,
      paddingTop: 18,
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
    preferenceHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
    },
    preferenceHeaderCopy: {
      flex: 1,
      gap: 2,
    },
    preferenceModalCard: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      gap: 16,
      marginHorizontal: 20,
      padding: 18,
    },
    preferenceOption: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: 1,
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
    preferenceIconWrap: {
      alignItems: "center",
      backgroundColor: theme.colors.limeSurface,
      borderRadius: 999,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    preferenceSection: {
      gap: 12,
    },
    preferenceSelectRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    preferenceSelectValue: {
      alignItems: "center",
      flexDirection: "row",
      flex: 1,
      gap: 8,
      justifyContent: "flex-end",
    },
    preferenceSelectValueText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
      textAlign: "right",
    },
    preferenceSummaryText: {
      color: theme.colors.textMuted,
      flexShrink: 1,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    preferenceTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    tagsPreferenceRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      paddingHorizontal: 14,
      paddingVertical: 12,
      ...interactiveSurfaceShadowStyle,
    },
    primaryButtonText: {
      color: theme.colors.screenBase,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
    },
    profileCopy: {
      flex: 1,
      gap: 6,
    },
    profileHero: {
      alignItems: "center",
      flexDirection: "row",
      gap: 14,
    },
    profileName: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    profileStage: {
      gap: 14,
      paddingBottom: 4,
    },
    roleLine: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      letterSpacing: 0.8,
      lineHeight: theme.typography.lineHeights.caption,
      textTransform: "uppercase",
    },
    screenHeader: {
      gap: 6,
      marginBottom: 4,
    },
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.titleLarge,
      letterSpacing: -0.8,
      lineHeight: theme.typography.lineHeights.titleLarge,
    },
    sectionLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    secondaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: theme.radius.button,
      paddingHorizontal: 14,
      paddingVertical: 12,
      ...interactiveSurfaceShadowStyle,
    },
    secondaryButtonRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
    },
    stack: {
      gap: 12,
    },
    suggestionChip: {
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: theme.radius.card,
      gap: 4,
      padding: 14,
      ...interactiveSurfaceShadowStyle,
    },
    suggestionGroup: {
      gap: 10,
    },
    suggestionList: {
      gap: 8,
    },
    suggestionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
  });
