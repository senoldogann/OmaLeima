import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  useDeleteDraftClubEventMutation,
  useUpdateClubEventMutation,
} from "@/features/club/club-event-mutations";
import { sortClubEventsForOrganizer } from "@/features/club/event-ordering";
import { getEventCoverSourceWithFallback, getFallbackCoverSource } from "@/features/events/event-visuals";
import { hapticImpact, hapticNotification, ImpactStyle, NotificationType } from "@/features/foundation/safe-haptics";
import { successNoticeDurationMs, useTransientSuccessKey } from "@/features/foundation/use-transient-success-key";
import { createUserSafeErrorMessage } from "@/features/foundation/user-safe-error";
import type {
  ClubDashboardEventSummary,
  ClubDashboardTimelineState,
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
  | "ticketUrl"
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

type ClubEventMutationNoticeResult = {
  message: string;
  status: string;
};

type CalendarDay = {
  date: string;
  dayLabel: string;
  isCurrentMonth: boolean;
  isSelected: boolean;
};

const readRouteEventId = (value: string | string[] | undefined): string | null => {
  if (typeof value === "string") {
    const normalizedValue = value.trim();

    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  if (Array.isArray(value)) {
    const firstValue = value[0];

    if (typeof firstValue !== "string") {
      return null;
    }

    const normalizedValue = firstValue.trim();

    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  return null;
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
    coverImageStagingPath: "",
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
    ticketUrl: "",
    visibility: "PUBLIC",
  };
};

const createDraftFromEvent = (event: ClubDashboardEventSummary): ClubEventFormDraft => ({
  city: event.city,
  clubId: event.clubId,
  coverImageStagingPath: event.coverImageStagingPath ?? "",
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
  ticketUrl: event.ticketUrl ?? "",
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
    field: "ticketUrl",
    label: language === "fi" ? "Lippulinkki" : "Ticket URL",
    multiline: false,
    placeholder: "https://",
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

  if (message.includes("ticketUrl must be a valid absolute URL")) {
    return {
      body:
        language === "fi"
          ? "Lisää lipulle täydellinen URL, esimerkiksi https://kide.app/..."
          : "Add a complete ticket URL, for example https://kide.app/...",
      title: language === "fi" ? "Tarkista lippulinkki" : "Check ticket link",
    };
  }

  if (message.includes("ticketUrl must use http or https")) {
    return {
      body:
        language === "fi"
          ? "Lippulinkin täytyy alkaa muodossa http:// tai https://."
          : "The ticket link must start with http:// or https://.",
      title: language === "fi" ? "Tarkista lippulinkki" : "Check ticket link",
    };
  }

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

  if (message.includes("EVENT_CITY_OUT_OF_SCOPE") || message.includes("CLUB_CITY_REQUIRED")) {
    return {
      body:
        language === "fi"
          ? "Järjestäjän tapahtuman kaupunki lukitaan oman organisaation kaupunkiin. Päivitä organisaation profiili, jos kaupunki on väärä."
          : "Organizer events are locked to the organization's own city. Update the organization profile if the city is wrong.",
      title: language === "fi" ? "Kaupunki lukittu" : "City is locked",
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

  if (message.includes("perBusinessLimit must be an integer between 1 and 5") || message.includes("perBusinessLimit must be 1")) {
    return {
      body:
        language === "fi"
          ? "Samasta pisteestä voi saada yhden leiman."
          : "Same-venue stamp limit must be 1.",
      title: language === "fi" ? "Tarkista leimaraja" : "Check stamp limit",
    };
  }

  if (message.includes("EVENT_UPDATE_NOT_ALLOWED") || message.includes("Event was not updated")) {
    return {
      body:
        language === "fi"
          ? "Tapahtumaa ei voitu päivittää. Se voi olla päättynyt, peruttu tai toisen järjestäjätilin alla."
          : "The event could not be updated. It may be completed, cancelled, or outside this organizer account.",
      title: language === "fi" ? "Päivitys epäonnistui" : "Update failed",
    };
  }

  if (
    message.includes("EVENT_DELETE_NOT_ALLOWED") ||
    message.includes("Event was not deleted") ||
    message.includes("Only draft events can be permanently deleted")
  ) {
    return {
      body:
        language === "fi"
          ? "Vain luonnostapahtumat voidaan poistaa pysyvästi. Julkaistut tai aktiiviset tapahtumat perutaan, jotta historia säilyy."
          : "Only draft events can be permanently deleted. Published or active events are cancelled so history stays intact.",
      title: language === "fi" ? "Poisto ei onnistunut" : "Delete failed",
    };
  }

  if (message.includes("EVENT_CANCEL_NOT_ALLOWED") || message.includes("Event was not cancelled")) {
    return {
      body:
        language === "fi"
          ? "Tapahtumaa ei voitu perua. Se voi olla jo päättynyt, peruttu tai toisen järjestäjätilin alla."
          : "The event could not be cancelled. It may already be completed, cancelled, or outside this organizer account.",
      title: language === "fi" ? "Peruminen epäonnistui" : "Cancel failed",
    };
  }

  return {
    body: message.length > 0 ? message : language === "fi" ? "Tuntematon virhe." : "Unknown error.",
    title: language === "fi" ? "Tallennus epäonnistui" : "Save failed",
  };
};

const localizeClubEventSuccessMessage = (
  result: ClubEventMutationNoticeResult | undefined,
  language: "fi" | "en"
): string | null => {
  if (result === undefined || result.status !== "SUCCESS") {
    return null;
  }

  const messages: Record<string, { en: string; fi: string }> = {
    "Draft event deleted successfully.": {
      en: "Draft event deleted.",
      fi: "Tapahtumaluonnos poistettu.",
    },
    "Event cancelled without deleting operational history.": {
      en: "Event cancelled. Operational history stays intact.",
      fi: "Tapahtuma peruttu. Toimintahistoria säilyy.",
    },
    "Event created and published successfully.": {
      en: "Event created and published.",
      fi: "Tapahtuma luotu ja julkaistu.",
    },
    "Event draft created successfully.": {
      en: "Event draft created.",
      fi: "Tapahtumaluonnos luotu.",
    },
    "Event updated successfully.": {
      en: "Event updated.",
      fi: "Tapahtuma päivitetty.",
    },
  };

  return messages[result.message]?.[language] ?? result.message;
};

const canEditEvent = (event: ClubDashboardEventSummary | null): boolean =>
  event !== null &&
  event.canManageEvent &&
  event.timelineState !== "COMPLETED" &&
  event.timelineState !== "CANCELLED" &&
  (event.status === "ACTIVE" || event.status === "DRAFT" || event.status === "PUBLISHED");

const isDraftEvent = (event: ClubDashboardEventSummary): boolean =>
  event.status === "DRAFT" || event.timelineState === "DRAFT";

const canDeleteEvent = (event: ClubDashboardEventSummary | null): boolean =>
  event !== null &&
  event.canManageEvent &&
  event.timelineState !== "COMPLETED" &&
  event.timelineState !== "CANCELLED" &&
  (event.status === "ACTIVE" || event.status === "DRAFT" || event.status === "PUBLISHED");

const timelineStateLabel = (state: ClubDashboardTimelineState, language: "fi" | "en"): string => {
  if (state === "LIVE") return language === "fi" ? "Käynnissä" : "Live";
  if (state === "UPCOMING") return language === "fi" ? "Tulossa" : "Upcoming";
  if (state === "DRAFT") return language === "fi" ? "Luonnos" : "Draft";
  if (state === "CANCELLED") return language === "fi" ? "Peruttu" : "Cancelled";
  if (state === "COMPLETED") return language === "fi" ? "Päättynyt" : "Completed";
  return state;
};

const timelineStateBadgeState = (state: ClubDashboardTimelineState): "pending" | "ready" | "warning" => {
  if (state === "LIVE") return "ready";
  if (state === "CANCELLED" || state === "COMPLETED") return "warning";
  return "pending";
};

const assertClubEventMutationSucceeded = (result: { message: string; status: string }): void => {
  if (result.status !== "SUCCESS") {
    throw new Error(result.message);
  }
};

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
  const params = useLocalSearchParams<{ eventId?: string | string[] }>();
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
  const deleteMutation = useDeleteDraftClubEventMutation();
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
  const sortedEvents = useMemo(() => sortClubEventsForOrganizer(events), [events]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const filteredEvents = useMemo(
    () =>
      searchQuery.trim().length === 0
        ? sortedEvents
        : sortedEvents.filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [sortedEvents, searchQuery]
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
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [contextMenuEventId, setContextMenuEventId] = useState<string | null>(null);
  const contextMenuEvent = events.find((event) => event.eventId === contextMenuEventId) ?? null;
  const fieldConfigs = useMemo(() => createFieldConfigs(language), [language]);
  const dateTimeFieldConfigs = useMemo(() => createDateTimeFieldConfigs(language), [language]);
  const requestedEventId = readRouteEventId(params.eventId);
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
    if (requestedEventId === null) {
      return;
    }

    const routedEvent = manageableEvents.find((event) => event.eventId === requestedEventId);

    if (typeof routedEvent === "undefined") {
      return;
    }

    setSelectedEventId(routedEvent.eventId);
    setMode("edit");
    setDraft(createDraftFromEvent(routedEvent));
    setIsFormModalOpen(true);
  }, [manageableEvents, requestedEventId]);

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
        coverImageStagingPath: uploadedCover.stagingPath,
        coverImageUrl: uploadedCover.previewUrl,
      }));
    } catch (error) {
      setCoverUploadError(createUserSafeErrorMessage(error, language, "clubMedia"));
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

    hapticImpact(ImpactStyle.Medium);
    setActionNotice(null);

    try {
      if (mode === "create") {
        const result = await createMutation.mutateAsync({ draft, userId });

        assertClubEventMutationSucceeded(result);
        hapticNotification(NotificationType.Success);
        handleSelectCreateMode();
        setIsFormModalOpen(false);
        return;
      }

      const result = await updateMutation.mutateAsync({ draft, userId });

      assertClubEventMutationSucceeded(result);
      hapticNotification(NotificationType.Success);
      setIsFormModalOpen(false);
    } catch (error) {
      hapticNotification(NotificationType.Error);
      setActionNotice(createClubEventActionNotice(error, language));
    }
  };

  const cancelEventAsync = async (event: ClubDashboardEventSummary): Promise<void> => {
    if (userId === null) {
      return;
    }

    hapticImpact(ImpactStyle.Medium);
    setActionNotice(null);

    try {
      const result = await cancelMutation.mutateAsync({ eventId: event.eventId, userId });

      assertClubEventMutationSucceeded(result);
      hapticNotification(NotificationType.Success);
      setIsFormModalOpen(false);
      router.push("/club/upcoming");
    } catch (error) {
      hapticNotification(NotificationType.Error);
      setActionNotice(createClubEventActionNotice(error, language));
    }
  };

  const handleCancelPress = (): void => {
    if (userId === null || selectedEvent === null || isPending) {
      return;
    }

    const eventToCancel = selectedEvent;

    Alert.alert(
      language === "fi" ? "Perutaanko tapahtuma?" : "Cancel event?",
      language === "fi"
        ? "Tapahtuma piilotetaan aktiivisista näkymistä. Leimat, ilmoittautumiset ja audit-historia säilyvät."
        : "This hides the event from active views. Stamps, registrations, and audit history stay intact.",
      [
        {
          style: "cancel",
          text: language === "fi" ? "Ei, palaa" : "No, go back",
        },
        {
          onPress: () => void cancelEventAsync(eventToCancel),
          style: "destructive",
          text: language === "fi" ? "Kyllä, peru tapahtuma" : "Yes, cancel event",
        },
      ]
    );
  };

  const handleDeleteEventAsync = async (event: ClubDashboardEventSummary): Promise<void> => {
    if (userId === null || isPending) {
      return;
    }

    hapticImpact(ImpactStyle.Medium);
    setActionNotice(null);
    setContextMenuEventId(null);

    try {
      const result = isDraftEvent(event)
        ? await deleteMutation.mutateAsync({
            eventId: event.eventId,
            userId,
          })
        : await cancelMutation.mutateAsync({
            eventId: event.eventId,
            userId,
          });

      assertClubEventMutationSucceeded(result);
      hapticNotification(NotificationType.Success);
      if (isDraftEvent(event)) {
        setSelectedEventId(null);
        handleSelectCreateMode();
      } else {
        setIsFormModalOpen(false);
        router.push("/club/upcoming");
      }
    } catch (error) {
      hapticNotification(NotificationType.Error);
      setActionNotice(createClubEventActionNotice(error, language));
    }
  };

  const handleDeleteEventPress = (event: ClubDashboardEventSummary): void => {
    const isDraft = isDraftEvent(event);

    Alert.alert(
      language === "fi" ? "Poista tapahtuma?" : "Delete event?",
      isDraft
        ? language === "fi"
          ? "Tapahtumaluonnos poistetaan pysyvästi."
          : "This permanently removes the draft event."
        : language === "fi"
          ? "Julkaistu tai aktiivinen tapahtuma perutaan ja piilotetaan aktiivisista näkymistä. Leimat, ilmoittautumiset ja audit-historia säilyvät."
          : "A published or active event will be cancelled and hidden from active views. Stamps, registrations, and audit history stay intact.",
      [
        {
          style: "cancel",
          text: language === "fi" ? "Peruuta" : "Cancel",
        },
        {
          onPress: () => void handleDeleteEventAsync(event),
          style: "destructive",
          text: language === "fi" ? "Poista" : "Delete",
        },
      ]
    );
  };

  const latestMessage =
    localizeClubEventSuccessMessage(createMutation.data, language) ??
    localizeClubEventSuccessMessage(updateMutation.data, language) ??
    localizeClubEventSuccessMessage(cancelMutation.data, language) ??
    localizeClubEventSuccessMessage(deleteMutation.data, language) ??
    null;
  const latestError = actionNotice;

  useTransientSuccessKey(
    latestMessage,
    () => {
      createMutation.reset();
      updateMutation.reset();
      cancelMutation.reset();
      deleteMutation.reset();
    },
    successNoticeDurationMs
  );
  const isPending = createMutation.isPending || updateMutation.isPending || cancelMutation.isPending || deleteMutation.isPending;
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
        <View style={styles.clubHeader}>
          <View style={styles.clubBrand}>
            <AppIcon color={theme.colors.lime} name="star" size={18} />
            <Text style={styles.clubBrandTitle}>OmaLeima</Text>
          </View>
          <Text style={styles.clubBrandSub}>
            {language === "fi" ? "Tapahtumat" : "Events"}
          </Text>
        </View>
        {hasCreateAccess ? (
          <Pressable
            onPress={() => { handleSelectCreateMode(); setIsFormModalOpen(true); }}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        ) : null}
      </View>

      {dashboardQuery.isLoading ? (
        <InfoCard eyebrow={copy.common.loading} title={copy.common.events}>
          <Text style={styles.bodyText}>{language === "fi" ? "Ladataan tapahtumia..." : "Loading events..."}</Text>
        </InfoCard>
      ) : null}

      {dashboardQuery.error ? (
        <InfoCard eyebrow={copy.common.error} title={copy.common.events}>
          <Text style={styles.bodyText}>{createUserSafeErrorMessage(dashboardQuery.error, language, "clubDashboard")}</Text>
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

          {sortedEvents.length === 0 && hasCreateAccess ? (
            <InfoCard eyebrow={language === "fi" ? "Tapahtumat" : "Events"} title={language === "fi" ? "Ei tapahtumia vielä" : "No events yet"}>
              <View style={{ alignItems: "flex-start", flexDirection: "row", gap: 12 }}>
                <AppIcon color={theme.colors.textMuted} name="calendar" size={16} />
                <Text style={[styles.bodyText, { flex: 1 }]}>
                  {language === "fi"
                    ? "Luo ensimmäinen tapahtuma + -painikkeella."
                    : "Create your first event with the + button."}
                </Text>
              </View>
            </InfoCard>
          ) : null}

          {sortedEvents.length > 0 ? (
            <View style={styles.listSection}>
              <View style={styles.sectionIconHeader}>
                <AppIcon color={theme.colors.lime} name="calendar" size={16} />
                <Text style={styles.sectionTitle}>{copy.common.events}</Text>
                <Text style={styles.sectionCount}>{sortedEvents.length}</Text>
              </View>
              <TextInput
                onChangeText={setSearchQuery}
                placeholder={language === "fi" ? "Hae tapahtumia..." : "Search events..."}
                placeholderTextColor={theme.colors.textDim}
                style={styles.searchInput}
                value={searchQuery}
              />
              <View style={styles.listStack}>
                {filteredEvents.length === 0 ? (
                  <Text style={styles.bodyText}>
                    {language === "fi" ? "Ei hakutuloksia." : "No results found."}
                  </Text>
                ) : null}
                {filteredEvents.map((event) => (
                  <Pressable
                    key={event.eventId}
                    onPress={() => setContextMenuEventId(event.eventId)}
                    style={styles.eventListCard}
                  >
                    <CoverImageSurface
                      fallbackSource={getEventCoverSourceWithFallback(null, "clubControl")}
                      imageStyle={styles.eventListCardImage}
                      source={event.coverImageUrl === null ? null : { uri: event.coverImageUrl }}
                      style={styles.eventListCardCover}
                    >
                      <View style={styles.eventListCardOverlay} />
                      <View style={styles.eventListCardBadgeRow}>
                        <View style={styles.eventStatusChip}>
                          <View style={[styles.statusDot, timelineStateBadgeState(event.timelineState) === "ready" ? styles.statusDotReady : timelineStateBadgeState(event.timelineState) === "warning" ? styles.statusDotWarning : styles.statusDotPending]} />
                          <Text style={styles.statusChipLabel}>{timelineStateLabel(event.timelineState, language)}</Text>
                        </View>
                      </View>
                    </CoverImageSurface>
                    <View style={styles.eventListCardCopy}>
                      <View style={styles.eventListCardTopRow}>
                        <Text style={styles.eventListCardTitle}>{event.name}</Text>
                      </View>
                      <View style={styles.eventListCardMeta}>
                        {event.city ? (
                          <View style={styles.eventListCardMetaItem}>
                            <AppIcon color={theme.colors.textMuted} name="map-pin" size={12} />
                            <Text style={styles.metaText}>{event.city}</Text>
                          </View>
                        ) : null}
                        <View style={styles.eventListCardMetaItem}>
                          <AppIcon color={theme.colors.textMuted} name="calendar" size={12} />
                          <Text style={styles.metaText}>{formatter.format(new Date(event.startAt))}</Text>
                        </View>
                        <View style={styles.eventListCardMetaItem}>
                          <AppIcon color={theme.colors.textMuted} name="user" size={12} />
                          <Text style={styles.metaText}>
                            {event.registeredParticipantCount}{" "}
                            {language === "fi" ? "os." : "part."}
                            {event.maxParticipants !== null ? ` / ${event.maxParticipants}` : ""}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      {/* Action sheet */}
      <Modal
        animationType="fade"
        onRequestClose={() => setContextMenuEventId(null)}
        transparent
        visible={contextMenuEventId !== null}
      >
        <Pressable style={styles.actionSheetBackdrop} onPress={() => setContextMenuEventId(null)}>
          <Pressable style={styles.actionSheet} onPress={() => {}}>
            {contextMenuEvent !== null &&
            hasCreateAccess &&
            contextMenuEvent.timelineState !== "COMPLETED" &&
            contextMenuEvent.timelineState !== "CANCELLED" ? (
              <Pressable
                onPress={() => {
                  const ev = contextMenuEvent;
                  setSelectedEventId(ev.eventId);
                  setMode("edit");
                  setDraft(createDraftFromEvent(ev));
                  setContextMenuEventId(null);
                  setIsFormModalOpen(true);
                }}
                style={styles.actionSheetItem}
              >
                <Text style={styles.actionSheetItemText}>{language === "fi" ? "Muokkaa" : "Edit"}</Text>
              </Pressable>
            ) : null}
            {contextMenuEvent !== null &&
            canDeleteEvent(contextMenuEvent) ? (
              <Pressable
                onPress={() => handleDeleteEventPress(contextMenuEvent)}
                style={styles.actionSheetItem}
              >
                <Text style={styles.actionSheetItemDangerText}>
                  {language === "fi" ? "Poista tapahtuma" : "Delete event"}
                </Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => setContextMenuEventId(null)} style={styles.actionSheetItem}>
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
                  {mode === "create" ? (language === "fi" ? "Luo" : "Create") : (language === "fi" ? "Muokkaa" : "Edit")}
                </Text>
                <Text numberOfLines={2} style={styles.formModalTitle}>
                  {mode === "create"
                    ? (language === "fi" ? "Uusi tapahtuma" : "New event")
                    : (selectedEvent?.name ?? (language === "fi" ? "Tapahtuma" : "Event"))}
                </Text>
              </View>
              <Pressable onPress={() => setIsFormModalOpen(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.formModalBody}>
              {mode === "create" && creatableMemberships.length > 1 ? (
                <View style={styles.optionRow}>
                  {creatableMemberships.map((membership: ClubMembershipSummary) => (
                    <Pressable
                      key={membership.clubId}
                      onPress={() => setDraft((currentDraft) => ({ ...currentDraft, clubId: membership.clubId, city: membership.city ?? "" }))}
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
                      autoCapitalize={config.field === "ticketUrl" ? "none" : "sentences"}
                      editable={
                        !isPending &&
                        config.field !== "city" &&
                        (mode === "create" || canEditEvent(selectedEvent))
                      }
                      keyboardType={
                        config.field === "minimumStampsRequired" || config.field === "maxParticipants"
                          ? "number-pad"
                          : config.field === "ticketUrl"
                            ? "url"
                            : "default"
                      }
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
                    ? "Yksi opiskelija voi saada samasta pisteestä yhden leiman tämän tapahtuman aikana."
                    : "One student can collect one stamp from the same venue during this event."}
                </Text>
                <View style={styles.optionRow}>
                  {(["1"] as const).map((limit) => (
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
                      <Text style={styles.optionChipText}>
                        {visibility === "PUBLIC"
                          ? (language === "fi" ? "Julkinen" : "Public")
                          : visibility === "UNLISTED"
                            ? (language === "fi" ? "Ei listattu" : "Unlisted")
                            : (language === "fi" ? "Yksityinen" : "Private")}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.optionBlock}>
                <Text style={styles.fieldLabel}>{language === "fi" ? "Tila" : "Status"}</Text>
                <View style={styles.optionRow}>
                  {(["DRAFT", "PUBLISHED", "ACTIVE"] as ClubEventEditableStatus[]).map((status) => (
                    <Pressable
                      disabled={isPending || (mode === "edit" && !canEditEvent(selectedEvent))}
                      key={status}
                      onPress={() => setDraft((currentDraft) => ({ ...currentDraft, status }))}
                      style={[styles.optionChip, draft.status === status ? styles.optionChipSelected : null]}
                    >
                      <Text style={styles.optionChipText}>
                        {status === "DRAFT"
                          ? (language === "fi" ? "Luonnos" : "Draft")
                          : status === "PUBLISHED"
                            ? (language === "fi" ? "Julkaistu" : "Published")
                            : (language === "fi" ? "Aktiivinen" : "Active")}
                      </Text>
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
                  onPress={handleCancelPress}
                  style={[styles.secondaryButton, isPending ? styles.disabledButton : null]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {language === "fi" ? "Peru tapahtuma" : "Cancel event"}
                  </Text>
                </Pressable>
              ) : null}

              {mode === "edit" && selectedEvent !== null && canDeleteEvent(selectedEvent) ? (
                <Pressable
                  disabled={isPending}
                  onPress={() => handleDeleteEventPress(selectedEvent)}
                  style={[styles.dangerButton, isPending ? styles.disabledButton : null]}
                >
                  <Text style={styles.dangerButtonText}>
                    {language === "fi" ? "Poista tapahtuma" : "Delete event"}
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
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Calendar picker lives inside the form modal so it renders on top */}
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
    dangerButton: {
      alignItems: "center",
      backgroundColor: theme.colors.dangerSurface,
      borderColor: theme.colors.danger,
      borderRadius: theme.radius.button,
      borderWidth: 1,
      minHeight: 46,
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    dangerButtonText: {
      color: theme.colors.danger,
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
      minHeight: 52,
      justifyContent: "center",
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
    eventListCard: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: theme.mode === "light" ? 1 : 0,
      overflow: "hidden",
    },
    eventListCardBadgeRow: {
      alignItems: "flex-start",
      flex: 1,
      padding: 10,
    },
    eventListCardCopy: {
      gap: 8,
      padding: 12,
    },
    eventListCardCover: {
      minHeight: 96,
      position: "relative",
    },
    eventListCardImage: {
      borderRadius: 0,
    },
    eventListCardMeta: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    eventListCardMetaItem: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
    },
    eventListCardOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.22)",
    },
    eventListCardTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    eventListCardTopRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      justifyContent: "space-between",
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
    listStack: {
      gap: 10,
    },
    listSection: {
      gap: 12,
    },
    sectionIconHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.bodySmall,
      flex: 1,
      lineHeight: theme.typography.lineHeights.bodySmall,
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
    searchInput: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      height: 44,
      paddingHorizontal: 14,
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
  });
