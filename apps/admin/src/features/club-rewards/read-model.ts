import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchClubEventContextAsync } from "@/features/club-events/context";
import type {
  ClubRewardTierRecord,
  ClubRewardsSnapshot,
  ManageableRewardEvent,
  RewardTierStatus,
  RewardTierType,
} from "@/features/club-rewards/types";

const rewardTierVisibleLimit = 24;

type EventRow = {
  city: string;
  club_id: string;
  id: string;
  name: string;
  start_at: string;
  status: ManageableRewardEvent["eventStatus"];
};

type RewardTierRow = {
  claim_instructions: string | null;
  created_at: string;
  description: string | null;
  event_id: string;
  id: string;
  inventory_claimed: number;
  inventory_total: number | null;
  reward_type: RewardTierType;
  required_stamp_count: number;
  status: RewardTierStatus;
  title: string;
};

const fetchManageableEventsAsync = async (
  supabase: SupabaseClient,
  clubIds: string[]
): Promise<EventRow[]> => {
  if (clubIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("events")
    .select("id,club_id,name,city,status,start_at")
    .in("club_id", clubIds)
    .in("status", ["DRAFT", "PUBLISHED", "ACTIVE", "COMPLETED"])
    .order("start_at", {
      ascending: false,
    })
    .returns<EventRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load manageable club events: ${error.message}`);
  }

  return data;
};

const fetchRewardTierRowsAsync = async (
  supabase: SupabaseClient,
  eventIds: string[]
): Promise<RewardTierRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("reward_tiers")
    .select(
      "id,event_id,title,description,required_stamp_count,reward_type,inventory_total,inventory_claimed,claim_instructions,status,created_at"
    )
    .in("event_id", eventIds)
    .order("created_at", {
      ascending: false,
    })
    .returns<RewardTierRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load reward tiers: ${error.message}`);
  }

  return data;
};

const buildTierCountByEventId = (rows: RewardTierRow[]): Map<string, number> => {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  });

  return counts;
};

const buildSummaryFromRewardTierRows = (rows: RewardTierRow[]) => ({
  activeTierCount: rows.filter((row) => row.status === "ACTIVE").length,
  claimedUnitCount: rows.reduce((total, row) => total + row.inventory_claimed, 0),
  lowStockTierCount: rows.filter((row) => {
    const stockState = buildStockState(row.inventory_total, row.inventory_claimed);

    return stockState === "LOW" || stockState === "OUT";
  }).length,
  totalTierCount: rows.length,
  visibleTierCount: Math.min(rows.length, rewardTierVisibleLimit),
});

const buildStockState = (inventoryTotal: number | null, inventoryClaimed: number): ClubRewardTierRecord["stockState"] => {
  if (inventoryTotal === null) {
    return "UNLIMITED";
  }

  const remaining = inventoryTotal - inventoryClaimed;

  if (remaining <= 0) {
    return "OUT";
  }

  if (remaining <= 5) {
    return "LOW";
  }

  return "AVAILABLE";
};

const mapRewardTierRecords = (
  rows: RewardTierRow[],
  eventById: Map<string, ManageableRewardEvent>
): ClubRewardTierRecord[] =>
  rows.flatMap((row) => {
    const event = eventById.get(row.event_id);

    if (typeof event === "undefined") {
      return [];
    }

    const inventoryRemaining =
      row.inventory_total === null ? null : Math.max(row.inventory_total - row.inventory_claimed, 0);

    return [
      {
        claimInstructions: row.claim_instructions,
        createdAt: row.created_at,
        description: row.description,
        eventId: row.event_id,
        eventName: event.name,
        inventoryClaimed: row.inventory_claimed,
        inventoryRemaining,
        inventoryTotal: row.inventory_total,
        rewardTierId: row.id,
        rewardType: row.reward_type,
        requiredStampCount: row.required_stamp_count,
        status: row.status,
        stockState: buildStockState(row.inventory_total, row.inventory_claimed),
        title: row.title,
      },
    ];
  });

export const fetchClubRewardsSnapshotAsync = async (
  supabase: SupabaseClient
): Promise<ClubRewardsSnapshot> => {
  const context = await fetchClubEventContextAsync(supabase);
  const manageableMemberships = context.memberships.filter((membership) => membership.canCreateEvents);
  const clubIds = manageableMemberships.map((membership) => membership.clubId);
  const eventRows = await fetchManageableEventsAsync(supabase, clubIds);
  const rewardTierRows = await fetchRewardTierRowsAsync(
    supabase,
    eventRows.map((row) => row.id)
  );
  const visibleRewardTierRows = rewardTierRows.slice(0, rewardTierVisibleLimit);
  const tierCountByEventId = buildTierCountByEventId(rewardTierRows);
  const membershipsByClubId = new Map(
    manageableMemberships.map((membership) => [
      membership.clubId,
      {
        canManageRewards: membership.canCreateEvents,
        clubName: membership.clubName,
      },
    ])
  );
  const events = eventRows.flatMap((row) => {
    const membership = membershipsByClubId.get(row.club_id);

    if (typeof membership === "undefined") {
      return [];
    }

    return [
      {
        canManageRewards:
          membership.canManageRewards &&
          (row.status === "DRAFT" || row.status === "PUBLISHED" || row.status === "ACTIVE"),
        city: row.city,
        clubId: row.club_id,
        clubName: membership.clubName,
        eventId: row.id,
        eventStatus: row.status,
        name: row.name,
        rewardTierCount: tierCountByEventId.get(row.id) ?? 0,
        startAt: row.start_at,
      },
    ];
  });
  const eventById = new Map(events.map((event) => [event.eventId, event]));
  const rewardTiers = mapRewardTierRecords(visibleRewardTierRows, eventById);
  const summary = buildSummaryFromRewardTierRows(rewardTierRows);

  return {
    events,
    rewardTiers,
    summary: {
      activeTierCount: summary.activeTierCount,
      claimedUnitCount: summary.claimedUnitCount,
      editableEventCount: events.filter((event) => event.canManageRewards).length,
      lowStockTierCount: summary.lowStockTierCount,
      manageableEventCount: events.length,
      totalTierCount: summary.totalTierCount,
      visibleTierCount: summary.visibleTierCount,
    },
  };
};
