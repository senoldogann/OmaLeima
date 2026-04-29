import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { useBusinessScanHistoryQuery } from "@/features/business/business-history";
import { mobileTheme } from "@/features/foundation/theme";
import type { BusinessScanHistoryEntry } from "@/features/business/types";
import { useSession } from "@/providers/session-provider";

const dateTimeFormatter = new Intl.DateTimeFormat("en-FI", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const formatDateTime = (value: string): string => dateTimeFormatter.format(new Date(value));

const historyStatusMeta: Record<
  BusinessScanHistoryEntry["validationStatus"],
  {
    eyebrow: string;
    borderColor: string;
    backgroundColor: string;
    detail: string;
  }
> = {
  VALID: {
    eyebrow: "Valid",
    borderColor: mobileTheme.colors.successBorder,
    backgroundColor: mobileTheme.colors.successSurface,
    detail: "Stamp was accepted and counted toward the student progress.",
  },
  MANUAL_REVIEW: {
    eyebrow: "Review",
    borderColor: mobileTheme.colors.warningBorder,
    backgroundColor: mobileTheme.colors.warningSurface,
    detail: "This scan needs manual follow-up before it should be treated as final.",
  },
  REVOKED: {
    eyebrow: "Revoked",
    borderColor: mobileTheme.colors.dangerBorder,
    backgroundColor: mobileTheme.colors.dangerSurface,
    detail: "This stamp was later revoked and should not be counted as an active stamp.",
  },
};

export default function BusinessHistoryScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const historyQuery = useBusinessScanHistoryQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });

  const historyEntries = historyQuery.data ?? [];

  return (
    <AppScreen>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Scan history</Text>
        <Text selectable style={styles.metaText}>Your latest scan outcomes.</Text>
      </View>
      <View style={styles.actionRow}>
        <Pressable onPress={() => router.push("/business/scanner")} style={styles.primaryButton}>
          <AppIcon color={mobileTheme.colors.screenBase} name="scan" size={18} />
          <Text style={styles.primaryButtonText}>Scanner</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/business/events")} style={styles.secondaryButton}>
          <AppIcon color={mobileTheme.colors.textPrimary} name="calendar" size={17} />
          <Text style={styles.secondaryButtonText}>Events</Text>
        </Pressable>
      </View>

      {historyQuery.isLoading ? (
        <InfoCard eyebrow="Loading" title="Opening scan history">
          <Text selectable style={styles.bodyText}>Loading the latest operator-owned scan rows.</Text>
        </InfoCard>
      ) : null}

      {historyQuery.error ? (
        <InfoCard eyebrow="Error" title="Could not load scan history">
          <Text selectable style={styles.bodyText}>{historyQuery.error.message}</Text>
          <Pressable onPress={() => void historyQuery.refetch()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!historyQuery.isLoading && !historyQuery.error ? (
        <InfoCard eyebrow="Recent" title="Latest 20 scan outcomes">
          {historyEntries.length === 0 ? (
            <Text selectable style={styles.bodyText}>
              No scan has been recorded by this account yet. Once a QR is accepted or flagged from the scanner, it will appear here.
            </Text>
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
                    <Text selectable style={styles.eyebrowText}>
                      {statusMeta.eyebrow}
                    </Text>
                    <Text selectable style={styles.cardTitle}>
                      {entry.studentLabel}
                    </Text>
                    <Text selectable style={styles.metaText}>
                      {entry.eventName} · {entry.businessName}
                    </Text>
                    <Text selectable style={styles.metaText}>Scanned {formatDateTime(entry.scannedAt)}</Text>
                    <Text selectable style={styles.bodyText}>{statusMeta.detail}</Text>
                    <Text selectable style={styles.metaText}>Student reference: {entry.studentId}</Text>
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

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  bodyText: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  cardTitle: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  eyebrowText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  metaText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.lime,
    borderRadius: mobileTheme.radius.button,
    flexDirection: "row",
    gap: 8,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: mobileTheme.colors.screenBase,
    fontSize: 14,
    fontWeight: "800",
  },
  rowCard: {
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderRadius: mobileTheme.radius.button,
    flexDirection: "row",
    gap: 8,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  screenHeader: {
    gap: 6,
    marginBottom: 4,
  },
  screenTitle: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  stack: {
    gap: 12,
  },
});
