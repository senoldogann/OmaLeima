import { Pressable, StyleSheet, Text, View } from "react-native";

import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { getEventCoverSource } from "@/features/events/event-visuals";
import { interactiveSurfaceShadowStyle, type MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import type { AppReadinessState } from "@/types/app";

import type {
  StudentRewardEventProgress,
  StudentRewardTierProgress,
  StudentRewardTierState,
  StudentRewardTimelineState,
} from "@/features/rewards/types";

type RewardProgressCardProps = {
  event: StudentRewardEventProgress;
  onOpenEvent?: (eventId: string) => void;
};

const createDateTimeFormatter = (localeTag: string): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(localeTag, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const getTimelineBadgeState = (state: StudentRewardTimelineState): AppReadinessState => {
  switch (state) {
    case "ACTIVE":
      return "ready";
    case "UPCOMING":
      return "pending";
    case "COMPLETED":
      return "warning";
  }
};

const getTierBadgeState = (state: StudentRewardTierState): AppReadinessState => {
  switch (state) {
    case "CLAIMED":
    case "CLAIMABLE":
      return "ready";
    case "MORE_NEEDED":
      return "pending";
    case "OUT_OF_STOCK":
    case "REVOKED":
      return "warning";
  }
};

const getTierBadgeLabel = (state: StudentRewardTierState, language: "fi" | "en"): string => {
  switch (state) {
    case "CLAIMED":
      return language === "fi" ? "lunastettu" : "claimed";
    case "CLAIMABLE":
      return language === "fi" ? "valmis" : "claimable";
    case "MORE_NEEDED":
      return language === "fi" ? "puuttuu" : "more needed";
    case "OUT_OF_STOCK":
      return language === "fi" ? "loppu" : "out of stock";
    case "REVOKED":
      return language === "fi" ? "peruttu" : "revoked";
  }
};

const getTierCopy = (
  tier: StudentRewardTierProgress,
  language: "fi" | "en",
  formatter: Intl.DateTimeFormat
): string => {
  switch (tier.state) {
    case "CLAIMED":
      return tier.claimedAt === null
        ? language === "fi"
          ? "Jo lunastettu."
          : "Already claimed."
        : language === "fi"
          ? `Lunastettu ${formatter.format(new Date(tier.claimedAt))}.`
          : `Claimed ${formatter.format(new Date(tier.claimedAt))}.`;
    case "CLAIMABLE":
      return language === "fi" ? "Valmis noudettavaksi henkilökunnalta." : "Ready for staff handoff.";
    case "MORE_NEEDED":
      return language === "fi"
        ? `${tier.missingStampCount} leimaa vielä.`
        : `${tier.missingStampCount} more leimat needed.`;
    case "OUT_OF_STOCK":
      return language === "fi" ? "Tällä hetkellä loppu." : "Currently out of stock.";
    case "REVOKED":
      return language === "fi" ? "Peruttu. Tarkista henkilökunnalta." : "Revoked. Check with staff.";
  }
};

const getInventoryCopy = (tier: StudentRewardTierProgress, language: "fi" | "en"): string => {
  if (tier.inventoryTotal === null) {
    return language === "fi" ? "Rajoittamaton määrä" : "Unlimited stock";
  }

  if (tier.remainingInventory === null || tier.remainingInventory <= 0) {
    return language === "fi" ? "Ei varastoa jäljellä" : "No stock left";
  }

  if (tier.remainingInventory === 1) {
    return language === "fi" ? "1 palkinto jäljellä" : "1 reward left";
  }

  return language === "fi"
    ? `${tier.remainingInventory} palkintoa jäljellä`
    : `${tier.remainingInventory} rewards left`;
};

const getEventHeroCopy = (event: StudentRewardEventProgress, language: "fi" | "en"): string => {
  if (event.claimableTierCount > 0) {
    return language === "fi"
      ? `${event.claimableTierCount} palkintoa valmiina.`
      : `${event.claimableTierCount} reward${event.claimableTierCount === 1 ? "" : "s"} ready for claim.`;
  }

  const nearestLockedTier = event.tiers.find((tier) => tier.state === "MORE_NEEDED") ?? null;

  if (nearestLockedTier !== null) {
    return language === "fi"
      ? `${nearestLockedTier.missingStampCount} leimaa seuraavaan avaukseen.`
      : `${nearestLockedTier.missingStampCount} leima left to the next unlock.`;
  }

  if (event.claimedTierCount > 0) {
    return language === "fi"
      ? `${event.claimedTierCount} palkintoa jo lunastettu.`
      : `${event.claimedTierCount} reward${event.claimedTierCount === 1 ? "" : "s"} already claimed.`;
  }

  return language === "fi"
    ? "Kerää leimoja, niin palkinnot avautuvat."
    : "Collect leimas to open the reward path.";
};

const getEventSummaryCopy = (event: StudentRewardEventProgress, language: "fi" | "en"): string => {
  if (event.tiers.length === 0) {
    return language === "fi" ? "Palkintotasoja ei ole vielä julkaistu." : "No reward tiers published yet.";
  }

  if (event.claimableTierCount > 0) {
    return language === "fi"
      ? `${event.claimableTierCount} tasoa valmiina noudettavaksi.`
      : `${event.claimableTierCount} tier${event.claimableTierCount === 1 ? "" : "s"} ready for handoff.`;
  }

  if (event.claimedTierCount > 0) {
    return language === "fi"
      ? `${event.claimedTierCount} tasoa jo lunastettu.`
      : `${event.claimedTierCount} tier${event.claimedTierCount === 1 ? "" : "s"} claimed.`;
  }

  return language === "fi"
    ? "Pidä kierros liikkeessä ja seuraa montako leimaa vielä puuttuu."
    : "Keep collecting leimas to unlock rewards.";
};

export const RewardProgressCard = ({ event, onOpenEvent }: RewardProgressCardProps) => {
  const { language, localeTag } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const formatter = createDateTimeFormatter(localeTag);
  const hasClaimable = event.claimableTierCount > 0;
  const coverSource = getEventCoverSource(event.coverImageUrl, `${event.id}:${event.name}`);

  return (
    <InfoCard eyebrow={event.city} title={event.name} variant={hasClaimable ? "scene" : "card"}>
      <CoverImageSurface imageStyle={styles.heroImage} source={coverSource} style={styles.heroBand}>
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <View style={styles.badges}>
            <StatusBadge
              label={event.timelineState === "ACTIVE" ? (language === "fi" ? "käynnissä" : "active") : event.timelineState === "UPCOMING" ? (language === "fi" ? "tulossa" : "upcoming") : language === "fi" ? "päättynyt" : "completed"}
              state={getTimelineBadgeState(event.timelineState)}
            />
            {hasClaimable ? (
              <View style={styles.heroReadyPill}>
                <Text style={styles.heroReadyPillText}>{language === "fi" ? "VALMIS" : "READY"}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.heroDate}>
            {formatter.format(new Date(event.startAt))} - {formatter.format(new Date(event.endAt))}
          </Text>
        </View>
      </CoverImageSurface>

      <View style={styles.stampHero}>
        <Text style={styles.stampNumber}>{event.stampCount}</Text>
        <View style={styles.stampMeta}>
          <Text style={styles.stampUnit}>{language === "fi" ? "leimaa" : "leimat"}</Text>
          {hasClaimable ? (
            <View style={styles.claimableBadge}>
              <Text style={styles.claimableBadgeText}>{language === "fi" ? "VALMIS" : "READY"}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${event.goalProgressRatio * 100}%` }]} />
      </View>

      <Text style={styles.heroCopy}>{getEventHeroCopy(event, language)}</Text>
      <Text style={styles.summaryText}>{getEventSummaryCopy(event, language)}</Text>

      {event.tiers.length > 0 ? (
        <View style={styles.tierSection}>
          <Text style={styles.sectionLabel}>{language === "fi" ? "PALKINTOTASOT" : "REWARD TIERS"}</Text>
          {event.tiers.map((tier) => (
            <View
              key={tier.id}
              style={[
                styles.tierRow,
                tier.state === "CLAIMABLE" ? styles.tierRowClaimable : null,
                tier.state === "CLAIMED" ? styles.tierRowClaimed : null,
              ]}
            >
              <View style={styles.tierHeader}>
                <Text style={styles.tierTitle}>{tier.title}</Text>
                <StatusBadge label={getTierBadgeLabel(tier.state, language)} state={getTierBadgeState(tier.state)} />
              </View>
              <Text style={styles.tierMeta}>
                {tier.requiredStampCount} {language === "fi" ? "leimaa" : "leima"} · {tier.rewardType.toLowerCase()}
              </Text>
              <Text style={styles.tierCopy}>{getTierCopy(tier, language, formatter)}</Text>
              <Text style={styles.tierInventory}>{getInventoryCopy(tier, language)}</Text>
              {tier.description ? <Text style={styles.tierCopy}>{tier.description}</Text> : null}
              {tier.claimInstructions ? <Text style={styles.tierCopy}>{tier.claimInstructions}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      {onOpenEvent ? (
        <Pressable onPress={() => onOpenEvent(event.id)} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>
            {language === "fi" ? "Tapahtuman tiedot" : "Event details"}
          </Text>
        </Pressable>
      ) : null}
    </InfoCard>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    badges: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    claimableBadge: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    claimableBadgeText: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      lineHeight: theme.typography.lineHeights.eyebrow,
    },
    ghostButton: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.button,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    ghostButtonText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
    },
    heroBand: {
      borderRadius: theme.radius.scene,
      minHeight: 172,
      overflow: "hidden",
      position: "relative",
    },
    heroContent: {
      flex: 1,
      justifyContent: "space-between",
      padding: 18,
    },
    heroCopy: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    heroDate: {
      color: "#F8FAF5",
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    heroImage: {
      borderRadius: theme.radius.scene,
    },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.mode === "dark" ? "rgba(0, 0, 0, 0.52)" : "rgba(7, 10, 7, 0.5)",
    },
    heroReadyPill: {
      alignSelf: "flex-start",
      backgroundColor: "rgba(8, 10, 8, 0.74)",
      borderColor: "rgba(248, 250, 245, 0.14)",
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    heroReadyPillText: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      lineHeight: theme.typography.lineHeights.eyebrow,
    },
    progressFill: {
      backgroundColor: theme.colors.lime,
      borderRadius: 999,
      height: "100%",
    },
    progressTrack: {
      backgroundColor: theme.colors.borderDefault,
      borderRadius: 999,
      height: 8,
      overflow: "hidden",
    },
    sectionLabel: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      lineHeight: theme.typography.lineHeights.eyebrow,
      textTransform: "uppercase",
    },
    stampHero: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    stampMeta: {
      gap: 0,
      justifyContent: "center",
      marginBottom: 0,
    },
    stampNumber: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.extrabold,
      fontSize: 52,
      lineHeight: 56,
      minWidth: 60,
    },
    stampUnit: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: 14,
      textTransform: "uppercase",
    },
    summaryText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    tierCopy: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    tierHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between",
    },
    tierInventory: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    tierMeta: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    tierRow: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 14,
      ...interactiveSurfaceShadowStyle,
    },
    tierRowClaimable: {
      backgroundColor: theme.colors.limeSurface,
      borderColor: theme.colors.limeBorder,
    },
    tierRowClaimed: {
      backgroundColor: theme.colors.successSurface,
      borderColor: theme.colors.successBorder,
    },
    tierSection: {
      gap: 10,
    },
    tierTitle: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
  });
