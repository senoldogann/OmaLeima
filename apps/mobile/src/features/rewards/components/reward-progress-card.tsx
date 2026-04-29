import { Pressable, StyleSheet, Text, View } from "react-native";

import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import { getEventCoverSource } from "@/features/events/event-visuals";
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

const getEventHeroCopy = (event: StudentRewardEventProgress): string => {
  if (event.claimableTierCount > 0) {
    return `${event.claimableTierCount} reward${event.claimableTierCount === 1 ? "" : "s"} ready for claim.`;
  }

  if (event.tiers.some((tier) => tier.state === "MORE_NEEDED")) {
    const nearestLockedTier = event.tiers.find((tier) => tier.state === "MORE_NEEDED") ?? null;

    if (nearestLockedTier !== null) {
      return `${nearestLockedTier.missingStampCount} leima left to the next unlock.`;
    }
  }

  if (event.claimedTierCount > 0) {
    return `${event.claimedTierCount} reward${event.claimedTierCount === 1 ? "" : "s"} already claimed.`;
  }

  return "Collect leimas to open the reward path.";
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
  const coverSource = getEventCoverSource(event.coverImageUrl, `${event.id}:${event.name}`);

  return (
    <InfoCard
      eyebrow={event.city}
      title={event.name}
      variant={hasClaimable ? "scene" : "card"}
    >
      <CoverImageSurface imageStyle={styles.heroImage} source={coverSource} style={styles.heroBand}>
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <View style={styles.badges}>
            <StatusBadge label={event.timelineState.toLowerCase()} state={getTimelineBadgeState(event.timelineState)} />
            {hasClaimable ? <StatusBadge label="claimable" state="ready" /> : null}
            {event.claimedTierCount > 0 ? <StatusBadge label="claimed" state="ready" /> : null}
            {event.revokedTierCount > 0 ? <StatusBadge label="revoked" state="warning" /> : null}
          </View>
          <Text style={styles.heroDate}>
            {formatDateTime(event.startAt)} - {formatDateTime(event.endAt)}
          </Text>
        </View>
      </CoverImageSurface>

      {/* Badges */}
      

      {/* Stamp count — big number hero */}
      <View style={styles.stampHero}>
        <Text style={styles.stampNumber}>{event.stampCount}</Text>
        <View style={styles.stampMeta}>
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
              backgroundColor: mobileTheme.colors.lime,
            },
          ]}
        />
      </View>

      <Text style={styles.heroCopy}>{getEventHeroCopy(event)}</Text>

      {/* Summary */}
      <Text style={styles.summaryText}>{getEventSummaryCopy(event)}</Text>

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
                        : mobileTheme.colors.surfaceL3,
                      borderColor: hasClaimable
                        ? mobileTheme.colors.limeBorder
                        : mobileTheme.colors.borderDefault,
                    },
                  ]}
                >
                  <Text style={[styles.tokenMark, { color: hasClaimable ? mobileTheme.colors.lime : mobileTheme.colors.textPrimary }]}>
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
                  {tier.rewardType.toLowerCase()}
                </Text>
                <Text style={styles.tierCopy}>{getTierCopy(tier)}</Text>
                {tier.inventoryTotal !== null ? (
                  <Text style={styles.tierInventory}>{getInventoryCopy(tier)}</Text>
                ) : null}
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
  heroBand: {
    borderRadius: mobileTheme.radius.scene,
    minHeight: 148,
    overflow: "hidden",
    position: "relative",
  },
  heroContent: {
    flex: 1,
    justifyContent: "space-between",
    padding: 16,
  },
  heroDate: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    lineHeight: mobileTheme.typography.lineHeights.bodySmall,
  },
  heroImage: {
    borderRadius: mobileTheme.radius.scene,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.54)",
  },

  // --- Stamp hero ---
  stampHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 82,
  },
  stampNumber: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.extrabold,
    fontSize: 60,
    lineHeight: 68,
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },
  stampMeta: {
    gap: 4,
    paddingBottom: 8,
    alignItems: "flex-start",
  },
  stampUnit: {
    color: mobileTheme.colors.textDim,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.caption,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  heroCopy: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.body,
    lineHeight: mobileTheme.typography.lineHeights.body,
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
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: 10,
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
    fontFamily: mobileTheme.typography.families.regular,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    lineHeight: mobileTheme.typography.lineHeights.bodySmall,
  },

  // --- Memory tokens ---
  memorySection: {
    gap: 8,
  },
  sectionLabel: {
    color: mobileTheme.colors.textDim,
    fontFamily: mobileTheme.typography.families.bold,
    fontSize: 10,
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
    fontFamily: mobileTheme.typography.families.bold,
  },
  tokenOverflow: {
    backgroundColor: mobileTheme.colors.surfaceL3,
    borderColor: mobileTheme.colors.borderDefault,
    minWidth: 44,
    paddingHorizontal: 8,
  },
  tokenOverflowText: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.caption,
  },

  // --- Tiers ---
  tierSection: {
    gap: 8,
  },
  tierRow: {
    borderRadius: mobileTheme.radius.card,
    gap: 8,
    padding: 12,
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
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.body,
    flex: 1,
  },
  tierMeta: {
    color: mobileTheme.colors.limeDim,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.caption,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  tierCopy: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.typography.families.regular,
    fontSize: mobileTheme.typography.sizes.bodySmall,
    lineHeight: mobileTheme.typography.lineHeights.bodySmall,
  },
  tierInventory: {
    color: mobileTheme.colors.textMuted,
    fontFamily: mobileTheme.typography.families.medium,
    fontSize: mobileTheme.typography.sizes.caption,
  },

  // --- Button ---
  ghostButton: {
    alignSelf: "flex-start",
    backgroundColor: mobileTheme.colors.surfaceL2,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  ghostButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.typography.families.semibold,
    fontSize: mobileTheme.typography.sizes.bodySmall,
  },
});
