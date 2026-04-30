import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { getEventCoverSource, prefetchEventCoverUrls } from "@/features/events/event-visuals";
import type { MobileTheme } from "@/features/foundation/theme";
import { interactiveSurfaceShadowStyle } from "@/features/foundation/theme";
import {
  useJoinEventMutation,
  useStudentEventDetailQuery,
} from "@/features/events/student-event-detail";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useStudentRewardInventoryRealtime } from "@/features/realtime/student-realtime";
import { useActiveAppState } from "@/features/qr/student-qr";
import { useSession } from "@/providers/session-provider";
import type { AppReadinessState } from "@/types/app";
import type {
  EventRegistrationState,
  EventRuleValue,
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

const createDateTimeFormatter = (localeTag: string): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(localeTag, {
    weekday: "short",
    day: "numeric",
    month: "short",
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

  if (event.status !== "PUBLISHED") {
    return {
      canJoin: false,
      label: language === "fi" ? "Ilmoittautuminen suljettu" : "Registration closed",
      detail:
        language === "fi"
          ? "Tapahtuma ei ole enää liittymisvaiheessa."
          : "This event is no longer in a pre-start join state.",
      state: "warning",
    };
  }

  const now = Date.now();
  const startTime = new Date(event.startAt).getTime();
  const joinDeadlineTime = new Date(event.joinDeadlineAt).getTime();

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
    default:
      return {
        title: language === "fi" ? "Liittyminen epäonnistui" : "Join failed",
        body: language === "fi" ? `Palautuskoodi ${result.status}.` : `Registration RPC returned ${result.status}.`,
        state: "error",
      };
  }
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

const getRewardChipColor = (rewardTier: RewardTierSummary, theme: MobileTheme): string => {
  if (rewardTier.inventoryTotal === null) {
    return theme.colors.chromeTintIndigo;
  }

  if (rewardTier.inventoryClaimed >= rewardTier.inventoryTotal) {
    return theme.colors.dangerSurface;
  }

  return theme.colors.chromeTintWarm;
};

export default function StudentEventDetailScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const isAppActive = useActiveAppState();
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

  useStudentRewardInventoryRealtime({
    trackedEventIds,
    studentId: studentId ?? "",
    detailEventId: eventId,
    isEnabled: eventId !== null && studentId !== null && isFocused && isAppActive,
  });

  const joinMutation = useJoinEventMutation();

  useEffect(() => {
    void prefetchEventCoverUrls([detailQuery.data?.coverImageUrl ?? null]);
  }, [detailQuery.data?.coverImageUrl]);

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
  const registrationBadge = event ? getRegistrationBadge(event.registrationState, language) : null;
  const joinAvailability = event ? getJoinAvailability(event, language, formatter) : null;
  const joinPresentation = getJoinResultPresentation(joinMutation.data, language);
  const coverSource =
    event === null ? undefined : getEventCoverSource(event.coverImageUrl, `${event.id}:${event.name}`);

  const handleJoinPress = async (): Promise<void> => {
    if (studentId === null || event === null) {
      return;
    }

    await joinMutation.mutateAsync({
      eventId: event.id,
      studentId,
    });
  };

  const handleBackPress = (): void => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/student/events");
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
          <Text style={themeStyles.bodyText}>{detailQuery.error.message}</Text>
          <Pressable onPress={() => void detailQuery.refetch()} style={themeStyles.secondaryButton}>
            <Text style={themeStyles.secondaryButtonText}>{copy.common.retry}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {event ? (
        <>
          <CoverImageSurface imageStyle={themeStyles.heroImage} source={coverSource} style={themeStyles.heroCard}>
            <View style={themeStyles.heroEdgeFade} />
          </CoverImageSurface>

          <InfoCard eyebrow={copy.common.eventDetails} title={event.name}>
            <View style={themeStyles.badges}>
              <StatusBadge
                label={event.status === "PUBLISHED" ? (language === "fi" ? "julkaistu" : "published") : language === "fi" ? "päättynyt" : "completed"}
                state={event.status === "PUBLISHED" ? "ready" : "warning"}
              />
              {registrationBadge ? (
                <StatusBadge label={registrationBadge.label} state={registrationBadge.state} />
              ) : null}
            </View>

            <View style={themeStyles.metaStrip}>
              <View style={themeStyles.metaPill}>
                <Text style={themeStyles.metaPillValue}>{event.city}</Text>
              </View>
              <View style={themeStyles.metaPill}>
                <Text style={themeStyles.metaPillValue}>
                  {language === "fi" ? "Alkaa" : "Starts"} {formatter.format(new Date(event.startAt))}
                </Text>
              </View>
              <View style={themeStyles.metaPill}>
                <Text style={themeStyles.metaPillValue}>
                  {language === "fi" ? "Ilmoittautuminen" : "Join before"} {formatter.format(new Date(event.joinDeadlineAt))}
                </Text>
              </View>
            </View>

            <Text style={themeStyles.sectionLead}>{copy.student.eventDescription}</Text>
            <Text style={themeStyles.bodyText}>
              {event.description ?? copy.student.eventDescriptionFallback}
            </Text>
          </InfoCard>

          <InfoCard eyebrow={language === "fi" ? "Ilmoittautuminen" : "Registration"} title={joinAvailability?.label ?? (language === "fi" ? "Liity tapahtumaan" : "Join event")}>
            <Text style={themeStyles.bodyText}>{joinAvailability?.detail ?? ""}</Text>
            {joinPresentation ? (
              <View style={themeStyles.inlineStatusRow}>
                <StatusBadge label={joinPresentation.state} state={joinPresentation.state} />
                <Text style={themeStyles.metaText}>{joinPresentation.body}</Text>
              </View>
            ) : null}
            <Pressable
              disabled={!joinAvailability?.canJoin || joinMutation.isPending}
              onPress={() => void handleJoinPress()}
              style={[
                themeStyles.primaryButton,
                !joinAvailability?.canJoin || joinMutation.isPending ? themeStyles.disabledButton : null,
              ]}
            >
              <Text style={themeStyles.primaryButtonText}>
                {joinMutation.isPending
                  ? language === "fi"
                    ? "Liitytään..."
                    : "Joining..."
                  : joinAvailability?.label ?? (language === "fi" ? "Liity tapahtumaan" : "Join event")}
              </Text>
            </Pressable>
          </InfoCard>

          <InfoCard eyebrow={language === "fi" ? "Pisteet" : "Venues"} title={language === "fi" ? "Pisteet ja palkinnot" : "Venues and rewards"}>
            {event.venues.length > 0 ? (
              <View style={themeStyles.listGroup}>
                {event.venues.map((venue) => (
                  <View key={venue.id} style={themeStyles.listRow}>
                    <View style={themeStyles.venueHeader}>
                      <View style={themeStyles.venueOrderBubble}>
                        <Text style={themeStyles.venueOrderText}>{venue.venueOrder ?? "-"}</Text>
                      </View>
                      <View style={themeStyles.venueCopy}>
                        <Text style={themeStyles.listTitle}>{venue.name}</Text>
                        <Text style={themeStyles.metaLine}>{venue.city}</Text>
                      </View>
                    </View>
                    {venue.stampLabel ? (
                      <Text style={themeStyles.metaLine}>
                        {language === "fi" ? "Leima" : "Stamp label"}: {venue.stampLabel}
                      </Text>
                    ) : null}
                    {venue.customInstructions ? <Text style={themeStyles.metaLine}>{venue.customInstructions}</Text> : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={themeStyles.bodyText}>
                {language === "fi" ? "Pisteitä ei ole vielä näkyvissä." : "No joined venues are visible yet for this event."}
              </Text>
            )}

            {event.rewardTiers.length > 0 ? (
              <View style={themeStyles.rewardGroup}>
                {event.rewardTiers.map((rewardTier) => (
                  <View key={rewardTier.id} style={themeStyles.listRow}>
                    <View style={themeStyles.rewardHeader}>
                      <View
                        style={[
                          themeStyles.rewardRequirementBadge,
                          { backgroundColor: getRewardChipColor(rewardTier, theme) },
                        ]}
                      >
                        <Text style={themeStyles.rewardRequirementText}>
                          {rewardTier.requiredStampCount} {language === "fi" ? "leimaa" : "leima"}
                        </Text>
                      </View>
                      <Text style={themeStyles.listTitle}>{rewardTier.title}</Text>
                    </View>
                    <Text style={themeStyles.metaLine}>{getRewardInventoryCopy(rewardTier, language)}</Text>
                    {rewardTier.description ? <Text style={themeStyles.metaLine}>{rewardTier.description}</Text> : null}
                    {rewardTier.claimInstructions ? <Text style={themeStyles.metaLine}>{rewardTier.claimInstructions}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}
          </InfoCard>

          {Object.entries(event.rules).length > 0 ? (
            <InfoCard eyebrow={language === "fi" ? "Säännöt" : "Rules"} title={language === "fi" ? "Muista nämä" : "Before you go"}>
              <View style={themeStyles.rulesGroup}>
                {Object.entries(event.rules).map(([key, value]) => (
                  <View key={key} style={themeStyles.ruleRow}>
                    <Text style={themeStyles.listTitle}>{key}</Text>
                    <Text style={themeStyles.metaLine}>{formatRuleValue(value)}</Text>
                  </View>
                ))}
              </View>
            </InfoCard>
          ) : null}
        </>
      ) : null}
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) => {
  const styles = StyleSheet.create({
    backButton: {
      alignSelf: "flex-start",
      backgroundColor: theme.mode === "dark" ? "rgba(8, 9, 14, 0.84)" : "rgba(255, 255, 255, 0.88)",
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
      minHeight: 264,
      overflow: "hidden",
      position: "relative",
    },
    heroEdgeFade: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "transparent",
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
    metaPill: {
      backgroundColor: theme.mode === "dark" ? "rgba(0, 0, 0, 0.42)" : "rgba(255, 255, 255, 0.82)",
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    metaPillValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
    },
    metaStrip: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
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
    rewardGroup: {
      gap: 10,
      marginTop: 10,
    },
    rewardHeader: {
      gap: 10,
    },
    rewardRequirementBadge: {
      alignSelf: "flex-start",
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    rewardRequirementText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      textTransform: "uppercase",
    },
    sectionLead: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    rulesGroup: {
      gap: 10,
    },
    ruleRow: {
      gap: 4,
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
    venueHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
    },
    venueOrderBubble: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL3,
      borderRadius: 999,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    venueOrderText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.caption,
    },
  });

  return styles;
};
