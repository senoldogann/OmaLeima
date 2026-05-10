import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";

import {
  createClubAnnouncementDraftFromRecord,
  createEmptyClubAnnouncementDraft,
  useArchiveClubAnnouncementMutation,
  useClubAnnouncementsQuery,
  useDeleteClubAnnouncementMutation,
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
import { hapticImpact, hapticNotification, ImpactStyle, NotificationType } from "@/features/foundation/safe-haptics";
import { successNoticeDurationMs, useTransientSuccessKey } from "@/features/foundation/use-transient-success-key";
import type { MobileTheme } from "@/features/foundation/theme";
import { createUserSafeErrorMessage } from "@/features/foundation/user-safe-error";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

type TextField = keyof Pick<ClubAnnouncementDraft, "body" | "priority" | "title">;

type DateTimeField = keyof Pick<ClubAnnouncementDraft, "endsAt" | "startsAt">;

type FieldConfig = {
  field: TextField;
  keyboardType: "default" | "number-pad" | "url";
  label: string;
  multiline: boolean;
  placeholder: string;
};

type DateTimeFieldConfig = {
  field: DateTimeField;
  isOptional: boolean;
  label: string;
};

type DateTimeEditorState = {
  date: string;
  field: DateTimeField;
  label: string;
  time: string;
  visibleMonth: string;
} | null;

type CalendarDay = {
  date: string;
  dayLabel: string;
  isCurrentMonth: boolean;
  isSelected: boolean;
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
    field: "priority",
    keyboardType: "number-pad",
    label: language === "fi" ? "Tärkeys 0-10" : "Priority 0-10",
    multiline: false,
    placeholder: "0",
  },
];

const createDateTimeFieldConfigs = (language: "fi" | "en"): DateTimeFieldConfig[] => [
  {
    field: "startsAt",
    isOptional: false,
    label: language === "fi" ? "Näkyy alkaen" : "Visible from",
  },
  {
    field: "endsAt",
    isOptional: true,
    label: language === "fi" ? "Näkyy asti" : "Visible until",
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

const createActionNotice = (error: unknown, language: "fi" | "en"): ActionNotice => {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("title must be between 3 and 120 characters")) {
    return {
      body:
        language === "fi"
          ? "Tiedotteen otsikon täytyy olla 3-120 merkkiä."
          : "The announcement title must be 3-120 characters.",
      tone: "error",
    };
  }

  if (message.includes("body must be between 12 and 1200 characters")) {
    return {
      body:
        language === "fi"
          ? "Tiedotteen tekstin täytyy olla 12-1200 merkkiä."
          : "The announcement body must be 12-1200 characters.",
      tone: "error",
    };
  }

  if (message.includes("ctaLabel must be at least 2 characters")) {
    return {
      body:
        language === "fi"
          ? "CTA-painikkeen tekstissä täytyy olla vähintään kaksi merkkiä."
          : "The CTA button label must contain at least two characters.",
      tone: "error",
    };
  }

  if (message.includes("ctaUrl must be a full http or https URL")) {
    return {
      body:
        language === "fi"
          ? "CTA-linkin täytyy olla täydellinen http- tai https-osoite."
          : "The CTA link must be a complete http or https URL.",
      tone: "error",
    };
  }

  if (message.includes("priority must be a whole number between 0 and 10")) {
    return {
      body:
        language === "fi"
          ? "Prioriteetin täytyy olla kokonaisluku välillä 0-10."
          : "Priority must be a whole number between 0 and 10.",
      tone: "error",
    };
  }

  if (message.includes("endsAt must be after startsAt")) {
    return {
      body:
        language === "fi"
          ? "Päättymisajan täytyy olla aloitusajan jälkeen."
          : "The end time must be after the start time.",
      tone: "error",
    };
  }

  if (
    message.includes("Announcement was not updated") ||
    message.includes("Announcement was not archived") ||
    message.includes("Announcement was not deleted")
  ) {
    return {
      body:
        language === "fi"
          ? "Tiedotetta ei voitu käsitellä. Se voi kuulua toiseen järjestäjätiliin tai olla jo poistettu."
          : "The announcement could not be processed. It may belong to another organizer account or already be removed.",
      tone: "error",
    };
  }

  return {
    body: message.length > 0 ? message : language === "fi" ? "Tuntematon virhe." : "Unknown error.",
    tone: "error",
  };
};

const getCreatableMemberships = (memberships: ClubMembershipSummary[]): ClubMembershipSummary[] =>
  memberships.filter((membership) => membership.canCreateEvents);

const splitLocalDateTime = (value: string): { date: string; time: string } => {
  const [date = "", time = ""] = value.split("T");

  return {
    date,
    time,
  };
};

const buildLocalDateTime = (date: string, time: string): string => `${date.trim()}T${time.trim()}`;

const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const localTimePattern = /^\d{2}:\d{2}$/;

const formatLocalDateInput = (date: Date): string => {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getMonthStartInput = (dateInput: string): string => {
  const date = dateInput.length > 0 ? new Date(`${dateInput}T00:00:00`) : new Date();

  if (Number.isNaN(date.getTime())) {
    return formatLocalDateInput(new Date());
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
};

const shiftMonthInput = (monthInput: string, offset: number): string => {
  const month = new Date(`${monthInput}T00:00:00`);
  month.setMonth(month.getMonth() + offset);

  return getMonthStartInput(formatLocalDateInput(month));
};

const createCalendarDays = (visibleMonth: string, selectedDate: string): CalendarDay[] => {
  const monthStart = new Date(`${visibleMonth}T00:00:00`);
  const calendarStart = new Date(monthStart);
  const mondayBasedDay = (monthStart.getDay() + 6) % 7;
  calendarStart.setDate(monthStart.getDate() - mondayBasedDay);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + index);
    const date = formatLocalDateInput(day);

    return {
      date,
      dayLabel: String(day.getDate()),
      isCurrentMonth: day.getMonth() === monthStart.getMonth(),
      isSelected: date === selectedDate,
    };
  });
};

const formatDraftDateTimeValue = (
  formatter: Intl.DateTimeFormat,
  value: string,
  emptyLabel: string
): string => {
  if (value.trim().length === 0) {
    return emptyLabel;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return formatter.format(parsedDate);
};

const isValidLocalDateInput = (value: string): boolean => {
  if (!localDatePattern.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  return formatLocalDateInput(parsedDate) === value;
};

const isValidLocalTimeInput = (value: string): boolean => {
  if (!localTimePattern.test(value)) {
    return false;
  }

  const [hours, minutes] = value.split(":").map((segment) => Number.parseInt(segment, 10));

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return false;
  }

  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
};

export default function ClubAnnouncementsScreen() {
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
  const deleteMutation = useDeleteClubAnnouncementMutation();
  const fieldConfigs = useMemo(() => createFieldConfigs(language), [language]);
  const dateTimeFieldConfigs = useMemo(() => createDateTimeFieldConfigs(language), [language]);
  const [draft, setDraft] = useState<ClubAnnouncementDraft>(() => createEmptyClubAnnouncementDraft(null));
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const [dateTimeEditor, setDateTimeEditor] = useState<DateTimeEditorState>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [contextMenuAnnouncementId, setContextMenuAnnouncementId] = useState<string | null>(null);

  useTransientSuccessKey(
    actionNotice?.tone === "success" ? actionNotice.body : null,
    () => setActionNotice(null),
    successNoticeDurationMs
  );
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [localAnnouncementImagePreviewUri, setLocalAnnouncementImagePreviewUri] = useState<string | null>(null);
  const sortedAnnouncements = useMemo(
    () =>
      [...(announcementsQuery.data ?? [])].sort(
        (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()
      ),
    [announcementsQuery.data]
  );
  const contextMenuAnnouncement =
    sortedAnnouncements.find((a) => a.announcementId === contextMenuAnnouncementId) ?? null;
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
  const isPending = saveMutation.isPending || archiveMutation.isPending || deleteMutation.isPending || isUploadingImage;
  const localAnnouncementImagePreviewSource = useMemo(() => {
    if (localAnnouncementImagePreviewUri === null || localAnnouncementImagePreviewUri.trim().length === 0) {
      return null;
    }

    return { uri: localAnnouncementImagePreviewUri };
  }, [localAnnouncementImagePreviewUri]);
  const remoteAnnouncementImagePreviewSource = useMemo(() => {
    const remoteImageUrl = draft.imageUrl.trim();

    if (remoteImageUrl.length === 0) {
      return null;
    }

    return { uri: remoteImageUrl };
  }, [draft.imageUrl]);
  const announcementImagePreviewSource = localAnnouncementImagePreviewSource ?? remoteAnnouncementImagePreviewSource;
  const announcementImagePreviewFallbackSource =
    localAnnouncementImagePreviewSource ?? getEventCoverSourceWithFallback(null, "clubControl");
  const hasAnnouncementImagePreview =
    localAnnouncementImagePreviewSource !== null || remoteAnnouncementImagePreviewSource !== null;
  const calendarDays = useMemo(
    () =>
      dateTimeEditor === null
        ? []
        : createCalendarDays(dateTimeEditor.visibleMonth, dateTimeEditor.date),
    [dateTimeEditor]
  );
  const monthTitle = useMemo(() => {
    if (dateTimeEditor === null) {
      return "";
    }

    return new Intl.DateTimeFormat(localeTag, {
      month: "long",
      year: "numeric",
    }).format(new Date(`${dateTimeEditor.visibleMonth}T00:00:00`));
  }, [dateTimeEditor, localeTag]);
  const isEditingDraft = draft.announcementId !== null;

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

  const openDateTimeEditor = (config: DateTimeFieldConfig): void => {
    const sourceValue = draft[config.field].trim().length > 0 ? draft[config.field] : draft.startsAt;
    const parts = splitLocalDateTime(sourceValue);

    setDateTimeEditor({
      date: parts.date,
      field: config.field,
      label: config.label,
      time: parts.time,
      visibleMonth: getMonthStartInput(parts.date),
    });
  };

  const handleConfirmDateTimePress = (): void => {
    if (dateTimeEditor === null) {
      return;
    }

    if (!isValidLocalDateInput(dateTimeEditor.date) || !isValidLocalTimeInput(dateTimeEditor.time)) {
      setActionNotice({
        body:
          language === "fi"
            ? "Valitse kalenterista tai syötä päivä muodossa YYYY-MM-DD ja aika muodossa HH:mm."
            : "Use the calendar or enter the date as YYYY-MM-DD and the time as HH:mm.",
        tone: "error",
      });
      return;
    }

    setDraft((currentDraft) => ({
      ...currentDraft,
      [dateTimeEditor.field]: buildLocalDateTime(dateTimeEditor.date, dateTimeEditor.time),
    }));
    setDateTimeEditor(null);
  };

  const handleClearDateTimePress = (): void => {
    if (dateTimeEditor === null || dateTimeEditor.field !== "endsAt") {
      return;
    }

    setDraft((currentDraft) => ({
      ...currentDraft,
      endsAt: "",
    }));
    setDateTimeEditor(null);
  };

  const resetNewDraft = (): void => {
    const selectedMembership = memberships.find((membership) => membership.clubId === draft.clubId) ?? memberships[0] ?? null;
    setLocalAnnouncementImagePreviewUri(null);
    setDraft(createEmptyClubAnnouncementDraft(selectedMembership));
  };

  const handleNewPress = (): void => {
    setActionNotice(null);
    resetNewDraft();
    setIsFormModalOpen(true);
  };

  const handleEditPress = (announcement: ClubAnnouncementRecord): void => {
    if (isPending) {
      return;
    }

    setActionNotice(null);
    setLocalAnnouncementImagePreviewUri(null);
    setDraft(createClubAnnouncementDraftFromRecord(announcement));
    setContextMenuAnnouncementId(null);
    setIsFormModalOpen(true);
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

      setLocalAnnouncementImagePreviewUri(asset.uri);

      const uploadedImage = await uploadClubAnnouncementImageAsync({
        asset,
        clubId: draft.clubId,
      });

      setDraft((currentDraft) => ({
        ...currentDraft,
        imageStagingPath: uploadedImage.stagingPath,
        imageUrl: uploadedImage.previewUrl,
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

    hapticImpact(ImpactStyle.Medium);
    setActionNotice(null);

    try {
      const result = await saveMutation.mutateAsync({
        draft,
        userId,
      });
      if (result.status === "SUCCESS") {
        hapticNotification(NotificationType.Success);
      } else {
        hapticNotification(NotificationType.Error);
      }
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
        resetNewDraft();
        setIsFormModalOpen(false);
      } else if (result.status === "SUCCESS") {
        setIsFormModalOpen(false);
      }
    } catch (error) {
      hapticNotification(NotificationType.Error);
      setActionNotice(createActionNotice(error, language));
    }
  };

  const handleArchivePress = async (): Promise<void> => {
    if (userId === null || draft.announcementId === null || draft.clubId.trim().length === 0 || isPending) {
      return;
    }

    hapticImpact(ImpactStyle.Medium);
    setActionNotice(null);

    try {
      const result = await archiveMutation.mutateAsync({
        announcementId: draft.announcementId,
        clubId: draft.clubId,
        userId,
      });
      if (result.status === "SUCCESS") {
        hapticNotification(NotificationType.Success);
      } else {
        hapticNotification(NotificationType.Error);
      }
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
        resetNewDraft();
        setIsFormModalOpen(false);
      }
    } catch (error) {
      hapticNotification(NotificationType.Error);
      setActionNotice(createActionNotice(error, language));
    }
  };

  const handleDeleteAnnouncementAsync = async (announcement: ClubAnnouncementRecord): Promise<void> => {
    if (userId === null || isPending) {
      return;
    }

    hapticImpact(ImpactStyle.Medium);
    setActionNotice(null);
    setContextMenuAnnouncementId(null);

    try {
      const result = await deleteMutation.mutateAsync({
        announcementId: announcement.announcementId,
        clubId: announcement.clubId,
        userId,
      });
      if (result.status === "SUCCESS") {
        hapticNotification(NotificationType.Success);
      } else {
        hapticNotification(NotificationType.Error);
      }
      setActionNotice({
        body:
          result.status === "SUCCESS"
            ? language === "fi"
              ? "Tiedote poistettu."
              : "Announcement deleted."
            : result.message,
        tone: result.status === "SUCCESS" ? "success" : "error",
      });
    } catch (error) {
      hapticNotification(NotificationType.Error);
      setActionNotice(createActionNotice(error, language));
    }
  };

  const handleDeleteAnnouncementPress = (announcement: ClubAnnouncementRecord): void => {
    Alert.alert(
      language === "fi" ? "Poista tiedote?" : "Delete announcement?",
      language === "fi"
        ? "Tiedote poistetaan pysyvästi ja sen kuva poistetaan tallennuksesta, jos kuva kuuluu OmaLeimalle."
        : "This permanently removes the announcement and deletes its image from storage when OmaLeima owns it.",
      [
        {
          style: "cancel",
          text: language === "fi" ? "Peruuta" : "Cancel",
        },
        {
          onPress: () => void handleDeleteAnnouncementAsync(announcement),
          style: "destructive",
          text: language === "fi" ? "Poista" : "Delete",
        },
      ]
    );
  };

  return (
    <AppScreen>
      <View style={styles.topBar}>
        <View style={styles.clubHeader}>
          <View style={styles.clubBrand}>
            <AppIcon color={theme.colors.lime} name="star" size={18} />
            <Text style={styles.clubBrandTitle}>OmaLeima</Text>
          </View>
          <Text style={styles.clubBrandSub}>
            {language === "fi" ? "Tiedotteet" : "Announcements"}
          </Text>
        </View>
        {memberships.length > 0 ? (
          <Pressable onPress={handleNewPress} style={styles.addButton}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        ) : null}
      </View>

      {dashboardQuery.isLoading ? (
        <InfoCard eyebrow="Club" title={language === "fi" ? "Ladataan oikeuksia" : "Loading access"}>
          <Text style={styles.bodyText}>
            {language === "fi" ? "Haetaan klubit, joihin voit julkaista." : "Loading clubs you can publish for."}
          </Text>
        </InfoCard>
      ) : null}

      {dashboardQuery.error ? (
        <InfoCard
          eyebrow={language === "fi" ? "Klubi" : "Club"}
          title={language === "fi" ? "Klubeja ei voitu ladata" : "Could not load clubs"}
        >
          <Text style={styles.bodyText}>{createUserSafeErrorMessage(dashboardQuery.error, language, "clubDashboard")}</Text>
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

      {memberships.length > 0 ? null : null}

      {announcementsQuery.isLoading ? (
        <InfoCard eyebrow="Feed" title={language === "fi" ? "Haetaan tiedotteita" : "Loading announcements"}>
          <Text style={styles.bodyText}>
            {language === "fi" ? "Ladataan klubin viimeisimpiä tiedotteita." : "Loading the latest club posts."}
          </Text>
        </InfoCard>
      ) : null}

      {announcementsQuery.error ? (
        <InfoCard eyebrow="Feed" title={language === "fi" ? "Tiedotteita ei voitu ladata" : "Could not load posts"}>
          <Text style={styles.bodyText}>{createUserSafeErrorMessage(announcementsQuery.error, language, "announcements")}</Text>
          <Pressable onPress={() => void announcementsQuery.refetch()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{language === "fi" ? "Yritä uudelleen" : "Retry"}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {announcementsQuery.data?.length === 0 ? (
        <InfoCard eyebrow="Feed" title={language === "fi" ? "Ei tiedotteita vielä" : "No announcements yet"}>
          <View style={{ alignItems: "flex-start", flexDirection: "row", gap: 12 }}>
            <AppIcon color={theme.colors.textMuted} name="bell" size={16} />
            <Text style={[styles.bodyText, { flex: 1 }]}>
              {language === "fi"
                ? "Ensimmäinen julkaistu tiedote näkyy opiskelijoille ja yrityksille heidän feedissään."
                : "The first published announcement appears in the student and business feeds."}
            </Text>
          </View>
        </InfoCard>
      ) : null}

      {sortedAnnouncements.length > 0 ? (
        <View style={styles.listStack}>
          <View style={styles.sectionIconHeader}>
            <AppIcon color={theme.colors.lime} name="bell" size={16} />
            <Text style={styles.sectionTitle}>{language === "fi" ? "Viimeisimmät" : "Latest"}</Text>
            <Text style={styles.sectionCount}>{sortedAnnouncements.length}</Text>
          </View>
          {sortedAnnouncements.map((announcement) => (
            <Pressable
              key={announcement.announcementId}
              onPress={() => setContextMenuAnnouncementId(announcement.announcementId)}
              style={styles.listCard}
            >
              <CoverImageSurface
                fallbackSource={getEventCoverSourceWithFallback(null, "clubControl")}
                imageStyle={styles.listImage}
                source={announcement.imageUrl === null ? null : { uri: announcement.imageUrl }}
                style={styles.listImageSurface}
              >
                <View style={styles.listImageOverlay} />
                <View style={styles.listImageContent}>
                  <View style={styles.eventStatusChip}>
                    <View style={[styles.statusDot, recordStatusState(announcement.status) === "ready" ? styles.statusDotReady : recordStatusState(announcement.status) === "warning" ? styles.statusDotWarning : styles.statusDotPending]} />
                    <Text style={styles.statusChipLabel}>{recordStatusLabel(announcement.status, language)}</Text>
                  </View>
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

      {/* Action sheet */}
      <Modal
        animationType="fade"
        onRequestClose={() => setContextMenuAnnouncementId(null)}
        transparent
        visible={contextMenuAnnouncementId !== null}
      >
        <Pressable
          style={styles.actionSheetBackdrop}
          onPress={() => setContextMenuAnnouncementId(null)}
        >
          <Pressable style={styles.actionSheet} onPress={() => {}}>
            {contextMenuAnnouncement !== null ? (
              <Pressable
                onPress={() => handleEditPress(contextMenuAnnouncement)}
                style={styles.actionSheetItem}
              >
                <Text style={styles.actionSheetItemText}>{language === "fi" ? "Muokkaa" : "Edit"}</Text>
              </Pressable>
            ) : null}
            {contextMenuAnnouncement !== null ? (
              <Pressable
                onPress={() => handleDeleteAnnouncementPress(contextMenuAnnouncement)}
                style={styles.actionSheetItem}
              >
                <Text style={styles.actionSheetItemDangerText}>{language === "fi" ? "Poista" : "Delete"}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => setContextMenuAnnouncementId(null)}
              style={styles.actionSheetItem}
            >
              <Text style={styles.actionSheetItemMutedText}>{language === "fi" ? "Peruuta" : "Cancel"}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Form modal */}
      <Modal
        animationType="slide"
        onRequestClose={() => setIsFormModalOpen(false)}
        visible={isFormModalOpen}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.formModalContainer}
        >
          <ScrollView
            contentContainerStyle={styles.formModalScrollContent}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formModalHeader}>
              <View style={styles.formModalHeaderCopy}>
                <Text style={styles.topBarEyebrow}>
                  {isEditingDraft ? (language === "fi" ? "Muokkaa" : "Edit") : (language === "fi" ? "Uusi" : "Create")}
                </Text>
                <Text numberOfLines={2} style={styles.formModalTitle}>
                  {isEditingDraft ? draft.title : (language === "fi" ? "Uusi tiedote" : "New announcement")}
                </Text>
              </View>
              <Pressable onPress={() => setIsFormModalOpen(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.formModalBody}>
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
                  fallbackSource={announcementImagePreviewFallbackSource}
                  imageStyle={styles.imagePreview}
                  source={announcementImagePreviewSource}
                  style={styles.imagePreviewSurface}
                >
                  <View style={styles.imageOverlay} />
                  <View style={styles.imageContent}>
                    <Text style={styles.imageTitle}>
                      {hasAnnouncementImagePreview
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

              <View style={styles.dateTimeGrid}>
                {dateTimeFieldConfigs.map((config) => (
                  <Pressable
                    disabled={isPending}
                    key={config.field}
                    onPress={() => openDateTimeEditor(config)}
                    style={styles.dateTimeCard}
                  >
                    <Text style={styles.fieldLabel}>{config.label}</Text>
                    <Text style={styles.dateTimeValue}>
                      {formatDraftDateTimeValue(
                        formatter,
                        draft[config.field],
                        config.isOptional
                          ? language === "fi"
                            ? "Ei päättymistä"
                            : "No end time"
                          : language === "fi"
                            ? "Valitse aika"
                            : "Pick a time"
                      )}
                    </Text>
                    <View style={styles.dateTimeHintRow}>
                      <AppIcon color={theme.colors.lime} name="calendar" size={14} />
                      <Text style={styles.dateTimeHint}>
                        {config.isOptional
                          ? language === "fi"
                            ? "Kalenteri tai tyhjä päättymiselle"
                            : "Calendar or leave empty for no end"
                          : language === "fi"
                            ? "Valitse päivä ja aika"
                            : "Pick date and time"}
                      </Text>
                    </View>
                  </Pressable>
                ))}
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

              {actionNotice !== null ? (
                <View style={actionNotice.tone === "success" ? styles.successCard : styles.errorCard}>
                  <Text style={actionNotice.tone === "success" ? styles.successText : styles.errorText}>
                    {actionNotice.body}
                  </Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Calendar picker lives inside the form modal */}
        <Modal
          animationType="fade"
          onRequestClose={() => setDateTimeEditor(null)}
          transparent
          visible={dateTimeEditor !== null}
        >
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={16}
              style={styles.modalKeyboardAvoidingView}
            >
              <ScrollView
                automaticallyAdjustKeyboardInsets
                contentContainerStyle={styles.modalScrollContent}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalCard}>
                  <Text style={styles.modalEyebrow}>{language === "fi" ? "Aika" : "Time"}</Text>
                  <Text style={styles.modalTitle}>{dateTimeEditor?.label ?? ""}</Text>

                  <View style={styles.calendarHeader}>
                    <Pressable
                      onPress={() =>
                        setDateTimeEditor((currentEditor) =>
                          currentEditor === null
                            ? null
                            : { ...currentEditor, visibleMonth: shiftMonthInput(currentEditor.visibleMonth, -1) }
                        )
                      }
                      style={styles.calendarNavButton}
                    >
                      <AppIcon color={theme.colors.textPrimary} name="chevron-left" size={16} />
                    </Pressable>
                    <Text style={styles.calendarMonthTitle}>{monthTitle}</Text>
                    <Pressable
                      onPress={() =>
                        setDateTimeEditor((currentEditor) =>
                          currentEditor === null
                            ? null
                            : { ...currentEditor, visibleMonth: shiftMonthInput(currentEditor.visibleMonth, 1) }
                        )
                      }
                      style={styles.calendarNavButton}
                    >
                      <AppIcon color={theme.colors.textPrimary} name="chevron-right" size={16} />
                    </Pressable>
                  </View>

                  <View style={styles.weekdayGrid}>
                    {["Ma", "Ti", "Ke", "To", "Pe", "La", "Su"].map((weekday) => (
                      <Text key={weekday} style={styles.weekdayLabel}>{weekday}</Text>
                    ))}
                  </View>

                  <View style={styles.calendarGrid}>
                    {calendarDays.map((day) => (
                      <Pressable
                        key={day.date}
                        onPress={() =>
                          setDateTimeEditor((currentEditor) =>
                            currentEditor === null
                              ? null
                              : {
                                ...currentEditor,
                                date: day.date,
                                visibleMonth: getMonthStartInput(day.date),
                              }
                          )
                        }
                        style={[
                          styles.calendarDay,
                          day.isSelected ? styles.calendarDaySelected : null,
                          day.isCurrentMonth ? null : styles.calendarDayOutside,
                        ]}
                      >
                        <Text style={[styles.calendarDayText, day.isSelected ? styles.calendarDayTextSelected : null]}>
                          {day.dayLabel}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.modalFieldRow}>
                    <View style={styles.modalField}>
                      <Text style={styles.fieldLabel}>{language === "fi" ? "Päivä" : "Date"}</Text>
                      <TextInput
                        autoCapitalize="none"
                        keyboardType="numbers-and-punctuation"
                        onChangeText={(date) =>
                          setDateTimeEditor((currentEditor) =>
                            currentEditor === null ? null : { ...currentEditor, date }
                          )
                        }
                        placeholder="2026-09-12"
                        placeholderTextColor={theme.colors.textDim}
                        style={styles.input}
                        value={dateTimeEditor?.date ?? ""}
                      />
                    </View>
                    <View style={styles.modalField}>
                      <Text style={styles.fieldLabel}>{language === "fi" ? "Kello" : "Time"}</Text>
                      <TextInput
                        autoCapitalize="none"
                        keyboardType="numbers-and-punctuation"
                        onChangeText={(time) =>
                          setDateTimeEditor((currentEditor) =>
                            currentEditor === null ? null : { ...currentEditor, time }
                          )
                        }
                        placeholder="18:00"
                        placeholderTextColor={theme.colors.textDim}
                        style={styles.input}
                        value={dateTimeEditor?.time ?? ""}
                      />
                    </View>
                  </View>

                  <View style={styles.timeChipRow}>
                    {["16:00", "18:00", "20:00", "22:00"].map((time) => (
                      <Pressable
                        key={time}
                        onPress={() =>
                          setDateTimeEditor((currentEditor) =>
                            currentEditor === null ? null : { ...currentEditor, time }
                          )
                        }
                        style={[styles.timeChip, dateTimeEditor?.time === time ? styles.timeChipSelected : null]}
                      >
                        <Text style={styles.timeChipText}>{time}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.modalActions}>
                    {dateTimeEditor?.field === "endsAt" ? (
                      <Pressable onPress={handleClearDateTimePress} style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>{language === "fi" ? "Tyhjennä" : "Clear"}</Text>
                      </Pressable>
                    ) : null}
                    <Pressable onPress={() => setDateTimeEditor(null)} style={styles.secondaryButton}>
                      <Text style={styles.secondaryButtonText}>{language === "fi" ? "Sulje" : "Close"}</Text>
                    </Pressable>
                    <Pressable onPress={handleConfirmDateTimePress} style={styles.primaryButton}>
                      <Text style={styles.primaryButtonText}>{language === "fi" ? "Käytä aikaa" : "Use time"}</Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </Modal>
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
    calendarDay: {
      alignItems: "center",
      aspectRatio: 1,
      borderRadius: 999,
      justifyContent: "center",
      width: `${100 / 7}%`,
    },
    calendarDayOutside: {
      opacity: 0.36,
    },
    calendarDaySelected: {
      backgroundColor: theme.colors.lime,
    },
    calendarDayText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    calendarDayTextSelected: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
    },
    calendarGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    calendarHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    calendarMonthTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      textTransform: "capitalize",
    },
    calendarNavButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: 999,
      height: 38,
      justifyContent: "center",
      width: 38,
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
    dateTimeCard: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 8,
      padding: 14,
    },
    dateTimeGrid: {
      gap: 10,
    },
    dateTimeHint: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    dateTimeHintRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    dateTimeValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    disabledButton: {
      opacity: 0.62,
    },
    editFocusBody: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    editFocusCard: {
      alignItems: "flex-start",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.limeBorder,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      padding: 14,
    },
    editFocusCopy: {
      flex: 1,
      gap: 4,
    },
    editFocusIconWrap: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      height: 24,
      justifyContent: "center",
      marginTop: 1,
      width: 24,
    },
    editFocusTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
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
    modalActions: {
      flexDirection: "row",
      gap: 10,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(3, 5, 8, 0.62)",
      justifyContent: "center",
      padding: 20,
    },
    modalCard: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 16,
      padding: 18,
    },
    modalEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    modalField: {
      flex: 1,
      gap: 8,
    },
    modalFieldRow: {
      flexDirection: "row",
      gap: 10,
    },
    modalKeyboardAvoidingView: {
      flex: 1,
      justifyContent: "center",
    },
    modalScrollContent: {
      flexGrow: 1,
      justifyContent: "center",
    },
    modalTitle: {
      color: theme.colors.textPrimary,
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
      textAlign: "center",
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
      textAlign: "center",
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
      textAlign: "center",
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
    timeChip: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    timeChipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    timeChipSelected: {
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
    },
    timeChipText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    uploadButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      minHeight: 42,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    uploadButtonText: {
      color: theme.colors.actionPrimaryText,
      flexShrink: 1,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
      textAlign: "center",
    },
    wrapRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    weekdayGrid: {
      flexDirection: "row",
    },
    weekdayLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textAlign: "center",
      width: `${100 / 7}%`,
    },
    addButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    addButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: 20,
      height: 32,
      includeFontPadding: false,
      lineHeight: 32,
      textAlign: "center",
      textAlignVertical: "center",
      width: 32,
    },
    actionSheetBackdrop: {
      backgroundColor: "rgba(0, 0, 0, 0.54)",
      flex: 1,
      justifyContent: "flex-end",
    },
    actionSheet: {
      backgroundColor: theme.colors.surfaceL1,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      gap: 4,
      paddingBottom: 32,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    actionSheetItem: {
      alignItems: "center",
      borderRadius: theme.radius.button,
      justifyContent: "center",
      minHeight: 52,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    actionSheetItemText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    actionSheetItemMutedText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    actionSheetItemDangerText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    closeButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    closeButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: 16,
      lineHeight: 20,
    },
    formModalBody: {
      gap: 14,
      paddingBottom: 32,
      paddingHorizontal: 20,
    },
    formModalContainer: {
      backgroundColor: theme.colors.screenBase,
      flex: 1,
    },
    formModalHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      paddingBottom: 16,
      paddingHorizontal: 20,
      paddingTop: 58,
    },
    formModalHeaderCopy: {
      flex: 1,
      gap: 4,
    },
    formModalScrollContent: {
      flexGrow: 1,
    },
    formModalTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    clubHeader: {
      flex: 1,
      gap: 4,
    },
    clubBrand: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    clubBrandTitle: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.extrabold,
      fontSize: 22,
      letterSpacing: -0.5,
      lineHeight: 28,
    },
    clubBrandSub: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
      marginLeft: 26,
    },
    sectionIconHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    sectionCount: {
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: 10,
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    statusDot: {
      borderRadius: 4,
      height: 8,
      width: 8,
    },
    statusDotReady: {
      backgroundColor: theme.colors.lime,
    },
    statusDotWarning: {
      backgroundColor: theme.colors.danger,
    },
    statusDotPending: {
      backgroundColor: theme.colors.textMuted,
    },
    eventStatusChip: {
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.45)",
      borderRadius: 999,
      flexDirection: "row",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    statusChipLabel: {
      color: "rgba(255,255,255,0.92)",
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
  });
