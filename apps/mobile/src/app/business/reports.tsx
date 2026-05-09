import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { useBusinessHomeOverviewQuery } from "@/features/business/business-home";
import { useBusinessRoiQuery, type BusinessRoiEvent, type BusinessRoiSummary } from "@/features/business/business-roi";
import type { MobileTheme } from "@/features/foundation/theme";
import { createUserSafeErrorMessage } from "@/features/foundation/user-safe-error";
import { useManualRefresh } from "@/features/foundation/use-manual-refresh";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";
import type { AppReadinessState } from "@/types/app";

type RoiCopy = {
  activeScannerBody: string;
  activeScannerLabel: string;
  emptyBody: string;
  emptyTitle: string;
  eventsBody: string;
  eventsLabel: string;
  eventStatusFallback: string;
  eventTitle: string;
  heroBody: string;
  heroEyebrow: string;
  heroTitle: string;
  joinedVenue: string;
  leftVenue: string;
  loading: string;
  overviewFailed: string;
  repeatBody: string;
  repeatLabel: string;
  repeatShort: string;
  reportFailed: string;
  scannerShort: string;
  stampsBody: string;
  stampsLabel: string;
  stampsShort: string;
  uniqueBody: string;
  uniqueLabel: string;
  uniqueShort: string;
  unknownVenue: string;
};

type MetricCardConfig = {
  body: string;
  iconName: "calendar" | "scan" | "user" | "history";
  label: string;
  value: number;
};

type LocalizedStatus = {
  label: string;
  state: AppReadinessState;
};

const createRoiCopy = (language: "fi" | "en"): RoiCopy => ({
  activeScannerBody:
    language === "fi"
      ? "Kuinka moni skannerilaite tai henkilökunnan kirjautuminen on ollut käytössä mittausjaksolla."
      : "How many scanner devices or staff sessions were active during the reporting window.",
  activeScannerLabel: language === "fi" ? "Aktiiviset skannerit" : "Active scanners",
  emptyBody:
    language === "fi"
      ? "Kun yritys liittyy tapahtumaan ja opiskelijat saavat leimoja, vaikutusraportti täyttyy automaattisesti."
      : "Once the business joins events and students collect leimas, this impact report fills automatically.",
  emptyTitle: language === "fi" ? "Ei vielä mitattavaa vaikutusta" : "No measurable impact yet",
  eventsBody:
    language === "fi"
      ? "Mukana olleet tapahtumat 180 päivän jaksolla."
      : "Joined events in the 180-day reporting window.",
  eventsLabel: language === "fi" ? "Tapahtumat" : "Events",
  eventStatusFallback: language === "fi" ? "Tuntematon tila" : "Unknown status",
  eventTitle: language === "fi" ? "Tapahtumakohtainen vaikutus" : "Event-level impact",
  heroBody:
    language === "fi"
      ? "Raportti näyttää OmaLeiman todentaman vaikutuksen: leimat, uniikit opiskelijat, palaavat kävijät ja aktiiviset skannerit. Rahallista ROI:ta ei arvata ilman myynti- tai kassadataa."
      : "This report shows the impact OmaLeima can verify: leimas, unique students, repeat visitors, and active scanners. Monetary ROI is not guessed without sales or POS data.",
  heroEyebrow: language === "fi" ? "Vaikutusraportti" : "Impact report",
  heroTitle: language === "fi" ? "Mitä tapahtumat tuovat?" : "What events bring back",
  joinedVenue: language === "fi" ? "Liittynyt" : "Joined",
  leftVenue: language === "fi" ? "Poistunut" : "Left",
  loading: language === "fi" ? "ROI-raportti latautuu" : "Loading ROI report",
  overviewFailed: language === "fi" ? "Yritysnäkymä ei latautunut" : "Business overview failed",
  repeatBody:
    language === "fi"
      ? "Opiskelijat, jotka ovat näkyneet useammassa tapahtuma- tai käyntikontekstissa."
      : "Students who appeared in more than one event or visit context.",
  repeatLabel: language === "fi" ? "Palaavat kävijät" : "Repeat visitors",
  repeatShort: language === "fi" ? "palaavaa" : "repeat",
  reportFailed: language === "fi" ? "ROI-raportti ei latautunut" : "ROI report failed",
  scannerShort: language === "fi" ? "skanneria" : "scanners",
  stampsBody:
    language === "fi"
      ? "Hyväksytyt leimat, jotka opiskelijat ovat keränneet yrityksen pisteessä."
      : "Accepted leimas students collected at the business checkpoint.",
  stampsLabel: language === "fi" ? "Hyväksytyt leimat" : "Accepted leimas",
  stampsShort: language === "fi" ? "leimaa" : "leimas",
  uniqueBody:
    language === "fi"
      ? "Eri opiskelijat, jotka ovat saaneet vähintään yhden leiman yritykseltä."
      : "Distinct students who collected at least one leima from the business.",
  uniqueLabel: language === "fi" ? "Uniikit opiskelijat" : "Unique students",
  uniqueShort: language === "fi" ? "uniikkia" : "unique",
  unknownVenue: language === "fi" ? "Tila ei tiedossa" : "Status unknown",
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

const createMetricCards = (summary: BusinessRoiSummary, copy: RoiCopy): MetricCardConfig[] => [
  {
    body: copy.eventsBody,
    iconName: "calendar",
    label: copy.eventsLabel,
    value: summary.joinedEventCount,
  },
  {
    body: copy.stampsBody,
    iconName: "scan",
    label: copy.stampsLabel,
    value: summary.validStampCount,
  },
  {
    body: copy.uniqueBody,
    iconName: "user",
    label: copy.uniqueLabel,
    value: summary.uniqueStudentCount,
  },
  {
    body: copy.repeatBody,
    iconName: "history",
    label: copy.repeatLabel,
    value: summary.repeatStudentCount,
  },
];

export default function BusinessReportsScreen() {
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
  const { isRefreshing, refreshAsync } = useManualRefresh(async () => {
    await Promise.all([overviewQuery.refetch(), roiQuery.refetch()]);
  });
  const summary = roiQuery.data?.summary ?? null;
  const events = roiQuery.data?.events ?? [];
  const metricCards = summary === null ? [] : createMetricCards(summary, roiCopy);

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

        <View style={styles.eventMetricGrid}>
          <View style={styles.eventMetricPill}>
            <Text style={styles.eventMetricValue}>{formatNumber(event.validStampCount, localeTag)}</Text>
            <Text style={styles.eventMetricLabel}>{roiCopy.stampsShort}</Text>
          </View>
          <View style={styles.eventMetricPill}>
            <Text style={styles.eventMetricValue}>{formatNumber(event.uniqueStudentCount, localeTag)}</Text>
            <Text style={styles.eventMetricLabel}>{roiCopy.uniqueShort}</Text>
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
    <AppScreen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={refreshAsync} refreshing={isRefreshing} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <AppIcon color={theme.colors.lime} name="history" size={22} />
          </View>
          <Text style={styles.eyebrow}>{roiCopy.heroEyebrow}</Text>
          <Text style={styles.title}>{roiCopy.heroTitle}</Text>
          <Text style={styles.bodyText}>{roiCopy.heroBody}</Text>
        </View>

        {overviewQuery.isLoading || roiQuery.isLoading ? (
          <InfoCard eyebrow={copy.common.loading} title={roiCopy.loading}>
            <ActivityIndicator />
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

        {metricCards.length > 0 ? (
          <View style={styles.metricGrid}>
            {metricCards.map((metric) => (
              <View key={metric.label} style={styles.metricCard}>
                <View style={styles.metricIcon}>
                  <AppIcon color={theme.colors.lime} name={metric.iconName} size={18} />
                </View>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <Text style={styles.metricValue}>{formatNumber(metric.value, localeTag)}</Text>
                <Text style={styles.metricBody}>{metric.body}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {events.length > 0 ? (
          <View style={styles.list}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{roiCopy.eventTitle}</Text>
              <Text style={styles.sectionMeta}>{formatNumber(events.length, localeTag)}</Text>
            </View>
            {events.map(renderEventCard)}
          </View>
        ) : null}

        {!roiQuery.isLoading && events.length === 0 ? (
          <InfoCard eyebrow={roiCopy.heroEyebrow} title={roiCopy.emptyTitle}>
            <View style={{ alignItems: "flex-start", flexDirection: "row", gap: 12 }}>
              <AppIcon color={theme.colors.textMuted} name="history" size={16} />
              <Text style={[styles.bodyText, { flex: 1 }]}>{roiCopy.emptyBody}</Text>
            </View>
          </InfoCard>
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: 14,
      lineHeight: 21,
    },
    content: {
      gap: 18,
      paddingBottom: 112,
      paddingHorizontal: 20,
      paddingTop: 18,
    },
    eventCard: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderStrong,
      borderRadius: 24,
      borderWidth: 1,
      gap: 16,
      padding: 18,
    },
    eventHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
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
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: 18,
      borderWidth: 1,
      flexGrow: 1,
      gap: 3,
      minWidth: "46%",
      paddingHorizontal: 12,
      paddingVertical: 10,
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
    eyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: 12,
      letterSpacing: 1.8,
      textTransform: "uppercase",
    },
    hero: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: 28,
      borderWidth: 1,
      gap: 8,
      overflow: "hidden",
      padding: 20,
    },
    heroIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.limeSurface,
      borderRadius: 999,
      height: 46,
      justifyContent: "center",
      marginBottom: 4,
      width: 46,
    },
    list: {
      gap: 12,
    },
    metricBody: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    metricCard: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderStrong,
      borderRadius: 22,
      borderWidth: 1,
      flex: 1,
      gap: 8,
      minWidth: "45%",
      padding: 16,
    },
    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    metricIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.limeSurface,
      borderRadius: 999,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    metricLabel: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.semibold,
      fontSize: 12,
      textTransform: "uppercase",
    },
    metricValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: 30,
      lineHeight: 36,
    },
    sectionHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
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
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: 34,
      letterSpacing: -1,
      lineHeight: 39,
    },
  });
