import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import {
  createVenueMapOpenErrorMessage,
  createVenueAddressLine,
  openExternalVenueMapAsync,
} from "@/features/events/components/student-event-venue-map";
import { getEventCoverSource, prefetchEventCoverUrls } from "@/features/events/event-visuals";
import type { MobileTheme } from "@/features/foundation/theme";
import { interactiveSurfaceShadowStyle } from "@/features/foundation/theme";
import { successNoticeDurationMs, useTransientSuccessKey } from "@/features/foundation/use-transient-success-key";
import { createUserSafeErrorMessage } from "@/features/foundation/user-safe-error";
import {
  useCancelEventRegistrationMutation,
  useJoinEventMutation,
  useStudentEventDetailQuery,
} from "@/features/events/student-event-detail";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useStudentRewardInventoryRealtime } from "@/features/realtime/student-realtime";
import { useActiveAppState, useCurrentTime } from "@/features/qr/student-qr";
import { useSession } from "@/providers/session-provider";
import type { AppReadinessState } from "@/types/app";
import type {
  CancelEventRegistrationResult,
  EventRegistrationState,
  EventRuleValue,
  EventVenueSummary,
  JoinEventResult,
  RewardTierSummary,
  StudentEventDetail,
} from "@/features/events/types";

type EventDetailRouteParams = {
  eventId?: string;
};

type JoinAvailability = {
  canJoin: boolean;
  label: string;
  detail: string;
  state: AppReadinessState;
};

type CancelAvailability = {
  canCancel: boolean;
  label: string;
  detail: string;
  state: AppReadinessState;
};

type ActionNotice = {
  body: string;
  title: string;
};

const createDateTimeFormatter = (localeTag: string): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(localeTag, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const createDateFormatter = (localeTag: string): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(localeTag, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

const createTimeFormatter = (localeTag: string): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(localeTag, {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatRuleValue = (value: EventRuleValue): string => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return String(value);
  }

  return JSON.stringify(value);
};

const extractPerBusinessLimit = (value: EventRuleValue): number | null => {
  if (value === null) {
    return null;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const rawLimit = value.perBusinessLimit;

    if (typeof rawLimit === "number" && Number.isInteger(rawLimit) && rawLimit > 0) {
      return rawLimit;
    }
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry !== "string") {
        continue;
      }

      const match = /^perBusinessLimit:(\d+)$/.exec(entry.trim());

      if (match === null) {
        continue;
      }

      return Number.parseInt(match[1], 10);
    }
  }

  if (typeof value === "string") {
    const match = /^perBusinessLimit:(\d+)$/.exec(value.trim());

    if (match !== null) {
      return Number.parseInt(match[1], 10);
    }
  }

  return null;
};

const createRuleLabel = (key: string, language: "fi" | "en"): string => {
  if (key === "stampPolicy") {
    return language === "fi" ? "Leimasääntö" : "Stamp policy";
  }

  return key;
};

const hiddenEventRuleKeys = new Set([
  "screenshotMode",
  "themeMode",
  "colorScheme",
  "displayMode",
  "previewMode",
]);

const createVisibleRuleEntries = (rules: StudentEventDetail["rules"]): [string, EventRuleValue][] =>
  Object.entries(rules).filter(([key]) => !hiddenEventRuleKeys.has(key));

const createRuleDescription = (
  key: string,
  value: EventRuleValue,
  language: "fi" | "en"
): string => {
  if (key === "stampPolicy") {
    const perBusinessLimit = extractPerBusinessLimit(value);

    if (perBusinessLimit !== null) {
      return language === "fi"
        ? `Samasta pisteestä voi kerätä enintään ${perBusinessLimit} leimaa tämän tapahtuman aikana. Jokainen leima vaatii oman onnistuneen skannauksen ja tuoreen QR:n.`
        : `You can collect up to ${perBusinessLimit} stamps from the same venue during this event. Each stamp needs its own successful scan and fresh QR.`;
    }
  }

  return formatRuleValue(value);
};

const getRegistrationBadge = (
  registrationState: EventRegistrationState,
  language: "fi" | "en"
): { label: string; state: AppReadinessState } => {
  if (registrationState === "REGISTERED") {
    return { label: language === "fi" ? "liitytty" : "registered", state: "ready" };
  }

  if (registrationState === "CANCELLED") {
    return { label: language === "fi" ? "peruttu" : "cancelled", state: "warning" };
  }

  if (registrationState === "BANNED") {
    return { label: language === "fi" ? "estetty" : "restricted", state: "error" };
  }

  return { label: language === "fi" ? "ei liitytty" : "not joined", state: "pending" };
};

const getJoinAvailability = (
  event: StudentEventDetail,
  language: "fi" | "en",
  formatter: Intl.DateTimeFormat
): JoinAvailability => {
  if (event.registrationState === "REGISTERED") {
    return {
      canJoin: false,
      label: language === "fi" ? "Liitytty" : "Already joined",
      detail:
        language === "fi" ? "Olet jo mukana tässä tapahtumassa." : "You are already in for this event.",
      state: "ready",
    };
  }

  if (event.registrationState === "BANNED") {
    return {
      canJoin: false,
      label: language === "fi" ? "Ilmoittautuminen estetty" : "Registration blocked",
      detail:
        language === "fi"
          ? "Tällä profiililla ei voi liittyä tähän tapahtumaan."
          : "This profile is restricted for this event.",
      state: "error",
    };
  }

  if (event.status === "CANCELLED") {
    return {
      canJoin: false,
      label: language === "fi" ? "Tapahtuma peruttu" : "Event cancelled",
      detail:
        language === "fi"
          ? "Tämä tapahtuma on peruttu."
          : "This event has been cancelled.",
      state: "warning",
    };
  }

  const now = Date.now();
  const startTime = new Date(event.startAt).getTime();
  const endTime = new Date(event.endAt).getTime();
  const joinDeadlineTime = new Date(event.joinDeadlineAt).getTime();

  if (now >= endTime) {
    return {
      canJoin: false,
      label: language === "fi" ? "Tapahtuma päättynyt" : "Event ended",
      detail:
        language === "fi"
          ? `Tapahtuma päättyi ${formatter.format(new Date(event.endAt))}.`
          : `This event ended at ${formatter.format(new Date(event.endAt))}.`,
      state: "warning",
    };
  }

  if (now >= joinDeadlineTime || now >= startTime) {
    return {
      canJoin: false,
      label: language === "fi" ? "Liittymisaika päättynyt" : "Join window closed",
      detail:
        language === "fi"
          ? `Ilmoittautuminen päättyi ${formatter.format(new Date(event.joinDeadlineAt))}.`
          : `Join deadline passed at ${formatter.format(new Date(event.joinDeadlineAt))}.`,
      state: "warning",
    };
  }

  return {
    canJoin: true,
    label: language === "fi" ? "Liity tapahtumaan" : "Join event",
    detail:
      event.maxParticipants === null
        ? language === "fi"
          ? "Ilmoittautuminen on avoinna."
          : "Registration is open."
        : language === "fi"
          ? `Ilmoittautuminen on avoinna. Kapasiteetti ${event.maxParticipants} osallistujaa.`
          : `Registration is open. Capacity is capped at ${event.maxParticipants} participants.`,
    state: "ready",
  };
};

const getJoinResultPresentation = (
  result: JoinEventResult | undefined,
  language: "fi" | "en"
): { title: string; body: string; state: AppReadinessState } | null => {
  if (typeof result === "undefined") {
    return null;
  }

  switch (result.status) {
    case "SUCCESS":
      return {
        title: language === "fi" ? "Liittyminen onnistui" : "Joined successfully",
        body:
          language === "fi"
            ? "Olet nyt mukana tässä tapahtumassa."
            : "You are now registered for this event.",
        state: "ready",
      };
    case "ALREADY_REGISTERED":
      return {
        title: language === "fi" ? "Jo ilmoittautunut" : "Already registered",
        body:
          language === "fi"
            ? "Olit jo mukana ennen viimeisintä yritystä."
            : "You were already registered before the latest join attempt.",
        state: "ready",
      };
    case "EVENT_FULL":
      return {
        title: language === "fi" ? "Tapahtuma täynnä" : "Event is full",
        body:
          language === "fi"
            ? "Tapahtuma on saavuttanut kapasiteettinsa."
            : "The event has reached capacity.",
        state: "warning",
      };
    case "EVENT_REGISTRATION_CLOSED":
      return {
        title: language === "fi" ? "Ilmoittautuminen suljettu" : "Registration closed",
        body:
          language === "fi"
            ? "Liittymisaika tai tapahtuman aloitus on jo mennyt."
            : "The join deadline or event start time has already passed.",
        state: "warning",
      };
    case "STUDENT_BANNED":
      return {
        title: language === "fi" ? "Liittyminen estetty" : "Registration blocked",
        body:
          language === "fi"
            ? "Tämä opiskelijaprofiili on estetty tältä tapahtumalta."
            : "This student profile is restricted for this event.",
        state: "error",
      };
    case "AUTH_REQUIRED":
      return {
        title: language === "fi" ? "Kirjaudu uudelleen" : "Sign in again",
        body:
          language === "fi"
            ? "Istunto vanheni. Kirjaudu sisään ja yritä uudelleen."
            : "Your session expired. Sign in and try again.",
        state: "error",
      };
    case "ACTOR_NOT_ALLOWED":
    case "ROLE_NOT_ALLOWED":
      return {
        title: language === "fi" ? "Liittyminen estetty" : "Registration blocked",
        body:
          language === "fi"
            ? "Tällä tunnuksella ei voi liittyä opiskelijatapahtumaan."
            : "This account cannot register for student events.",
        state: "error",
      };
    case "PROFILE_NOT_FOUND":
      return {
        title: language === "fi" ? "Profiili puuttuu" : "Profile missing",
        body:
          language === "fi"
            ? "Opiskelijaprofiilia ei löytynyt. Kirjaudu uudelleen tai ota yhteyttä tukeen."
            : "Student profile was not found. Sign in again or contact support.",
        state: "error",
      };
    case "PROFILE_NOT_ACTIVE":
      return {
        title: language === "fi" ? "Profiili ei ole aktiivinen" : "Profile inactive",
        body:
          language === "fi"
            ? "Tämä profiili ei ole aktiivinen juuri nyt."
            : "This profile is not active right now.",
        state: "error",
      };
    case "EVENT_NOT_FOUND":
      return {
        title: language === "fi" ? "Tapahtumaa ei löytynyt" : "Event not found",
        body:
          language === "fi"
            ? "Tapahtumaa ei enää löytynyt. Päivitä tapahtumalista."
            : "The event could not be found anymore. Refresh the event list.",
        state: "warning",
      };
    case "EVENT_NOT_AVAILABLE":
      return {
        title: language === "fi" ? "Tapahtuma ei ole avoinna" : "Event unavailable",
        body:
          language === "fi"
            ? "Tapahtumaan ei voi liittyä tässä tilassa."
            : "This event cannot accept registrations in its current state.",
        state: "warning",
      };
    default:
      return {
        title: language === "fi" ? "Liittyminen epäonnistui" : "Join failed",
        body: language === "fi" ? `Palautuskoodi ${result.status}.` : `Registration RPC returned ${result.status}.`,
        state: "error",
      };
  }
};

const getCancelAvailability = (
  event: StudentEventDetail,
  language: "fi" | "en",
  formatter: Intl.DateTimeFormat
): CancelAvailability | null => {
  if (event.registrationState !== "REGISTERED") {
    return null;
  }

  if (event.status === "CANCELLED") {
    return {
      canCancel: false,
      label: language === "fi" ? "Tapahtuma peruttu" : "Event cancelled",
      detail:
        language === "fi"
          ? "Peruttua tapahtumaa ei voi enää muokata ilmoittautumisesta."
          : "A cancelled event can no longer be changed from registration.",
      state: "warning",
    };
  }

  if (Date.now() >= new Date(event.startAt).getTime()) {
    return {
      canCancel: false,
      label: language === "fi" ? "Peruminen suljettu" : "Cancellation closed",
      detail:
        language === "fi"
          ? `Osallistumista ei voi perua tapahtuman alettua (${formatter.format(new Date(event.startAt))}).`
          : `You cannot cancel after the event starts (${formatter.format(new Date(event.startAt))}).`,
      state: "warning",
    };
  }

  return {
    canCancel: true,
    label: language === "fi" ? "Peru osallistuminen" : "Cancel registration",
    detail:
      language === "fi"
        ? "Voit perua osallistumisen ennen tapahtuman alkua."
        : "You can cancel before the event starts.",
    state: "pending",
  };
};

const getCancelResultPresentation = (
  result: CancelEventRegistrationResult | undefined,
  language: "fi" | "en"
): { title: string; body: string; state: AppReadinessState } | null => {
  if (typeof result === "undefined") {
    return null;
  }

  switch (result.status) {
    case "SUCCESS":
    case "ALREADY_CANCELLED":
      return {
        title: language === "fi" ? "Osallistuminen peruttu" : "Registration cancelled",
        body:
          language === "fi"
            ? "Et ole enää mukana tässä tapahtumassa."
            : "You are no longer registered for this event.",
        state: "ready",
      };
    case "EVENT_ALREADY_STARTED":
      return {
        title: language === "fi" ? "Peruminen suljettu" : "Cancellation closed",
        body:
          language === "fi"
            ? "Tapahtuma on jo alkanut tai päättynyt."
            : "The event has already started or ended.",
        state: "warning",
      };
    case "AUTH_REQUIRED":
      return {
        title: language === "fi" ? "Kirjaudu uudelleen" : "Sign in again",
        body:
          language === "fi"
            ? "Istunto vanheni. Kirjaudu sisään ja yritä uudelleen."
            : "Your session expired. Sign in and try again.",
        state: "error",
      };
    case "ACTOR_NOT_ALLOWED":
      return {
        title: language === "fi" ? "Peruminen estetty" : "Cancellation blocked",
        body:
          language === "fi"
            ? "Tällä tunnuksella ei voi perua tätä osallistumista."
            : "This account cannot cancel this registration.",
        state: "error",
      };
    case "EVENT_NOT_FOUND":
      return {
        title: language === "fi" ? "Tapahtumaa ei löytynyt" : "Event not found",
        body:
          language === "fi"
            ? "Tapahtumaa ei enää löytynyt. Päivitä tapahtumalista."
            : "The event could not be found anymore. Refresh the event list.",
        state: "warning",
      };
    case "NOT_REGISTERED":
      return {
        title: language === "fi" ? "Et ole ilmoittautunut" : "Not registered",
        body:
          language === "fi"
            ? "Osallistumista ei voitu perua, koska et ole mukana tässä tapahtumassa."
            : "Registration could not be cancelled because you are not registered for this event.",
        state: "warning",
      };
    case "STUDENT_BANNED":
      return {
        title: language === "fi" ? "Peruminen estetty" : "Cancellation blocked",
        body:
          language === "fi"
            ? "Tällä opiskelijaprofiililla ei voi muuttaa tätä osallistumista."
            : "This student profile cannot change this registration.",
        state: "error",
      };
    default:
      return {
        title: language === "fi" ? "Peruminen epäonnistui" : "Cancellation failed",
        body: language === "fi" ? `Palautuskoodi ${result.status}.` : `Cancellation RPC returned ${result.status}.`,
        state: "error",
      };
  }
};

const createActionErrorNotice = (error: unknown, language: "fi" | "en"): ActionNotice => {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("Failed to join event")) {
    return {
      body:
        language === "fi"
          ? "Tapahtumaan liittyminen ei onnistunut juuri nyt. Päivitä näkymä ja yritä uudelleen."
          : "Joining the event failed right now. Refresh the view and try again.",
      title: language === "fi" ? "Liittyminen epäonnistui" : "Join failed",
    };
  }

  if (message.includes("Failed to cancel event registration")) {
    return {
      body:
        language === "fi"
          ? "Osallistumisen peruminen ei onnistunut juuri nyt. Päivitä näkymä ja yritä uudelleen."
          : "Cancelling the registration failed right now. Refresh the view and try again.",
      title: language === "fi" ? "Peruminen epäonnistui" : "Cancellation failed",
    };
  }

  if (message.includes("RPC returned no data")) {
    return {
      body:
        language === "fi"
          ? "Palvelu ei palauttanut odotettua vastausta. Yritä hetken päästä uudelleen."
          : "The service did not return the expected response. Try again in a moment.",
      title: language === "fi" ? "Toiminto epäonnistui" : "Action failed",
    };
  }

  return {
    body: message.length > 0 ? message : language === "fi" ? "Tuntematon virhe." : "Unknown error.",
    title: language === "fi" ? "Toiminto epäonnistui" : "Action failed",
  };
};

const getRewardInventoryCopy = (rewardTier: RewardTierSummary, language: "fi" | "en"): string => {
  if (rewardTier.inventoryTotal === null) {
    return language === "fi" ? "Rajoittamaton määrä" : "Unlimited reward stock";
  }

  const remaining = rewardTier.inventoryTotal - rewardTier.inventoryClaimed;

  if (remaining <= 0) {
    return language === "fi" ? "Loppunut" : "Out of stock";
  }

  return language === "fi" ? `${remaining} palkintoa jäljellä` : `${remaining} reward(s) left`;
};

const getRewardTypeLabel = (rewardTier: RewardTierSummary, language: "fi" | "en"): string => {
  switch (rewardTier.rewardType) {
    case "HAALARIMERKKI":
      return language === "fi" ? "Haalarimerkki" : "Overall patch";
    case "PATCH":
      return language === "fi" ? "Merkki" : "Patch";
    case "COUPON":
      return language === "fi" ? "Kuponki" : "Coupon";
    case "PRODUCT":
      return language === "fi" ? "Tuote" : "Product";
    case "ENTRY":
      return language === "fi" ? "Sisäänpääsy" : "Entry";
    case "OTHER":
      return language === "fi" ? "Palkinto" : "Reward";
  }
};

const getRewardSummaryTitle = (rewardTiers: RewardTierSummary[], language: "fi" | "en"): string => {
  if (rewardTiers.length === 0) {
    return language === "fi" ? "Ei palkintoja" : "No rewards";
  }

  if (rewardTiers.length === 1) {
    return language === "fi" ? "1 palkinto" : "1 reward";
  }

  return language === "fi" ? `${rewardTiers.length} palkintoa` : `${rewardTiers.length} rewards`;
};

const getRewardChipColor = (rewardTier: RewardTierSummary, theme: MobileTheme): string => {
  if (rewardTier.inventoryTotal === null) {
    return theme.colors.chromeTintIndigo;
  }

  if (rewardTier.inventoryClaimed >= rewardTier.inventoryTotal) {
    return theme.colors.dangerSurface;
  }

  return theme.colors.chromeTintWarm;
};

const getVenueStatusBadge = (
  venue: EventVenueSummary,
  language: "fi" | "en"
): { label: string; state: AppReadinessState } =>
  venue.stampStatus === "COLLECTED"
    ? { label: language === "fi" ? "Leima saatu" : "Collected", state: "ready" }
    : { label: language === "fi" ? "Odottaa" : "Pending", state: "pending" };

const getEventTimelineBadge = (
  event: StudentEventDetail,
  now: number,
  language: "fi" | "en"
): { label: string; state: AppReadinessState } => {
  const startTime = new Date(event.startAt).getTime();
  const endTime = new Date(event.endAt).getTime();

  if (event.status === "CANCELLED") {
    return { label: language === "fi" ? "peruttu" : "cancelled", state: "warning" };
  }

  if (now >= endTime) {
    return { label: language === "fi" ? "päättynyt" : "completed", state: "warning" };
  }

  if (now >= startTime) {
    return { label: language === "fi" ? "käynnissä" : "active", state: "ready" };
  }

  return { label: language === "fi" ? "tulossa" : "upcoming", state: "pending" };
};

export default function StudentEventDetailScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const isAppActive = useActiveAppState();
  const now = useCurrentTime(isFocused && isAppActive);
  const params = useLocalSearchParams<EventDetailRouteParams>();
  const { session } = useSession();
  const { copy, language, localeTag } = useUiPreferences();
  const theme = useAppTheme();
  const themeStyles = useThemeStyles(createStyles);
  const eventId = typeof params.eventId === "string" ? params.eventId : null;
  const studentId = session?.user.id ?? null;
  const detailQuery = useStudentEventDetailQuery({
    eventId: eventId ?? "",
    studentId: studentId ?? "",
    isEnabled: eventId !== null && studentId !== null,
  });
  const trackedEventIds = useMemo(() => (eventId === null ? [] : [eventId]), [eventId]);
  const formatter = useMemo(() => createDateTimeFormatter(localeTag), [localeTag]);
  const dateFormatter = useMemo(() => createDateFormatter(localeTag), [localeTag]);
  const timeFormatter = useMemo(() => createTimeFormatter(localeTag), [localeTag]);

  useStudentRewardInventoryRealtime({
    trackedEventIds,
    studentId: studentId ?? "",
    detailEventId: eventId,
    isEnabled: eventId !== null && studentId !== null && isFocused && isAppActive,
  });

  const joinMutation = useJoinEventMutation();
  const cancelRegistrationMutation = useCancelEventRegistrationMutation();
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<EventVenueSummary | null>(null);
  const [venueNotice, setVenueNotice] = useState<string | null>(null);
  const [isRewardModalVisible, setIsRewardModalVisible] = useState(false);

  useEffect(() => {
    void prefetchEventCoverUrls([detailQuery.data?.coverImageUrl ?? null]);
  }, [detailQuery.data?.coverImageUrl]);

  const joinPresentation = getJoinResultPresentation(joinMutation.data, language);
  const cancelPresentation = getCancelResultPresentation(cancelRegistrationMutation.data, language);
  const successPresentationKey = joinPresentation?.body ?? cancelPresentation?.body ?? null;

  useTransientSuccessKey(
    successPresentationKey,
    () => {
      joinMutation.reset();
      cancelRegistrationMutation.reset();
    },
    successNoticeDurationMs
  );

  if (eventId === null) {
    return (
      <AppScreen>
        <InfoCard eyebrow={copy.common.error} title={language === "fi" ? "Tapahtuman tunnus puuttuu" : "Event detail is missing an id"}>
          <Text style={themeStyles.bodyText}>
            {language === "fi"
              ? "Tämän tapahtuman tunnusta ei löytynyt reitistä."
              : "The event id was not present in the route parameters."}
          </Text>
        </InfoCard>
      </AppScreen>
    );
  }

  const event = detailQuery.data ?? null;
  const totalUserStamps = event ? event.venues.reduce((sum, v) => sum + v.collectedStampCount, 0) : 0;
  const registrationBadge = event ? getRegistrationBadge(event.registrationState, language) : null;
  const joinAvailability = event ? getJoinAvailability(event, language, formatter) : null;
  const cancelAvailability = event ? getCancelAvailability(event, language, formatter) : null;
  const coverSource =
    event === null ? undefined : getEventCoverSource(event.coverImageUrl, `${event.id}:${event.name}`);
  const hasEventStarted = event !== null && now >= new Date(event.startAt).getTime();
  const shouldShowRegistrationSection = event !== null && !hasEventStarted;
  const selectedVenueStatus = selectedVenue === null ? null : getVenueStatusBadge(selectedVenue, language);
  const selectedVenueAddress = selectedVenue === null ? null : createVenueAddressLine(selectedVenue);
  const eventTimelineBadge = event === null ? null : getEventTimelineBadge(event, now, language);
  const rewardSummaryTitle = event === null ? null : getRewardSummaryTitle(event.rewardTiers, language);
  const visibleRuleEntries = event === null ? [] : createVisibleRuleEntries(event.rules);

  const handleJoinPress = async (): Promise<void> => {
    if (studentId === null || event === null) {
      return;
    }

    setActionNotice(null);

    try {
      await joinMutation.mutateAsync({
        eventId: event.id,
        studentId,
      });
    } catch (error) {
      setActionNotice(createActionErrorNotice(error, language));
    }
  };

  const handleCancelRegistrationPress = async (): Promise<void> => {
    if (studentId === null || event === null) {
      return;
    }

    setActionNotice(null);

    try {
      await cancelRegistrationMutation.mutateAsync({
        eventId: event.id,
        studentId,
      });
    } catch (error) {
      setActionNotice(createActionErrorNotice(error, language));
    }
  };

  const handleBackPress = (): void => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/student/events");
  };

  const handleVenuePress = (venue: EventVenueSummary): void => {
    setVenueNotice(null);
    setSelectedVenue(venue);
  };

  const handleVenueMapPress = async (): Promise<void> => {
    if (selectedVenue === null) {
      return;
    }

    setVenueNotice(null);

    try {
      await openExternalVenueMapAsync(selectedVenue);
    } catch (error) {
      setVenueNotice(createVenueMapOpenErrorMessage(error, language));
    }
  };

  const handleTicketPress = async (): Promise<void> => {
    if (event?.ticketUrl === null || typeof event?.ticketUrl === "undefined") {
      return;
    }

    setActionNotice(null);

    try {
      const canOpenTicketUrl = await Linking.canOpenURL(event.ticketUrl);

      if (!canOpenTicketUrl) {
        throw new Error(
          language === "fi"
            ? "Lippulinkkiä ei voitu avata tällä laitteella."
            : "The ticket link could not be opened on this device."
        );
      }

      await Linking.openURL(event.ticketUrl);
    } catch (error) {
      setActionNotice(createActionErrorNotice(error, language));
    }
  };

  return (
    <AppScreen>
      <Pressable onPress={handleBackPress} style={themeStyles.backButton}>
        <View style={themeStyles.backButtonRow}>
          <AppIcon color={theme.colors.textPrimary} name="chevron-left" size={16} />
          <Text style={themeStyles.backButtonText}>{copy.common.back}</Text>
        </View>
      </Pressable>

      {detailQuery.isLoading ? (
        <InfoCard eyebrow={copy.common.loading} title={language === "fi" ? "Avataan tapahtumaa" : "Opening event"}>
          <Text style={themeStyles.bodyText}>
            {language === "fi"
              ? "Ladataan tapahtuman tiedot, pisteet ja palkinnot."
              : "Loading event, venue, and reward details."}
          </Text>
        </InfoCard>
      ) : null}

      {detailQuery.error ? (
        <InfoCard eyebrow={copy.common.error} title={language === "fi" ? "Tapahtumaa ei voitu ladata" : "Could not load event"}>
          <Text style={themeStyles.bodyText}>{createUserSafeErrorMessage(detailQuery.error, language, "eventDetail")}</Text>
          <Pressable onPress={() => void detailQuery.refetch()} style={themeStyles.secondaryButton}>
            <Text style={themeStyles.secondaryButtonText}>{copy.common.retry}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {event ? (
        <>
          <CoverImageSurface imageStyle={themeStyles.heroImage} source={coverSource} style={themeStyles.heroCard}>
            <View style={themeStyles.heroEdgeFade} />
            <View style={themeStyles.heroContent}>
              <View style={themeStyles.heroBadgeRow}>
                {eventTimelineBadge ? (
                  <StatusBadge
                    label={eventTimelineBadge.label}
                    state={eventTimelineBadge.state}
                  />
                ) : null}
                {registrationBadge ? (
                  <StatusBadge label={registrationBadge.label} state={registrationBadge.state} />
                ) : null}
              </View>
              <View style={themeStyles.heroTextGroup}>
                <Text style={themeStyles.heroCity}>{event.city}</Text>
                <Text style={themeStyles.heroTitle}>{event.name}</Text>
              </View>
            </View>
          </CoverImageSurface>

          <View style={themeStyles.sectionBlock}>
            <View style={themeStyles.metaGrid}>
              <View style={themeStyles.metaCard}>
                <View style={themeStyles.metaCardIcon}>
                  <AppIcon name="map-pin" size={14} color={theme.colors.lime} />
                </View>
                <Text style={themeStyles.metaCardLabel}>{language === "fi" ? "Paikka" : "Place"}</Text>
                <Text style={themeStyles.metaCardValue}>{event.city}</Text>
              </View>
              <View style={themeStyles.metaCard}>
                <View style={themeStyles.metaCardIcon}>
                  <AppIcon name="calendar" size={14} color={theme.colors.lime} />
                </View>
                <Text style={themeStyles.metaCardLabel}>{language === "fi" ? "Päivä" : "Date"}</Text>
                <Text style={themeStyles.metaCardValue}>{dateFormatter.format(new Date(event.startAt))}</Text>
              </View>
              <View style={themeStyles.metaCard}>
                <View style={themeStyles.metaCardIcon}>
                  <AppIcon name="clock" size={14} color={theme.colors.lime} />
                </View>
                <Text style={themeStyles.metaCardLabel}>{language === "fi" ? "Aika" : "Time"}</Text>
                <Text style={themeStyles.metaCardValue}>
                  {timeFormatter.format(new Date(event.startAt))} – {timeFormatter.format(new Date(event.endAt))}
                </Text>
              </View>
            </View>
            <Pressable
              disabled={event.rewardTiers.length === 0}
              onPress={() => setIsRewardModalVisible(true)}
              style={[
                themeStyles.rewardTopButton,
                event.rewardTiers.length === 0 ? themeStyles.disabledButton : null,
              ]}
            >
              <View style={themeStyles.rewardTopIcon}>
                <AppIcon name="gift" size={18} color={theme.colors.lime} />
              </View>
              <View style={themeStyles.rewardTopCopy}>
                <Text style={themeStyles.sectionEyebrow}>
                  {language === "fi" ? "Palkinto" : "Reward"}
                </Text>
                <Text style={themeStyles.rewardTopTitle}>
                  {rewardSummaryTitle ?? (language === "fi" ? "Palkinnot" : "Rewards")}
                </Text>
              </View>
              <AppIcon name="chevron-right" size={16} color={theme.colors.textMuted} />
            </Pressable>
            <Text style={themeStyles.bodyText}>
              {event.description ?? copy.student.eventDescriptionFallback}
            </Text>
            {event.ticketUrl !== null ? (
              <Pressable onPress={() => void handleTicketPress()} style={themeStyles.secondaryButton}>
                <Text style={themeStyles.secondaryButtonText}>
                  {language === "fi" ? "Avaa lippulinkki" : "Open ticket link"}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {shouldShowRegistrationSection ? (
            <>
              <View style={themeStyles.sectionDivider} />

              <View style={joinAvailability?.canJoin ? themeStyles.registrationCard : themeStyles.sectionBlock}>
                <View style={themeStyles.sectionHeader}>
                  <Text style={themeStyles.sectionEyebrow}>{language === "fi" ? "Ilmoittautuminen" : "Registration"}</Text>
                  <Text style={themeStyles.sectionTitle}>{joinAvailability?.label ?? (language === "fi" ? "Liity tapahtumaan" : "Join event")}</Text>
                </View>
                <Text style={themeStyles.bodyText}>{joinAvailability?.detail ?? ""}</Text>
                {joinPresentation ? (
                  <View style={themeStyles.inlineStatusRow}>
                    <StatusBadge label={joinPresentation.state} state={joinPresentation.state} />
                    <Text style={themeStyles.metaText}>{joinPresentation.body}</Text>
                  </View>
                ) : null}
                {cancelPresentation ? (
                  <View style={themeStyles.inlineStatusRow}>
                    <StatusBadge label={cancelPresentation.state} state={cancelPresentation.state} />
                    <Text style={themeStyles.metaText}>{cancelPresentation.body}</Text>
                  </View>
                ) : null}
                {actionNotice !== null ? (
                  <View style={themeStyles.inlineStatusRow}>
                    <StatusBadge label={language === "fi" ? "virhe" : "error"} state="error" />
                    <Text style={themeStyles.metaText}>
                      {actionNotice.title}: {actionNotice.body}
                    </Text>
                  </View>
                ) : null}
                {joinAvailability?.canJoin ? (
                  <Pressable
                    disabled={joinMutation.isPending}
                    onPress={() => void handleJoinPress()}
                    style={[themeStyles.primaryButton, joinMutation.isPending ? themeStyles.disabledButton : null]}
                  >
                    <Text style={themeStyles.primaryButtonText}>
                      {joinMutation.isPending
                        ? language === "fi"
                          ? "Liitytään..."
                          : "Joining..."
                        : joinAvailability.label}
                    </Text>
                  </Pressable>
                ) : null}
                {cancelAvailability ? (
                  <>
                    <Text style={themeStyles.metaText}>{cancelAvailability.detail}</Text>
                    <Pressable
                      disabled={!cancelAvailability.canCancel || cancelRegistrationMutation.isPending}
                      onPress={() => void handleCancelRegistrationPress()}
                      style={[
                        themeStyles.secondaryButton,
                        !cancelAvailability.canCancel || cancelRegistrationMutation.isPending ? themeStyles.disabledButton : null,
                      ]}
                    >
                      <Text style={themeStyles.secondaryButtonText}>
                        {cancelRegistrationMutation.isPending
                          ? language === "fi"
                            ? "Perutaan..."
                            : "Cancelling..."
                          : cancelAvailability.label}
                      </Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            </>
          ) : null}

          <View style={themeStyles.sectionDivider} />

          <View style={themeStyles.sectionBlock}>
            <View style={themeStyles.sectionHeader}>
              <Text style={themeStyles.sectionEyebrow}>{language === "fi" ? "Pisteet" : "Venues"}</Text>
              <Text style={themeStyles.sectionTitle}>{language === "fi" ? "Avaa piste ja näe lisätiedot" : "Tap a venue for details"}</Text>
            </View>
            {event.venues.length > 0 ? (
              <ScrollView
                contentContainerStyle={themeStyles.venueRail}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {event.venues.map((venue) => (
                  <Pressable
                    key={venue.id}
                    onPress={() => handleVenuePress(venue)}
                    style={themeStyles.venueMiniCard}
                  >
                    <View style={themeStyles.venueMiniHeader}>
                      <CoverImageSurface
                        imageStyle={themeStyles.venueLogoImage}
                        source={venue.logoUrl === null ? null : { uri: venue.logoUrl }}
                        style={themeStyles.venueLogo}
                      >
                        {venue.logoUrl === null ? (
                          <AppIcon color={theme.colors.textPrimary} name="business" size={17} />
                        ) : null}
                      </CoverImageSurface>
                      {venue.stampedAt !== null ? (
                        <View style={[themeStyles.venueOrderBubble, themeStyles.venueStampedBubble]}>
                          <AppIcon name="check" size={14} color={theme.colors.actionPrimaryText} />
                        </View>
                      ) : (
                        <View style={themeStyles.venueOrderBubble}>
                          <Text style={themeStyles.venueOrderText}>{venue.venueOrder ?? "-"}</Text>
                        </View>
                      )}
                    </View>
                    <View style={themeStyles.venueCopy}>
                      <Text numberOfLines={2} style={themeStyles.listTitle}>{venue.name}</Text>
                      <Text numberOfLines={1} style={themeStyles.metaLine}>
                        {venue.stampedAt === null
                          ? venue.city
                          : `${venue.city} · ${language === "fi" ? "haettu" : "scanned"} ${formatter.format(new Date(venue.stampedAt))}`}
                      </Text>
                    </View>
                    <StatusBadge
                      label={getVenueStatusBadge(venue, language).label}
                      state={getVenueStatusBadge(venue, language).state}
                    />
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Text style={themeStyles.bodyText}>
                {language === "fi" ? "Pisteitä ei ole vielä näkyvissä." : "No joined venues are visible yet for this event."}
              </Text>
            )}

          </View>

          {visibleRuleEntries.length > 0 ? (
            <>
              <View style={themeStyles.sectionDivider} />
              <View style={themeStyles.sectionBlock}>
                <View style={themeStyles.sectionHeader}>
                  <Text style={themeStyles.sectionEyebrow}>{language === "fi" ? "Säännöt" : "Rules"}</Text>
                  <Text style={themeStyles.sectionTitle}>{language === "fi" ? "Muista nämä" : "Before you go"}</Text>
                </View>
                <View style={themeStyles.rulesGroup}>
                  {visibleRuleEntries.map(([key, value]) => (
                    <View key={key} style={themeStyles.ruleRow}>
                      <View style={themeStyles.ruleBullet} />
                      <View style={themeStyles.ruleContent}>
                        <Text style={themeStyles.listTitle}>{createRuleLabel(key, language)}</Text>
                        <Text style={themeStyles.metaLine}>{createRuleDescription(key, value, language)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </>
          ) : null}

          <Modal
            animationType="fade"
            onRequestClose={() => setSelectedVenue(null)}
            transparent
            visible={selectedVenue !== null}
          >
            <View style={themeStyles.modalBackdrop}>
              <View style={themeStyles.venueModalSheet}>
                <View style={themeStyles.venueModalAccentLine} />
                {selectedVenue !== null ? (
                  <ScrollView contentContainerStyle={themeStyles.venueModalContent} showsVerticalScrollIndicator={false}>
                    <View style={themeStyles.venueModalHeader}>
                      <View style={themeStyles.venueModalHeaderCopy}>
                        <Text style={themeStyles.sectionEyebrow}>{language === "fi" ? "Mekan" : "Venue"}</Text>
                        <Text style={themeStyles.sectionTitle}>{selectedVenue.name}</Text>
                        {selectedVenueStatus ? (
                          <StatusBadge label={selectedVenueStatus.label} state={selectedVenueStatus.state} />
                        ) : null}
                      </View>
                      <Pressable onPress={() => setSelectedVenue(null)} style={themeStyles.venueModalCloseButton}>
                        <AppIcon color={theme.colors.textPrimary} name="x" size={18} />
                      </Pressable>
                    </View>

                    <View style={themeStyles.venueModalSummary}>
                      <CoverImageSurface
                        imageStyle={themeStyles.venueLogoImage}
                        source={selectedVenue.logoUrl === null ? null : { uri: selectedVenue.logoUrl }}
                        style={themeStyles.venueModalLogo}
                      >
                        {selectedVenue.logoUrl === null ? (
                          <AppIcon color={theme.colors.textPrimary} name="business" size={20} />
                        ) : null}
                      </CoverImageSurface>
                      <View style={themeStyles.venueCopy}>
                        {selectedVenueAddress ? <Text style={themeStyles.metaLine}>{selectedVenueAddress}</Text> : null}
                        {selectedVenue.stampedAt !== null ? (
                          <Text style={themeStyles.metaLine}>
                            {language === "fi"
                              ? `Leima haettu ${formatter.format(new Date(selectedVenue.stampedAt))}`
                              : `Stamped ${formatter.format(new Date(selectedVenue.stampedAt))}`}
                          </Text>
                        ) : null}
                        {selectedVenue.stampLabel ? (
                          <Text style={themeStyles.metaLine}>
                            {language === "fi" ? "Leima" : "Stamp"}: {selectedVenue.stampLabel}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {selectedVenue.customInstructions ? (
                      <View style={themeStyles.listRow}>
                        <Text style={themeStyles.listTitle}>{language === "fi" ? "Mitä paikan päällä tehdään" : "What to do there"}</Text>
                        <Text style={themeStyles.metaLine}>{selectedVenue.customInstructions}</Text>
                      </View>
                    ) : null}

                    <Pressable onPress={() => void handleVenueMapPress()} style={themeStyles.primaryButton}>
                      <Text style={themeStyles.primaryButtonText}>
                        {language === "fi" ? "Avaa kartassa" : "Open in Maps"}
                      </Text>
                    </Pressable>

                    {venueNotice !== null ? <Text style={themeStyles.metaText}>{venueNotice}</Text> : null}

                  </ScrollView>
                ) : null}
              </View>
            </View>
          </Modal>

          <Modal
            animationType="fade"
            onRequestClose={() => setIsRewardModalVisible(false)}
            transparent
            visible={isRewardModalVisible}
          >
            <View style={themeStyles.modalBackdrop}>
              <View style={themeStyles.rewardModalSheet}>
                <View style={themeStyles.venueModalAccentLine} />
                <ScrollView contentContainerStyle={themeStyles.venueModalContent} showsVerticalScrollIndicator={false}>
                  <View style={themeStyles.venueModalHeader}>
                    <View style={themeStyles.venueModalHeaderCopy}>
                      <Text style={themeStyles.sectionEyebrow}>
                        {language === "fi" ? "Palkinto" : "Reward"}
                      </Text>
                      <Text style={themeStyles.sectionTitle}>
                        {language === "fi" ? "Mitä voit lunastaa" : "What you can claim"}
                      </Text>
                      <Text style={themeStyles.metaLine}>
                        {language === "fi"
                          ? `${totalUserStamps} leimaa kerätty tässä tapahtumassa.`
                          : `${totalUserStamps} leimas collected in this event.`}
                      </Text>
                    </View>
                    <Pressable onPress={() => setIsRewardModalVisible(false)} style={themeStyles.venueModalCloseButton}>
                      <AppIcon color={theme.colors.textPrimary} name="x" size={18} />
                    </Pressable>
                  </View>

                  {event.rewardTiers.length > 0 ? (
                    <View style={themeStyles.rewardGroup}>
                      {event.rewardTiers.map((rewardTier) => {
                        const isUnlocked = totalUserStamps >= rewardTier.requiredStampCount;

                        return (
                          <View
                            key={`reward-modal:${rewardTier.id}`}
                            style={isUnlocked ? themeStyles.rewardUnlockedRow : themeStyles.rewardLockedRow}
                          >
                            <View style={themeStyles.rewardHeader}>
                              <View
                                style={[
                                  themeStyles.rewardRequirementBadge,
                                  { backgroundColor: getRewardChipColor(rewardTier, theme) },
                                ]}
                              >
                                <View style={themeStyles.rewardBadgeIcon}>
                                  <AppIcon name="gift" size={12} color={theme.colors.textPrimary} />
                                </View>
                                <Text style={themeStyles.rewardRequirementText}>
                                  {rewardTier.requiredStampCount} {language === "fi" ? "leimaa" : "leimas"}
                                </Text>
                              </View>
                              <StatusBadge
                                label={isUnlocked ? (language === "fi" ? "Avattu" : "Unlocked") : (language === "fi" ? "Lukittu" : "Locked")}
                                state={isUnlocked ? "ready" : "pending"}
                              />
                            </View>
                            <Text style={themeStyles.listTitle}>{rewardTier.title}</Text>
                            <Text style={themeStyles.metaLine}>
                              {getRewardTypeLabel(rewardTier, language)} · {getRewardInventoryCopy(rewardTier, language)}
                            </Text>
                            {rewardTier.description ? <Text style={themeStyles.metaLine}>{rewardTier.description}</Text> : null}
                            {rewardTier.claimInstructions ? (
                              <View style={themeStyles.rewardInstructionBox}>
                                <Text style={themeStyles.sectionEyebrow}>
                                  {language === "fi" ? "Luovutusohje" : "Claim instructions"}
                                </Text>
                                <Text style={themeStyles.metaLine}>{rewardTier.claimInstructions}</Text>
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={themeStyles.bodyText}>
                      {language === "fi"
                        ? "Tähän tapahtumaan ei ole vielä julkaistu palkintoja."
                        : "No rewards are published for this event yet."}
                    </Text>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </>
      ) : null}
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) => {
  const styles = StyleSheet.create({
    backButton: {
      alignSelf: "flex-start",
      backgroundColor: "rgba(8, 9, 14, 0.84)",
      borderRadius: theme.radius.button,
      left: theme.spacing.screenHorizontal,
      paddingHorizontal: 14,
      paddingVertical: 10,
      position: "absolute",
      top: theme.spacing.screenVertical,
      zIndex: 20,
      ...interactiveSurfaceShadowStyle,
    },
    backButtonRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    backButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: 13,
      lineHeight: 16,
    },
    badges: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    disabledButton: {
      opacity: 0.6,
    },
    heroCard: {
      marginHorizontal: -theme.spacing.screenHorizontal,
      marginTop: -theme.spacing.screenVertical,
      minHeight: 300,
      overflow: "hidden",
      position: "relative",
    },
    heroEdgeFade: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.32)",
    },
    heroBadgeRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    heroContent: {
      bottom: 0,
      gap: 10,
      left: 0,
      paddingBottom: 20,
      paddingHorizontal: 16,
      position: "absolute",
      right: 0,
      zIndex: 10,
    },
    heroTextGroup: {
      gap: 4,
    },
    heroCity: {
      color: "rgba(255, 255, 255, 0.72)",
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    heroTitle: {
      color: "#FFFFFF",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      letterSpacing: -0.5,
      lineHeight: 34,
    },
    heroImage: {
      borderRadius: 0,
    },
    inlineStatusRow: {
      gap: 8,
    },
    listGroup: {
      gap: 10,
    },
    listRow: {
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: theme.radius.card,
      gap: 8,
      padding: 16,
      ...interactiveSurfaceShadowStyle,
    },
    listTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    metaLine: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    metaCard: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      flex: 1,
      gap: 4,
      minWidth: 92,
      paddingHorizontal: 12,
      paddingVertical: 12,
      ...interactiveSurfaceShadowStyle,
    },
    metaCardIcon: {
      marginBottom: 2,
    },
    metaCardLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    metaCardValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    metaGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    modalBackdrop: {
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.72)",
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 18,
      paddingVertical: 32,
    },
    primaryButton: {
      alignItems: "center",
      alignSelf: "stretch",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      paddingHorizontal: 14,
      paddingVertical: 14,
      ...interactiveSurfaceShadowStyle,
    },
    primaryButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
    },
    rewardBadgeIcon: {
      opacity: 0.7,
    },
    rewardGroup: {
      gap: 10,
      marginTop: 10,
    },
    rewardHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between",
    },
    rewardInstructionBox: {
      backgroundColor: theme.colors.surfaceL3,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      gap: 6,
      padding: 12,
    },
    rewardModalSheet: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.scene,
      borderWidth: 0,
      maxHeight: "82%",
      overflow: "hidden",
      padding: 18,
      width: "100%",
    },
    rewardRequirementBadge: {
      alignItems: "center",
      alignSelf: "flex-start",
      borderRadius: 999,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    rewardRequirementText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      textTransform: "uppercase",
    },
    rewardTopButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.limeBorder,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      padding: 14,
      ...interactiveSurfaceShadowStyle,
    },
    rewardTopCopy: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    rewardTopIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
      borderRadius: 999,
      borderWidth: 1,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    rewardTopTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    sectionBlock: {
      gap: 14,
      paddingVertical: 6,
    },
    sectionDivider: {
      backgroundColor: theme.colors.borderSubtle,
      height: 1,
      marginHorizontal: 0,
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
    registrationCard: {
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      gap: 14,
      padding: 16,
    },
    rewardLockedRow: {
      backgroundColor: theme.colors.surfaceL2,
      borderLeftColor: theme.colors.borderDefault,
      borderLeftWidth: 3,
      borderRadius: theme.radius.card,
      gap: 8,
      padding: 16,
      ...interactiveSurfaceShadowStyle,
    },
    rewardUnlockedRow: {
      backgroundColor: theme.colors.surfaceL2,
      borderLeftColor: theme.colors.lime,
      borderLeftWidth: 3,
      borderRadius: theme.radius.card,
      gap: 8,
      padding: 16,
      ...interactiveSurfaceShadowStyle,
    },
    ruleBullet: {
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      height: 6,
      marginTop: 6,
      width: 6,
    },
    ruleContent: {
      flex: 1,
      gap: 4,
    },
    rulesGroup: {
      gap: 10,
    },
    ruleRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
    },
    secondaryButton: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radius.button,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      ...interactiveSurfaceShadowStyle,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
    },
    venueCopy: {
      flex: 1,
      gap: 4,
    },
    venueMiniCard: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      gap: 10,
      minHeight: 152,
      padding: 14,
      width: 176,
      ...interactiveSurfaceShadowStyle,
    },
    venueMiniHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    venueModalCloseButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: 0,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    venueModalContent: {
      gap: 14,
    },
    venueModalHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    venueModalHeaderCopy: {
      flex: 1,
      gap: 6,
      minWidth: 0,
    },
    venueModalLogo: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL3,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: 1,
      height: 56,
      justifyContent: "center",
      overflow: "hidden",
      width: 56,
    },
    venueModalAccentLine: {
      alignSelf: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      height: 3,
      marginBottom: 16,
      width: 40,
    },
    venueModalSheet: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.scene,
      borderWidth: 0,
      maxHeight: "86%",
      overflow: "hidden",
      padding: 18,
      width: "100%",
    },
    venueModalSummary: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
    },
    venueRail: {
      gap: 10,
      paddingRight: 8,
    },
    venueCard: {
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: theme.radius.card,
      gap: 12,
      overflow: "hidden",
      padding: 12,
      ...interactiveSurfaceShadowStyle,
    },
    venueCover: {
      borderRadius: theme.radius.inner,
      minHeight: 116,
      overflow: "hidden",
      position: "relative",
    },
    venueCoverImage: {
      borderRadius: theme.radius.inner,
    },
    venueCoverOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.28)",
    },
    venueHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
    },
    venueLogo: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL3,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: 1,
      height: 42,
      justifyContent: "center",
      overflow: "hidden",
      width: 42,
    },
    venueLogoImage: {
      borderRadius: 999,
    },
    venueOrderBubble: {
      alignItems: "center",
      backgroundColor: "rgba(8, 9, 14, 0.78)",
      borderRadius: 999,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    venueStampedBubble: {
      backgroundColor: theme.colors.lime,
    },
    venueOrderText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.caption,
    },
    venueStatusRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 10,
    },
  });

  return styles;
};
