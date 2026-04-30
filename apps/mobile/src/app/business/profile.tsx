import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import {
  type BusinessMediaKind,
  pickBusinessMediaAsync,
  uploadBusinessMediaAsync,
} from "@/features/business/business-media";
import {
  canManageBusinessProfile,
  createBusinessProfileDraft,
  useUpdateBusinessProfileMutation,
  type BusinessProfileDraft,
} from "@/features/business/business-profile";
import { useBusinessHomeOverviewQuery } from "@/features/business/business-home";
import type { BusinessMembershipSummary } from "@/features/business/types";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { SupportRequestSheet } from "@/features/support/components/support-request-sheet";
import type { BusinessSupportOption } from "@/features/support/types";
import { useSession } from "@/providers/session-provider";

type PreferenceSheet = "language" | "theme" | null;
type BusinessProfileDraftField = keyof Pick<
  BusinessProfileDraft,
  | "name"
  | "contactEmail"
  | "phone"
  | "address"
  | "city"
  | "websiteUrl"
  | "instagramUrl"
  | "yTunnus"
  | "contactPersonName"
  | "openingHours"
  | "announcement"
>;

type EditableFieldConfig = {
  field: BusinessProfileDraftField;
  label: string;
  multiline: boolean;
  placeholder: string;
};

const mapSupportOptions = (memberships: BusinessMembershipSummary[]): BusinessSupportOption[] =>
  memberships.map((membership) => ({
    businessId: membership.businessId,
    businessName: membership.businessName,
    city: membership.city,
    role: membership.role,
  }));

const createFieldConfigs = (language: "fi" | "en"): EditableFieldConfig[] => [
  {
    field: "name",
    label: language === "fi" ? "Yrityksen nimi" : "Business name",
    multiline: false,
    placeholder: language === "fi" ? "Yrityksen nimi" : "Business name",
  },
  {
    field: "yTunnus",
    label: "Y-tunnus",
    multiline: false,
    placeholder: "1234567-8",
  },
  {
    field: "contactPersonName",
    label: language === "fi" ? "Vastuuhenkilö" : "Responsible person",
    multiline: false,
    placeholder: language === "fi" ? "Etunimi Sukunimi" : "First Last",
  },
  {
    field: "contactEmail",
    label: language === "fi" ? "Sähköposti" : "Email",
    multiline: false,
    placeholder: "hello@omaleima.fi",
  },
  {
    field: "phone",
    label: language === "fi" ? "Puhelin" : "Phone",
    multiline: false,
    placeholder: "+358 40 123 4567",
  },
  {
    field: "address",
    label: language === "fi" ? "Osoite" : "Address",
    multiline: false,
    placeholder: language === "fi" ? "Katuosoite" : "Street address",
  },
  {
    field: "city",
    label: language === "fi" ? "Kaupunki" : "City",
    multiline: false,
    placeholder: "Helsinki",
  },
  {
    field: "openingHours",
    label: language === "fi" ? "Aukioloajat" : "Opening hours",
    multiline: true,
    placeholder: language === "fi" ? "Ma-to 16-02, pe-la 16-04" : "Mon-Thu 16-02, Fri-Sat 16-04",
  },
  {
    field: "announcement",
    label: language === "fi" ? "Ilmoitus skanneriin" : "Scanner announcement",
    multiline: true,
    placeholder:
      language === "fi"
        ? "Lyhyt viesti henkilökunnalle tapahtumapäivää varten."
        : "Short event-day message for staff.",
  },
  {
    field: "websiteUrl",
    label: language === "fi" ? "Verkkosivu" : "Website",
    multiline: false,
    placeholder: "https://...",
  },
  {
    field: "instagramUrl",
    label: "Instagram",
    multiline: false,
    placeholder: "https://instagram.com/...",
  },
];

export default function BusinessProfileScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { copy, language, setLanguage, setThemeMode, theme, themeMode } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const userId = session?.user.id ?? null;
  const [preferenceSheet, setPreferenceSheet] = useState<PreferenceSheet>(null);
  const [isSupportVisible, setIsSupportVisible] = useState<boolean>(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BusinessProfileDraft | null>(null);
  const [uploadingMediaKind, setUploadingMediaKind] = useState<BusinessMediaKind | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const updateBusinessProfileMutation = useUpdateBusinessProfileMutation();

  const homeOverviewQuery = useBusinessHomeOverviewQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });

  const memberships = useMemo<BusinessMembershipSummary[]>(
    () => homeOverviewQuery.data?.memberships ?? [],
    [homeOverviewQuery.data?.memberships]
  );
  const supportOptions = useMemo(() => mapSupportOptions(memberships), [memberships]);
  const selectedMembership = useMemo(
    () => memberships.find((membership) => membership.businessId === selectedBusinessId) ?? memberships[0] ?? null,
    [memberships, selectedBusinessId]
  );
  const selectedThemeLabel = themeMode === "dark" ? copy.common.darkMode : copy.common.lightMode;
  const selectedLanguageLabel = language === "fi" ? copy.common.finnish : copy.common.english;
  const fieldConfigs = useMemo(() => createFieldConfigs(language), [language]);
  const canEditSelectedMembership = selectedMembership !== null && canManageBusinessProfile(selectedMembership);

  useEffect(() => {
    if (memberships.length === 0) {
      setSelectedBusinessId(null);
      return;
    }

    setSelectedBusinessId((currentValue) => {
      if (currentValue !== null && memberships.some((membership) => membership.businessId === currentValue)) {
        return currentValue;
      }

      return memberships[0].businessId;
    });
  }, [memberships]);

  useEffect(() => {
    if (selectedMembership === null || userId === null) {
      setDraft(null);
      return;
    }

    setDraft(createBusinessProfileDraft(selectedMembership, userId));
  }, [selectedMembership, userId]);

  const updateDraftField = (field: BusinessProfileDraftField, value: string): void => {
    setDraft((currentDraft) => {
      if (currentDraft === null) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        [field]: value,
      };
    });
  };

  const handleSavePress = async (): Promise<void> => {
    if (draft === null || !canEditSelectedMembership) {
      return;
    }

    await updateBusinessProfileMutation.mutateAsync(draft);
  };

  const handleMediaPress = async (kind: BusinessMediaKind): Promise<void> => {
    if (draft === null || !canEditSelectedMembership || uploadingMediaKind !== null) {
      return;
    }

    setUploadingMediaKind(kind);
    setMediaError(null);

    try {
      const asset = await pickBusinessMediaAsync({ kind });

      if (asset === null) {
        setUploadingMediaKind(null);
        return;
      }

      const uploadedMedia = await uploadBusinessMediaAsync({
        asset,
        businessId: draft.businessId,
        kind,
      });
      const nextDraft: BusinessProfileDraft =
        kind === "cover"
          ? { ...draft, coverImageUrl: uploadedMedia.publicUrl }
          : { ...draft, logoUrl: uploadedMedia.publicUrl };

      setDraft(nextDraft);
      await updateBusinessProfileMutation.mutateAsync(nextDraft);
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Unknown business media upload error.");
    } finally {
      setUploadingMediaKind(null);
    }
  };

  return (
    <AppScreen>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.push("/business/home")} style={styles.backButton}>
          <AppIcon color={theme.colors.textPrimary} name="chevron-left" size={18} />
        </Pressable>
        <View style={styles.topBarCopy}>
          <Text style={styles.screenTitle}>{copy.common.profile}</Text>
          <Text style={styles.metaText}>{copy.business.profileMeta}</Text>
        </View>
      </View>

      {homeOverviewQuery.isLoading ? (
        <InfoCard eyebrow={copy.common.loading} title={copy.common.business}>
          <Text style={styles.bodyText}>
            {language === "fi" ? "Ladataan yritysroolit ja asetukset." : "Loading business memberships and settings."}
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

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error && selectedMembership !== null && draft !== null ? (
        <>
          <CoverImageSurface
            source={draft.coverImageUrl.trim().length > 0 ? { uri: draft.coverImageUrl.trim() } : null}
            style={styles.businessHero}
          >
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <CoverImageSurface
                source={draft.logoUrl.trim().length > 0 ? { uri: draft.logoUrl.trim() } : null}
                style={styles.logoSurface}
              >
                {draft.logoUrl.trim().length === 0 ? (
                  <AppIcon color={theme.colors.textPrimary} name="business" size={24} />
                ) : null}
              </CoverImageSurface>
              <View style={styles.heroCopy}>
                <Text numberOfLines={1} style={styles.heroTitle}>
                  {draft.name}
                </Text>
                <Text numberOfLines={1} style={styles.heroMeta}>
                  {selectedMembership.role} · {draft.city}
                </Text>
              </View>
            </View>
          </CoverImageSurface>

          {canEditSelectedMembership ? (
            <View style={styles.mediaActionRow}>
              <Pressable
                disabled={uploadingMediaKind !== null || updateBusinessProfileMutation.isPending}
                onPress={() => void handleMediaPress("cover")}
                style={[styles.mediaButton, uploadingMediaKind !== null ? styles.disabledButton : null]}
              >
                <Text style={styles.mediaButtonText}>
                  {uploadingMediaKind === "cover"
                    ? language === "fi"
                      ? "Ladataan..."
                      : "Uploading..."
                    : language === "fi"
                      ? "Vaihda kansikuva"
                      : "Change cover"}
                </Text>
              </Pressable>
              <Pressable
                disabled={uploadingMediaKind !== null || updateBusinessProfileMutation.isPending}
                onPress={() => void handleMediaPress("logo")}
                style={[styles.mediaButton, uploadingMediaKind !== null ? styles.disabledButton : null]}
              >
                <Text style={styles.mediaButtonText}>
                  {uploadingMediaKind === "logo"
                    ? language === "fi"
                      ? "Ladataan..."
                      : "Uploading..."
                    : language === "fi"
                      ? "Vaihda logo"
                      : "Change logo"}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {mediaError ? <Text style={styles.errorText}>{mediaError}</Text> : null}

          {memberships.length > 1 ? (
            <View style={styles.businessSwitchRow}>
              {memberships.map((membership) => {
                const isSelected = membership.businessId === selectedMembership.businessId;

                return (
                  <Pressable
                    key={membership.businessId}
                    onPress={() => setSelectedBusinessId(membership.businessId)}
                    style={[styles.businessChip, isSelected ? styles.businessChipSelected : null]}
                  >
                    <Text style={[styles.businessChipText, isSelected ? styles.businessChipTextSelected : null]}>
                      {membership.businessName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <InfoCard
            eyebrow={language === "fi" ? "Yritysprofiili" : "Business profile"}
            title={language === "fi" ? "Näkyvyys ja tapahtumapäivä" : "Visibility and event-day context"}
          >
            <View style={styles.formStack}>
              {fieldConfigs.map((config) => (
                <View key={config.field} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{config.label}</Text>
                  <TextInput
                    autoCapitalize={config.field === "contactEmail" || config.field.includes("Url") ? "none" : "sentences"}
                    editable={canEditSelectedMembership && !updateBusinessProfileMutation.isPending}
                    keyboardType={config.field === "contactEmail" ? "email-address" : "default"}
                    multiline={config.multiline}
                    onChangeText={(value) => updateDraftField(config.field, value)}
                    placeholder={config.placeholder}
                    placeholderTextColor={theme.colors.textDim}
                    style={[styles.input, config.multiline ? styles.textArea : null]}
                    textAlignVertical={config.multiline ? "top" : "center"}
                    value={draft[config.field]}
                  />
                </View>
              ))}
            </View>

            {canEditSelectedMembership ? (
              <Pressable
                disabled={updateBusinessProfileMutation.isPending}
                onPress={() => void handleSavePress()}
                style={[styles.primaryButton, updateBusinessProfileMutation.isPending ? styles.disabledButton : null]}
              >
                <Text style={styles.primaryButtonText}>
                  {updateBusinessProfileMutation.isPending
                    ? language === "fi"
                      ? "Tallennetaan..."
                      : "Saving..."
                    : language === "fi"
                      ? "Tallenna profiili"
                      : "Save profile"}
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.metaText}>
                {language === "fi"
                  ? "Skannerirooli voi tarkastella profiilia, mutta vain owner tai manager voi muokata sitä."
                  : "Scanner role can view this profile; only owner or manager can edit it."}
              </Text>
            )}

            {updateBusinessProfileMutation.error ? (
              <Text style={styles.errorText}>{updateBusinessProfileMutation.error.message}</Text>
            ) : null}
            {updateBusinessProfileMutation.isSuccess ? (
              <Text style={styles.successText}>
                {language === "fi" ? "Yritysprofiili tallennettu." : "Business profile saved."}
              </Text>
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
    businessChip: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    businessChipSelected: {
      backgroundColor: theme.colors.lime,
      borderColor: theme.colors.limeBorder,
    },
    businessChipText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    businessChipTextSelected: {
      color: theme.colors.actionPrimaryText,
    },
    businessHero: {
      borderRadius: theme.radius.card,
      minHeight: 188,
      overflow: "hidden",
      position: "relative",
    },
    businessSwitchRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    disabledButton: {
      opacity: 0.68,
    },
    errorText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    fieldGroup: {
      gap: 8,
    },
    fieldLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    formStack: {
      gap: 14,
    },
    heroContent: {
      alignItems: "flex-end",
      bottom: 18,
      flexDirection: "row",
      gap: 12,
      left: 18,
      position: "absolute",
      right: 18,
      zIndex: 2,
    },
    heroCopy: {
      flex: 1,
      gap: 2,
    },
    heroMeta: {
      color: "rgba(255, 255, 255, 0.78)",
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
      textTransform: "uppercase",
    },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.42)",
      zIndex: 1,
    },
    heroTitle: {
      color: "#FFFFFF",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    input: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: theme.mode === "light" ? 1 : 0,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.body,
      minHeight: 46,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    logoSurface: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: "rgba(255, 255, 255, 0.52)",
      borderRadius: 18,
      borderWidth: 1,
      height: 62,
      justifyContent: "center",
      overflow: "hidden",
      position: "relative",
      width: 62,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    mediaActionRow: {
      flexDirection: "row",
      gap: 10,
    },
    mediaButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flex: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    mediaButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
      textAlign: "center",
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
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    primaryButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
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
    successText: {
      color: theme.colors.success,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    textArea: {
      minHeight: 112,
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
