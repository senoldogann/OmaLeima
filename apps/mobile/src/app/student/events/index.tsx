import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { EventCard } from "@/features/events/components/event-card";
import {
  getEventCoverSource,
  getOffsetFallbackCoverSourceByIndex,
  prefetchEventCoverUrls,
} from "@/features/events/event-visuals";
import { AutoAdvancingRail } from "@/features/foundation/components/auto-advancing-rail";
import type { MobileTheme } from "@/features/foundation/theme";
import { useJoinEventMutation } from "@/features/events/student-event-detail";
import { useStudentEventsQuery } from "@/features/events/student-events";
import type { StudentEventSummary } from "@/features/events/types";
import { useAppTheme, useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

type DiscoverySlide = {
  copy: string;
  eyebrow: string;
  key: string;
  meta: string;
  title: string;
};

type ActionNotice = {
  body: string;
  title: string;
};

const createJoinActionNotice = (status: string, language: "fi" | "en"): ActionNotice | null => {
  if (status === "SUCCESS" || status === "ALREADY_REGISTERED") {
    return null;
  }

  const notices: Record<string, ActionNotice> = {
    EVENT_FULL: {
      body: language === "fi" ? "Tapahtuma on saavuttanut kapasiteettinsa." : "The event has reached capacity.",
      title: language === "fi" ? "Tapahtuma täynnä" : "Event is full",
    },
    EVENT_NOT_AVAILABLE: {
      body:
        language === "fi"
          ? "Tapahtuma ei ole enää avoin ilmoittautumiselle."
          : "This event is no longer available for registration.",
      title: language === "fi" ? "Ilmoittautuminen suljettu" : "Registration closed",
    },
    EVENT_REGISTRATION_CLOSED: {
      body:
        language === "fi"
          ? "Liittymisaika tai tapahtuman aloitus on jo mennyt."
          : "The join deadline or event start time has already passed.",
      title: language === "fi" ? "Liittymisaika päättynyt" : "Join window closed",
    },
    STUDENT_BANNED: {
      body:
        language === "fi"
          ? "Tällä profiililla ei voi liittyä tähän tapahtumaan."
          : "This profile is restricted for this event.",
      title: language === "fi" ? "Liittyminen estetty" : "Registration blocked",
    },
  };

  return (
    notices[status] ?? {
      body: language === "fi" ? `Palautuskoodi ${status}.` : `Registration returned ${status}.`,
      title: language === "fi" ? "Liittyminen epäonnistui" : "Could not join event",
    }
  );
};

const createErrorNotice = (error: unknown, language: "fi" | "en"): ActionNotice => ({
  body: error instanceof Error ? error.message : language === "fi" ? "Tuntematon virhe." : "Unknown error.",
  title: language === "fi" ? "Toiminto epäonnistui" : "Action failed",
});

const canShowJoinAction = (event: StudentEventSummary): boolean =>
  event.timelineState === "UPCOMING" && event.registrationState === "NOT_REGISTERED";

const getRegistrationLabel = (
  registrationState: StudentEventSummary["registrationState"],
  language: "fi" | "en"
): string => {
  switch (registrationState) {
    case "REGISTERED":
      return language === "fi" ? "Liitytty" : "Registered";
    case "CANCELLED":
      return language === "fi" ? "Peruttu" : "Cancelled";
    case "BANNED":
      return language === "fi" ? "Rajoitettu" : "Restricted";
    case "NOT_REGISTERED":
      return language === "fi" ? "Ei vielä liitytty" : "Not joined yet";
  }
};

const getTimelineLabel = (
  timelineState: StudentEventSummary["timelineState"],
  language: "fi" | "en"
): string => {
  switch (timelineState) {
    case "ACTIVE":
      return language === "fi" ? "Käynnissä nyt" : "Live now";
    case "UPCOMING":
      return language === "fi" ? "Tulossa" : "Coming up";
  }
};

export default function StudentEventsScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { session } = useSession();
  const { copy, language } = useUiPreferences();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const studentId = session?.user.id ?? null;
  const [previewEvent, setPreviewEvent] = useState<StudentEventSummary | null>(null);
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const eventsQuery = useStudentEventsQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null,
  });
  const joinMutation = useJoinEventMutation();

  const activeEvents = useMemo(
    () => eventsQuery.data?.activeEvents ?? [],
    [eventsQuery.data?.activeEvents]
  );
  const upcomingEvents = useMemo(
    () => eventsQuery.data?.upcomingEvents ?? [],
    [eventsQuery.data?.upcomingEvents]
  );
  const coverImageUrls = useMemo(
    () => [...activeEvents, ...upcomingEvents].map((event) => event.coverImageUrl),
    [activeEvents, upcomingEvents]
  );
  const visibleEvents = useMemo(
    () => [...activeEvents, ...upcomingEvents],
    [activeEvents, upcomingEvents]
  );
  const hasEvents = activeEvents.length > 0 || upcomingEvents.length > 0;
  const heroWidth = windowWidth;
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "fi" ? "fi-FI" : "en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [language]
  );

  const discoverySlides = useMemo<readonly DiscoverySlide[]>(
    () => [
      {
        copy: copy.student.discoverySlides[0].body,
        eyebrow: copy.student.discoveryEyebrow,
        key: copy.student.discoverySlides[0].key,
        meta: language === "fi" ? `${activeEvents.length} käynnissä` : `${activeEvents.length} live now`,
        title: copy.student.discoverySlides[0].title,
      },
      {
        copy: copy.student.discoverySlides[1].body,
        eyebrow: copy.student.discoveryEyebrow,
        key: copy.student.discoverySlides[1].key,
        meta: language === "fi" ? `${upcomingEvents.length} tulossa` : `${upcomingEvents.length} coming up`,
        title: copy.student.discoverySlides[1].title,
      },
      {
        copy: copy.student.discoverySlides[2].body,
        eyebrow: copy.student.discoveryEyebrow,
        key: copy.student.discoverySlides[2].key,
        meta:
          language === "fi"
            ? `${activeEvents.length + upcomingEvents.length} iltaa näkyvissä`
            : `${activeEvents.length + upcomingEvents.length} nights visible`,
        title: copy.student.discoverySlides[2].title,
      },
    ],
    [activeEvents.length, copy.student.discoveryEyebrow, copy.student.discoverySlides, language, upcomingEvents.length]
  );

  const openEventDetail = (eventId: string): void => {
    router.push({
      pathname: "/student/events/[eventId]",
      params: { eventId },
    });
  };

  const joinEventFromCard = async (eventId: string): Promise<boolean> => {
    if (studentId === null) {
      return false;
    }

    setActionNotice(null);

    try {
      const result = await joinMutation.mutateAsync({
        eventId,
        studentId,
      });
      const notice = createJoinActionNotice(result.status, language);
      setActionNotice(notice);

      return notice === null;
    } catch (error) {
      setActionNotice(createErrorNotice(error, language));
      return false;
    }
  };

  const handlePreviewJoinPress = async (event: StudentEventSummary): Promise<void> => {
    const didJoin = await joinEventFromCard(event.id);

    if (didJoin) {
      setPreviewEvent(null);
    }
  };

  const handlePreviewDetailPress = (event: StudentEventSummary): void => {
    setPreviewEvent(null);
    openEventDetail(event.id);
  };

  useEffect(() => {
    void prefetchEventCoverUrls(coverImageUrls);
  }, [coverImageUrls]);

  return (
    <AppScreen>
      <AutoAdvancingRail
        contentContainerStyle={styles.heroRailContent}
        intervalMs={3000}
        itemGap={0}
        items={discoverySlides}
        itemWidth={heroWidth}
        keyExtractor={(slide: DiscoverySlide) => slide.key}
        railStyle={styles.heroRail}
        renderItem={(slide: DiscoverySlide, index: number) => (
          <CoverImageSurface
            imageStyle={styles.heroImage}
            source={
              visibleEvents.length > 0
                ? getEventCoverSource(
                    visibleEvents[index % visibleEvents.length].coverImageUrl,
                    `${visibleEvents[index % visibleEvents.length].id}:hero:${slide.key}`
                  )
                : getOffsetFallbackCoverSourceByIndex(index, 1)
            }
            style={styles.heroBand}
          >
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.heroCopyBlock}>
                <Text style={styles.heroEyebrow}>{slide.eyebrow}</Text>
                <Text style={styles.heroTitle}>{slide.title}</Text>
                <Text style={styles.heroCopy}>{slide.copy}</Text>
              </View>

              <View style={styles.heroMetaRow}>
                <Text style={styles.heroMetaText}>{slide.meta}</Text>
                <View style={styles.heroMetaDot} />
                <View style={styles.heroMetaHint}>
                  <Text style={styles.heroMetaText}>{language === "fi" ? "Auto" : "Auto"}</Text>
                  <AppIcon color={theme.colors.lime} name="chevron-right" size={14} />
                </View>
              </View>
            </View>
          </CoverImageSurface>
        )}
        showsIndicators={false}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{copy.student.eventsTitle}</Text>
        <Text style={styles.headerMeta}>{copy.student.eventsMeta}</Text>
      </View>

      {eventsQuery.error ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageEyebrow}>{copy.common.error}</Text>
          <Text style={styles.messageTitle}>
            {language === "fi" ? "Tapahtumia ei voitu ladata" : "Could not load events"}
          </Text>
          <Text style={styles.bodyText}>{eventsQuery.error.message}</Text>
          <Pressable onPress={() => void eventsQuery.refetch()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>{copy.common.retry}</Text>
          </Pressable>
        </View>
      ) : null}

      {actionNotice !== null ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageEyebrow}>{copy.common.error}</Text>
          <Text style={styles.messageTitle}>{actionNotice.title}</Text>
          <Text style={styles.bodyText}>{actionNotice.body}</Text>
        </View>
      ) : null}

      {!eventsQuery.isLoading && !eventsQuery.error && !hasEvents ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageEyebrow}>{copy.common.standby}</Text>
          <Text style={styles.messageTitle}>
            {language === "fi" ? "Ei aktiivisia tai tulevia tapahtumia" : "No active or upcoming events"}
          </Text>
          <Text style={styles.bodyText}>
            {language === "fi"
              ? "Kun järjestäjät julkaisevat seuraavan tapahtuman, se ilmestyy tänne."
              : "When organizers publish the next event, it will appear here."}
          </Text>
        </View>
      ) : null}

      {activeEvents.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{language === "fi" ? "Käynnissä nyt" : "Live now"}</Text>
          {activeEvents.map((event, index) => (
            <EventCard
              event={event}
              isJoinPending={joinMutation.isPending}
              key={event.id}
              motionIndex={index + 1}
              onJoinPress={canShowJoinAction(event) ? () => void joinEventFromCard(event.id) : undefined}
              onPress={() => setPreviewEvent(event)}
            />
          ))}
        </View>
      ) : null}

      {upcomingEvents.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{language === "fi" ? "Tulossa" : "Coming up"}</Text>
          {upcomingEvents.map((event, index) => (
            <EventCard
              event={event}
              isJoinPending={joinMutation.isPending}
              key={event.id}
              motionIndex={activeEvents.length + index + 1}
              onJoinPress={() => void joinEventFromCard(event.id)}
              onPress={() => setPreviewEvent(event)}
            />
          ))}
        </View>
      ) : null}

      <Modal
        animationType="fade"
        onRequestClose={() => setPreviewEvent(null)}
        transparent
        visible={previewEvent !== null}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {previewEvent !== null ? (
              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <CoverImageSurface
                  imageStyle={styles.previewImage}
                  source={getEventCoverSource(previewEvent.coverImageUrl, `${previewEvent.id}:preview`)}
                  style={styles.previewHero}
                >
                  <View style={styles.previewOverlay} />
                  <Pressable onPress={() => setPreviewEvent(null)} style={styles.modalCloseButton}>
                    <AppIcon color="#F8FAF5" name="x" size={18} />
                  </Pressable>
                  <View style={styles.previewHeroCopy}>
                    <Text style={styles.previewEyebrow}>
                      {getTimelineLabel(previewEvent.timelineState, language)}
                    </Text>
                    <Text style={styles.previewTitle}>{previewEvent.name}</Text>
                    <Text style={styles.previewMeta}>
                      {previewEvent.city}
                      {previewEvent.country.length > 0 ? ` · ${previewEvent.country}` : ""}
                    </Text>
                  </View>
                </CoverImageSurface>

                <View style={styles.previewDetailGrid}>
                  <View style={styles.previewDetailTile}>
                    <Text style={styles.previewTileLabel}>{language === "fi" ? "Alkaa" : "Starts"}</Text>
                    <Text style={styles.previewTileValue}>
                      {dateFormatter.format(new Date(previewEvent.startAt))}
                    </Text>
                  </View>
                  <View style={styles.previewDetailTile}>
                    <Text style={styles.previewTileLabel}>{language === "fi" ? "Päättyy" : "Ends"}</Text>
                    <Text style={styles.previewTileValue}>
                      {dateFormatter.format(new Date(previewEvent.endAt))}
                    </Text>
                  </View>
                  <View style={styles.previewDetailTile}>
                    <Text style={styles.previewTileLabel}>
                      {language === "fi" ? "Liittyminen" : "Join before"}
                    </Text>
                    <Text style={styles.previewTileValue}>
                      {dateFormatter.format(new Date(previewEvent.joinDeadlineAt))}
                    </Text>
                  </View>
                  <View style={styles.previewDetailTile}>
                    <Text style={styles.previewTileLabel}>{language === "fi" ? "Tila" : "Status"}</Text>
                    <Text style={styles.previewTileValue}>
                      {getRegistrationLabel(previewEvent.registrationState, language)}
                    </Text>
                  </View>
                </View>

                <View style={styles.previewSection}>
                  <Text style={styles.previewSectionTitle}>{language === "fi" ? "Kuvaus" : "Description"}</Text>
                  <Text style={styles.previewDescription}>
                    {previewEvent.description?.trim().length
                      ? previewEvent.description
                      : language === "fi"
                        ? "Järjestäjä ei ole vielä lisännyt tarkempaa kuvausta."
                        : "The organizer has not added a detailed description yet."}
                  </Text>
                </View>

                <View style={styles.previewFactRow}>
                  <View style={styles.previewFact}>
                    <Text style={styles.previewFactNumber}>
                      {previewEvent.minimumStampsRequired}
                    </Text>
                    <Text style={styles.previewFactLabel}>
                      {language === "fi" ? "leimaa palkintoon" : "leima for rewards"}
                    </Text>
                  </View>
                  <View style={styles.previewFact}>
                    <Text style={styles.previewFactNumber}>
                      {previewEvent.maxParticipants === null ? "∞" : previewEvent.maxParticipants}
                    </Text>
                    <Text style={styles.previewFactLabel}>
                      {language === "fi" ? "paikkaa" : "places"}
                    </Text>
                  </View>
                </View>

                <View style={styles.previewActionRow}>
                  <Pressable
                    onPress={() => handlePreviewDetailPress(previewEvent)}
                    style={[styles.previewSecondaryButton, styles.previewActionFlex]}
                  >
                    <Text style={styles.previewSecondaryButtonText}>
                      {language === "fi" ? "Avaa tiedot" : "Open details"}
                    </Text>
                  </Pressable>
                  {canShowJoinAction(previewEvent) ? (
                    <Pressable
                      disabled={joinMutation.isPending}
                      onPress={() => void handlePreviewJoinPress(previewEvent)}
                      style={[
                        styles.previewPrimaryButton,
                        styles.previewActionFlex,
                        joinMutation.isPending ? styles.previewButtonDisabled : null,
                      ]}
                    >
                      <Text style={styles.previewPrimaryButtonText}>
                        {joinMutation.isPending
                          ? language === "fi"
                            ? "Liitytään..."
                            : "Joining..."
                          : language === "fi"
                            ? "Liity"
                            : "Join"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </ScrollView>
            ) : null}
          </View>
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
    header: {
      gap: 6,
    },
    headerMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      maxWidth: 320,
    },
    headerTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    heroBand: {
      minHeight: 248,
      position: "relative",
      width: "100%",
    },
    heroCopy: {
      color: "rgba(248, 250, 245, 0.86)",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
      maxWidth: 270,
    },
    heroCopyBlock: {
      gap: 8,
    },
    heroContent: {
      flex: 1,
      justifyContent: "space-between",
      padding: 22,
    },
    heroEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.2,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    heroImage: {
      borderRadius: 0,
    },
    heroMetaDot: {
      backgroundColor: theme.colors.limeBorder,
      borderRadius: 999,
      height: 4,
      width: 4,
    },
    heroMetaHint: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
    },
    heroMetaRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    heroMetaText: {
      color: "rgba(248, 250, 245, 0.8)",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.mode === "dark" ? "rgba(0, 0, 0, 0.58)" : "rgba(7, 10, 7, 0.52)",
    },
    heroRail: {
      marginHorizontal: -theme.spacing.screenHorizontal,
      marginTop: -theme.spacing.screenVertical,
    },
    heroRailContent: {
      paddingRight: 0,
    },
    heroTitle: {
      color: "#F8FAF5",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      letterSpacing: -0.5,
      lineHeight: theme.typography.lineHeights.title,
    },
    messageCard: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 18,
    },
    messageEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.2,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    messageTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    modalBackdrop: {
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.72)",
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 18,
      paddingVertical: 32,
    },
    modalCloseButton: {
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.42)",
      borderRadius: 999,
      height: 38,
      justifyContent: "center",
      position: "absolute",
      right: 14,
      top: 14,
      width: 38,
      zIndex: 3,
    },
    modalScrollContent: {
      gap: 16,
      padding: 16,
    },
    modalSheet: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: theme.mode === "light" ? 1 : 0,
      maxHeight: "88%",
      overflow: "hidden",
      width: "100%",
    },
    previewActionFlex: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
    },
    previewActionRow: {
      flexDirection: "row",
      gap: 10,
    },
    previewButtonDisabled: {
      opacity: 0.62,
    },
    previewDescription: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    previewDetailGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    previewDetailTile: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flexBasis: "48%",
      flexGrow: 1,
      gap: 5,
      minWidth: 132,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    previewEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.2,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    previewFact: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.inner,
      borderWidth: theme.mode === "light" ? 1 : 0,
      flex: 1,
      gap: 4,
      paddingVertical: 14,
    },
    previewFactLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textAlign: "center",
    },
    previewFactNumber: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: 28,
      lineHeight: 32,
    },
    previewFactRow: {
      flexDirection: "row",
      gap: 10,
    },
    previewHero: {
      borderRadius: theme.radius.inner,
      minHeight: 236,
      overflow: "hidden",
      position: "relative",
    },
    previewHeroCopy: {
      bottom: 18,
      gap: 7,
      left: 18,
      position: "absolute",
      right: 18,
      zIndex: 2,
    },
    previewImage: {
      borderRadius: theme.radius.inner,
    },
    previewMeta: {
      color: "rgba(248, 250, 245, 0.8)",
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    previewOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    previewPrimaryButton: {
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      minHeight: 48,
      paddingHorizontal: 14,
    },
    previewPrimaryButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    previewSecondaryButton: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: theme.mode === "light" ? 1 : 0,
      minHeight: 48,
      paddingHorizontal: 14,
    },
    previewSecondaryButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    previewSection: {
      gap: 8,
    },
    previewSectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    previewTileLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    previewTileValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    previewTitle: {
      color: "#F8FAF5",
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    retryButton: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    retryButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
    },
    section: {
      gap: theme.spacing.sectionGap,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
  });
