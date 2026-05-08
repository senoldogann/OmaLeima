import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { useClubDashboardQuery } from "@/features/club/club-dashboard";
import { useClubReportQuery, type ClubReportEvent, type ClubReportSummary } from "@/features/club/club-reports";
import type { MobileTheme } from "@/features/foundation/theme";
import { useManualRefresh } from "@/features/foundation/use-manual-refresh";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";
import type { AppReadinessState } from "@/types/app";

type ReportCopy = {
  attendanceShort: string;
  emptyBody: string;
  emptyEyebrow: string;
  emptyTitle: string;
  eventStatusFallback: string;
  eventTitle: string;
  heroBody: string;
  heroEyebrow: string;
  heroTitle: string;
  loading: string;
  dashboardFailed: string;
  reportFailed: string;
  registrationsBody: string;
  registrationsLabel: string;
  registrationsShort: string;
  rewardsBody: string;
  rewardsLabel: string;
  rewardsShort: string;
  stampsBody: string;
  stampsLabel: string;
  stampsShort: string;
  uniqueBody: string;
  uniqueLabel: string;
  uniqueShort: string;
  venuesBody: string;
  venuesLabel: string;
  venuesShort: string;
};

type MetricCardConfig = {
  body: string;
  iconName: "calendar" | "gift" | "map-pin" | "scan" | "user";
  label: string;
  value: number;
};

type LocalizedStatus = {
  label: string;
  state: AppReadinessState;
};

const createReportCopy = (language: "fi" | "en"): ReportCopy => ({
  attendanceShort: language === "fi" ? "osallistui" : "attendance",
  dashboardFailed: language === "fi" ? "Järjestäjänäkymä ei latautunut" : "Organizer overview failed",
  emptyBody:
    language === "fi"
      ? "Kun julkaiset tapahtumia ja opiskelijat ilmoittautuvat tai keräävät leimoja, raportti täyttyy automaattisesti."
      : "Once you publish events and students register or collect leimas, this report fills automatically.",
  emptyEyebrow: language === "fi" ? "Tyhjä raportti" : "Empty report",
  emptyTitle: language === "fi" ? "Ei raportoitavia tapahtumia" : "No reportable events",
  eventStatusFallback: language === "fi" ? "Tuntematon tila" : "Unknown status",
  eventTitle: language === "fi" ? "Tapahtumakohtainen analyysi" : "Event-level analysis",
  heroBody:
    language === "fi"
      ? "Seuraa ilmoittautumisia, leimoja, mukana olevia paikkoja ja palkintojen lunastuksia yhdestä järjestäjän raporttinäkymästä."
      : "Track registrations, leimas, joined venues, and reward handoff from one organizer reporting surface.",
  heroEyebrow: language === "fi" ? "Raportit" : "Reports",
  heroTitle: language === "fi" ? "Miten tapahtumat suoriutuvat?" : "How events perform",
  loading: language === "fi" ? "Raporttia ladataan" : "Loading report",
  registrationsBody:
    language === "fi"
      ? "Opiskelijat, jotka ovat ilmoittautuneet järjestäjän tapahtumiin raportointijaksolla."
      : "Students registered to organizer events during the reporting window.",
  registrationsLabel: language === "fi" ? "Ilmoittautumiset" : "Registrations",
  registrationsShort: language === "fi" ? "ilmoittautui" : "registered",
  reportFailed: language === "fi" ? "Raportti ei latautunut" : "Report failed",
  rewardsBody:
    language === "fi"
      ? "Fyysisesti luovutetut palkinnot, joissa claim-handoff on vahvistettu."
      : "Physically handed rewards where claim handoff has been confirmed.",
  rewardsLabel: language === "fi" ? "Palkinnot" : "Rewards",
  rewardsShort: language === "fi" ? "palkintoa" : "rewards",
  stampsBody:
    language === "fi"
      ? "Tapahtumissa vahvistetut, voimassa olevat leimat."
      : "Valid leimas confirmed across organizer events.",
  stampsLabel: language === "fi" ? "Leimat" : "Leimas",
  stampsShort: language === "fi" ? "leimaa" : "leimas",
  uniqueBody:
    language === "fi"
      ? "Eri opiskelijat, jotka ovat saaneet vähintään yhden leiman tapahtumissa."
      : "Distinct students who collected at least one leima in your events.",
  uniqueLabel: language === "fi" ? "Leimanneet opiskelijat" : "Stamped students",
  uniqueShort: language === "fi" ? "leimasi" : "stamped",
  venuesBody:
    language === "fi"
      ? "Tapahtumiin liittyneet yritykset ja rastit."
      : "Businesses and checkpoints joined to events.",
  venuesLabel: language === "fi" ? "Paikat" : "Venues",
  venuesShort: language === "fi" ? "paikkaa" : "venues",
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
  const normalizedStatus = status.trim().toUpperCase();

  if (normalizedStatus === "ACTIVE") {
    return { label: language === "fi" ? "Käynnissä" : "Live", state: "ready" };
  }

  if (normalizedStatus === "PUBLISHED") {
    return { label: language === "fi" ? "Julkaistu" : "Published", state: "pending" };
  }

  if (normalizedStatus === "COMPLETED" || normalizedStatus === "ENDED") {
    return { label: language === "fi" ? "Päättynyt" : "Completed", state: "pending" };
  }

  if (normalizedStatus === "CANCELLED") {
    return { label: language === "fi" ? "Peruttu" : "Cancelled", state: "warning" };
  }

  if (normalizedStatus === "DRAFT") {
    return { label: language === "fi" ? "Luonnos" : "Draft", state: "pending" };
  }

  return { label: fallback, state: "pending" };
};

const createMetricCards = (summary: ClubReportSummary, copy: ReportCopy): MetricCardConfig[] => [
  {
    body: copy.registrationsBody,
    iconName: "calendar",
    label: copy.registrationsLabel,
    value: summary.registeredParticipantCount,
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
    value: summary.uniqueStampedStudentCount,
  },
  {
    body: copy.venuesBody,
    iconName: "map-pin",
    label: copy.venuesLabel,
    value: summary.joinedVenueCount,
  },
  {
    body: copy.rewardsBody,
    iconName: "gift",
    label: copy.rewardsLabel,
    value: summary.claimedRewardCount,
  },
];

export default function ClubReportsScreen() {
  const { copy, language, localeTag, theme } = useUiPreferences();
  const reportCopy = createReportCopy(language);
  const styles = useThemeStyles(createStyles);
  const { session } = useSession();
  const userId = session?.user.id ?? "";
  const dashboardQuery = useClubDashboardQuery({
    isEnabled: userId.length > 0,
    userId,
  });
  const reportQuery = useClubReportQuery({
    isEnabled: dashboardQuery.data !== undefined && userId.length > 0,
    memberships: dashboardQuery.data?.memberships ?? [],
    userId,
  });
  const { isRefreshing, refreshAsync } = useManualRefresh(async () => {
    await Promise.all([dashboardQuery.refetch(), reportQuery.refetch()]);
  });
  const summary = reportQuery.data?.summary ?? null;
  const events = reportQuery.data?.events ?? [];
  const metricCards = summary === null ? [] : createMetricCards(summary, reportCopy);

  const renderEventCard = (event: ClubReportEvent) => {
    const eventStatus = getEventStatus(event.status, language, reportCopy.eventStatusFallback);
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
          <StatusBadge label={eventStatus.label} state={eventStatus.state} />
        </View>

        <View style={styles.eventMetricGrid}>
          <View style={styles.eventMetricPill}>
            <Text style={styles.eventMetricValue}>{formatPercent(event.attendanceRate, localeTag)}</Text>
            <Text style={styles.eventMetricLabel}>{reportCopy.attendanceShort}</Text>
          </View>
          <View style={styles.eventMetricPill}>
            <Text style={styles.eventMetricValue}>{formatNumber(event.validStampCount, localeTag)}</Text>
            <Text style={styles.eventMetricLabel}>{reportCopy.stampsShort}</Text>
          </View>
          <View style={styles.eventMetricPill}>
            <Text style={styles.eventMetricValue}>{formatNumber(event.uniqueStampedStudentCount, localeTag)}</Text>
            <Text style={styles.eventMetricLabel}>{reportCopy.uniqueShort}</Text>
          </View>
          <View style={styles.eventMetricPill}>
            <Text style={styles.eventMetricValue}>{formatNumber(event.joinedVenueCount, localeTag)}</Text>
            <Text style={styles.eventMetricLabel}>{reportCopy.venuesShort}</Text>
          </View>
          <View style={styles.eventMetricPill}>
            <Text style={styles.eventMetricValue}>{formatPercent(event.rewardClaimRate, localeTag)}</Text>
            <Text style={styles.eventMetricLabel}>{reportCopy.rewardsShort}</Text>
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
          <Text style={styles.eyebrow}>{reportCopy.heroEyebrow}</Text>
          <Text style={styles.title}>{reportCopy.heroTitle}</Text>
          <Text style={styles.bodyText}>{reportCopy.heroBody}</Text>
        </View>

        {dashboardQuery.isLoading || reportQuery.isLoading ? (
          <InfoCard eyebrow={copy.common.loading} title={reportCopy.loading}>
            <ActivityIndicator />
          </InfoCard>
        ) : null}

        {dashboardQuery.error ? (
          <InfoCard eyebrow={copy.common.error} title={reportCopy.dashboardFailed}>
            <Text style={styles.bodyText}>{dashboardQuery.error.message}</Text>
          </InfoCard>
        ) : null}

        {reportQuery.error ? (
          <InfoCard eyebrow={copy.common.error} title={reportCopy.reportFailed}>
            <Text style={styles.bodyText}>{reportQuery.error.message}</Text>
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
              <Text style={styles.sectionTitle}>{reportCopy.eventTitle}</Text>
              <Text style={styles.sectionMeta}>{formatNumber(events.length, localeTag)}</Text>
            </View>
            {events.map(renderEventCard)}
          </View>
        ) : null}

        {!reportQuery.isLoading && events.length === 0 ? (
          <InfoCard eyebrow={reportCopy.emptyEyebrow} title={reportCopy.emptyTitle}>
            <View style={{ alignItems: "flex-start", flexDirection: "row", gap: 12 }}>
              <AppIcon color={theme.colors.textMuted} name="history" size={16} />
              <Text style={[styles.bodyText, { flex: 1 }]}>{reportCopy.emptyBody}</Text>
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
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: 34,
      letterSpacing: -1,
      lineHeight: 39,
    },
  });
