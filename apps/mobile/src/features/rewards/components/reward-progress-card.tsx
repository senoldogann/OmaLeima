import { Pressable, StyleSheet, Text, View } from "react-native";

import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { interactiveSurfaceShadowStyle, mobileTheme } from "@/features/foundation/theme";
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

const dateTimeFormatter = new Intl.DateTimeFormat("en-FI", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const formatDateTime = (value: string): string => dateTimeFormatter.format(new Date(value));

const getTimelineBadgeState = (timelineState: StudentRewardTimelineState): AppReadinessState => {
  switch (timelineState) {
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
      return "ready";
    case "CLAIMABLE":
      return "ready";
    case "MORE_NEEDED":
      return "pending";
    case "OUT_OF_STOCK":
      return "warning";
    case "REVOKED":
      return "warning";
  }
};

const getTierBadgeLabel = (state: StudentRewardTierState): string => {
  switch (state) {
    case "CLAIMED":
      return "claimed";
    case "CLAIMABLE":
      return "claimable now";
    case "MORE_NEEDED":
      return "more needed";
    case "OUT_OF_STOCK":
      return "out of stock";
    case "REVOKED":
      return "revoked";
  }
};

const getTierPrimaryCopy = (tier: StudentRewardTierProgress): string => {
  switch (tier.state) {
    case "CLAIMED":
      return tier.claimedAt === null ? "Already claimed." : `Claimed on ${formatDateTime(tier.claimedAt)}.`;
    case "CLAIMABLE":
      return "Ready for club handoff once staff confirms the reward.";
    case "MORE_NEEDED":
      return `${tier.missingStampCount} more leima needed.`;
    case "OUT_OF_STOCK":
      return "This reward is currently out of stock.";
    case "REVOKED":
      return "This reward claim was revoked. Check with club staff before expecting another handoff.";
  }
};

const getInventoryCopy = (tier: StudentRewardTierProgress): string => {
  if (tier.inventoryTotal === null) {
    return "Unlimited stock";
  }

  if (tier.remainingInventory === null || tier.remainingInventory <= 0) {
    return "No stock left";
  }

  if (tier.remainingInventory === 1) {
    return "1 reward left";
  }

  return `${tier.remainingInventory} rewards left`;
};

const getEventSummaryCopy = (event: StudentRewardEventProgress): string => {
  if (event.tiers.length === 0) {
    return "No reward tiers published for this event yet.";
  }

  if (event.claimableTierCount > 0) {
    const claimableCopy = `${event.claimableTierCount} reward tier${event.claimableTierCount === 1 ? "" : "s"} can be claimed with staff handoff.`;

    if (event.revokedTierCount > 0) {
      return `${claimableCopy} ${event.revokedTierCount} tier${event.revokedTierCount === 1 ? "" : "s"} also needs staff review after a revoked claim.`;
    }

    return claimableCopy;
  }

  if (event.revokedTierCount > 0) {
    return `${event.revokedTierCount} reward tier${event.revokedTierCount === 1 ? "" : "s"} was revoked and now needs staff review.`;
  }

  if (event.claimedTierCount > 0) {
    return `${event.claimedTierCount} reward tier${event.claimedTierCount === 1 ? "" : "s"} already claimed for this event.`;
  }

  return "Keep collecting leima to unlock the next reward tier.";
};

type MemoryStripItem =
  | { kind: "stamp"; index: number }
  | { kind: "overflow"; remainingCount: number };

const maxVisibleMemoryTokens = 8;

const getMemoryStripItems = (stampCount: number): MemoryStripItem[] => {
  if (stampCount <= maxVisibleMemoryTokens) {
    return Array.from({ length: stampCount }, (_, index) => ({
      kind: "stamp",
      index,
    }));
  }

  const visibleStampCount = maxVisibleMemoryTokens - 1;
  const visibleItems = Array.from({ length: visibleStampCount }, (_, index) => ({
    kind: "stamp" as const,
    index,
  }));

  return [
    ...visibleItems,
    {
      kind: "overflow",
      remainingCount: stampCount - visibleStampCount,
    },
  ];
};

export const RewardProgressCard = ({ event, onOpenEvent }: RewardProgressCardProps) => (
  <InfoCard eyebrow={event.city} title={event.name}>
    <View style={styles.heroCard}>
      <View style={styles.heroGlow} />
      <View style={styles.badges}>
        <StatusBadge label={event.timelineState.toLowerCase()} state={getTimelineBadgeState(event.timelineState)} />
        {event.claimableTierCount > 0 ? <StatusBadge label="claimable" state="ready" /> : null}
        {event.claimedTierCount > 0 ? <StatusBadge label="claimed" state="ready" /> : null}
        {event.revokedTierCount > 0 ? <StatusBadge label="revoked" state="warning" /> : null}
      </View>

      <Text style={styles.progressCaption}>Collected leimat</Text>
      <View style={styles.progressHeadlineRow}>
        <Text style={styles.progressHeadline}>{event.stampCount}</Text>
        <Text style={styles.progressGoal}>/ {event.minimumStampsRequired}</Text>
      </View>
      <Text style={styles.bodyText}>{getEventSummaryCopy(event)}</Text>
    </View>

    <View style={styles.metaGroup}>
      <Text style={styles.metaLine}>Starts {formatDateTime(event.startAt)}</Text>
      <Text style={styles.metaLine}>Ends {formatDateTime(event.endAt)}</Text>
    </View>

    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${event.goalProgressRatio * 100}%` }]} />
    </View>

    {event.stampCount > 0 ? (
      <>
        <View style={styles.memoryStrip}>
          {getMemoryStripItems(event.stampCount).map((item) =>
            item.kind === "stamp" ? (
              <View key={`${event.id}-stamp-${item.index}`} style={styles.memoryToken}>
                <View style={[styles.memoryDot, styles.memoryDotCollected]} />
              </View>
            ) : (
              <View key={`${event.id}-overflow`} style={styles.memoryOverflowToken}>
                <Text style={styles.memoryOverflowText}>+{item.remainingCount}</Text>
              </View>
            )
          )}
        </View>
        <Text style={styles.secondaryText}>
          Recent leima memory strip for this event. The main progress bar above still reflects full reward progress.
        </Text>
      </>
    ) : null}

    {event.tiers.length === 0 ? (
      <Text style={styles.secondaryText}>The organizer has not published reward tiers for this event yet.</Text>
    ) : (
      <View style={styles.tierList}>
        {event.tiers.map((tier) => (
          <View key={tier.id} style={styles.tierCard}>
            <View style={styles.tierHeader}>
              <View style={styles.tierTitleGroup}>
                <Text style={styles.tierTitle}>{tier.title}</Text>
                <Text style={styles.tierMeta}>
                  {tier.requiredStampCount} leima • {tier.rewardType.toLowerCase()}
                </Text>
              </View>
              <StatusBadge label={getTierBadgeLabel(tier.state)} state={getTierBadgeState(tier.state)} />
            </View>

            <Text style={styles.bodyText}>{getTierPrimaryCopy(tier)}</Text>
            <Text style={styles.secondaryText}>{getInventoryCopy(tier)}</Text>
            {tier.description ? <Text style={styles.secondaryText}>{tier.description}</Text> : null}
            {tier.claimInstructions ? <Text style={styles.secondaryText}>{tier.claimInstructions}</Text> : null}
          </View>
        ))}
      </View>
    )}

    {onOpenEvent ? (
      <Pressable onPress={() => onOpenEvent(event.id)} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Open event detail</Text>
      </Pressable>
    ) : null}
  </InfoCard>
);

const styles = StyleSheet.create({
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bodyText: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  heroCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 26,
    borderWidth: 1,
    gap: 12,
    overflow: "hidden",
    padding: 18,
    position: "relative",
  },
  heroGlow: {
    backgroundColor: mobileTheme.colors.chromeTintWarm,
    borderRadius: 90,
    height: 132,
    opacity: 0.45,
    position: "absolute",
    right: -32,
    top: -36,
    width: 132,
  },
  metaGroup: {
    gap: 4,
  },
  memoryDot: {
    borderRadius: 999,
    height: 12,
    width: 12,
  },
  memoryDotCollected: {
    backgroundColor: mobileTheme.colors.accentMint,
    borderColor: "rgba(255, 255, 255, 0.22)",
    borderWidth: 1,
  },
  memoryOverflowText: {
    color: mobileTheme.colors.accentGold,
    fontSize: 12,
    fontWeight: "700",
  },
  memoryOverflowToken: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.warningSurface,
    borderColor: "rgba(255, 217, 138, 0.22)",
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    minWidth: 40,
    paddingHorizontal: 8,
  },
  memoryStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  memoryToken: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.035)",
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  metaLine: {
    color: mobileTheme.colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  progressCaption: {
    color: mobileTheme.colors.accentGold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  progressHeadlineRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
  },
  progressHeadline: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 48,
    fontWeight: "800",
    lineHeight: 50,
  },
  progressGoal: {
    color: mobileTheme.colors.textMuted,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 28,
    paddingBottom: 4,
  },
  progressTrack: {
    backgroundColor: mobileTheme.colors.progressTrack,
    borderRadius: 999,
    height: 10,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: mobileTheme.colors.accentMint,
    height: "100%",
  },
  tierList: {
    gap: 10,
  },
  tierCard: {
    backgroundColor: mobileTheme.colors.cardBackgroundSoft,
    borderColor: mobileTheme.colors.cardBorder,
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    padding: 16,
    ...interactiveSurfaceShadowStyle,
  },
  tierHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  tierTitleGroup: {
    flex: 1,
    gap: 4,
  },
  tierTitle: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  tierMeta: {
    color: mobileTheme.colors.accentBlue,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  secondaryText: {
    color: mobileTheme.colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.actionNeutral,
    borderColor: mobileTheme.colors.actionNeutralBorder,
    borderRadius: mobileTheme.radius.button,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...interactiveSurfaceShadowStyle,
  },
  secondaryButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
});
