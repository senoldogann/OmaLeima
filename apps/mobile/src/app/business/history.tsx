import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { useSessionAccessQuery } from "@/features/auth/session-access";
import { RECENT_SCAN_LIMIT, useBusinessScanHistoryQuery } from "@/features/business/business-history";
import type { BusinessScanHistoryEntry } from "@/features/business/types";
import type { MobileTheme } from "@/features/foundation/theme";
import { useManualRefresh } from "@/features/foundation/use-manual-refresh";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

type HistoryDateFilter = "ALL" | "TODAY" | "WEEK" | "MONTH";

type HistoryStatusMeta = {
  eyebrow: string;
  detail: string;
  backgroundColor: string;
  borderColor: string;
  chipBackgroundColor: string;
  chipBorderColor: string;
  chipTextColor: string;
};

type HistoryMetricCard = {
  key: string;
  label: string;
  tone: "accent" | "warning" | "muted";
  value: string;
};

type GroupedHistorySection = {
  dayKey: string;
  dayLabel: string;
  entries: BusinessScanHistoryEntry[];
};

const historyDateFilters = ["ALL", "TODAY", "WEEK", "MONTH"] as const satisfies readonly HistoryDateFilter[];
const allEventsFilterValue = "__ALL_EVENTS__";
const emptyHistoryEntries: BusinessScanHistoryEntry[] = [];

const formatDateTime = (formatter: Intl.DateTimeFormat, value: string): string =>
  formatter.format(new Date(value));

const createDayKey = (value: string): string => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const isInsideDateFilter = (
  scannedAt: string,
  dateFilter: HistoryDateFilter,
  now: Date
): boolean => {
  if (dateFilter === "ALL") {
    return true;
  }

  const scannedDate = new Date(scannedAt);

  if (dateFilter === "TODAY") {
    return createDayKey(scannedAt) === createDayKey(now.toISOString());
  }

  const dayWindow = dateFilter === "WEEK" ? 7 : 30;
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  windowStart.setDate(windowStart.getDate() - (dayWindow - 1));

  return scannedDate >= windowStart;
};

export default function BusinessHistoryScreen() {
  const router = useRouter();
  const styles = useThemeStyles(createStyles);
  const { session } = useSession();
  const { copy, language, localeTag, theme } = useUiPreferences();
  const [dateFilter, setDateFilter] = useState<HistoryDateFilter>("ALL");
  const [filterClock, setFilterClock] = useState<number>(() => Date.now());
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState<boolean>(false);
  const [selectedEventId, setSelectedEventId] = useState<string>(allEventsFilterValue);
  const userId = session?.user.id ?? null;
  const accessQuery = useSessionAccessQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [localeTag]
  );

  const sectionDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [localeTag]
  );

  const numberFormatter = useMemo(() => new Intl.NumberFormat(localeTag), [localeTag]);
  const now = useMemo(() => new Date(filterClock), [filterClock]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setFilterClock(Date.now());
    }, 60_000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const labels = useMemo(
    () => ({
      allEvents: language === "fi" ? "Kaikki tapahtumat" : "All events",
      currentView: language === "fi" ? "Näkymä nyt" : "Current view",
      currentViewBody:
        language === "fi"
          ? "Suodata viimeisimpiä skannauksia päivän, ajan ja tapahtuman mukaan. Luvut päivittyvät aktiivisen näkymän mukaan."
          : "Filter recent scans by time and event. The summary updates with the active view.",
      dateFilters: {
        ALL: language === "fi" ? "Viimeisimmät" : "Recent",
        TODAY: language === "fi" ? "Tänään" : "Today",
        WEEK: language === "fi" ? "7 päivää" : "7 days",
        MONTH: language === "fi" ? "30 päivää" : "30 days",
      } satisfies Record<HistoryDateFilter, string>,
      loadingTitle: language === "fi" ? "Avataan historiaa" : "Opening scan history",
      loadingBody:
        language === "fi"
          ? "Ladataan yrityksesi uusimmat tapahtumaskannaukset."
          : "Loading the latest event scan rows for your business.",
      errorTitle:
        language === "fi" ? "Skannaushistoria ei avautunut" : "Could not load scan history",
      errorBody:
        language === "fi"
          ? "Historiaa ei saatu haettua juuri nyt. Yritä uudelleen hetken kuluttua."
          : "Could not load scan history right now. Try again in a moment.",
      emptyFiltered:
        language === "fi"
          ? "Aktiivisilla suodattimilla ei löytynyt skannauksia. Vaihda aikaa tai tapahtumaa nähdäksesi lisää rivejä."
          : "No scans matched the active filters. Change the date or event filter to see more rows.",
      filters: language === "fi" ? "Suodattimet" : "Filters",
      filterByDate: language === "fi" ? "Aikaväli" : "Date range",
      filterByEvent: language === "fi" ? "Tapahtuma" : "Event",
      closeFilters: language === "fi" ? "Valmis" : "Done",
      latestTitle: language === "fi" ? "Skannauspäivät" : "Scan days",
      metrics: {
        rows: language === "fi" ? "näkyvää riviä" : "visible rows",
        review: language === "fi" ? "tarkistettavaa" : "needs review",
        students: language === "fi" ? "opiskelijaa" : "students",
        valid: language === "fi" ? "annettua leimaa" : "valid stamps",
      },
      emptyBody:
        language === "fi"
          ? "Yrityksellesi ei ole vielä skannauksia. Hyväksytyt ja tarkistukseen jääneet tapahtumaskannaukset näkyvät täällä."
          : "No scan has been recorded for your business yet. Accepted and review-needed event scans will appear here.",
      openScanner: language === "fi" ? "Avaa skanneri" : "Open scanner",
      openEvents: language === "fi" ? "Tapahtumat" : "Events",
      recentWindowNotice:
        language === "fi"
          ? `Historia perustuu yrityksesi viimeisimpään ${RECENT_SCAN_LIMIT} skannaukseen.`
          : `History is based on the latest ${RECENT_SCAN_LIMIT} scans for your business.`,
      allShown: language === "fi" ? "Kaikki skannaukset näytetään" : "All scans are shown",
      scannedAt: language === "fi" ? "Skannattu" : "Scanned",
      scanRows: language === "fi" ? "skannausta" : "scans",
      unknownBusiness: language === "fi" ? "Tuntematon toimija" : "Unknown business",
      unknownEvent: language === "fi" ? "Tuntematon tapahtuma" : "Unknown event",
      studentIdShort: language === "fi" ? "Viite" : "Reference",
      studentReference: language === "fi" ? "Opiskelijaviite" : "Student reference",
      screenTitle: language === "fi" ? "Historia" : "History",
    }),
    [language]
  );

  const historyStatusMeta = useMemo<Record<BusinessScanHistoryEntry["validationStatus"], HistoryStatusMeta>>(
    () => ({
      VALID: {
        eyebrow: language === "fi" ? "Hyväksytty" : "Valid",
        borderColor: theme.colors.successBorder,
        backgroundColor: theme.colors.successSurface,
        chipBackgroundColor: theme.colors.limeSurface,
        chipBorderColor: theme.colors.limeBorder,
        chipTextColor: theme.colors.lime,
        detail:
          language === "fi"
            ? "Leima hyväksyttiin ja se lasketaan mukaan opiskelijan etenemiseen."
            : "Stamp was accepted and counted toward the student progress.",
      },
      MANUAL_REVIEW: {
        eyebrow: language === "fi" ? "Tarkistus" : "Review",
        borderColor: theme.colors.warningBorder,
        backgroundColor: theme.colors.warningSurface,
        chipBackgroundColor: theme.colors.warningSurface,
        chipBorderColor: theme.colors.warningBorder,
        chipTextColor: theme.colors.textPrimary,
        detail:
          language === "fi"
            ? "Tämä skannaus vaatii manuaalisen tarkistuksen ennen lopullista vahvistusta."
            : "This scan needs manual follow-up before it should be treated as final.",
      },
      REVOKED: {
        eyebrow: language === "fi" ? "Peruttu" : "Revoked",
        borderColor: theme.colors.dangerBorder,
        backgroundColor: theme.colors.dangerSurface,
        chipBackgroundColor: theme.colors.surfaceL2,
        chipBorderColor: theme.colors.borderDefault,
        chipTextColor: theme.colors.textMuted,
        detail:
          language === "fi"
            ? "Tämä leima on myöhemmin peruttu eikä sitä lasketa aktiiviseksi leimaksi."
            : "This stamp was later revoked and should not be counted as an active stamp.",
      },
    }),
    [
      language,
      theme.colors.borderDefault,
      theme.colors.dangerBorder,
      theme.colors.dangerSurface,
      theme.colors.lime,
      theme.colors.limeBorder,
      theme.colors.limeSurface,
      theme.colors.successBorder,
      theme.colors.successSurface,
      theme.colors.surfaceL2,
      theme.colors.textMuted,
      theme.colors.textPrimary,
      theme.colors.warningBorder,
      theme.colors.warningSurface,
    ]
  );

  const historyQuery = useBusinessScanHistoryQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });
  const manualRefresh = useManualRefresh(historyQuery.refetch);

  const historyEntries = historyQuery.data ?? emptyHistoryEntries;
  const isScannerOnlyBusinessUser = accessQuery.data?.isBusinessScannerOnly === true;
  const showBusinessName = useMemo(
    () => new Set(historyEntries.map((entry) => entry.businessId)).size > 1,
    [historyEntries]
  );

  const eventOptions = useMemo(
    () =>
      Array.from(
        historyEntries.reduce<Map<string, { eventId: string; eventName: string }>>((eventMap, entry) => {
          if (!eventMap.has(entry.eventId)) {
            eventMap.set(entry.eventId, {
              eventId: entry.eventId,
              eventName: entry.eventName.length > 0 ? entry.eventName : labels.unknownEvent,
            });
          }

          return eventMap;
        }, new Map()).values()
      ),
    [historyEntries, labels.unknownEvent]
  );

  useEffect(() => {
    if (selectedEventId === allEventsFilterValue) {
      return;
    }

    if (!eventOptions.some((eventOption) => eventOption.eventId === selectedEventId)) {
      setSelectedEventId(allEventsFilterValue);
    }
  }, [eventOptions, selectedEventId]);

  const isRecentWindowCapped = historyEntries.length >= RECENT_SCAN_LIMIT;
  const selectedEventLabel = selectedEventId === allEventsFilterValue
    ? labels.allEvents
    : eventOptions.find((eventOption) => eventOption.eventId === selectedEventId)?.eventName ?? labels.allEvents;
  const activeFilterLabel = `${labels.dateFilters[dateFilter]} · ${selectedEventLabel}`;

  const filteredEntries = useMemo(
    () =>
      historyEntries.filter((entry) => {
        if (!isInsideDateFilter(entry.scannedAt, dateFilter, now)) {
          return false;
        }

        if (selectedEventId !== allEventsFilterValue && entry.eventId !== selectedEventId) {
          return false;
        }

        return true;
      }),
    [dateFilter, historyEntries, now, selectedEventId]
  );

  const metricCards = useMemo<HistoryMetricCard[]>(() => {
    const validCount = filteredEntries.filter((entry) => entry.validationStatus === "VALID").length;
    const reviewCount = filteredEntries.filter((entry) => entry.validationStatus === "MANUAL_REVIEW").length;
    const uniqueStudents = new Set(filteredEntries.map((entry) => entry.studentId)).size;

    return [
      {
        key: "valid",
        label: labels.metrics.valid,
        tone: "accent",
        value: numberFormatter.format(validCount),
      },
      {
        key: "students",
        label: labels.metrics.students,
        tone: "muted",
        value: numberFormatter.format(uniqueStudents),
      },
      {
        key: "review",
        label: labels.metrics.review,
        tone: "warning",
        value: numberFormatter.format(reviewCount),
      },
      {
        key: "rows",
        label: labels.metrics.rows,
        tone: "muted",
        value: numberFormatter.format(filteredEntries.length),
      },
    ];
  }, [filteredEntries, labels.metrics.review, labels.metrics.rows, labels.metrics.students, labels.metrics.valid, numberFormatter]);

  const groupedSections = useMemo<GroupedHistorySection[]>(() => {
    const groupedMap = filteredEntries.reduce<Map<string, BusinessScanHistoryEntry[]>>((sectionsMap, entry) => {
      const dayKey = createDayKey(entry.scannedAt);
      const currentEntries = sectionsMap.get(dayKey);

      if (currentEntries) {
        currentEntries.push(entry);
        return sectionsMap;
      }

      sectionsMap.set(dayKey, [entry]);
      return sectionsMap;
    }, new Map());

    return Array.from(groupedMap.entries()).map(([dayKey, entries]) => ({
      dayKey,
      dayLabel: sectionDateFormatter.format(new Date(entries[0].scannedAt)),
      entries,
    }));
  }, [filteredEntries, sectionDateFormatter]);

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
      {/* Page header */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.topBarEyebrow}>{language === "fi" ? "Yritys" : "Business"}</Text>
          <Text style={styles.screenTitle}>{labels.screenTitle}</Text>
        </View>
        <View style={styles.topBarActions}>
          <Pressable onPress={() => router.push("/business/scanner")} style={styles.topBarIconBtn}>
            <AppIcon color={theme.colors.textPrimary} name="scan" size={18} />
          </Pressable>
          {isScannerOnlyBusinessUser ? null : (
            <Pressable onPress={() => router.push("/business/events")} style={styles.topBarIconBtn}>
              <AppIcon color={theme.colors.textPrimary} name="calendar" size={18} />
            </Pressable>
          )}
        </View>
      </View>

      <Text style={styles.metaText}>{copy.business.historyMeta}</Text>

      {historyQuery.isLoading ? (
        <InfoCard eyebrow={copy.common.loading} title={labels.loadingTitle}>
          <Text style={styles.bodyText}>{labels.loadingBody}</Text>
        </InfoCard>
      ) : null}

      {historyQuery.error ? (
        <InfoCard eyebrow={copy.common.error} title={labels.errorTitle}>
          <Text style={styles.bodyText}>{labels.errorBody}</Text>
          <Pressable onPress={() => void historyQuery.refetch()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{copy.common.retry}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!historyQuery.isLoading && !historyQuery.error ? (
        <>
          {/* Metric summary strip */}
          <View style={styles.metricStrip}>
            {metricCards.map((metricCard) => {
              const accentColor = metricCard.tone === "accent"
                ? theme.colors.lime
                : metricCard.tone === "warning"
                  ? theme.colors.warning
                  : theme.colors.textMuted;
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
                </View>
              );
            })}
          </View>

          {isRecentWindowCapped ? (
            <Text style={styles.windowNotice}>{labels.recentWindowNotice}</Text>
          ) : null}

          <Pressable onPress={() => setIsFilterSheetVisible(true)} style={styles.filterSummaryButton}>
            <View style={styles.filterSummaryCopy}>
              <Text style={styles.filterSummaryLabel}>{labels.filters}</Text>
              <Text numberOfLines={1} style={styles.filterSummaryValue}>{activeFilterLabel}</Text>
            </View>
            <AppIcon color={theme.colors.textPrimary} name="filter" size={18} />
          </Pressable>

          {historyEntries.length === 0 ? (
            <InfoCard eyebrow={copy.business.history} title={labels.latestTitle}>
              <View style={{ alignItems: "flex-start", flexDirection: "row", gap: 12 }}>
                <AppIcon color={theme.colors.textMuted} name="history" size={16} />
                <Text style={[styles.bodyText, { flex: 1 }]}>{labels.emptyBody}</Text>
              </View>
            </InfoCard>
          ) : filteredEntries.length === 0 ? (
            <InfoCard eyebrow={copy.business.history} title={labels.latestTitle}>
              <View style={{ alignItems: "flex-start", flexDirection: "row", gap: 12 }}>
                <AppIcon color={theme.colors.textMuted} name="search" size={16} />
                <Text style={[styles.bodyText, { flex: 1 }]}>{labels.emptyFiltered}</Text>
              </View>
            </InfoCard>
          ) : (
            <View style={styles.stack}>
              {groupedSections.map((section) => (
                <View key={section.dayKey} style={styles.section}>
                  {/* Day section header */}
                  <View style={styles.daySectionHeader}>
                    <Text style={styles.daySectionTitle}>{section.dayLabel}</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        {numberFormatter.format(section.entries.length)} {labels.scanRows}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.sectionList}>
                    {section.entries.map((entry) => {
                      const statusMeta = historyStatusMeta[entry.validationStatus];

                      return (
                        <View
                          key={entry.stampId}
                          style={[
                            styles.rowCard,
                            {
                              backgroundColor: statusMeta.backgroundColor,
                              borderColor: statusMeta.borderColor,
                            },
                          ]}
                        >
                          <View style={[styles.rowAccent, { backgroundColor: statusMeta.chipBorderColor }]} />
                          <View style={styles.rowBody}>
                            <View style={styles.rowTop}>
                              <View
                                style={[
                                  styles.statusChip,
                                  {
                                    backgroundColor: statusMeta.chipBackgroundColor,
                                    borderColor: statusMeta.chipBorderColor,
                                  },
                                ]}
                              >
                                <Text style={[styles.statusChipText, { color: statusMeta.chipTextColor }]}>
                                  {statusMeta.eyebrow}
                                </Text>
                              </View>
                              <Text style={styles.rowTime}>
                                {formatDateTime(formatter, entry.scannedAt)}
                              </Text>
                            </View>

                            <Text style={styles.cardTitle}>{entry.studentLabel}</Text>
                            <Text style={styles.eventTitle}>
                              {entry.eventName.length > 0 ? entry.eventName : labels.unknownEvent}
                            </Text>

                            <View style={styles.metaWrap}>
                              {showBusinessName ? (
                                <Text style={styles.metaPill}>
                                  {entry.businessName.length > 0 ? entry.businessName : labels.unknownBusiness}
                                </Text>
                              ) : null}
                              <Text style={styles.metaPill}>
                                {labels.studentIdShort} {entry.studentId.slice(-6)}
                              </Text>
                            </View>

                            {entry.validationStatus !== "VALID" ? (
                              <Text style={styles.statusDetail}>{statusMeta.detail}</Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
              {!isRecentWindowCapped ? (
                <Text style={styles.listEndNotice}>— {labels.allShown} —</Text>
              ) : null}
            </View>
          )}
        </>
      ) : null}

      <Modal
        animationType="fade"
        onRequestClose={() => setIsFilterSheetVisible(false)}
        transparent
        visible={isFilterSheetVisible}
      >
        <Pressable onPress={() => setIsFilterSheetVisible(false)} style={styles.filterModalBackdrop}>
          <Pressable onPress={() => undefined} style={styles.filterSheet}>
            <View style={styles.filterSheetHeader}>
              <View style={styles.filterSummaryCopy}>
                <Text style={styles.topBarEyebrow}>{labels.filters}</Text>
                <Text style={styles.filterSheetTitle}>{activeFilterLabel}</Text>
              </View>
              <Pressable onPress={() => setIsFilterSheetVisible(false)} style={styles.filterDoneButton}>
                <Text style={styles.filterDoneText}>{labels.closeFilters}</Text>
              </Pressable>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>{labels.filterByDate}</Text>
              <View style={styles.filterWrap}>
                {historyDateFilters.map((filter) => (
                  <Pressable
                    key={filter}
                    onPress={() => setDateFilter(filter)}
                    style={[styles.filterChip, dateFilter === filter ? styles.filterChipActive : null]}
                  >
                    <Text style={[styles.filterChipText, dateFilter === filter ? styles.filterChipTextActive : null]}>
                      {labels.dateFilters[filter]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>{labels.filterByEvent}</Text>
              <ScrollView contentContainerStyle={styles.filterEventList} showsVerticalScrollIndicator={false}>
                <Pressable
                  onPress={() => setSelectedEventId(allEventsFilterValue)}
                  style={[styles.filterEventRow, selectedEventId === allEventsFilterValue ? styles.filterEventRowActive : null]}
                >
                  <Text style={[styles.filterEventText, selectedEventId === allEventsFilterValue ? styles.filterChipTextActive : null]}>
                    {labels.allEvents}
                  </Text>
                  {selectedEventId === allEventsFilterValue ? <AppIcon color={theme.colors.actionPrimaryText} name="check" size={16} /> : null}
                </Pressable>
                {eventOptions.map((eventOption) => (
                  <Pressable
                    key={eventOption.eventId}
                    onPress={() => setSelectedEventId(eventOption.eventId)}
                    style={[styles.filterEventRow, selectedEventId === eventOption.eventId ? styles.filterEventRowActive : null]}
                  >
                    <Text numberOfLines={2} style={[styles.filterEventText, selectedEventId === eventOption.eventId ? styles.filterChipTextActive : null]}>
                      {eventOption.eventName}
                    </Text>
                    {selectedEventId === eventOption.eventId ? <AppIcon color={theme.colors.actionPrimaryText} name="check" size={16} /> : null}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    countBadge: {
      backgroundColor: theme.colors.surfaceL2,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    countBadgeText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    daySectionHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    daySectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      letterSpacing: -0.3,
      lineHeight: 24,
    },
    eventTitle: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    filterChip: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      justifyContent: "center",
      minHeight: 38,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    filterChipActive: {
      backgroundColor: theme.colors.lime,
      borderColor: theme.colors.limeBorder,
    },
    filterChipText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    filterChipTextActive: {
      color: theme.colors.actionPrimaryText,
    },
    filterDoneButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      justifyContent: "center",
      minHeight: 40,
      paddingHorizontal: 14,
    },
    filterDoneText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    filterEventList: {
      gap: 8,
      paddingBottom: 4,
    },
    filterEventRow: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between",
      minHeight: 46,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    filterEventRowActive: {
      backgroundColor: theme.colors.lime,
      borderColor: theme.colors.limeBorder,
    },
    filterEventText: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    filterGroup: {
      gap: 10,
    },
    filterGroupTitle: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    filterModalBackdrop: {
      backgroundColor: theme.mode === "dark" ? "rgba(0,0,0,0.68)" : "rgba(12,16,12,0.24)",
      flex: 1,
      justifyContent: "flex-end",
      padding: 18,
    },
    filterSheet: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      gap: 18,
      maxHeight: "82%",
      padding: 16,
    },
    filterSheetHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    filterSheetTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    filterSummaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    filterSummaryCopy: {
      flex: 1,
      gap: 3,
      minWidth: 0,
    },
    filterSummaryLabel: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    filterSummaryValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    filterWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    listEndNotice: {
      color: theme.colors.textDim,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      paddingVertical: 12,
      textAlign: "center",
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    metaPill: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      overflow: "hidden",
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    metaWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    metricCard: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.inner,
      borderWidth: 1,
      flex: 1,
      gap: 3,
      paddingHorizontal: 14,
      paddingVertical: 14,
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
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    metricStrip: {
      flexDirection: "row",
      gap: 8,
    },
    metricValue: {
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.subtitle,
      fontVariant: ["tabular-nums"],
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    primaryButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    rowAccent: {
      borderRadius: 3,
      width: 4,
    },
    rowBody: {
      flex: 1,
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    rowCard: {
      borderRadius: theme.radius.card,
      borderWidth: 1,
      flexDirection: "row",
      overflow: "hidden",
    },
    rowTime: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    rowTop: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      justifyContent: "space-between",
    },
    screenTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.titleLarge,
      letterSpacing: -0.8,
      lineHeight: theme.typography.lineHeights.titleLarge,
    },
    section: {
      gap: 10,
    },
    sectionList: {
      gap: 8,
    },
    stack: {
      gap: 18,
    },
    statusChip: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    statusChipText: {
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 0.8,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    statusDetail: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    topBar: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    topBarActions: {
      flexDirection: "row",
      gap: 8,
    },
    topBarEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    topBarIconBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    topBarLeft: {
      gap: 4,
    },
    windowNotice: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
  });
