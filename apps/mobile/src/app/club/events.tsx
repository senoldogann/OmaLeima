import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useLocalSearchParams, useRouter } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { useClubDashboardQuery } from "@/features/club/club-dashboard";
import { pickClubEventCoverAsync, uploadClubEventCoverAsync } from "@/features/club/club-event-media";
import {
  useCancelClubEventMutation,
  useCreateClubEventMutation,
  useUpdateClubEventMutation,
} from "@/features/club/club-event-mutations";
import { getEventCoverSourceWithFallback } from "@/features/events/event-visuals";
import type {
  ClubDashboardEventSummary,
  ClubEventEditableStatus,
  ClubEventFormDraft,
  ClubEventVisibility,
  ClubMembershipSummary,
} from "@/features/club/types";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

type TextEditableField = keyof Pick<
  ClubEventFormDraft,
  | "city"
  | "description"
  | "maxParticipants"
  | "minimumStampsRequired"
  | "name"
>;

type DateTimeField = keyof Pick<ClubEventFormDraft, "endAt" | "joinDeadlineAt" | "startAt">;

type FieldConfig = {
  field: TextEditableField;
  label: string;
  multiline: boolean;
  placeholder: string;
};

type DateTimeFieldConfig = {
  field: DateTimeField;
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

const toLocalDateTimeInput = (value: string): string => {
  const date = new Date(value);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  const localDate = new Date(date.getTime() - timezoneOffsetMs);

  return localDate.toISOString().slice(0, 16);
};

const formatDateTime = (formatter: Intl.DateTimeFormat, value: string): string =>
  formatter.format(new Date(value));

const createNewDraft = (clubId: string, city: string | null): ClubEventFormDraft => {
  const now = new Date();
  const startAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14);
  const endAt = new Date(startAt.getTime() + 1000 * 60 * 60 * 5);
  const joinDeadlineAt = new Date(startAt.getTime() - 1000 * 60 * 60 * 2);

  return {
    city: city ?? "",
    clubId,
    coverImageUrl: "",
    description: "",
    endAt: toLocalDateTimeInput(endAt.toISOString()),
    eventId: null,
    joinDeadlineAt: toLocalDateTimeInput(joinDeadlineAt.toISOString()),
    maxParticipants: "",
    minimumStampsRequired: "0",
    name: "",
    startAt: toLocalDateTimeInput(startAt.toISOString()),
    status: "DRAFT",
    visibility: "PUBLIC",
  };
};

const createDraftFromEvent = (event: ClubDashboardEventSummary): ClubEventFormDraft => ({
  city: event.city,
  clubId: event.clubId,
  coverImageUrl: event.coverImageUrl ?? "",
  description: event.description ?? "",
  endAt: toLocalDateTimeInput(event.endAt),
  eventId: event.eventId,
  joinDeadlineAt: toLocalDateTimeInput(event.joinDeadlineAt),
  maxParticipants: event.maxParticipants === null ? "" : String(event.maxParticipants),
  minimumStampsRequired: String(event.minimumStampsRequired),
  name: event.name,
  startAt: toLocalDateTimeInput(event.startAt),
  status: event.status === "ACTIVE" || event.status === "PUBLISHED" ? event.status : "DRAFT",
  visibility: event.visibility,
});

const createFieldConfigs = (language: "fi" | "en"): FieldConfig[] => [
  {
    field: "name",
    label: language === "fi" ? "Tapahtuman nimi" : "Event name",
    multiline: false,
    placeholder: language === "fi" ? "Haalarimerkki Appro" : "Overall badge appro",
  },
  {
    field: "city",
    label: language === "fi" ? "Kaupunki" : "City",
    multiline: false,
    placeholder: "Oulu",
  },
  {
    field: "description",
    label: language === "fi" ? "Kuvaus" : "Description",
    multiline: true,
    placeholder:
      language === "fi"
        ? "Kirjoita opiskelijoille näkyvä tapahtumakuvaus."
        : "Write the public event description for students.",
  },
  {
    field: "minimumStampsRequired",
    label: language === "fi" ? "Minimi leimat" : "Minimum stamps",
    multiline: false,
    placeholder: "12",
  },
  {
    field: "maxParticipants",
    label: language === "fi" ? "Osallistujakatto" : "Max participants",
    multiline: false,
    placeholder: language === "fi" ? "Tyhjä = ei rajaa" : "Empty = no limit",
  },
];

const createDateTimeFieldConfigs = (language: "fi" | "en"): DateTimeFieldConfig[] => [
  {
    field: "startAt",
    label: language === "fi" ? "Alkaa" : "Starts",
  },
  {
    field: "endAt",
    label: language === "fi" ? "Päättyy" : "Ends",
  },
  {
    field: "joinDeadlineAt",
    label: language === "fi" ? "Ilmoittautuminen sulkeutuu" : "Join deadline",
  },
];

const canEditEvent = (event: ClubDashboardEventSummary | null): boolean =>
  event !== null && (event.status === "ACTIVE" || event.status === "DRAFT" || event.status === "PUBLISHED");

const splitLocalDateTime = (value: string): { date: string; time: string } => {
  const [date = "", time = ""] = value.split("T");

  return {
    date,
    time,
  };
};

const buildLocalDateTime = (date: string, time: string): string => `${date.trim()}T${time.trim()}`;

const formatDateInput = (date: Date): string => date.toISOString().slice(0, 10);

const getMonthStartInput = (dateInput: string): string => {
  const date = dateInput.length > 0 ? new Date(`${dateInput}T00:00:00`) : new Date();

  if (Number.isNaN(date.getTime())) {
    return formatDateInput(new Date());
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
};

const shiftMonthInput = (monthInput: string, offset: number): string => {
  const month = new Date(`${monthInput}T00:00:00`);
  month.setMonth(month.getMonth() + offset);

  return getMonthStartInput(formatDateInput(month));
};

const createCalendarDays = (visibleMonth: string, selectedDate: string): CalendarDay[] => {
  const monthStart = new Date(`${visibleMonth}T00:00:00`);
  const calendarStart = new Date(monthStart);
  const mondayBasedDay = (monthStart.getDay() + 6) % 7;
  calendarStart.setDate(monthStart.getDate() - mondayBasedDay);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + index);
    const date = formatDateInput(day);

    return {
      date,
      dayLabel: String(day.getDate()),
      isCurrentMonth: day.getMonth() === monthStart.getMonth(),
      isSelected: date === selectedDate,
    };
  });
};

export default function ClubEventsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string }>();
  const { copy, language, localeTag, theme } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const dashboardQuery = useClubDashboardQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });
  const createMutation = useCreateClubEventMutation();
  const updateMutation = useUpdateClubEventMutation();
  const cancelMutation = useCancelClubEventMutation();
  const memberships = useMemo(
    () => dashboardQuery.data?.memberships ?? [],
    [dashboardQuery.data?.memberships]
  );
  const creatableMemberships = useMemo(
    () => memberships.filter((membership) => membership.canCreateEvents),
    [memberships]
  );
  const events = useMemo(
    () => dashboardQuery.data?.events ?? [],
    [dashboardQuery.data?.events]
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const selectedEvent = events.find((event) => event.eventId === selectedEventId) ?? events[0] ?? null;
  const [draft, setDraft] = useState<ClubEventFormDraft>(() =>
    createNewDraft(creatableMemberships[0]?.clubId ?? "", creatableMemberships[0]?.city ?? null)
  );
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [dateTimeEditor, setDateTimeEditor] = useState<DateTimeEditorState>(null);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState<boolean>(false);
  const fieldConfigs = useMemo(() => createFieldConfigs(language), [language]);
  const dateTimeFieldConfigs = useMemo(() => createDateTimeFieldConfigs(language), [language]);
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [localeTag]
  );

  useEffect(() => {
    if (creatableMemberships.length === 0) {
      return;
    }

    setDraft((currentDraft) => {
      if (currentDraft.clubId.trim().length > 0) {
        return currentDraft;
      }

      return createNewDraft(creatableMemberships[0].clubId, creatableMemberships[0].city);
    });
  }, [creatableMemberships]);

  useEffect(() => {
    if (mode === "edit" && selectedEvent !== null) {
      setDraft(createDraftFromEvent(selectedEvent));
    }
  }, [mode, selectedEvent]);

  useEffect(() => {
    if (typeof params.eventId !== "string") {
      return;
    }

    const routedEvent = events.find((event) => event.eventId === params.eventId);

    if (typeof routedEvent === "undefined") {
      return;
    }

    setSelectedEventId(routedEvent.eventId);
    setMode("edit");
    setDraft(createDraftFromEvent(routedEvent));
  }, [events, params.eventId]);

  const updateDraftField = (field: TextEditableField, value: string): void => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  };

  const openDateTimeEditor = (config: DateTimeFieldConfig): void => {
    const parts = splitLocalDateTime(draft[config.field]);

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

    setDraft((currentDraft) => ({
      ...currentDraft,
      [dateTimeEditor.field]: buildLocalDateTime(dateTimeEditor.date, dateTimeEditor.time),
    }));
    setDateTimeEditor(null);
  };

  const handleUploadCoverPress = async (): Promise<void> => {
    if (draft.clubId.trim().length === 0 || isUploadingCover) {
      return;
    }

    setCoverUploadError(null);
    setIsUploadingCover(true);

    try {
      const asset = await pickClubEventCoverAsync();

      if (asset === null) {
        setIsUploadingCover(false);
        return;
      }

      const uploadedCover = await uploadClubEventCoverAsync({
        asset,
        clubId: draft.clubId,
      });

      setDraft((currentDraft) => ({
        ...currentDraft,
        coverImageUrl: uploadedCover.publicUrl,
      }));
    } catch (error) {
      setCoverUploadError(error instanceof Error ? error.message : "Unknown event cover upload error.");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSelectCreateMode = (): void => {
    const selectedMembership = creatableMemberships[0] ?? null;
    setMode("create");
    setDraft(createNewDraft(selectedMembership?.clubId ?? "", selectedMembership?.city ?? null));
  };

  const handleSelectEvent = (event: ClubDashboardEventSummary): void => {
    setSelectedEventId(event.eventId);
    setMode("edit");
    setDraft(createDraftFromEvent(event));
  };

  const handleSubmitPress = async (): Promise<void> => {
    if (userId === null) {
      return;
    }

    if (mode === "create") {
      const result = await createMutation.mutateAsync({ draft, userId });

      if (result.status === "SUCCESS") {
        handleSelectCreateMode();
      }
      return;
    }

    await updateMutation.mutateAsync({ draft, userId });
  };

  const handleCancelPress = async (): Promise<void> => {
    if (userId === null || selectedEvent === null) {
      return;
    }

    await cancelMutation.mutateAsync({ eventId: selectedEvent.eventId, userId });
  };

  const latestMessage =
    createMutation.data?.message ??
    updateMutation.data?.message ??
    cancelMutation.data?.message ??
    null;
  const latestError =
    createMutation.error?.message ??
    updateMutation.error?.message ??
    cancelMutation.error?.message ??
    null;
  const isPending = createMutation.isPending || updateMutation.isPending || cancelMutation.isPending;
  const submitButtonLabel = (() => {
    if (isPending) {
      return language === "fi" ? "Tallennetaan..." : "Saving...";
    }

    if (mode === "create") {
      if (language === "fi") {
        return draft.status === "DRAFT" ? "Luo luonnos" : "Luo tapahtuma";
      }

      return draft.status === "DRAFT" ? "Create draft" : "Create event";
    }

    return language === "fi" ? "Tallenna muutokset" : "Save changes";
  })();
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

  return (
    <AppScreen>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.push("/club/home")} style={styles.backButton}>
          <AppIcon color={theme.colors.textPrimary} name="chevron-left" size={18} />
        </Pressable>
        <View style={styles.topBarCopy}>
          <Text style={styles.screenTitle}>{copy.common.events}</Text>
          <Text style={styles.metaText}>
            {language === "fi" ? "Luo, päivitä ja sulje klubin tapahtumia." : "Create, update, and close club events."}
          </Text>
        </View>
      </View>

      {dashboardQuery.isLoading ? (
        <InfoCard eyebrow={copy.common.loading} title={copy.common.events}>
          <Text style={styles.bodyText}>{language === "fi" ? "Ladataan tapahtumia..." : "Loading events..."}</Text>
        </InfoCard>
      ) : null}

      {dashboardQuery.error ? (
        <InfoCard eyebrow={copy.common.error} title={copy.common.events}>
          <Text style={styles.bodyText}>{dashboardQuery.error.message}</Text>
        </InfoCard>
      ) : null}

      {!dashboardQuery.isLoading && !dashboardQuery.error ? (
        <>
          <InfoCard eyebrow="Club" title={language === "fi" ? "Tapahtumalista" : "Event list"}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventRail}>
              <Pressable
                disabled={creatableMemberships.length === 0}
                onPress={handleSelectCreateMode}
                style={[styles.eventChip, mode === "create" ? styles.eventChipSelected : null]}
              >
                <Text style={styles.eventChipTitle}>{language === "fi" ? "Uusi tapahtuma" : "New event"}</Text>
                <Text style={styles.eventChipMeta}>
                  {creatableMemberships.length === 0
                    ? language === "fi"
                      ? "Vain katselu"
                      : "View only"
                    : language === "fi"
                      ? "Luonnos"
                      : "Draft"}
                </Text>
              </Pressable>

              {events.map((event) => (
                <Pressable
                  key={event.eventId}
                  onPress={() => handleSelectEvent(event)}
                  style={[styles.eventChip, selectedEvent?.eventId === event.eventId && mode === "edit" ? styles.eventChipSelected : null]}
                >
                  <Text numberOfLines={1} style={styles.eventChipTitle}>
                    {event.name}
                  </Text>
                  <Text style={styles.eventChipMeta}>
                    {formatDateTime(formatter, event.startAt)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </InfoCard>

          <InfoCard
            eyebrow={mode === "create" ? "Create" : "Edit"}
            title={mode === "create" ? (language === "fi" ? "Luo tapahtuma" : "Create event") : (selectedEvent?.name ?? "Event")}
          >
            {mode === "create" && creatableMemberships.length > 1 ? (
              <View style={styles.optionRow}>
                {creatableMemberships.map((membership: ClubMembershipSummary) => (
                  <Pressable
                    key={membership.clubId}
                    onPress={() => setDraft((currentDraft) => ({ ...currentDraft, clubId: membership.clubId, city: currentDraft.city || membership.city || "" }))}
                    style={[styles.optionChip, draft.clubId === membership.clubId ? styles.optionChipSelected : null]}
                  >
                    <Text style={styles.optionChipText}>{membership.clubName}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {mode === "edit" && selectedEvent !== null ? (
              <View style={styles.metricsRow}>
                <Text style={styles.metricText}>{selectedEvent.registeredParticipantCount} {language === "fi" ? "osallistujaa" : "participants"}</Text>
                <Text style={styles.metricText}>{selectedEvent.joinedVenueCount} {language === "fi" ? "rastia" : "venues"}</Text>
                <StatusBadge
                  label={selectedEvent.status}
                  state={selectedEvent.status === "ACTIVE" || selectedEvent.status === "PUBLISHED" ? "ready" : "pending"}
                />
              </View>
            ) : null}

            <View style={styles.formStack}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{language === "fi" ? "Kansikuva" : "Cover image"}</Text>
                <CoverImageSurface
                  imageStyle={styles.coverPreviewImage}
                  source={getEventCoverSourceWithFallback(draft.coverImageUrl, "clubControl")}
                  style={styles.coverPreview}
                >
                  <View style={styles.coverPreviewOverlay} />
                  <View style={styles.coverPreviewContent}>
                    <Text style={styles.coverPreviewTitle}>
                      {draft.coverImageUrl.trim().length > 0
                        ? language === "fi"
                          ? "Kansikuva valittu"
                          : "Cover selected"
                        : language === "fi"
                          ? "Lisää tapahtuman tunnelma"
                          : "Add the event atmosphere"}
                    </Text>
                    <Pressable
                      disabled={isPending || isUploadingCover || draft.clubId.trim().length === 0}
                      onPress={() => void handleUploadCoverPress()}
                      style={[styles.coverUploadButton, isUploadingCover ? styles.disabledButton : null]}
                    >
                      {isUploadingCover ? (
                        <ActivityIndicator color={theme.colors.actionPrimaryText} size="small" />
                      ) : (
                        <AppIcon color={theme.colors.actionPrimaryText} name="calendar" size={16} />
                      )}
                      <Text style={styles.coverUploadButtonText}>
                        {language === "fi" ? "Valitse puhelimesta" : "Choose from phone"}
                      </Text>
                    </Pressable>
                  </View>
                </CoverImageSurface>
                {coverUploadError !== null ? <Text style={styles.errorText}>{coverUploadError}</Text> : null}
              </View>

              {fieldConfigs.map((config) => (
                <View key={config.field} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{config.label}</Text>
                  <TextInput
                    autoCapitalize="sentences"
                    editable={!isPending && (mode === "create" || canEditEvent(selectedEvent))}
                    keyboardType={config.field === "minimumStampsRequired" || config.field === "maxParticipants" ? "number-pad" : "default"}
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

              <View style={styles.dateTimeGrid}>
                {dateTimeFieldConfigs.map((config) => (
                  <Pressable
                    disabled={isPending || !(mode === "create" || canEditEvent(selectedEvent))}
                    key={config.field}
                    onPress={() => openDateTimeEditor(config)}
                    style={styles.dateTimeCard}
                  >
                    <Text style={styles.fieldLabel}>{config.label}</Text>
                    <Text style={styles.dateTimeValue}>
                      {formatDateTime(formatter, new Date(draft[config.field]).toISOString())}
                    </Text>
                    <View style={styles.dateTimeHintRow}>
                      <AppIcon color={theme.colors.lime} name="calendar" size={14} />
                      <Text style={styles.dateTimeHint}>
                        {language === "fi" ? "Valitse päivä ja aika" : "Pick date and time"}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.optionBlock}>
              <Text style={styles.fieldLabel}>{language === "fi" ? "Näkyvyys" : "Visibility"}</Text>
              <View style={styles.optionRow}>
                {(["PUBLIC", "UNLISTED", "PRIVATE"] as ClubEventVisibility[]).map((visibility) => (
                  <Pressable
                    key={visibility}
                    onPress={() => setDraft((currentDraft) => ({ ...currentDraft, visibility }))}
                    style={[styles.optionChip, draft.visibility === visibility ? styles.optionChipSelected : null]}
                  >
                    <Text style={styles.optionChipText}>{visibility}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.optionBlock}>
              <Text style={styles.fieldLabel}>Status</Text>
              <View style={styles.optionRow}>
                {(["DRAFT", "PUBLISHED", "ACTIVE"] as ClubEventEditableStatus[]).map((status) => (
                  <Pressable
                    disabled={isPending || (mode === "edit" && !canEditEvent(selectedEvent))}
                    key={status}
                    onPress={() => setDraft((currentDraft) => ({ ...currentDraft, status }))}
                    style={[styles.optionChip, draft.status === status ? styles.optionChipSelected : null]}
                  >
                    <Text style={styles.optionChipText}>{status}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              disabled={isPending || (mode === "create" && creatableMemberships.length === 0) || (mode === "edit" && !canEditEvent(selectedEvent))}
              onPress={() => void handleSubmitPress()}
              style={[styles.primaryButton, isPending ? styles.disabledButton : null]}
            >
              <Text style={styles.primaryButtonText}>{submitButtonLabel}</Text>
            </Pressable>

            {mode === "edit" && selectedEvent !== null && canEditEvent(selectedEvent) ? (
              <Pressable
                disabled={isPending}
                onPress={() => void handleCancelPress()}
                style={[styles.secondaryButton, isPending ? styles.disabledButton : null]}
              >
                <Text style={styles.secondaryButtonText}>
                  {language === "fi" ? "Peru tapahtuma" : "Cancel event"}
                </Text>
              </Pressable>
            ) : null}

            {latestMessage !== null ? <Text style={styles.successText}>{latestMessage}</Text> : null}
            {latestError !== null ? <Text style={styles.errorText}>{latestError}</Text> : null}
          </InfoCard>
        </>
      ) : null}

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
    disabledButton: {
      opacity: 0.62,
    },
    coverPreview: {
      borderRadius: theme.radius.scene,
      minHeight: 188,
      overflow: "hidden",
      position: "relative",
    },
    coverPreviewContent: {
      flex: 1,
      gap: 14,
      justifyContent: "flex-end",
      padding: 16,
    },
    coverPreviewImage: {
      borderRadius: theme.radius.scene,
    },
    coverPreviewOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.46)",
    },
    coverPreviewTitle: {
      color: "#F8FAF5",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    coverUploadButton: {
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
    coverUploadButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
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
    errorText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    eventChip: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 18,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 4,
      minWidth: 156,
      padding: 12,
    },
    eventChipMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    eventChipSelected: {
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
    },
    eventChipTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    eventRail: {
      gap: 10,
      paddingRight: 4,
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
    input: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: theme.mode === "light" ? 1 : 0,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.body,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    metricsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    metricText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    optionBlock: {
      gap: 8,
    },
    modalActions: {
      flexDirection: "row",
      gap: 10,
    },
    modalBackdrop: {
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.72)",
      flex: 1,
      justifyContent: "center",
      padding: 20,
    },
    modalCard: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.scene,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 16,
      padding: 18,
      width: "100%",
    },
    modalEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.2,
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
      maxHeight: "100%",
      width: "100%",
    },
    modalScrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      paddingVertical: 12,
    },
    modalTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    optionChip: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    optionChipSelected: {
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
    },
    optionChipText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    optionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      minHeight: 48,
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 13,
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
      minHeight: 46,
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    successText: {
      color: theme.colors.lime,
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
    },
    topBarCopy: {
      flex: 1,
      gap: 6,
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
    weekdayGrid: {
      flexDirection: "row",
    },
    weekdayLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textAlign: "center",
      width: `${100 / 7}%`,
    },
  });
