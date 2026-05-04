import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import {
  createClubAnnouncementDraftFromRecord,
  createEmptyClubAnnouncementDraft,
  useArchiveClubAnnouncementMutation,
  useClubAnnouncementsQuery,
  useSaveClubAnnouncementMutation,
  type ClubAnnouncementAudience,
  type ClubAnnouncementDraft,
  type ClubAnnouncementRecord,
  type ClubAnnouncementStatus,
} from "@/features/announcements/club-announcements";
import {
  pickClubAnnouncementImageAsync,
  uploadClubAnnouncementImageAsync,
} from "@/features/announcements/club-announcement-media";
import { useClubDashboardQuery } from "@/features/club/club-dashboard";
import type { ClubMembershipSummary } from "@/features/club/types";
import { getEventCoverSourceWithFallback } from "@/features/events/event-visuals";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

type FieldConfig = {
  field: keyof Pick<ClubAnnouncementDraft, "body" | "ctaLabel" | "ctaUrl" | "endsAt" | "priority" | "startsAt" | "title">;
  keyboardType: "default" | "number-pad" | "url";
  label: string;
  multiline: boolean;
  placeholder: string;
};

type ActionNotice = {
  body: string;
  tone: "error" | "success";
};

const createFieldConfigs = (language: "fi" | "en"): FieldConfig[] => [
  {
    field: "title",
    keyboardType: "default",
    label: language === "fi" ? "Otsikko" : "Title",
    multiline: false,
    placeholder: language === "fi" ? "Illan aikataulu päivittyi" : "Tonight's schedule changed",
  },
  {
    field: "body",
    keyboardType: "default",
    label: language === "fi" ? "Viesti" : "Message",
    multiline: true,
    placeholder:
      language === "fi"
        ? "Kirjoita lyhyt ja selkeä päivitys opiskelijoille, yrityksille tai klubille."
        : "Write a short update for students, businesses, or club staff.",
  },
  {
    field: "startsAt",
    keyboardType: "default",
    label: language === "fi" ? "Näkyy alkaen" : "Visible from",
    multiline: false,
    placeholder: "2026-05-04T18:00",
  },
  {
    field: "endsAt",
    keyboardType: "default",
    label: language === "fi" ? "Näkyy asti" : "Visible until",
    multiline: false,
    placeholder: language === "fi" ? "Tyhjä = ei päättymistä" : "Empty = no end",
  },
  {
    field: "priority",
    keyboardType: "number-pad",
    label: language === "fi" ? "Tärkeys 0-10" : "Priority 0-10",
    multiline: false,
    placeholder: "0",
  },
  {
    field: "ctaLabel",
    keyboardType: "default",
    label: language === "fi" ? "Linkin teksti" : "Link label",
    multiline: false,
    placeholder: language === "fi" ? "Avaa ohje" : "Open guide",
  },
  {
    field: "ctaUrl",
    keyboardType: "url",
    label: language === "fi" ? "Linkki" : "Link",
    multiline: false,
    placeholder: "https://",
  },
];

const audienceLabels = (language: "fi" | "en"): Record<ClubAnnouncementAudience, string> => ({
  ALL: language === "fi" ? "Kaikki" : "Everyone",
  CLUBS: language === "fi" ? "Klubit" : "Clubs",
  STUDENTS: language === "fi" ? "Opiskelijat" : "Students",
});

const statusLabels = (language: "fi" | "en"): Record<ClubAnnouncementDraft["status"], string> => ({
  DRAFT: language === "fi" ? "Luonnos" : "Draft",
  PUBLISHED: language === "fi" ? "Julkaistu" : "Published",
});

const recordStatusLabel = (status: ClubAnnouncementStatus, language: "fi" | "en"): string => {
  if (status === "ARCHIVED") {
    return language === "fi" ? "Arkistoitu" : "Archived";
  }

  return statusLabels(language)[status];
};

const recordStatusState = (status: ClubAnnouncementStatus): "pending" | "ready" | "warning" => {
  if (status === "PUBLISHED") {
    return "ready";
  }

  if (status === "ARCHIVED") {
    return "warning";
  }

  return "pending";
};

const createActionNotice = (error: unknown, language: "fi" | "en"): ActionNotice => ({
  body: error instanceof Error ? error.message : language === "fi" ? "Tuntematon virhe." : "Unknown error.",
  tone: "error",
});

const getCreatableMemberships = (memberships: ClubMembershipSummary[]): ClubMembershipSummary[] =>
  memberships.filter((membership) => membership.canCreateEvents);

export default function ClubAnnouncementsScreen() {
  const router = useRouter();
  const { language, localeTag, theme } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const dashboardQuery = useClubDashboardQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });
  const memberships = useMemo(
    () => getCreatableMemberships(dashboardQuery.data?.memberships ?? []),
    [dashboardQuery.data?.memberships]
  );
  const clubIds = useMemo(() => memberships.map((membership) => membership.clubId), [memberships]);
  const announcementsQuery = useClubAnnouncementsQuery({
    clubIds,
    isEnabled: clubIds.length > 0,
  });
  const saveMutation = useSaveClubAnnouncementMutation();
  const archiveMutation = useArchiveClubAnnouncementMutation();
  const fieldConfigs = useMemo(() => createFieldConfigs(language), [language]);
  const [draft, setDraft] = useState<ClubAnnouncementDraft>(() => createEmptyClubAnnouncementDraft(null));
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag, {
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
      }),
    [localeTag]
  );
  const isPending = saveMutation.isPending || archiveMutation.isPending || isUploadingImage;

  useEffect(() => {
    if (draft.clubId.trim().length > 0 || memberships.length === 0) {
      return;
    }

    setDraft(createEmptyClubAnnouncementDraft(memberships[0]));
  }, [draft.clubId, memberships]);

  const updateDraftField = (field: FieldConfig["field"], value: string): void => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  };

  const handleNewPress = (): void => {
    const selectedMembership = memberships.find((membership) => membership.clubId === draft.clubId) ?? memberships[0] ?? null;
    setActionNotice(null);
    setDraft(createEmptyClubAnnouncementDraft(selectedMembership));
  };

  const handleEditPress = (announcement: ClubAnnouncementRecord): void => {
    setActionNotice(null);
    setDraft(createClubAnnouncementDraftFromRecord(announcement));
  };

  const handleUploadImagePress = async (): Promise<void> => {
    if (draft.clubId.trim().length === 0 || isUploadingImage) {
      return;
    }

    setIsUploadingImage(true);
    setActionNotice(null);

    try {
      const asset = await pickClubAnnouncementImageAsync();

      if (asset === null) {
        setIsUploadingImage(false);
        return;
      }

      const uploadedImage = await uploadClubAnnouncementImageAsync({
        asset,
        clubId: draft.clubId,
      });

      setDraft((currentDraft) => ({
        ...currentDraft,
        imageUrl: uploadedImage.publicUrl,
      }));
      setActionNotice({
        body: language === "fi" ? "Kuva lisätty tiedotteeseen." : "Image attached to the announcement.",
        tone: "success",
      });
    } catch (error) {
      setActionNotice(createActionNotice(error, language));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSavePress = async (): Promise<void> => {
    if (userId === null || isPending) {
      return;
    }

    setActionNotice(null);

    try {
      const result = await saveMutation.mutateAsync({
        draft,
        userId,
      });
      setActionNotice({
        body:
          result.status === "SUCCESS"
            ? language === "fi"
              ? "Tiedote tallennettu."
              : "Announcement saved."
            : result.message,
        tone: result.status === "SUCCESS" ? "success" : "error",
      });

      if (result.status === "SUCCESS" && draft.announcementId === null) {
        handleNewPress();
      }
    } catch (error) {
      setActionNotice(createActionNotice(error, language));
    }
  };

  const handleArchivePress = async (): Promise<void> => {
    if (userId === null || draft.announcementId === null || draft.clubId.trim().length === 0 || isPending) {
      return;
    }

    setActionNotice(null);

    try {
      const result = await archiveMutation.mutateAsync({
        announcementId: draft.announcementId,
        clubId: draft.clubId,
        userId,
      });
      setActionNotice({
        body:
          result.status === "SUCCESS"
            ? language === "fi"
              ? "Tiedote arkistoitu."
              : "Announcement archived."
            : result.message,
        tone: result.status === "SUCCESS" ? "success" : "error",
      });

      if (result.status === "SUCCESS") {
        handleNewPress();
      }
    } catch (error) {
      setActionNotice(createActionNotice(error, language));
    }
  };

  return (
    <AppScreen>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.push("/club/home")} style={styles.iconButton}>
          <AppIcon color={theme.colors.textPrimary} name="chevron-left" size={18} />
        </Pressable>
        <View style={styles.topBarCopy}>
          <Text style={styles.screenTitle}>{language === "fi" ? "Tiedotteet" : "Announcements"}</Text>
          <Text style={styles.metaText}>
            {language === "fi"
              ? "Julkaise opiskelijoille ja tapahtumapäivän tiimille näkyviä päivityksiä."
              : "Publish updates for students and event-day teams."}
          </Text>
        </View>
      </View>

      {dashboardQuery.isLoading ? (
        <InfoCard eyebrow="Club" title={language === "fi" ? "Ladataan oikeuksia" : "Loading access"}>
          <Text style={styles.bodyText}>
            {language === "fi" ? "Haetaan klubit, joihin voit julkaista." : "Loading clubs you can publish for."}
          </Text>
        </InfoCard>
      ) : null}

      {dashboardQuery.error ? (
        <InfoCard eyebrow="Club" title={language === "fi" ? "Klubeja ei voitu ladata" : "Could not load clubs"}>
          <Text style={styles.bodyText}>{dashboardQuery.error.message}</Text>
        </InfoCard>
      ) : null}

      {!dashboardQuery.isLoading && !dashboardQuery.error && memberships.length === 0 ? (
        <InfoCard eyebrow="Club" title={language === "fi" ? "Ei julkaisuoikeutta" : "No publishing access"}>
          <Text style={styles.bodyText}>
            {language === "fi"
              ? "Tällä tilillä ei ole organizer- tai owner-oikeutta tiedotteiden julkaisuun."
              : "This account does not have organizer or owner access for announcements."}
          </Text>
        </InfoCard>
      ) : null}

      {memberships.length > 0 ? (
        <InfoCard
          eyebrow={draft.announcementId === null ? "Create" : "Edit"}
          title={draft.announcementId === null ? (language === "fi" ? "Uusi tiedote" : "New announcement") : draft.title}
        >
          {memberships.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRail}>
              {memberships.map((membership) => (
                <Pressable
                  disabled={isPending}
                  key={membership.clubId}
                  onPress={() =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      clubId: membership.clubId,
                    }))
                  }
                  style={[styles.chip, draft.clubId === membership.clubId ? styles.chipSelected : null]}
                >
                  <Text style={styles.chipText}>{membership.clubName}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.imageBlock}>
            <CoverImageSurface
              fallbackSource={getEventCoverSourceWithFallback(null, "clubControl")}
              imageStyle={styles.imagePreview}
              source={draft.imageUrl.trim().length === 0 ? null : { uri: draft.imageUrl.trim() }}
              style={styles.imagePreviewSurface}
            >
              <View style={styles.imageOverlay} />
              <View style={styles.imageContent}>
                <Text style={styles.imageTitle}>
                  {draft.imageUrl.trim().length > 0
                    ? language === "fi"
                      ? "Kuva valittu"
                      : "Image selected"
                    : language === "fi"
                      ? "Lisää tiedotteelle kuva"
                      : "Add an announcement image"}
                </Text>
                <Pressable
                  disabled={isPending || draft.clubId.trim().length === 0}
                  onPress={() => void handleUploadImagePress()}
                  style={[styles.uploadButton, isUploadingImage ? styles.disabledButton : null]}
                >
                  {isUploadingImage ? (
                    <ActivityIndicator color={theme.colors.actionPrimaryText} size="small" />
                  ) : (
                    <AppIcon color={theme.colors.actionPrimaryText} name="calendar" size={16} />
                  )}
                  <Text style={styles.uploadButtonText}>
                    {language === "fi" ? "Valitse kuva" : "Choose image"}
                  </Text>
                </Pressable>
              </View>
            </CoverImageSurface>
          </View>

          {fieldConfigs.map((config) => (
            <View key={config.field} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{config.label}</Text>
              <TextInput
                autoCapitalize={config.keyboardType === "url" ? "none" : "sentences"}
                editable={!isPending}
                keyboardType={config.keyboardType}
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

          <View style={styles.optionBlock}>
            <Text style={styles.fieldLabel}>{language === "fi" ? "Yleisö" : "Audience"}</Text>
            <View style={styles.wrapRow}>
              {(Object.keys(audienceLabels(language)) as ClubAnnouncementAudience[]).map((audience) => (
                <Pressable
                  disabled={isPending}
                  key={audience}
                  onPress={() => setDraft((currentDraft) => ({ ...currentDraft, audience }))}
                  style={[styles.chip, draft.audience === audience ? styles.chipSelected : null]}
                >
                  <Text style={styles.chipText}>{audienceLabels(language)[audience]}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.optionBlock}>
            <Text style={styles.fieldLabel}>Status</Text>
            <View style={styles.wrapRow}>
              {(Object.keys(statusLabels(language)) as ClubAnnouncementDraft["status"][]).map((status) => (
                <Pressable
                  disabled={isPending}
                  key={status}
                  onPress={() => setDraft((currentDraft) => ({ ...currentDraft, status }))}
                  style={[styles.chip, draft.status === status ? styles.chipSelected : null]}
                >
                  <Text style={styles.chipText}>{statusLabels(language)[status]}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            disabled={isPending || draft.clubId.trim().length === 0}
            onPress={() => void handleSavePress()}
            style={[styles.primaryButton, isPending ? styles.disabledButton : null]}
          >
            <Text style={styles.primaryButtonText}>
              {saveMutation.isPending
                ? language === "fi"
                  ? "Tallennetaan..."
                  : "Saving..."
                : language === "fi"
                  ? "Tallenna tiedote"
                  : "Save announcement"}
            </Text>
          </Pressable>

          {draft.announcementId !== null ? (
            <Pressable
              disabled={isPending}
              onPress={() => void handleArchivePress()}
              style={[styles.secondaryButton, isPending ? styles.disabledButton : null]}
            >
              <Text style={styles.secondaryButtonText}>
                {archiveMutation.isPending
                  ? language === "fi"
                    ? "Arkistoidaan..."
                    : "Archiving..."
                  : language === "fi"
                    ? "Arkistoi tiedote"
                    : "Archive announcement"}
              </Text>
            </Pressable>
          ) : null}

          <Pressable disabled={isPending} onPress={handleNewPress} style={styles.textButton}>
            <Text style={styles.textButtonText}>{language === "fi" ? "Tyhjennä lomake" : "Reset form"}</Text>
          </Pressable>

          {actionNotice !== null ? (
            <View style={actionNotice.tone === "success" ? styles.successCard : styles.errorCard}>
              <Text style={actionNotice.tone === "success" ? styles.successText : styles.errorText}>
                {actionNotice.body}
              </Text>
            </View>
          ) : null}
        </InfoCard>
      ) : null}

      {announcementsQuery.isLoading ? (
        <InfoCard eyebrow="Feed" title={language === "fi" ? "Haetaan tiedotteita" : "Loading announcements"}>
          <Text style={styles.bodyText}>
            {language === "fi" ? "Ladataan klubin viimeisimpiä tiedotteita." : "Loading the latest club posts."}
          </Text>
        </InfoCard>
      ) : null}

      {announcementsQuery.error ? (
        <InfoCard eyebrow="Feed" title={language === "fi" ? "Tiedotteita ei voitu ladata" : "Could not load posts"}>
          <Text style={styles.bodyText}>{announcementsQuery.error.message}</Text>
          <Pressable onPress={() => void announcementsQuery.refetch()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{language === "fi" ? "Yritä uudelleen" : "Retry"}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {announcementsQuery.data?.length === 0 ? (
        <InfoCard eyebrow="Feed" title={language === "fi" ? "Ei tiedotteita vielä" : "No announcements yet"}>
          <Text style={styles.bodyText}>
            {language === "fi"
              ? "Ensimmäinen julkaistu tiedote näkyy opiskelijoille ja yrityksille heidän feedissään."
              : "The first published announcement appears in the student and business feeds."}
          </Text>
        </InfoCard>
      ) : null}

      {announcementsQuery.data && announcementsQuery.data.length > 0 ? (
        <View style={styles.listStack}>
          <Text style={styles.sectionTitle}>{language === "fi" ? "Viimeisimmät" : "Latest"}</Text>
          {announcementsQuery.data.map((announcement) => (
            <Pressable key={announcement.announcementId} onPress={() => handleEditPress(announcement)} style={styles.listCard}>
              <CoverImageSurface
                fallbackSource={getEventCoverSourceWithFallback(null, "clubControl")}
                imageStyle={styles.listImage}
                source={announcement.imageUrl === null ? null : { uri: announcement.imageUrl }}
                style={styles.listImageSurface}
              >
                <View style={styles.listImageOverlay} />
                <View style={styles.listImageContent}>
                  <StatusBadge
                    label={recordStatusLabel(announcement.status, language)}
                    state={recordStatusState(announcement.status)}
                  />
                </View>
              </CoverImageSurface>
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>{announcement.title}</Text>
                <Text numberOfLines={2} style={styles.bodyText}>{announcement.body}</Text>
                <Text style={styles.metaText}>
                  {announcement.clubName} · {formatter.format(new Date(announcement.startsAt))}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
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
    chip: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    chipRail: {
      gap: 8,
      paddingRight: 4,
    },
    chipSelected: {
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
    },
    chipText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    disabledButton: {
      opacity: 0.62,
    },
    errorCard: {
      backgroundColor: theme.colors.dangerSurface,
      borderColor: theme.colors.danger,
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      padding: 12,
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
    iconButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    imageBlock: {
      gap: 8,
    },
    imageContent: {
      flex: 1,
      gap: 12,
      justifyContent: "flex-end",
      padding: 16,
    },
    imageOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.48)",
    },
    imagePreview: {
      borderRadius: theme.radius.scene,
    },
    imagePreviewSurface: {
      borderRadius: theme.radius.scene,
      minHeight: 190,
      overflow: "hidden",
      position: "relative",
    },
    imageTitle: {
      color: "#F8FAF5",
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
      lineHeight: theme.typography.lineHeights.body,
      minHeight: 52,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    listCard: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: theme.mode === "light" ? 1 : 0,
      overflow: "hidden",
    },
    listCopy: {
      gap: 8,
      padding: 14,
    },
    listImage: {
      borderRadius: 0,
    },
    listImageContent: {
      alignItems: "flex-end",
      flex: 1,
      padding: 12,
    },
    listImageOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.2)",
    },
    listImageSurface: {
      minHeight: 118,
      position: "relative",
    },
    listStack: {
      gap: 12,
    },
    listTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    optionBlock: {
      gap: 10,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      minHeight: 52,
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
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
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: theme.mode === "light" ? 1 : 0,
      minHeight: 50,
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    successCard: {
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      padding: 12,
    },
    successText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    textArea: {
      minHeight: 132,
    },
    textButton: {
      alignItems: "center",
      alignSelf: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    textButtonText: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    topBar: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
    },
    topBarCopy: {
      flex: 1,
      gap: 4,
    },
    uploadButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      flexDirection: "row",
      gap: 8,
      minHeight: 42,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    uploadButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    wrapRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
  });
