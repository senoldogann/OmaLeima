import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
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
import { useClubDashboardQuery } from "@/features/club/club-dashboard";
import { pickClubEventCoverAsync, uploadClubEventCoverAsync } from "@/features/club/club-event-media";
import {
  useCancelClubEventMutation,
  useCreateClubEventMutation,
  useUpdateClubEventMutation,
} from "@/features/club/club-event-mutations";
import { getEventCoverSourceWithFallback, getFallbackCoverSource } from "@/features/events/event-visuals";
import type {
  ClubDashboardEventSummary,
  ClubEventEditableStatus,
  ClubEventFormDraft,
  ClubEventVisibility,
  ClubMembershipSummary,
} from "@/features/club/types";
import type { MobileTheme } from "@/features/foundation/theme";
import { useManualRefresh } from "@/features/foundation/use-manual-refresh";
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

type ActionNotice = {
  body: string;
  title: string;
};

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
    perBusinessLimit: "1",
    rules: {},
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
  perBusinessLimit: String(event.perBusinessLimit),
  rules: event.rules,
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

const createClubEventActionNotice = (error: unknown, language: "fi" | "en"): ActionNotice => {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("endAt must be after startAt") || message.includes("EVENT_END_BEFORE_START")) {
    return {
      body:
        language === "fi"
          ? "Päättymisajan täytyy olla aloitusajan jälkeen."
          : "End time must be after the start time.",
      title: language === "fi" ? "Tarkista ajat" : "Check event times",
    };
  }

  if (message.includes("joinDeadlineAt must be before or equal to startAt") || message.includes("EVENT_JOIN_DEADLINE_INVALID")) {
    return {
      body:
        language === "fi"
          ? "Ilmoittautumisen takaraja ei voi olla tapahtuman aloituksen jälkeen."
          : "Join deadline cannot be after the event start.",
      title: language === "fi" ? "Tarkista ilmoittautuminen" : "Check join deadline",
    };
  }

  if (message.includes("Event name must contain")) {
    return {
      body:
        language === "fi"
          ? "Tapahtuman nimessä täytyy olla vähintään kolme merkkiä."
          : "Event name must contain at least three characters.",
      title: language === "fi" ? "Nimi puuttuu" : "Name is too short",
    };
  }

  if (message.includes("Event city must contain")) {
    return {
      body:
        language === "fi"
          ? "Lisää tapahtumalle kaupunki."
          : "Add a city for the event.",
      title: language === "fi" ? "Kaupunki puuttuu" : "City is missing",
    };
  }

  if (message.includes("positive whole number") || message.includes("zero or a positive whole number")) {
    return {
      body:
        language === "fi"
          ? "Numeroiden täytyy olla kokonaislukuja. Jätä osallistujakatto tyhjäksi, jos rajaa ei ole."
          : "Numbers must be whole numbers. Leave max participants empty when there is no cap.",
      title: language === "fi" ? "Tarkista numerot" : "Check numbers",
    };
  }

  if (message.includes("perBusinessLimit must be an integer between 1 and 5")) {
    return {
      body:
        language === "fi"
          ? "Valitse samasta pisteestä sallittu leimamäärä välillä 1-5."
          : "Choose a same-venue stamp limit between 1 and 5.",
      title: language === "fi" ? "Tarkista leimaraja" : "Check stamp limit",
    };
  }

  return {
    body: message.length > 0 ? message : language === "fi" ? "Tuntematon virhe." : "Unknown error.",
    title: language === "fi" ? "Tallennus epäonnistui" : "Save failed",
  };
};

const canEditEvent = (event: ClubDashboardEventSummary | null): boolean =>
  event !== null &&
  event.timelineState !== "COMPLETED" &&
  event.timelineState !== "CANCELLED" &&
  (event.status === "ACTIVE" || event.status === "DRAFT" || event.status === "PUBLISHED");

const splitLocalDateTime = (value: string): { date: string; time: string } => {
  const [date = "", time = ""] = value.split("T");

  return {
    date,
    time,
  };
};

const buildLocalDateTime = (date: string, time: string): string => `${date.trim()}T${time.trim()}`;

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
  const manualRefresh = useManualRefresh(dashboardQuery.refetch);
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
  const manageableEvents = useMemo(
    () => events.filter((event) => event.timelineState !== "COMPLETED" && event.timelineState !== "CANCELLED"),
    [events]
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const selectedEvent = manageableEvents.find((event) => event.eventId === selectedEventId) ?? null;
  const [draft, setDraft] = useState<ClubEventFormDraft>(() =>
    createNewDraft(creatableMemberships[0]?.clubId ?? "", creatableMemberships[0]?.city ?? null)
  );
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [dateTimeEditor, setDateTimeEditor] = useState<DateTimeEditorState>(null);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const fieldConfigs = useMemo(() => createFieldConfigs(language), [language]);
  const dateTimeFieldConfigs = useMemo(() => createDateTimeFieldConfigs(language), [language]);
  const requestedEventId = typeof params.eventId === "string" ? params.eventId : null;
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

    const routedEvent = manageableEvents.find((event) => event.eventId === params.eventId);

    if (typeof routedEvent === "undefined") {
      return;
    }

    setSelectedEventId(routedEvent.eventId);
    setMode("edit");
    setDraft(createDraftFromEvent(routedEvent));
  }, [manageableEvents, params.eventId]);

  useEffect(() => {
    if (requestedEventId !== null || mode !== "edit") {
      return;
    }

    const selectedMembership = creatableMemberships[0] ?? null;
    setSelectedEventId(null);
    setActionNotice(null);
    setMode("create");
    setDraft(createNewDraft(selectedMembership?.clubId ?? "", selectedMembership?.city ?? null));
  }, [creatableMemberships, mode, requestedEventId]);

  useEffect(() => {
    setDateTimeEditor(null);
  }, [mode, selectedEventId]);

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
    setActionNotice(null);
    setDraft(createNewDraft(selectedMembership?.clubId ?? "", selectedMembership?.city ?? null));
  };

  const handleSubmitPress = async (): Promise<void> => {
    if (userId === null) {
      return;
    }

    setActionNotice(null);

    try {
      if (mode === "create") {
        const result = await createMutation.mutateAsync({ draft, userId });

        if (result.status === "SUCCESS") {
          handleSelectCreateMode();
        }
        return;
      }

      await updateMutation.mutateAsync({ draft, userId });
    } catch (error) {
      setActionNotice(createClubEventActionNotice(error, language));
    }
  };

  const handleCancelPress = async (): Promise<void> => {
    if (userId === null || selectedEvent === null) {
      return;
    }

    setActionNotice(null);

    try {
      await cancelMutation.mutateAsync({ eventId: selectedEvent.eventId, userId });
      router.push("/club/upcoming");
    } catch (error) {
      setActionNotice(createClubEventActionNotice(error, language));
    }
  };

  const latestMessage =
    createMutation.data?.message ??
    updateMutation.data?.message ??
    cancelMutation.data?.message ??
    null;
  const latestError = actionNotice;
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
  const hasCreateAccess = creatableMemberships.length > 0;
  const isEditingExistingEvent = requestedEventId !== null;
  const isMissingRequestedEvent = requestedEventId !== null && selectedEvent === null && !dashboardQuery.isLoading;

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          onRefresh={manualRefresh.refreshAsync}
          refreshing={manualRefresh.isRefreshing}
          tintColor={theme.colors.lime}
        />
      }
    >
      <View style={styles.topBar}>
        <View style={styles.topBarCopy}>
          <Text style={styles.topBarEyebrow}>{language === "fi" ? "Klubi" : "Club"}</Text>
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
          {isMissingRequestedEvent ? (
            <InfoCard eyebrow={language === "fi" ? "Muokkaus" : "Edit"} title={language === "fi" ? "Tapahtumaa ei voi muokata" : "Event cannot be edited"}>
              <Text style={styles.bodyText}>
                {language === "fi"
                  ? "Tama tapahtuma on jo paattynyt, peruttu tai poistui muokattavien listalta. Avaa aktiivinen tapahtuma Tulossa-nakymasta."
                  : "This event is already ended, cancelled, or no longer available in the editable list. Open an active event from Upcoming."}
              </Text>
              <Pressable onPress={() => router.push("/club/upcoming")} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>{language === "fi" ? "Avaa Tulossa" : "Open Upcoming"}</Text>
              </Pressable>
            </InfoCard>
          ) : null}

          {!isEditingExistingEvent && !hasCreateAccess ? (
            <InfoCard eyebrow={language === "fi" ? "Luonti" : "Create"} title={language === "fi" ? "Luontioikeus puuttuu" : "Create access required"}>
              <Text style={styles.bodyText}>
                {language === "fi"
                  ? "Talla roolilla et voi luoda uusia tapahtumia. Avaa olemassa oleva tapahtuma Tulossa-nakymasta, jos sinun taytyy tarkistaa tapahtuman tiedot."
                  : "This role cannot create new events. Open an existing event from Upcoming if you need to review event details."}
              </Text>
              <Pressable onPress={() => router.push("/club/upcoming")} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>{language === "fi" ? "Siirry Tulossa-listaan" : "Go to Upcoming"}</Text>
              </Pressable>
            </InfoCard>
          ) : null}

          {((isEditingExistingEvent && selectedEvent !== null) || (!isEditingExistingEvent && hasCreateAccess)) ? (
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

              <View style={styles.formStack}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{language === "fi" ? "Kansikuva" : "Cover image"}</Text>
                  <CoverImageSurface
                    fallbackSource={getFallbackCoverSource("clubControl")}
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
                <Text style={styles.fieldLabel}>
                  {language === "fi" ? "Leimat samasta pisteestä" : "Same venue limit"}
                </Text>
                <Text style={styles.metaText}>
                  {language === "fi"
                    ? "Kuinka monta leimaa yksi opiskelija voi saada samasta pisteestä tämän tapahtuman aikana."
                    : "How many stamps one student can collect from the same venue during this event."}
                </Text>
                <View style={styles.optionRow}>
                  {(["1", "2", "3", "4", "5"] as const).map((limit) => (
                    <Pressable
                      disabled={isPending || (mode === "edit" && !canEditEvent(selectedEvent))}
                      key={limit}
                      onPress={() => setDraft((currentDraft) => ({ ...currentDraft, perBusinessLimit: limit }))}
                      style={[styles.optionChip, draft.perBusinessLimit === limit ? styles.optionChipSelected : null]}
                    >
                      <Text style={styles.optionChipText}>{limit}</Text>
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
              {latestError !== null ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorTitle}>{latestError.title}</Text>
                  <Text style={styles.errorText}>{latestError.body}</Text>
                </View>
              ) : null}
            </InfoCard>
          ) : null}
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
    errorCard: {
      backgroundColor: theme.colors.dangerSurface,
      borderColor: theme.colors.danger,
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    errorTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    eventChip: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 18,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 4,
      height: 76,
      justifyContent: "center",
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
    endedEventCard: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 8,
      height: 128,
      justifyContent: "space-between",
      padding: 14,
      width: 238,
    },
    endedEventDate: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    endedEventTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    endedEventTopRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      justifyContent: "space-between",
    },
    endedRail: {
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
    noticeBox: {
      backgroundColor: theme.colors.warningSurface,
      borderColor: theme.colors.warning,
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    noticeTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
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
