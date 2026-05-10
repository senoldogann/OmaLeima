import { useMemo } from "react";
import { useRouter } from "expo-router";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { EmptyStateCard } from "@/components/empty-state-card";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { useBusinessHomeOverviewQuery } from "@/features/business/business-home";
import { useBusinessRoiQuery, type BusinessRoiEvent, type BusinessRoiSummary } from "@/features/business/business-roi";
import { interactiveSurfaceShadowStyle, type MobileTheme } from "@/features/foundation/theme";
import { createUserSafeErrorMessage } from "@/features/foundation/user-safe-error";
import { useManualRefresh } from "@/features/foundation/use-manual-refresh";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";
import type { AppReadinessState } from "@/types/app";

type RoiCopy = {
  activeScanners: string;
  activeScannersBody: string;
  businessEyebrow: string;
  emptyBody: string;
  emptyTitle: string;
  eventStatusFallback: string;
  eventTitle: string;
  eventWindow: string;
  eventsJoined: string;
  guideBody: string;
  guideTitle: string;
  heroBody: string;
  heroTitle: string;
  history: string;
  joinedVenue: string;
  leftVenue: string;
  loading: string;
  overviewFailed: string;
  repeatBody: string;
  repeatLabel: string;
  repeatSentence: string;
  repeatShort: string;
  reportFailed: string;
  reportsMeta: string;
  scanner: string;
  scannerShort: string;
  screenTitle: string;
  stampsBody: string;
  stampsLabel: string;
  stampsShort: string;
  studentsBody: string;
  studentsLabel: string;
  studentsShort: string;
  unknownVenue: string;
  viewEvents: string;
  windowDays: string;
};

type MetricTone = "accent" | "muted" | "warning";

type RoiMetricCard = {
  body: string;
  key: string;
  label: string;
  tone: MetricTone;
  value: string;
};

type RoiQuickStat = {
  key: string;
  label: string;
  value: string;
};

type LocalizedStatus = {
  label: string;
  state: AppReadinessState;
};

const createRoiCopy = (language: "fi" | "en"): RoiCopy => ({
  activeScanners: language === "fi" ? "Aktiiviset skannerit" : "Active scanners",
  activeScannersBody:
    language === "fi"
      ? "Kuinka moni henkilökunnan laite tai sessio oli oikeasti käytössä raporttijaksolla."
      : "How many staff devices or sessions were actually active during the reporting window.",
  businessEyebrow: language === "fi" ? "Yritys" : "Business",
  emptyBody:
    language === "fi"
      ? "Kun yritys liittyy tapahtumiin ja opiskelijat saavat leimoja, vaikutus näkyy täällä ilman erillistä raportointia."
      : "Once the business joins events and students collect leimas, the impact appears here automatically.",
  emptyTitle: language === "fi" ? "Ei vielä mitattavaa vaikutusta" : "No measurable impact yet",
  eventStatusFallback: language === "fi" ? "Tuntematon tila" : "Unknown status",
  eventTitle: language === "fi" ? "Tapahtumien vaikutus" : "Event impact",
  eventWindow: language === "fi" ? "180 päivän näkymä" : "180 day view",
  eventsJoined: language === "fi" ? "Mukana olevat tapahtumat" : "Joined events",
  guideBody:
    language === "fi"
      ? "OmaLeima näyttää varmennetun vaikutuksen: leimat, opiskelijat, palaavat käynnit ja skanneriaktiivisuuden. Rahallista ROI:ta ei arvioida ilman kassadataa."
      : "OmaLeima shows verified impact: leimas, students, return visits, and scanner activity. Monetary ROI is not estimated without POS data.",
  guideTitle: language === "fi" ? "Mitä tämä raportti kertoo" : "What this report tells you",
  heroBody:
    language === "fi"
      ? "Näet nopeasti, mitkä tapahtumat toivat opiskelijoita takaisin ja missä pisteissä leimoja oikeasti annettiin."
      : "See quickly which events brought students back and where leimas were actually scanned.",
  heroTitle: language === "fi" ? "Selkeä vaikutus yhdellä silmäyksellä" : "Clear impact at a glance",
  history: language === "fi" ? "Historia" : "History",
  joinedVenue: language === "fi" ? "Mukana" : "Joined",
  leftVenue: language === "fi" ? "Poistunut" : "Left",
  loading: language === "fi" ? "ROI-raportti latautuu" : "Loading ROI report",
  overviewFailed: language === "fi" ? "Yritysnäkymä ei latautunut" : "Business overview failed",
  repeatBody:
    language === "fi"
      ? "Opiskelijat, jotka palasivat yritykselle useamman kuin kerran saman raportti-ikkunan aikana."
      : "Students who returned to the business more than once during the reporting window.",
  repeatLabel: language === "fi" ? "Palaavat kävijät" : "Repeat visitors",
  repeatSentence: language === "fi" ? "paluuprosentti" : "return rate",
  repeatShort: language === "fi" ? "palaavaa" : "repeat",
  reportFailed: language === "fi" ? "ROI-raportti ei latautunut" : "ROI report failed",
  reportsMeta:
    language === "fi"
      ? "Sama rauhallinen näkymä kuin historiassa, mutta vaikutuslukuihin keskittyen."
      : "A calmer history-like view focused on impact numbers.",
  scanner: language === "fi" ? "Skanneri" : "Scanner",
  scannerShort: language === "fi" ? "skanneria" : "scanners",
  screenTitle: language === "fi" ? "ROI" : "ROI",
  stampsBody:
    language === "fi"
      ? "Hyväksytyt leimat, jotka yrityksesi pisteissä on annettu opiskelijoille."
      : "Accepted leimas collected by students at your business checkpoints.",
  stampsLabel: language === "fi" ? "Hyväksytyt leimat" : "Accepted leimas",
  stampsShort: language === "fi" ? "leimaa" : "leimas",
  studentsBody:
    language === "fi"
      ? "Kuinka monta eri opiskelijaa yrityksesi tavoitti raporttijaksolla."
      : "How many distinct students your business reached during the reporting window.",
  studentsLabel: language === "fi" ? "Uniikit opiskelijat" : "Unique students",
  studentsShort: language === "fi" ? "opiskelijaa" : "students",
  unknownVenue: language === "fi" ? "Tila ei tiedossa" : "Status unknown",
  viewEvents: language === "fi" ? "Avaa Approt" : "Open events",
  windowDays: language === "fi" ? "180 päivää" : "180 days",
});

const formatNumber = (value: number, localeTag: string): string =>
  new Intl.NumberFormat(localeTag).format(value);

const formatPercent = (value: number, localeTag: string): string =>
  new Intl.NumberFormat(localeTag, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "percent",
  }).format(value / 100);

const formatEventDate = (value: string, localeTag: string): string => {
  if (value.trim().length === 0) {
    return "";
  }

  return new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const getEventStatus = (status: string, language: "fi" | "en", fallback: string): LocalizedStatus => {
  if (status === "ACTIVE") {
    return { label: language === "fi" ? "Käynnissä" : "Live", state: "ready" };
  }

  if (status === "PUBLISHED") {
    return { label: language === "fi" ? "Julkaistu" : "Published", state: "pending" };
  }

  if (status === "COMPLETED") {
    return { label: language === "fi" ? "Päättynyt" : "Completed", state: "pending" };
  }

  if (status === "CANCELLED") {
    return { label: language === "fi" ? "Peruttu" : "Cancelled", state: "warning" };
  }

  return { label: fallback, state: "pending" };
};

const getVenueStatus = (venueStatus: string, copy: RoiCopy): LocalizedStatus => {
  if (venueStatus === "JOINED") {
    return { label: copy.joinedVenue, state: "ready" };
  }

  if (venueStatus === "LEFT" || venueStatus === "REMOVED") {
    return { label: copy.leftVenue, state: "warning" };
  }

  return { label: copy.unknownVenue, state: "pending" };
};

const createMetricCards = (summary: BusinessRoiSummary, copy: RoiCopy, localeTag: string): RoiMetricCard[] => [
  {
    body: copy.stampsBody,
    key: "stamps",
    label: copy.stampsLabel,
    tone: "accent",
    value: formatNumber(summary.validStampCount, localeTag),
  },
  {
    body: copy.studentsBody,
    key: "students",
    label: copy.studentsLabel,
    tone: "muted",
    value: formatNumber(summary.uniqueStudentCount, localeTag),
  },
  {
    body: copy.repeatBody,
    key: "repeat",
    label: copy.repeatLabel,
    tone: summary.repeatStudentCount > 0 ? "warning" : "muted",
    value: formatNumber(summary.repeatStudentCount, localeTag),
  },
  {
    body: copy.activeScannersBody,
    key: "scanners",
    label: copy.activeScanners,
    tone: "muted",
    value: formatNumber(summary.activeScannerCount, localeTag),
  },
];

const createQuickStats = (summary: BusinessRoiSummary, copy: RoiCopy, localeTag: string): RoiQuickStat[] => {
  const returnRate = summary.uniqueStudentCount === 0
    ? 0
    : Math.round((summary.repeatStudentCount / summary.uniqueStudentCount) * 100);

  return [
    {
      key: "window",
      label: copy.eventWindow,
      value: copy.windowDays,
    },
    {
      key: "events",
      label: copy.eventsJoined,
      value: formatNumber(summary.joinedEventCount, localeTag),
    },
    {
      key: "return-rate",
      label: copy.repeatSentence,
      value: formatPercent(returnRate, localeTag),
    },
  ];
};

const sortEventsByImpact = (events: BusinessRoiEvent[]): BusinessRoiEvent[] =>
  [...events].sort((left, right) => {
    if (right.validStampCount !== left.validStampCount) {
      return right.validStampCount - left.validStampCount;
    }

    if (right.uniqueStudentCount !== left.uniqueStudentCount) {
      return right.uniqueStudentCount - left.uniqueStudentCount;
    }

    return right.startAt.localeCompare(left.startAt);
  });

const createImpactSentence = (event: BusinessRoiEvent, copy: RoiCopy, localeTag: string): string => {
  const stampCount = formatNumber(event.validStampCount, localeTag);
  const uniqueCount = formatNumber(event.uniqueStudentCount, localeTag);
  const repeatRate = formatPercent(event.repeatVisitRate, localeTag);

  return `${stampCount} ${copy.stampsShort} · ${uniqueCount} ${copy.studentsShort} · ${repeatRate} ${copy.repeatSentence}`;
};

export default function BusinessReportsScreen() {
  const router = useRouter();
  const { copy, language, localeTag, theme } = useUiPreferences();
  const roiCopy = createRoiCopy(language);
  const styles = useThemeStyles(createStyles);
  const { session } = useSession();
  const userId = session?.user.id ?? "";
  const overviewQuery = useBusinessHomeOverviewQuery({
    isEnabled: userId.length > 0,
    userId,
  });
  const roiQuery = useBusinessRoiQuery({
    isEnabled: overviewQuery.data !== undefined && userId.length > 0,
    memberships: overviewQuery.data?.memberships ?? [],
    userId,
  });
  const manualRefresh = useManualRefresh(async () => {
    await Promise.all([overviewQuery.refetch(), roiQuery.refetch()]);
  });

  const summary = roiQuery.data?.summary ?? null;
  const events = useMemo(() => sortEventsByImpact(roiQuery.data?.events ?? []), [roiQuery.data?.events]);
  const metricCards = useMemo(
    () => (summary === null ? [] : createMetricCards(summary, roiCopy, localeTag)),
    [localeTag, roiCopy, summary]
  );
  const quickStats = useMemo(
    () => (summary === null ? [] : createQuickStats(summary, roiCopy, localeTag)),
    [localeTag, roiCopy, summary]
  );

  const renderEventCard = (event: BusinessRoiEvent) => {
    const eventStatus = getEventStatus(event.status, language, roiCopy.eventStatusFallback);
    const venueStatus = getVenueStatus(event.venueStatus, roiCopy);
    const eventDate = formatEventDate(event.startAt, localeTag);

    return (
      <View key={event.eventId} style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <View style={styles.eventTitleGroup}>
            <Text style={styles.eventTitle}>{event.name}</Text>
            <Text style={styles.eventMeta}>
              {[event.city, eventDate].filter((value) => value.length > 0).join(" · ")}
            </Text>
          </View>
          <View style={styles.statusStack}>
            <StatusBadge label={eventStatus.label} state={eventStatus.state} />
            <StatusBadge label={venueStatus.label} state={venueStatus.state} />
          </View>
        </View>

        <Text style={styles.eventImpactSentence}>{createImpactSentence(event, roiCopy, localeTag)}</Text>

        <View style={styles.eventMetricGrid}>
          <View style={styles.eventMetricPill}>
            <Text style={styles.eventMetricValue}>{formatNumber(event.validStampCount, localeTag)}</Text>
            <Text style={styles.eventMetricLabel}>{roiCopy.stampsShort}</Text>
          </View>
          <View style={styles.eventMetricPill}>
            <Text style={styles.eventMetricValue}>{formatNumber(event.uniqueStudentCount, localeTag)}</Text>
            <Text style={styles.eventMetricLabel}>{roiCopy.studentsShort}</Text>
          </View>
          <View style={styles.eventMetricPill}>
            <Text style={styles.eventMetricValue}>{formatPercent(event.repeatVisitRate, localeTag)}</Text>
            <Text style={styles.eventMetricLabel}>{roiCopy.repeatShort}</Text>
          </View>
          <View style={styles.eventMetricPill}>
            <Text style={styles.eventMetricValue}>{formatNumber(event.activeScannerCount, localeTag)}</Text>
            <Text style={styles.eventMetricLabel}>{roiCopy.scannerShort}</Text>
          </View>
        </View>
      </View>
    );
  };

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
        <View style={styles.topBarLeft}>
          <Text style={styles.topBarEyebrow}>{roiCopy.businessEyebrow}</Text>
          <Text style={styles.screenTitle}>{roiCopy.screenTitle}</Text>
        </View>
        <View style={styles.topBarActions}>
          <Pressable onPress={() => router.push("/business/history")} style={styles.topBarIconBtn}>
            <AppIcon color={theme.colors.textPrimary} name="history" size={18} />
          </Pressable>
          <Pressable onPress={() => router.push("/business/events")} style={styles.topBarIconBtn}>
            <AppIcon color={theme.colors.textPrimary} name="calendar" size={18} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.metaText}>{roiCopy.reportsMeta}</Text>

      {overviewQuery.isLoading || roiQuery.isLoading ? (
        <InfoCard eyebrow={copy.common.loading} title={roiCopy.loading}>
          <Text style={styles.bodyText}>{roiCopy.heroBody}</Text>
        </InfoCard>
      ) : null}

      {overviewQuery.error ? (
        <InfoCard eyebrow={copy.common.error} title={roiCopy.overviewFailed}>
          <Text style={styles.bodyText}>{createUserSafeErrorMessage(overviewQuery.error, language, "business")}</Text>
        </InfoCard>
      ) : null}

      {roiQuery.error ? (
        <InfoCard eyebrow={copy.common.error} title={roiCopy.reportFailed}>
          <Text style={styles.bodyText}>{createUserSafeErrorMessage(roiQuery.error, language, "reports")}</Text>
        </InfoCard>
      ) : null}

      {!overviewQuery.isLoading && !roiQuery.isLoading && !overviewQuery.error && !roiQuery.error && summary !== null ? (
        <>
          <View style={styles.heroCard}>
            <View style={styles.heroHeaderRow}>
              <View style={styles.heroIcon}>
                <AppIcon color={theme.colors.lime} name="scan" size={18} />
              </View>
              <Text style={styles.heroEyebrow}>{roiCopy.guideTitle}</Text>
            </View>
            <Text style={styles.heroTitle}>{roiCopy.heroTitle}</Text>
            <Text style={styles.bodyText}>{roiCopy.heroBody}</Text>

            <View style={styles.quickStatsRow}>
              {quickStats.map((quickStat) => (
                <View key={quickStat.key} style={styles.quickStatCard}>
                  <Text style={styles.quickStatValue}>{quickStat.value}</Text>
                  <Text style={styles.quickStatLabel}>{quickStat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.metricStrip}>
            {metricCards.map((metricCard) => {
              const accentColor = metricCard.tone === "accent"
                ? theme.colors.lime
                : metricCard.tone === "warning"
                  ? theme.colors.warning
                  : theme.colors.textPrimary;

              return (
                <View
                  key={metricCard.key}
                  style={[
                    styles.metricCard,
                    metricCard.tone === "accent" ? styles.metricCardAccent : null,
                    metricCard.tone === "warning" ? styles.metricCardWarning : null,
                  ]}
                >
                  <Text style={[styles.metricValue, { color: accentColor }]}>{metricCard.value}</Text>
                  <Text style={styles.metricLabel}>{metricCard.label}</Text>
                  <Text style={styles.metricBody}>{metricCard.body}</Text>
                </View>
              );
            })}
          </View>

          <InfoCard eyebrow={roiCopy.eventWindow} title={roiCopy.guideTitle} variant="subtle">
            <Text style={styles.bodyText}>{roiCopy.guideBody}</Text>
          </InfoCard>

          {events.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{roiCopy.eventTitle}</Text>
                <View style={styles.sectionHeaderActions}>
                  <Text style={styles.sectionMeta}>{formatNumber(events.length, localeTag)}</Text>
                  <Pressable onPress={() => router.push("/business/events")} style={styles.linkButton}>
                    <Text style={styles.linkButtonText}>{roiCopy.viewEvents}</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.list}>{events.map(renderEventCard)}</View>
            </View>
          ) : (
            <EmptyStateCard
              body={roiCopy.emptyBody}
              eyebrow={roiCopy.eventWindow}
              iconName="history"
              title={roiCopy.emptyTitle}
            />
          )}
        </>
      ) : null}
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    emptyRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
    },
    eventCard: {
      ...interactiveSurfaceShadowStyle,
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      gap: 14,
      padding: 16,
    },
    eventHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    eventImpactSentence: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    eventMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    eventMetricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    eventMetricLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    eventMetricPill: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      flexGrow: 1,
      gap: 3,
      minWidth: "47%",
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    eventMetricValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: 20,
      lineHeight: 25,
    },
    eventTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: 18,
      lineHeight: 23,
    },
    eventTitleGroup: {
      flex: 1,
      gap: 5,
      minWidth: 0,
    },
    flexBody: {
      flex: 1,
    },
    heroCard: {
      ...interactiveSurfaceShadowStyle,
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.limeBorder,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      gap: 14,
      padding: 18,
    },
    heroEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: 12,
      letterSpacing: 1.6,
      textTransform: "uppercase",
    },
    heroHeaderRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
    },
    heroIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
      borderRadius: 999,
      borderWidth: 1,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    heroTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    linkButton: {
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    linkButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    list: {
      gap: 12,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    metricBody: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    metricCard: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      flex: 1,
      gap: 8,
      minWidth: "47%",
      padding: 16,
    },
    metricCardAccent: {
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
    },
    metricCardWarning: {
      backgroundColor: theme.colors.warningSurface,
      borderColor: theme.colors.warningBorder,
    },
    metricLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.semibold,
      fontSize: 12,
      textTransform: "uppercase",
    },
    metricStrip: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    metricValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: 30,
      lineHeight: 36,
    },
    quickStatCard: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      flex: 1,
      gap: 4,
      minWidth: "30%",
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    quickStatLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    quickStatValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    quickStatsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
    section: {
      gap: 12,
    },
    sectionHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    sectionHeaderActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
    },
    sectionMeta: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    statusStack: {
      alignItems: "flex-end",
      flexShrink: 0,
      gap: 6,
    },
    topBar: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    topBarActions: {
      flexDirection: "row",
      gap: 10,
    },
    topBarEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.5,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    topBarIconBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: 1,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    topBarLeft: {
      gap: 2,
    },
  });
