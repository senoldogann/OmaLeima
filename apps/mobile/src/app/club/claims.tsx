import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import {
  useClubClaimsQuery,
  useConfirmClubRewardClaimMutation,
  type ClubClaimCandidateRecord,
  type ClubRecentRewardClaimRecord,
} from "@/features/club/club-claims";
import { hapticImpact, hapticNotification, ImpactStyle, NotificationType } from "@/features/foundation/safe-haptics";
import type { MobileTheme } from "@/features/foundation/theme";
import { createUserSafeErrorMessage } from "@/features/foundation/user-safe-error";
import { useManualRefresh } from "@/features/foundation/use-manual-refresh";
import { successNoticeDurationMs, useTransientSuccessKey } from "@/features/foundation/use-transient-success-key";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

type ActionState = {
  message: string | null;
  tone: "error" | "idle" | "success";
};

const createCandidateKey = (candidate: ClubClaimCandidateRecord): string =>
  `${candidate.eventId}:${candidate.rewardTierId}:${candidate.studentId}`;

const formatRewardType = (rewardType: ClubClaimCandidateRecord["rewardType"], language: "fi" | "en"): string => {
  const labels: Record<ClubClaimCandidateRecord["rewardType"], string> = {
    COUPON: language === "fi" ? "Kuponki" : "Coupon",
    ENTRY: language === "fi" ? "Sisäänpääsy" : "Entry",
    HAALARIMERKKI: language === "fi" ? "Haalarimerkki" : "Patch",
    OTHER: language === "fi" ? "Muu" : "Other",
    PATCH: language === "fi" ? "Merkki" : "Patch",
    PRODUCT: language === "fi" ? "Tuote" : "Product",
  };

  return labels[rewardType];
};

const formatInventory = (candidate: ClubClaimCandidateRecord, language: "fi" | "en"): string => {
  if (candidate.inventoryTotal === null) {
    return language === "fi" ? "Rajoittamaton varasto" : "Unlimited stock";
  }

  if (candidate.inventoryRemaining === null || candidate.inventoryRemaining <= 0) {
    return language === "fi" ? "Ei varastoa jäljellä" : "No stock left";
  }

  return language === "fi"
    ? `${candidate.inventoryRemaining}/${candidate.inventoryTotal} jäljellä`
    : `${candidate.inventoryRemaining}/${candidate.inventoryTotal} left`;
};

const getStatusTone = (status: string): ActionState["tone"] =>
  status === "SUCCESS" || status === "REWARD_ALREADY_CLAIMED" ? "success" : "error";

export default function ClubClaimsScreen() {
  const { language, localeTag, theme } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const claimsQuery = useClubClaimsQuery({
    userId: userId ?? "",
    isEnabled: userId !== null,
  });
  const confirmMutation = useConfirmClubRewardClaimMutation();
  const manualRefresh = useManualRefresh(claimsQuery.refetch);
  const [notesByCandidateKey, setNotesByCandidateKey] = useState<Record<string, string>>({});
  const [processingCandidateKey, setProcessingCandidateKey] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>({
    message: null,
    tone: "idle",
  });

  useTransientSuccessKey(
    actionState.tone === "success" ? actionState.message : null,
    () => setActionState({ message: null, tone: "idle" }),
    successNoticeDurationMs
  );

  const labels = useMemo(
    () => ({
      body:
        language === "fi"
          ? "Vahvista palkinto vasta, kun olet luovuttanut sen opiskelijalle."
          : "Confirm a reward only after the handoff is complete.",
      claimable: language === "fi" ? "Lunastettavissa" : "Claimable",
      emptyBody:
        language === "fi"
          ? "Kun opiskelija on kerännyt tarpeeksi leimoja, hän näkyy tässä listassa."
          : "Students appear here after collecting enough valid leimas.",
      emptyTitle: language === "fi" ? "Ei valmiita luovutuksia" : "No handoffs ready",
      errorTitle: language === "fi" ? "Palkintojono ei latautunut" : "Reward queue unavailable",
      loadingBody:
        language === "fi"
          ? "Haetaan opiskelijat, leimat ja palkintotasot."
          : "Loading students, leimas, and reward tiers.",
      loadingTitle: language === "fi" ? "Haetaan palkintojonoa" : "Loading reward queue",
      notes: language === "fi" ? "Luovutushuomiot" : "Handoff notes",
      recent: language === "fi" ? "Viimeisimmät luovutukset" : "Recent handoffs",
      retry: language === "fi" ? "Yritä uudelleen" : "Retry",
      submit: language === "fi" ? "Vahvista luovutus" : "Confirm handoff",
      submitting: language === "fi" ? "Vahvistetaan..." : "Confirming...",
      title: language === "fi" ? "Palkintojen luovutus" : "Reward handoff",
    }),
    [language]
  );

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag, {
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
      }),
    [localeTag]
  );

  const handleConfirmPressAsync = async (candidate: ClubClaimCandidateRecord): Promise<void> => {
    if (userId === null) {
      setActionState({
        message: language === "fi" ? "Kirjaudu uudelleen ennen luovutusta." : "Sign in again before handoff.",
        tone: "error",
      });
      return;
    }

    hapticImpact(ImpactStyle.Medium);
    const candidateKey = createCandidateKey(candidate);
    if (processingCandidateKey !== null) {
      return;
    }

    setProcessingCandidateKey(candidateKey);
    setActionState({
      message: null,
      tone: "idle",
    });

    try {
      const response = await confirmMutation.mutateAsync({
        eventId: candidate.eventId,
        notes: notesByCandidateKey[candidateKey] ?? "",
        rewardTierId: candidate.rewardTierId,
        studentId: candidate.studentId,
        userId,
      });
      hapticNotification(NotificationType.Success);
      setActionState({
        message: response.message,
        tone: getStatusTone(response.status),
      });

      if (response.status === "SUCCESS" || response.status === "REWARD_ALREADY_CLAIMED") {
        setNotesByCandidateKey({});
      }
    } catch (error) {
      hapticNotification(NotificationType.Error);
      setActionState({
        message: createUserSafeErrorMessage(error, language, "clubClaims"),
        tone: "error",
      });
    } finally {
      setProcessingCandidateKey(null);
    }
  };

  const renderCandidate = (candidate: ClubClaimCandidateRecord) => {
    const candidateKey = createCandidateKey(candidate);
    const isProcessingCandidate = processingCandidateKey === candidateKey;

    return (
      <View key={candidateKey} style={styles.candidateCard}>
        <View style={styles.candidateHeader}>
          <View style={styles.candidateHeaderCopy}>
            <Text style={styles.candidateTitle}>{candidate.studentLabel}</Text>
            <Text style={styles.candidateMeta}>{candidate.eventName}</Text>
          </View>
          <StatusBadge label={labels.claimable} state="ready" />
        </View>

        <Text style={styles.rewardTitle}>{candidate.rewardTitle}</Text>
        <Text style={styles.bodyText}>
          {candidate.stampCount}/{candidate.requiredStampCount} {language === "fi" ? "leimaa" : "leimas"} ·{" "}
          {formatRewardType(candidate.rewardType, language)} · {formatInventory(candidate, language)}
        </Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{labels.notes}</Text>
          <TextInput
            multiline
            onChangeText={(value) =>
              setNotesByCandidateKey((currentNotes) => ({
                ...currentNotes,
                [candidateKey]: value,
              }))
            }
            placeholder={language === "fi" ? "Esim. luovutettu tiskillä." : "For example: handed off at desk."}
            placeholderTextColor={theme.colors.textMuted}
            style={styles.textInput}
            value={notesByCandidateKey[candidateKey] ?? ""}
          />
        </View>

        <Pressable
          disabled={processingCandidateKey !== null}
          onPress={() => void handleConfirmPressAsync(candidate)}
          style={[styles.primaryButton, processingCandidateKey !== null ? styles.disabledButton : null]}
        >
          {isProcessingCandidate ? <ActivityIndicator color={theme.colors.actionPrimaryText} size="small" /> : null}
          <Text style={styles.primaryButtonText}>
            {isProcessingCandidate ? labels.submitting : labels.submit}
          </Text>
        </Pressable>
      </View>
    );
  };

  const renderRecentClaim = (claim: ClubRecentRewardClaimRecord) => (
    <View key={claim.rewardClaimId} style={styles.recentRow}>
      <View style={styles.recentCopy}>
        <Text style={styles.recentTitle}>{claim.studentLabel}</Text>
        <Text style={styles.recentMeta}>
          {claim.rewardTitle} · {claim.eventName}
        </Text>
        {claim.notes !== null ? <Text style={styles.recentMeta}>{claim.notes}</Text> : null}
      </View>
      <Text style={styles.recentDate}>{formatter.format(new Date(claim.claimedAt))}</Text>
    </View>
  );

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
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{language === "fi" ? "Klubi" : "Club"}</Text>
        <Text style={styles.title}>{labels.title}</Text>
        <Text style={styles.metaText}>{labels.body}</Text>
      </View>

      {actionState.message !== null ? (
        <Text style={actionState.tone === "success" ? styles.successText : styles.errorText}>{actionState.message}</Text>
      ) : null}

      {claimsQuery.isLoading ? (
        <InfoCard eyebrow={language === "fi" ? "Palkinnot" : "Rewards"} title={labels.loadingTitle}>
          <Text style={styles.bodyText}>{labels.loadingBody}</Text>
        </InfoCard>
      ) : null}

      {claimsQuery.error ? (
        <InfoCard eyebrow={language === "fi" ? "Palkinnot" : "Rewards"} title={labels.errorTitle}>
          <Text style={styles.bodyText}>{createUserSafeErrorMessage(claimsQuery.error, language, "clubClaims")}</Text>
          <Pressable onPress={() => void claimsQuery.refetch()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{labels.retry}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!claimsQuery.isLoading && !claimsQuery.error && claimsQuery.data?.candidates.length === 0 ? (
        <InfoCard eyebrow={language === "fi" ? "Palkinnot" : "Rewards"} title={labels.emptyTitle}>
          <Text style={styles.bodyText}>{labels.emptyBody}</Text>
        </InfoCard>
      ) : null}

      {claimsQuery.data?.candidates.map(renderCandidate)}

      {claimsQuery.data !== undefined && claimsQuery.data.recentClaims.length > 0 ? (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>{labels.recent}</Text>
          {claimsQuery.data.recentClaims.map(renderRecentClaim)}
        </View>
      ) : null}
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
    candidateCard: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: theme.mode === "light" ? 1 : 0,
      gap: 12,
      padding: 16,
    },
    candidateHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    candidateHeaderCopy: {
      flex: 1,
      gap: 4,
    },
    candidateMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    candidateTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.subtitle,
      lineHeight: theme.typography.lineHeights.subtitle,
    },
    disabledButton: {
      opacity: 0.64,
    },
    errorText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    eyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.4,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    field: {
      gap: 7,
    },
    fieldLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    header: {
      gap: 8,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    primaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    primaryButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    recentCopy: {
      flex: 1,
      gap: 4,
    },
    recentDate: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    recentMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    recentRow: {
      alignItems: "flex-start",
      backgroundColor: theme.colors.surfaceL1,
      borderRadius: theme.radius.card,
      flexDirection: "row",
      gap: 12,
      padding: 14,
    },
    recentSection: {
      gap: 10,
    },
    recentTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    rewardTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    secondaryButton: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: 999,
      borderWidth: theme.mode === "light" ? 1 : 0,
      paddingHorizontal: 16,
      paddingVertical: 11,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    successText: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    textInput: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.bodySmall,
      minHeight: 88,
      paddingHorizontal: 12,
      paddingVertical: 10,
      textAlignVertical: "top",
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.title,
      lineHeight: theme.typography.lineHeights.title,
    },
  });
