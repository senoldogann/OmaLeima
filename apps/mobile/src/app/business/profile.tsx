import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { BusinessOnboardingModal } from "@/features/business/components/business-onboarding-modal";
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
import { getFallbackCoverSource } from "@/features/events/event-visuals";
import type { MobileTheme } from "@/features/foundation/theme";
import { successNoticeDurationMs, useTransientSuccessKey } from "@/features/foundation/use-transient-success-key";
import { createUserSafeErrorMessage } from "@/features/foundation/user-safe-error";
import { LegalLinksModal } from "@/features/legal/legal-links-card";
import { LanguageDropdown } from "@/features/preferences/language-dropdown";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import {
  useBusinessScannerLoginQrQuery,
  useBusinessScannerLoginQrSvgQuery,
} from "@/features/scanner/business-scanner-login";
import {
  type BusinessScannerDeviceSummary,
  useClearBusinessScannerDevicePinMutation,
  useBusinessScannerDevicesQuery,
  useRenameBusinessScannerDeviceMutation,
  useRevokeBusinessScannerDeviceMutation,
  useSetBusinessScannerDevicePinMutation,
} from "@/features/scanner/scanner-device";
import { SupportRequestSheet } from "@/features/support/components/support-request-sheet";
import type { BusinessSupportOption } from "@/features/support/types";
import { useSession } from "@/providers/session-provider";

type PreferenceSheet = "language" | null;
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

const formatScannerDevicePlatform = (platform: BusinessScannerDeviceSummary["platform"]): string => {
  const platformLabels: Record<BusinessScannerDeviceSummary["platform"], string> = {
    IOS: "iOS",
    ANDROID: "Android",
    WEB: "Web",
    UNKNOWN: "Scanner",
  };

  return platformLabels[platform];
};

const formatScannerDeviceHardware = (device: BusinessScannerDeviceSummary): string => {
  const platformLabel = formatScannerDevicePlatform(device.platform);

  if (device.deviceModel === null) {
    return platformLabel;
  }

  return `${device.deviceModel} · ${platformLabel}`;
};

const formatScannerDeviceTime = (formatter: Intl.DateTimeFormat, value: string): string =>
  formatter.format(new Date(value));

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
  const { session } = useSession();
  const { copy, language, setLanguage, theme } = useUiPreferences();
  const router = useRouter();
  const styles = useThemeStyles(createStyles);
  const userId = session?.user.id ?? null;
  const [preferenceSheet, setPreferenceSheet] = useState<PreferenceSheet>(null);
  const [isSupportVisible, setIsSupportVisible] = useState<boolean>(false);
  const [isLegalLinksVisible, setIsLegalLinksVisible] = useState<boolean>(false);
  const [isOnboardingVisible, setIsOnboardingVisible] = useState<boolean>(false);
  const [isBusinessProfileExpanded, setIsBusinessProfileExpanded] = useState<boolean>(false);
  const [isScannerDevicesExpanded, setIsScannerDevicesExpanded] = useState<boolean>(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BusinessProfileDraft | null>(null);
  const [editingScannerDeviceId, setEditingScannerDeviceId] = useState<string | null>(null);
  const [editingScannerDeviceLabel, setEditingScannerDeviceLabel] = useState<string>("");
  const [editingScannerPinDeviceId, setEditingScannerPinDeviceId] = useState<string | null>(null);
  const [editingScannerPin, setEditingScannerPin] = useState<string>("");
  const [uploadingMediaKind, setUploadingMediaKind] = useState<BusinessMediaKind | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const updateBusinessProfileMutation = useUpdateBusinessProfileMutation();

  useTransientSuccessKey(
    updateBusinessProfileMutation.isSuccess ? "business-profile-saved" : null,
    () => updateBusinessProfileMutation.reset(),
    successNoticeDurationMs
  );
  const renameScannerDeviceMutation = useRenameBusinessScannerDeviceMutation();
  const revokeScannerDeviceMutation = useRevokeBusinessScannerDeviceMutation();
  const setScannerPinMutation = useSetBusinessScannerDevicePinMutation();
  const clearScannerPinMutation = useClearBusinessScannerDevicePinMutation();

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
  const fieldConfigs = useMemo(() => createFieldConfigs(language), [language]);
  const canEditSelectedMembership = selectedMembership !== null && canManageBusinessProfile(selectedMembership);
  const selectedBusinessIdForEvents = selectedMembership?.businessId ?? null;
  const selectedBusinessActiveJoinedEvents = useMemo(
    () =>
      (homeOverviewQuery.data?.joinedActiveEvents ?? []).filter(
        (event) => event.businessId === selectedBusinessIdForEvents
      ),
    [homeOverviewQuery.data?.joinedActiveEvents, selectedBusinessIdForEvents]
  );
  const selectedBusinessUpcomingJoinedEventCount = useMemo(
    () =>
      (homeOverviewQuery.data?.joinedUpcomingEvents ?? []).filter(
        (event) => event.businessId === selectedBusinessIdForEvents
      ).length,
    [homeOverviewQuery.data?.joinedUpcomingEvents, selectedBusinessIdForEvents]
  );
  const actionableJoinedEventCount =
    selectedBusinessActiveJoinedEvents.length + selectedBusinessUpcomingJoinedEventCount;
  const selectedBusinessActiveEventVenueId = selectedBusinessActiveJoinedEvents[0]?.eventVenueId ?? null;
  const scannerDeviceTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "fi" ? "fi-FI" : "en-US", {
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
      }),
    [language]
  );
  const scannerDevicesQuery = useBusinessScannerDevicesQuery({
    businessId: selectedMembership?.businessId ?? "",
    isEnabled: selectedMembership !== null,
  });
  const scannerLoginQrQuery = useBusinessScannerLoginQrQuery({
    businessId: selectedMembership?.businessId ?? "",
    isEnabled: canEditSelectedMembership && selectedMembership !== null,
  });
  const scannerLoginQrSvgQuery = useBusinessScannerLoginQrSvgQuery({
    businessId: scannerLoginQrQuery.data?.businessId ?? selectedMembership?.businessId ?? "",
    expiresAt: scannerLoginQrQuery.data?.expiresAt ?? "",
    isEnabled: canEditSelectedMembership && scannerLoginQrQuery.data !== undefined,
    token: scannerLoginQrQuery.data?.qrPayload.token ?? "",
  });
  const scannerDeviceCount = scannerDevicesQuery.data?.length ?? 0;
  const scannerDeviceSummary =
    scannerDevicesQuery.isLoading
      ? language === "fi"
        ? "Ladataan laitteita"
        : "Loading devices"
      : scannerDevicesQuery.error !== null
        ? language === "fi"
          ? "Lataus epaonnistui"
          : "Load failed"
        : language === "fi"
          ? `${scannerDeviceCount} laitetta`
          : `${scannerDeviceCount} device${scannerDeviceCount === 1 ? "" : "s"}`;

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

  const handleEditScannerDevicePress = (device: BusinessScannerDeviceSummary): void => {
    setEditingScannerDeviceId(device.id);
    setEditingScannerDeviceLabel(device.label);
  };

  const handleCancelScannerDeviceEditPress = (): void => {
    setEditingScannerDeviceId(null);
    setEditingScannerDeviceLabel("");
  };

  const handleSaveScannerDevicePress = async (device: BusinessScannerDeviceSummary): Promise<void> => {
    const label = editingScannerDeviceLabel.trim();

    if (selectedMembership === null || label.length === 0) {
      return;
    }

    await renameScannerDeviceMutation.mutateAsync({
      businessId: selectedMembership.businessId,
      scannerDeviceId: device.id,
      label,
    });
    handleCancelScannerDeviceEditPress();
  };

  const handleRevokeScannerDevicePress = async (device: BusinessScannerDeviceSummary): Promise<void> => {
    if (selectedMembership === null || !canEditSelectedMembership) {
      return;
    }

    await revokeScannerDeviceMutation.mutateAsync({
      businessId: selectedMembership.businessId,
      scannerDeviceId: device.id,
    });
  };

  const handleEditScannerPinPress = (device: BusinessScannerDeviceSummary): void => {
    setEditingScannerPinDeviceId(device.id);
    setEditingScannerPin("");
  };

  const handleCancelScannerPinPress = (): void => {
    setEditingScannerPinDeviceId(null);
    setEditingScannerPin("");
  };

  const handleSaveScannerPinPress = async (device: BusinessScannerDeviceSummary): Promise<void> => {
    const pin = editingScannerPin.trim();

    if (selectedMembership === null || pin.length === 0) {
      return;
    }

    await setScannerPinMutation.mutateAsync({
      businessId: selectedMembership.businessId,
      scannerDeviceId: device.id,
      pin,
    });
    handleCancelScannerPinPress();
  };

  const handleClearScannerPinPress = async (device: BusinessScannerDeviceSummary): Promise<void> => {
    if (selectedMembership === null) {
      return;
    }

    await clearScannerPinMutation.mutateAsync({
      businessId: selectedMembership.businessId,
      scannerDeviceId: device.id,
    });
    handleCancelScannerPinPress();
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
      setMediaError(createUserSafeErrorMessage(error, language, "businessMedia"));
    } finally {
      setUploadingMediaKind(null);
    }
  };

  return (
    <AppScreen>
      <View style={styles.topBar}>
        <View style={styles.topBarCopy}>
          <Text style={styles.topBarEyebrow}>{language === "fi" ? "Yritys" : "Business"}</Text>
          <Text style={styles.screenTitle}>{copy.common.profile}</Text>
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
          <Text style={styles.bodyText}>{createUserSafeErrorMessage(homeOverviewQuery.error, language, "business")}</Text>
          <Pressable onPress={() => void homeOverviewQuery.refetch()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{copy.common.retry}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!homeOverviewQuery.isLoading && !homeOverviewQuery.error && selectedMembership !== null && draft !== null ? (
        <>
          <CoverImageSurface
            fallbackSource={getFallbackCoverSource("clubControl")}
            source={draft.coverImageUrl.trim().length > 0 ? { uri: draft.coverImageUrl.trim() } : null}
            style={styles.businessHero}
          >
            <View style={styles.heroOverlay} />
            {canEditSelectedMembership ? (
              <View style={styles.heroMediaButtons}>
                <Pressable
                  disabled={uploadingMediaKind !== null || updateBusinessProfileMutation.isPending}
                  onPress={() => void handleMediaPress("cover")}
                  style={[styles.heroMediaBtn, uploadingMediaKind !== null ? styles.disabledButton : null]}
                >
                  <AppIcon color="rgba(255,255,255,0.92)" name="tools" size={13} />
                  <Text style={styles.heroMediaBtnText}>
                    {uploadingMediaKind === "cover"
                      ? language === "fi" ? "Ladataan..." : "Uploading..."
                      : language === "fi" ? "Vaihda kansikuva" : "Change cover"}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={uploadingMediaKind !== null || updateBusinessProfileMutation.isPending}
                  onPress={() => void handleMediaPress("logo")}
                  style={[styles.heroMediaBtn, uploadingMediaKind !== null ? styles.disabledButton : null]}
                >
                  <AppIcon color="rgba(255,255,255,0.92)" name="tools" size={13} />
                  <Text style={styles.heroMediaBtnText}>
                    {uploadingMediaKind === "logo"
                      ? language === "fi" ? "Ladataan..." : "Uploading..."
                      : language === "fi" ? "Vaihda logo" : "Change logo"}
                  </Text>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.heroContent}>
              <CoverImageSurface
                fallbackSource={getFallbackCoverSource("qrPass")}
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

          {mediaError ? <Text style={styles.errorText}>{mediaError}</Text> : null}

          <View style={styles.scannerWorkflowCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>{language === "fi" ? "Tapahtumat" : "Events"}</Text>
              <Text style={styles.sectionTitle}>{language === "fi" ? "Skanneri" : "Scanner"}</Text>
            </View>
            <Text style={styles.bodyText}>
              {language === "fi"
                ? "Avaa tapahtumat ja siirry skanneriin suoraan aktiivisesta pisteestä."
                : "Open events and jump into the scanner from the active checkpoint."}
            </Text>
            <View style={styles.quickActionRow}>
              <Pressable onPress={() => router.push("/business/events")} style={[styles.primaryButton, styles.quickActionButton]}>
                <AppIcon color={theme.colors.actionPrimaryText} name="calendar" size={16} />
                <Text style={styles.primaryButtonText}>
                  {language === "fi"
                    ? `Tapahtumat (${actionableJoinedEventCount})`
                    : `Events (${actionableJoinedEventCount})`}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (selectedBusinessActiveEventVenueId === null) {
                    router.push("/business/events");
                    return;
                  }

                  router.push({
                    pathname: "/business/scanner",
                    params: { eventVenueId: selectedBusinessActiveEventVenueId },
                  });
                }}
                style={[styles.secondaryButton, styles.quickActionButton]}
              >
                <AppIcon color={theme.colors.textPrimary} name="scan" size={16} />
                <Text style={styles.secondaryButtonText}>
                  {selectedBusinessActiveEventVenueId !== null ? copy.business.openScanner : copy.business.manageEvents}
                </Text>
              </Pressable>
            </View>
          </View>

          {canEditSelectedMembership ? (
            <View style={styles.ownerQrCard}>
              <View style={styles.ownerQrCopy}>
                <Text style={styles.sectionEyebrow}>
                  {language === "fi" ? "Henkilökunta" : "Staff access"}
                </Text>
                <Text style={styles.sectionTitle}>
                  {language === "fi" ? "Scanner QR" : "Scanner QR"}
                </Text>
                <Text style={styles.bodyText}>
                  {language === "fi"
                    ? "Näytä tämä QR henkilöstölle. He avaavat yrityskirjautumisen, skannaavat koodin ja saavat laitekohtaisen skannausroolin."
                    : "Show this QR to staff. They open business sign-in, scan it, and this phone gets its own scanner access."}
                </Text>
              </View>

              <View style={styles.ownerQrSurface}>
                {scannerLoginQrSvgQuery.data ? (
                  <SvgXml height={184} width={184} xml={scannerLoginQrSvgQuery.data} />
                ) : (
                  <View style={styles.ownerQrPlaceholder}>
                    <AppIcon color={theme.colors.lime} name="scan" size={28} />
                    <Text style={styles.metaText}>
                      {scannerLoginQrQuery.isLoading || scannerLoginQrSvgQuery.isLoading
                        ? language === "fi"
                          ? "Luodaan QR..."
                          : "Creating QR..."
                        : language === "fi"
                          ? "QR ei ole valmis"
                          : "QR not ready"}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.ownerQrActionRow}>
                <Text style={styles.metaText}>
                  {scannerLoginQrQuery.data
                    ? language === "fi"
                      ? "QR päivittyy automaattisesti."
                      : "QR refreshes automatically."
                    : language === "fi"
                      ? "Omistaja- tai managerioikeus vaaditaan."
                      : "Owner/manager access required."}
                </Text>
                <Pressable onPress={() => void scannerLoginQrQuery.refetch()} style={styles.scannerDeviceActionButton}>
                  <Text style={styles.scannerDeviceActionText}>
                    {language === "fi" ? "Päivitä" : "Refresh"}
                  </Text>
                </Pressable>
              </View>

              {scannerLoginQrQuery.error ? (
                <Text style={styles.errorText}>{createUserSafeErrorMessage(scannerLoginQrQuery.error, language, "businessScanner")}</Text>
              ) : null}
              {scannerLoginQrSvgQuery.error ? (
                <Text style={styles.errorText}>{createUserSafeErrorMessage(scannerLoginQrSvgQuery.error, language, "businessScanner")}</Text>
              ) : null}
            </View>
          ) : null}

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

          <Pressable
            onPress={() => setIsBusinessProfileExpanded((isExpanded) => !isExpanded)}
            style={styles.collapseHeader}
          >
            <View style={styles.collapseHeaderCopy}>
              <Text style={styles.collapseEyebrow}>
                {language === "fi" ? "Yritysprofiili" : "Business profile"}
              </Text>
              <Text style={styles.collapseTitle}>
                {language === "fi" ? "Yrityksen tiedot" : "Business details"}
              </Text>
            </View>
            <View style={[styles.collapseIcon, isBusinessProfileExpanded ? styles.collapseIconOpen : null]}>
              <AppIcon color={theme.colors.textPrimary} name="chevron-down" size={18} />
            </View>
          </Pressable>

          {isBusinessProfileExpanded ? (
            <InfoCard
              eyebrow={language === "fi" ? "Muokkaa" : "Edit"}
              title={language === "fi" ? "Yrityksen tiedot" : "Business details"}
            >
              <View style={styles.formStack}>
                <Text style={styles.formGroupHeader}>
                  {language === "fi" ? "Perustiedot" : "Basic info"}
                </Text>
                {fieldConfigs.filter(c => (["name", "yTunnus", "contactPersonName"] as string[]).includes(c.field as string)).map((config) => (
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
                      style={[
                        styles.input,
                        config.multiline ? styles.textArea : null,
                        !canEditSelectedMembership ? styles.readOnlyInput : null,
                      ]}
                      textAlignVertical={config.multiline ? "top" : "center"}
                      value={draft[config.field]}
                    />
                  </View>
                ))}

                <Text style={styles.formGroupHeader}>
                  {language === "fi" ? "Yhteystiedot" : "Contact"}
                </Text>
                {fieldConfigs.filter(c => (["contactEmail", "phone", "address", "city", "websiteUrl", "instagramUrl"] as string[]).includes(c.field as string)).map((config) => (
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
                      style={[
                        styles.input,
                        config.multiline ? styles.textArea : null,
                        !canEditSelectedMembership ? styles.readOnlyInput : null,
                      ]}
                      textAlignVertical={config.multiline ? "top" : "center"}
                      value={draft[config.field]}
                    />
                  </View>
                ))}

                <Text style={styles.formGroupHeader}>
                  {language === "fi" ? "Toiminta" : "Operations"}
                </Text>
                {fieldConfigs.filter(c => (["openingHours", "announcement"] as string[]).includes(c.field as string)).map((config) => (
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
                      style={[
                        styles.input,
                        config.multiline ? styles.textArea : null,
                        !canEditSelectedMembership ? styles.readOnlyInput : null,
                      ]}
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
                <Text style={styles.errorText}>{createUserSafeErrorMessage(updateBusinessProfileMutation.error, language, "business")}</Text>
              ) : null}
              {updateBusinessProfileMutation.isSuccess ? (
                <Text style={styles.successText}>
                  {language === "fi" ? "Yritysprofiili tallennettu." : "Business profile saved."}
                </Text>
              ) : null}
            </InfoCard>
          ) : null}

          <Pressable
            onPress={() => setIsScannerDevicesExpanded((isExpanded) => !isExpanded)}
            style={styles.collapseHeader}
          >
            <View style={styles.collapseHeaderCopy}>
              <Text style={styles.collapseEyebrow}>{language === "fi" ? "Skannerit" : "Scanners"}</Text>
              <Text style={styles.collapseTitle}>{language === "fi" ? "Skannerilaitteet" : "Scanner devices"}</Text>
              <Text style={styles.metaText}>{scannerDeviceSummary}</Text>
            </View>
            <View style={[styles.collapseIcon, isScannerDevicesExpanded ? styles.collapseIconOpen : null]}>
              <AppIcon color={theme.colors.textPrimary} name="chevron-down" size={18} />
            </View>
          </Pressable>

          {isScannerDevicesExpanded ? (
            <InfoCard
              eyebrow={language === "fi" ? "Skannerit" : "Scanners"}
              title={language === "fi" ? "Laitteet" : "Devices"}
            >
              {scannerDevicesQuery.isLoading ? (
                <Text style={styles.bodyText}>
                  {language === "fi" ? "Ladataan skannerilaitteita." : "Loading scanner devices."}
                </Text>
              ) : null}

              {scannerDevicesQuery.error ? (
                <View style={styles.inlineErrorBlock}>
                  <Text style={styles.errorText}>{createUserSafeErrorMessage(scannerDevicesQuery.error, language, "businessScanner")}</Text>
                  <Pressable onPress={() => void scannerDevicesQuery.refetch()} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>{copy.common.retry}</Text>
                  </Pressable>
                </View>
              ) : null}

              {!scannerDevicesQuery.isLoading &&
                scannerDevicesQuery.error === null &&
                (scannerDevicesQuery.data ?? []).length === 0 ? (
                <Text style={styles.bodyText}>
                  {language === "fi"
                    ? "Skannerilaitteet ilmestyvät tähän, kun henkilökunta avaa skannerin."
                    : "Scanner devices appear here after staff opens the scanner."}
                </Text>
              ) : null}

              <View style={styles.scannerDeviceList}>
                {(scannerDevicesQuery.data ?? []).map((device) => {
                const isEditing = editingScannerDeviceId === device.id;
                const isPinEditing = editingScannerPinDeviceId === device.id;
                const canRenameDevice =
                  device.createdBy === userId || canEditSelectedMembership;
                const canManagePin = device.status === "ACTIVE" && canRenameDevice;
                const isCurrentUserScannerDevice = device.scannerUserId === userId;
                const canRevokeDevice =
                  canEditSelectedMembership && device.status === "ACTIVE" && !isCurrentUserScannerDevice;
                const isMutationPending =
                  renameScannerDeviceMutation.isPending ||
                  revokeScannerDeviceMutation.isPending ||
                  setScannerPinMutation.isPending ||
                  clearScannerPinMutation.isPending;

                return (
                  <View key={device.id} style={styles.scannerDeviceRow}>
                    <View style={styles.scannerDeviceHeader}>
                      <View style={styles.scannerDeviceIcon}>
                        <AppIcon color={theme.colors.lime} name="scan" size={18} />
                      </View>
                      <View style={styles.scannerDeviceCopy}>
                        {isEditing ? (
                          <TextInput
                            autoCapitalize="sentences"
                            editable={!isMutationPending}
                            onChangeText={setEditingScannerDeviceLabel}
                            placeholder={language === "fi" ? "Skannerin nimi" : "Scanner name"}
                            placeholderTextColor={theme.colors.textDim}
                            style={styles.scannerDeviceInput}
                            value={editingScannerDeviceLabel}
                          />
                        ) : (
                          <Text numberOfLines={1} style={styles.scannerDeviceTitle}>
                            {device.label}
                          </Text>
                        )}
                        <Text style={styles.scannerDeviceMeta}>
                          {formatScannerDeviceHardware(device)} ·{" "}
                          {language === "fi" ? "nähty" : "seen"}{" "}
                          {formatScannerDeviceTime(scannerDeviceTimeFormatter, device.lastSeenAt)}
                        </Text>
                        <Text style={styles.scannerDeviceMeta}>
                          {device.pinRequired
                            ? language === "fi"
                              ? "PIN käytössä"
                              : "PIN enabled"
                            : language === "fi"
                              ? "Ei PIN-koodia"
                              : "No PIN"}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.scannerDeviceStatus,
                          device.status === "REVOKED" ? styles.scannerDeviceStatusRevoked : null,
                        ]}
                      >
                        <Text style={styles.scannerDeviceStatusText}>
                          {device.status === "ACTIVE"
                            ? language === "fi"
                              ? "Aktiivinen"
                              : "Active"
                            : language === "fi"
                              ? "Poistettu"
                              : "Revoked"}
                        </Text>
                      </View>
                    </View>

                    {isPinEditing ? (
                      <View style={styles.scannerPinEditor}>
                        <TextInput
                          editable={!isMutationPending}
                          keyboardType="number-pad"
                          maxLength={8}
                          onChangeText={setEditingScannerPin}
                          placeholder={language === "fi" ? "4-8 numeroa" : "4-8 digits"}
                          placeholderTextColor={theme.colors.textDim}
                          secureTextEntry
                          style={styles.scannerDeviceInput}
                          value={editingScannerPin}
                        />
                        <View style={styles.scannerDeviceActions}>
                          <Pressable
                            disabled={isMutationPending || editingScannerPin.trim().length === 0}
                            onPress={() => void handleSaveScannerPinPress(device)}
                            style={[styles.scannerDeviceActionButton, styles.scannerDevicePrimaryAction]}
                          >
                            <Text style={styles.scannerDevicePrimaryActionText}>
                              {language === "fi" ? "Tallenna PIN" : "Save PIN"}
                            </Text>
                          </Pressable>
                          <Pressable
                            disabled={isMutationPending}
                            onPress={handleCancelScannerPinPress}
                            style={styles.scannerDeviceActionButton}
                          >
                            <Text style={styles.scannerDeviceActionText}>
                              {language === "fi" ? "Peruuta" : "Cancel"}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}

                    {!isPinEditing && (canRenameDevice || canRevokeDevice || canManagePin) ? (
                      <View style={styles.scannerDeviceActions}>
                        {isEditing ? (
                          <>
                            <Pressable
                              disabled={isMutationPending}
                              onPress={() => void handleSaveScannerDevicePress(device)}
                              style={[styles.scannerDeviceActionButton, styles.scannerDevicePrimaryAction]}
                            >
                              <Text style={styles.scannerDevicePrimaryActionText}>
                                {language === "fi" ? "Tallenna" : "Save"}
                              </Text>
                            </Pressable>
                            <Pressable
                              disabled={isMutationPending}
                              onPress={handleCancelScannerDeviceEditPress}
                              style={styles.scannerDeviceActionButton}
                            >
                              <Text style={styles.scannerDeviceActionText}>
                                {language === "fi" ? "Peruuta" : "Cancel"}
                              </Text>
                            </Pressable>
                          </>
                        ) : (
                          <>
                            {canRenameDevice ? (
                              <Pressable
                                disabled={isMutationPending}
                                onPress={() => handleEditScannerDevicePress(device)}
                                style={styles.scannerDeviceActionButton}
                              >
                                <Text style={styles.scannerDeviceActionText}>
                                  {language === "fi" ? "Nimeä" : "Rename"}
                                </Text>
                              </Pressable>
                            ) : null}
                            {canManagePin ? (
                              <Pressable
                                disabled={isMutationPending}
                                onPress={() => handleEditScannerPinPress(device)}
                                style={styles.scannerDeviceActionButton}
                              >
                                <Text style={styles.scannerDeviceActionText}>
                                  {device.pinRequired
                                    ? language === "fi"
                                      ? "Vaihda PIN"
                                      : "Change PIN"
                                    : "PIN"}
                                </Text>
                              </Pressable>
                            ) : null}
                            {canManagePin && device.pinRequired ? (
                              <Pressable
                                disabled={isMutationPending}
                                onPress={() => void handleClearScannerPinPress(device)}
                                style={styles.scannerDeviceActionButton}
                              >
                                <Text style={styles.scannerDeviceDangerText}>
                                  {language === "fi" ? "Poista PIN" : "Clear PIN"}
                                </Text>
                              </Pressable>
                            ) : null}
                            {canRevokeDevice ? (
                              <Pressable
                                disabled={isMutationPending}
                                onPress={() => void handleRevokeScannerDevicePress(device)}
                                style={styles.scannerDeviceActionButton}
                              >
                                <Text style={styles.scannerDeviceDangerText}>
                                  {language === "fi" ? "Poista" : "Revoke"}
                                </Text>
                              </Pressable>
                            ) : null}
                            {isCurrentUserScannerDevice ? (
                              <Text style={styles.scannerDeviceMeta}>
                                {language === "fi"
                                  ? "Tama on nykyinen kirjautunut laite."
                                  : "This is the currently signed-in device."}
                              </Text>
                            ) : null}
                          </>
                        )}
                      </View>
                    ) : null}
                  </View>
                );
                })}
              </View>

              {renameScannerDeviceMutation.error ? (
                <Text style={styles.errorText}>{createUserSafeErrorMessage(renameScannerDeviceMutation.error, language, "businessScanner")}</Text>
              ) : null}
              {revokeScannerDeviceMutation.error ? (
                <Text style={styles.errorText}>{createUserSafeErrorMessage(revokeScannerDeviceMutation.error, language, "businessScanner")}</Text>
              ) : null}
              {setScannerPinMutation.error ? (
                <Text style={styles.errorText}>{createUserSafeErrorMessage(setScannerPinMutation.error, language, "businessScanner")}</Text>
              ) : null}
              {clearScannerPinMutation.error ? (
                <Text style={styles.errorText}>{createUserSafeErrorMessage(clearScannerPinMutation.error, language, "businessScanner")}</Text>
              ) : null}
            </InfoCard>
          ) : null}

          <InfoCard eyebrow={language === "fi" ? "Skannaushistoria" : "Scan history"} title={language === "fi" ? "Historia" : "History"}>
            <Text style={styles.bodyText}>
              {language === "fi"
                ? "Tarkastele kaikkia skannauksia, suodata tapahtuman tai päivän mukaan ja seuraa leimakertoja."
                : "Review all scan records, filter by event or date, and track stamp activity."}
            </Text>
            <Pressable
              onPress={() => router.push("/business/history")}
              style={styles.primaryButton}
            >
              <AppIcon color={theme.colors.actionPrimaryText} name="history" size={16} />
              <Text style={styles.primaryButtonText}>
                {language === "fi" ? "Avaa historia" : "Open history"}
              </Text>
            </Pressable>
          </InfoCard>

          <InfoCard eyebrow={language === "fi" ? "Asetukset" : "Preferences"} title={copy.common.profile}>
            <View style={styles.preferenceSection}>
              <LanguageDropdown language={language} onLanguageChange={setLanguage} />

              <View style={styles.preferenceDivider} />

              <Pressable onPress={() => setIsOnboardingVisible(true)} style={styles.preferenceRow}>
                <View style={styles.preferenceIconWrap}>
                  <AppIcon color={theme.colors.lime} name="info" size={16} />
                </View>
                <Text style={styles.preferenceTitle}>
                  {language === "fi" ? "Näytä aloitusopastus" : "Show onboarding guide"}
                </Text>
                <View style={styles.preferenceValue}>
                  <Text style={styles.preferenceValueText}>{copy.common.open}</Text>
                  <AppIcon color={theme.colors.textMuted} name="chevron-right" size={16} />
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

              <Pressable onPress={() => setIsLegalLinksVisible(true)} style={styles.preferenceRow}>
                <View style={styles.preferenceIconWrap}>
                  <AppIcon color={theme.colors.lime} name="info" size={16} />
                </View>
                <Text style={styles.preferenceTitle}>
                  {language === "fi" ? "Tietosuoja ja käyttöehdot" : "Privacy and terms"}
                </Text>
                <View style={styles.preferenceValue}>
                  <Text style={styles.preferenceValueText}>{copy.common.open}</Text>
                  <AppIcon color={theme.colors.textMuted} name="chevron-right" size={16} />
                </View>
              </Pressable>

              <View style={styles.preferenceDivider} />

              <SignOutButton />
            </View>
          </InfoCard>

          <LegalLinksModal
            isVisible={isLegalLinksVisible}
            language={language}
            onClose={() => setIsLegalLinksVisible(false)}
          />
        </>
      ) : null}

      <Modal
        animationType="fade"
        onRequestClose={() => setPreferenceSheet(null)}
        transparent
        visible={preferenceSheet !== null}
      >
        <Pressable onPress={() => setPreferenceSheet(null)} style={styles.modalBackdrop}>
          <Pressable onPress={() => { }} style={styles.preferenceModalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalEyebrow}>{language === "fi" ? "Asetus" : "Setting"}</Text>
                <Text style={styles.modalTitle}>{copy.common.language}</Text>
              </View>
              <Pressable onPress={() => setPreferenceSheet(null)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>{language === "fi" ? "Valmis" : "Done"}</Text>
              </Pressable>
            </View>

            <View style={styles.preferenceOptionList}>
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

      <BusinessOnboardingModal
        isVisible={isOnboardingVisible}
        onDismiss={() => setIsOnboardingVisible(false)}
      />
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    formGroupHeader: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.4,
      marginTop: 6,
      textTransform: "uppercase",
    },
    heroMediaButtons: {
      flexDirection: "row",
      gap: 8,
      justifyContent: "space-between",
      left: 14,
      position: "absolute",
      right: 14,
      top: 14,
      zIndex: 3,
    },
    heroMediaBtn: {
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.54)",
      borderRadius: 999,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    heroMediaBtnText: {
      color: "rgba(255,255,255,0.92)",
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
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
    collapseEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.4,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    collapseHeader: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      padding: 18,
    },
    collapseHeaderCopy: {
      flex: 1,
      gap: 6,
    },
    collapseIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: 999,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    collapseIconOpen: {
      transform: [{ rotate: "180deg" }],
    },
    collapseTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
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
    inlineErrorBlock: {
      gap: 10,
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
    ownerQrActionRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    ownerQrCard: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 16,
      padding: 18,
    },
    ownerQrCopy: {
      gap: 8,
    },
    ownerQrPlaceholder: {
      alignItems: "center",
      gap: 10,
      justifyContent: "center",
      minHeight: 184,
      minWidth: 184,
    },
    ownerQrSurface: {
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: "#ffffff",
      borderRadius: 28,
      justifyContent: "center",
      padding: 14,
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
      flexDirection: "row",
      gap: 8,
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
    quickActionButton: {
      flex: 1,
      flexDirection: "row",
      gap: 8,
    },
    quickActionRow: {
      flexDirection: "row",
      gap: 10,
    },
    readOnlyInput: {
      opacity: 0.64,
    },
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.titleLarge,
      letterSpacing: -0.8,
      lineHeight: theme.typography.lineHeights.titleLarge,
    },
    topBarEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    scannerWorkflowCard: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      gap: 14,
      padding: 18,
    },
    sectionHeader: {
      gap: 4,
    },
    sectionEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      letterSpacing: -0.3,
      lineHeight: 24,
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
    scannerDeviceActionButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      justifyContent: "center",
      minHeight: 38,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    scannerDeviceActionText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    scannerDeviceActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "flex-end",
    },
    scannerDeviceCopy: {
      flex: 1,
      gap: 4,
      minWidth: 0,
    },
    scannerDeviceDangerText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    scannerDeviceHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
    },
    scannerDeviceIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.limeSurface,
      borderRadius: 999,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    scannerDeviceInput: {
      backgroundColor: theme.colors.surfaceL3,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: theme.mode === "light" ? 1 : 0,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      minHeight: 42,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    scannerDeviceList: {
      gap: 10,
    },
    scannerDeviceMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    scannerDevicePrimaryAction: {
      backgroundColor: theme.colors.lime,
      borderColor: theme.colors.limeBorder,
    },
    scannerDevicePrimaryActionText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    scannerDeviceRow: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 12,
      padding: 12,
    },
    scannerDeviceStatus: {
      backgroundColor: theme.colors.limeSurface,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    scannerDeviceStatusRevoked: {
      backgroundColor: theme.colors.dangerSurface,
    },
    scannerDeviceStatusText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textTransform: "uppercase",
    },
    scannerDeviceTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    scannerPinEditor: {
      gap: 10,
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
      gap: 4,
    },
  });
