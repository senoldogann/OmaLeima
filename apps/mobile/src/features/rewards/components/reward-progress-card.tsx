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

const getTimelineBadgeState = (state: StudentRewardTimelineState): AppReadinessState => {
  switch (state) {
    case "ACTIVE": return "ready";
    case "UPCOMING": return "pending";
    case "COMPLETED": return "warning";
  }
};

const getTierBadgeState = (state: StudentRewardTierState): AppReadinessState => {
  switch (state) {
    case "CLAIMED": return "ready";
    case "CLAIMABLE": return "ready";
    case "MORE_NEEDED": return "pending";
    case "OUT_OF_STOCK": return "warning";
    case "REVOKED": return "warning";
  }
};

const getTierBadgeLabel = (state: StudentRewardTierState): string => {
  switch (state) {
    case "CLAIMED": return "claimed";
    case "CLAIMABLE": return "claimable";
    case "MORE_NEEDED": return "more needed";
    case "OUT_OF_STOCK": return "out of stock";
    case "REVOKED": return "revoked";
  }
};

const getTierCopy = (tier: StudentRewardTierProgress): string => {
  switch (tier.state) {
    case "CLAIMED":
      return tier.claimedAt === null ? "Already claimed." : `Claimed ${formatDateTime(tier.claimedAt)}.`;
    case "CLAIMABLE":
      return "Ready for staff handoff.";
    case "MORE_NEEDED":
      return `${tier.missingStampCount} more leimat needed.`;
    case "OUT_OF_STOCK":
      return "Currently out of stock.";
    case "REVOKED":
      return "Revoked. Check with staff.";
  }
};

const getInventoryCopy = (tier: StudentRewardTierProgress): string => {
  if (tier.inventoryTotal === null) return "Unlimited stock";
  if (tier.remainingInventory === null || tier.remainingInventory <= 0) return "No stock left";
  if (tier.remainingInventory === 1) return "1 reward left";
  return `${tier.remainingInventory} rewards left`;
};

const getEventSummaryCopy = (event: StudentRewardEventProgress): string => {
  if (event.tiers.length === 0) return "No reward tiers published yet.";
  if (event.claimableTierCount > 0) {
    const base = `${event.claimableTierCount} tier${event.claimableTierCount === 1 ? "" : "s"} ready for handoff.`;
    return event.revokedTierCount > 0 ? `${base} ${event.revokedTierCount} revoked.` : base;
  }
  if (event.revokedTierCount > 0) return `${event.revokedTierCount} tier${event.revokedTierCount === 1 ? "" : "s"} revoked.`;
  if (event.claimedTierCount > 0) return `${event.claimedTierCount} tier${event.claimedTierCount === 1 ? "" : "s"} claimed.`;
  return "Keep collecting leimat to unlock rewards.";
};

type MemoryItem = { kind: "stamp"; index: number } | { kind: "overflow"; remainingCount: number };
const MAX_TOKENS = 12;

const getMemoryItems = (count: number): MemoryItem[] => {
  if (count <= MAX_TOKENS) {
    return Array.from({ length: count }, (_, i) => ({ kind: "stamp", index: i }));
  }
  const visible = MAX_TOKENS - 1;
  return [
    ...Array.from({ length: visible }, (_, i) => ({ kind: "stamp" as const, index: i })),
    { kind: "overflow", remainingCount: count - visible },
  ];
};

export const RewardProgressCard = ({ event, onOpenEvent }: RewardProgressCardProps) => {
  const hasClaimable = event.claimableTierCount > 0;

  return (
    <InfoCard
      eyebrow={event.city}
      title={event.name}
      variant={hasClaimable ? "scene" : "card"}
    >
      {/* Badges */}
      <View style={styles.badges}>
        <StatusBadge label={event.timelineState.toLowerCase()} state={getTimelineBadgeState(event.timelineState)} />
        {event.claimableTierCount > 0 ? <StatusBadge label="claimable" state="ready" /> : null}
        {event.claimedTierCount > 0 ? <StatusBadge label="claimed" state="ready" /> : null}
        {event.revokedTierCount > 0 ? <StatusBadge label="revoked" state="warning" /> : null}
      </View>

      {/* Stamp count — big number hero */}
      <View style={styles.stampHero}>
        <Text style={styles.stampNumber}>{event.stampCount}</Text>
        <View style={styles.stampMeta}>
          <Text style={styles.stampDivider}>/ {event.minimumStampsRequired}</Text>
          <Text style={styles.stampUnit}>leimat</Text>
          {hasClaimable ? (
            <View style={styles.claimableBadge}>
              <Text style={styles.claimableBadgeText}>READY</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${event.goalProgressRatio * 100}%`,
              backgroundColor: hasClaimable ? mobileTheme.colors.lime : mobileTheme.colors.cyan,
            },
          ]}
        />
      </View>

      {/* Summary */}
      <Text style={styles.summaryText}>{getEventSummaryCopy(event)}</Text>

      <Text style={styles.dateLine}>
        {formatDateTime(event.startAt)} - {formatDateTime(event.endAt)}
      </Text>

      {/* Memory tokens */}
      {event.stampCount > 0 ? (
        <View style={styles.memorySection}>
          <Text style={styles.sectionLabel}>COLLECTED</Text>
          <View style={styles.tokenStrip}>
            {getMemoryItems(event.stampCount).map((item) =>
              item.kind === "stamp" ? (
                <View
                  key={`${event.id}-s${item.index}`}
                  style={[
                    styles.token,
                    {
                      backgroundColor: hasClaimable
                        ? mobileTheme.colors.limeSurface
                        : mobileTheme.colors.cyanSurface,
                      borderColor: hasClaimable
                        ? mobileTheme.colors.limeBorder
                        : mobileTheme.colors.cyanBorder,
                    },
                  ]}
                >
                  <Text style={[styles.tokenMark, { color: hasClaimable ? mobileTheme.colors.lime : mobileTheme.colors.cyan }]}>
                    ✦
                  </Text>
                </View>
              ) : (
                <View key={`${event.id}-ov`} style={[styles.token, styles.tokenOverflow]}>
                  <Text style={styles.tokenOverflowText}>+{item.remainingCount}</Text>
                </View>
              )
            )}
          </View>
        </View>
      ) : null}

      {/* Tier list */}
      {event.tiers.length > 0 ? (
        <View style={styles.tierSection}>
          <Text style={styles.sectionLabel}>REWARD TIERS</Text>
          {event.tiers.map((tier) => (
            <View
              key={tier.id}
              style={[
                styles.tierRow,
                tier.state === "CLAIMABLE" ? styles.tierRowClaimable : null,
                tier.state === "CLAIMED" ? styles.tierRowClaimed : null,
              ]}
            >
              <View style={styles.tierLeft}>
                <View style={styles.tierHeader}>
                  <Text style={styles.tierTitle}>{tier.title}</Text>
                  <StatusBadge label={getTierBadgeLabel(tier.state)} state={getTierBadgeState(tier.state)} />
                </View>
                <Text style={styles.tierMeta}>
                  {tier.requiredStampCount} leimat · {tier.rewardType.toLowerCase()}
                </Text>
                <Text style={styles.tierCopy}>{getTierCopy(tier)}</Text>
                <Text style={styles.tierInventory}>{getInventoryCopy(tier)}</Text>
                {tier.description ? <Text style={styles.tierCopy}>{tier.description}</Text> : null}
                {tier.claimInstructions ? <Text style={styles.tierCopy}>{tier.claimInstructions}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {onOpenEvent ? (
        <Pressable onPress={() => onOpenEvent(event.id)} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>Event details</Text>
        </Pressable>
      ) : null}
    </InfoCard>
  );
};

const styles = StyleSheet.create({
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  // --- Stamp hero ---
  stampHero: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  stampNumber: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 72,
    fontWeight: "800",
    lineHeight: 74,
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },
  stampMeta: {
    gap: 4,
    paddingBottom: 10,
    alignItems: "flex-start",
  },
  stampDivider: {
    color: mobileTheme.colors.textMuted,
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  stampUnit: {
    color: mobileTheme.colors.textDim,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  claimableBadge: {
    backgroundColor: mobileTheme.colors.lime,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 4,
  },
  claimableBadgeText: {
    color: "#08090E",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  // --- Progress ---
  progressTrack: {
    backgroundColor: mobileTheme.colors.borderDefault,
    borderRadius: 999,
    height: 5,
    overflow: "hidden",
  },
  progressFill: {
    borderRadius: 999,
    height: 5,
  },

  // --- Summary ---
  summaryText: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },

  dateLine: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },

  // --- Memory tokens ---
  memorySection: {
    gap: 10,
  },
  sectionLabel: {
    color: mobileTheme.colors.textDim,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  tokenStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  token: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tokenMark: {
    fontSize: 14,
    fontWeight: "700",
  },
  tokenOverflow: {
    backgroundColor: mobileTheme.colors.surfaceL3,
    borderColor: mobileTheme.colors.borderDefault,
    minWidth: 44,
    paddingHorizontal: 8,
  },
  tokenOverflowText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },

  // --- Tiers ---
  tierSection: {
    gap: 10,
  },
  tierRow: {
    borderRadius: mobileTheme.radius.card,
    gap: 8,
    padding: 14,
    backgroundColor: mobileTheme.colors.surfaceL2,
    ...interactiveSurfaceShadowStyle,
  },
  tierRowClaimable: {
    borderColor: mobileTheme.colors.limeBorder,
    backgroundColor: mobileTheme.colors.limeSurface,
  },
  tierRowClaimed: {
    borderColor: mobileTheme.colors.successBorder,
    backgroundColor: mobileTheme.colors.successSurface,
  },
  tierLeft: {
    gap: 6,
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  tierTitle: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  tierMeta: {
    color: mobileTheme.colors.cyan,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  tierCopy: {
    color: mobileTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  tierInventory: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
  },

  // --- Button ---
  ghostButton: {
    alignSelf: "flex-start",
    borderColor: mobileTheme.colors.borderStrong,
    borderRadius: mobileTheme.radius.button,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  ghostButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
});
