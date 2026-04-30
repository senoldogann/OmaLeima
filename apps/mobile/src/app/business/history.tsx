import { useMemo } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { useBusinessScanHistoryQuery } from "@/features/business/business-history";
import type { BusinessScanHistoryEntry } from "@/features/business/types";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

type HistoryStatusMeta = {
  eyebrow: string;
  detail: string;
  backgroundColor: string;
  borderColor: string;
};

const formatDateTime = (formatter: Intl.DateTimeFormat, value: string): string =>
  formatter.format(new Date(value));

export default function BusinessHistoryScreen() {
  const router = useRouter();
  const styles = useThemeStyles(createStyles);
  const { session } = useSession();
  const { copy, language, localeTag, theme } = useUiPreferences();
  const userId = session?.user.id ?? null;

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

  const labels = useMemo(
    () => ({
      loadingTitle: language === "fi" ? "Avataan historiaa" : "Opening scan history",
      loadingBody:
        language === "fi"
          ? "Ladataan tämän käyttäjän uusimmat skannaukset."
          : "Loading the latest operator-owned scan rows.",
      errorTitle:
        language === "fi" ? "Skannaushistoria ei avautunut" : "Could not load scan history",
      latestTitle: language === "fi" ? "Viimeisimmät skannaukset" : "Latest scans",
      emptyBody:
        language === "fi"
          ? "Tällä tunnuksella ei ole vielä skannauksia. Hyväksytyt ja tarkistukseen jääneet skannaukset näkyvät täällä."
          : "No scan has been recorded by this account yet. Once a QR is accepted or flagged from the scanner, it will appear here.",
      scannedAt: language === "fi" ? "Skannattu" : "Scanned",
      studentReference: language === "fi" ? "Opiskelijaviite" : "Student reference",
    }),
    [language]
  );

  const historyStatusMeta = useMemo<Record<BusinessScanHistoryEntry["validationStatus"], HistoryStatusMeta>>(
    () => ({
      VALID: {
        eyebrow: language === "fi" ? "Hyväksytty" : "Valid",
        borderColor: theme.colors.successBorder,
        backgroundColor: theme.colors.successSurface,
        detail:
          language === "fi"
            ? "Leima hyväksyttiin ja se lasketaan mukaan opiskelijan etenemiseen."
            : "Stamp was accepted and counted toward the student progress.",
      },
      MANUAL_REVIEW: {
        eyebrow: language === "fi" ? "Tarkistus" : "Review",
        borderColor: theme.colors.warningBorder,
        backgroundColor: theme.colors.warningSurface,
        detail:
          language === "fi"
            ? "Tämä skannaus vaatii manuaalisen tarkistuksen ennen lopullista vahvistusta."
            : "This scan needs manual follow-up before it should be treated as final.",
      },
      REVOKED: {
        eyebrow: language === "fi" ? "Peruttu" : "Revoked",
        borderColor: theme.colors.dangerBorder,
        backgroundColor: theme.colors.dangerSurface,
        detail:
          language === "fi"
            ? "Tämä leima on myöhemmin peruttu eikä sitä lasketa aktiiviseksi leimaksi."
            : "This stamp was later revoked and should not be counted as an active stamp.",
      },
    }),
    [language, theme.colors.dangerBorder, theme.colors.dangerSurface, theme.colors.successBorder, theme.colors.successSurface, theme.colors.warningBorder, theme.colors.warningSurface]
  );

  const historyQuery = useBusinessScanHistoryQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });

  const historyEntries = historyQuery.data ?? [];

  return (
    <AppScreen>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>{copy.business.history}</Text>
        <Text style={styles.metaText}>{copy.business.historyMeta}</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => router.push("/business/scanner")} style={styles.primaryButton}>
          <AppIcon color={theme.colors.actionPrimaryText} name="scan" size={18} />
          <Text style={styles.primaryButtonText}>{copy.business.scanner}</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/business/events")} style={styles.secondaryButton}>
          <AppIcon color={theme.colors.textPrimary} name="calendar" size={17} />
          <Text style={styles.secondaryButtonText}>{copy.common.events}</Text>
        </Pressable>
      </View>

      {historyQuery.isLoading ? (
        <InfoCard eyebrow={copy.common.loading} title={labels.loadingTitle}>
          <Text style={styles.bodyText}>{labels.loadingBody}</Text>
        </InfoCard>
      ) : null}

      {historyQuery.error ? (
        <InfoCard eyebrow={copy.common.error} title={labels.errorTitle}>
          <Text style={styles.bodyText}>{historyQuery.error.message}</Text>
          <Pressable onPress={() => void historyQuery.refetch()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{copy.common.retry}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!historyQuery.isLoading && !historyQuery.error ? (
        <InfoCard eyebrow={copy.business.history} title={labels.latestTitle}>
          {historyEntries.length === 0 ? (
            <Text style={styles.bodyText}>{labels.emptyBody}</Text>
          ) : (
            <View style={styles.stack}>
              {historyEntries.map((entry) => {
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
                    <Text style={styles.eyebrowText}>{statusMeta.eyebrow}</Text>
                    <Text style={styles.cardTitle}>{entry.studentLabel}</Text>
                    <Text style={styles.metaText}>
                      {entry.eventName} · {entry.businessName}
                    </Text>
                    <Text style={styles.metaText}>
                      {labels.scannedAt} {formatDateTime(formatter, entry.scannedAt)}
                    </Text>
                    <Text style={styles.bodyText}>{statusMeta.detail}</Text>
                    <Text style={styles.metaText}>
                      {labels.studentReference}: {entry.studentId}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </InfoCard>
      ) : null}
    </AppScreen>
  );
}

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    actionRow: {
      flexDirection: "row",
      gap: 10,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    eyebrowText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.1,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
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
      flex: 1,
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
    rowCard: {
      borderRadius: theme.radius.card,
      borderWidth: 1,
      gap: 5,
      padding: 14,
    },
    screenHeader: {
      gap: 6,
      marginBottom: 4,
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
      flex: 1,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    stack: {
      gap: 12,
    },
  });
