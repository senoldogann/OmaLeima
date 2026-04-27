import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import type { RewardTierSummary } from "@/features/events/types";
import { supabase } from "@/lib/supabase";

import type {
  StudentRewardEventProgress,
  StudentRewardOverview,
  StudentRewardTierProgress,
  StudentRewardTierState,
  StudentRewardTimelineState,
} from "@/features/rewards/types";

type RegistrationRow = {
  event_id: string;
};

type EventRow = {
  id: string;
  name: string;
  city: string;
  start_at: string;
  end_at: string;
  status: "PUBLISHED" | "ACTIVE" | "COMPLETED";
  minimum_stamps_required: number;
};

type RewardTierRow = {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  required_stamp_count: number;
  reward_type: RewardTierSummary["rewardType"];
  inventory_total: number | null;
  inventory_claimed: number;
  claim_instructions: string | null;
};

type RewardClaimRow = {
  event_id: string;
  reward_tier_id: string;
  status: "CLAIMED" | "REVOKED";
  claimed_at: string;
};

type StampRow = {
  event_id: string;
};

type UseStudentRewardOverviewQueryParams = {
  studentId: string;
  isEnabled: boolean;
};

type UseStudentRewardEventQueryParams = {
  eventId: string;
  studentId: string;
  isEnabled: boolean;
};

const createClaimKey = (eventId: string, rewardTierId: string): string => `${eventId}:${rewardTierId}`;

const deriveTimelineState = (event: EventRow, now: number): StudentRewardTimelineState => {
  if (event.status === "COMPLETED") {
    return "COMPLETED";
  }

  const startTime = new Date(event.start_at).getTime();
  const endTime = new Date(event.end_at).getTime();

  if (now < startTime) {
    return "UPCOMING";
  }

  if (now > endTime) {
    return "COMPLETED";
  }

  return "ACTIVE";
};

const groupEventIds = (rows: RegistrationRow[]): string[] => Array.from(new Set(rows.map((row) => row.event_id)));

const countStampsByEvent = (rows: StampRow[]): Map<string, number> => {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const currentCount = counts.get(row.event_id) ?? 0;
    counts.set(row.event_id, currentCount + 1);
  });

  return counts;
};

const mapClaimsByTier = (rows: RewardClaimRow[]): Map<string, RewardClaimRow> =>
  new Map(rows.map((row) => [createClaimKey(row.event_id, row.reward_tier_id), row] as const));

const calculateRemainingInventory = (row: RewardTierRow): number | null => {
  if (row.inventory_total === null) {
    return null;
  }

  return Math.max(row.inventory_total - row.inventory_claimed, 0);
};

const deriveTierState = (
  stampCount: number,
  row: RewardTierRow,
  claim: RewardClaimRow | null
): StudentRewardTierState => {
  if (claim?.status === "REVOKED") {
    return "REVOKED";
  }

  if (claim !== null) {
    return "CLAIMED";
  }

  const remainingInventory = calculateRemainingInventory(row);

  if (remainingInventory !== null && remainingInventory <= 0) {
    return "OUT_OF_STOCK";
  }

  if (stampCount >= row.required_stamp_count) {
    return "CLAIMABLE";
  }

  return "MORE_NEEDED";
};

const toRewardTierProgress = (
  stampCount: number,
  row: RewardTierRow,
  claimsByTier: Map<string, RewardClaimRow>
): StudentRewardTierProgress => {
  const claim = claimsByTier.get(createClaimKey(row.event_id, row.id)) ?? null;
  const remainingInventory = calculateRemainingInventory(row);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    requiredStampCount: row.required_stamp_count,
    rewardType: row.reward_type,
    inventoryTotal: row.inventory_total,
    inventoryClaimed: row.inventory_claimed,
    remainingInventory,
    claimInstructions: row.claim_instructions,
    state: deriveTierState(stampCount, row, claim),
    missingStampCount: Math.max(row.required_stamp_count - stampCount, 0),
    claimedAt: claim?.claimed_at ?? null,
  };
};

const mapRewardTiersByEvent = (rows: RewardTierRow[]): Map<string, RewardTierRow[]> => {
  const rowsByEvent = new Map<string, RewardTierRow[]>();

  rows.forEach((row) => {
    const currentRows = rowsByEvent.get(row.event_id) ?? [];
    rowsByEvent.set(row.event_id, [...currentRows, row]);
  });

  return rowsByEvent;
};

const compareRewardEvents = (left: StudentRewardEventProgress, right: StudentRewardEventProgress): number => {
  const order: Record<StudentRewardTimelineState, number> = {
    ACTIVE: 0,
    UPCOMING: 1,
    COMPLETED: 2,
  };

  if (order[left.timelineState] !== order[right.timelineState]) {
    return order[left.timelineState] - order[right.timelineState];
  }

  if (left.timelineState === "COMPLETED") {
    return new Date(right.endAt).getTime() - new Date(left.endAt).getTime();
  }

  return new Date(left.startAt).getTime() - new Date(right.startAt).getTime();
};

const toRewardEventProgress = (
  event: EventRow,
  stampCountsByEvent: Map<string, number>,
  rewardTiersByEvent: Map<string, RewardTierRow[]>,
  claimsByTier: Map<string, RewardClaimRow>,
  now: number
): StudentRewardEventProgress => {
  const stampCount = stampCountsByEvent.get(event.id) ?? 0;
  const rewardTierRows = rewardTiersByEvent.get(event.id) ?? [];
  const tiers = rewardTierRows.map((row) => toRewardTierProgress(stampCount, row, claimsByTier));

  return {
    id: event.id,
    name: event.name,
    city: event.city,
    startAt: event.start_at,
    endAt: event.end_at,
    status: event.status,
    timelineState: deriveTimelineState(event, now),
    minimumStampsRequired: event.minimum_stamps_required,
    stampCount,
    goalProgressRatio:
      event.minimum_stamps_required === 0 ? 1 : Math.min(stampCount / event.minimum_stamps_required, 1),
    claimableTierCount: tiers.filter((tier) => tier.state === "CLAIMABLE").length,
    claimedTierCount: tiers.filter((tier) => tier.state === "CLAIMED").length,
    revokedTierCount: tiers.filter((tier) => tier.state === "REVOKED").length,
    tiers,
  };
};

const fetchRegisteredEventIdsAsync = async (studentId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from("event_registrations")
    .select("event_id")
    .eq("student_id", studentId)
    .eq("status", "REGISTERED")
    .returns<RegistrationRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load registered reward events for ${studentId}: ${error.message}`);
  }

  return groupEventIds(data);
};

const fetchRewardEventsAsync = async (eventIds: string[]): Promise<EventRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("events")
    .select("id,name,city,start_at,end_at,status,minimum_stamps_required")
    .in("id", eventIds)
    .in("status", ["PUBLISHED", "ACTIVE", "COMPLETED"])
    .eq("visibility", "PUBLIC")
    .returns<EventRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load reward events: ${error.message}`);
  }

  return data;
};

const fetchRewardTiersAsync = async (eventIds: string[]): Promise<RewardTierRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("reward_tiers")
    .select(
      "id,event_id,title,description,required_stamp_count,reward_type,inventory_total,inventory_claimed,claim_instructions"
    )
    .in("event_id", eventIds)
    .eq("status", "ACTIVE")
    .order("required_stamp_count", { ascending: true })
    .returns<RewardTierRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load reward tiers: ${error.message}`);
  }

  return data;
};

const fetchRewardClaimsAsync = async (eventIds: string[], studentId: string): Promise<RewardClaimRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("reward_claims")
    .select("event_id,reward_tier_id,status,claimed_at")
    .eq("student_id", studentId)
    .in("event_id", eventIds)
    .returns<RewardClaimRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load reward claims for ${studentId}: ${error.message}`);
  }

  return data;
};

const fetchStampRowsAsync = async (eventIds: string[], studentId: string): Promise<StampRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("stamps")
    .select("event_id")
    .eq("student_id", studentId)
    .eq("validation_status", "VALID")
    .in("event_id", eventIds)
    .returns<StampRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load reward stamp progress for ${studentId}: ${error.message}`);
  }

  return data;
};

export const studentRewardOverviewQueryKey = (studentId: string) => ["student-reward-overview", studentId] as const;

export const studentRewardEventQueryKey = (eventId: string, studentId: string) =>
  ["student-reward-event", eventId, studentId] as const;

export const fetchStudentRewardOverviewAsync = async (studentId: string): Promise<StudentRewardOverview> => {
  const eventIds = await fetchRegisteredEventIdsAsync(studentId);

  if (eventIds.length === 0) {
    return {
      registeredEventCount: 0,
      events: [],
    };
  }

  const [events, rewardTiers, rewardClaims, stampRows] = await Promise.all([
    fetchRewardEventsAsync(eventIds),
    fetchRewardTiersAsync(eventIds),
    fetchRewardClaimsAsync(eventIds, studentId),
    fetchStampRowsAsync(eventIds, studentId),
  ]);
  const stampCountsByEvent = countStampsByEvent(stampRows);
  const rewardTiersByEvent = mapRewardTiersByEvent(rewardTiers);
  const claimsByTier = mapClaimsByTier(rewardClaims);
  const now = Date.now();

  return {
    registeredEventCount: eventIds.length,
    events: events
      .map((event) => toRewardEventProgress(event, stampCountsByEvent, rewardTiersByEvent, claimsByTier, now))
      .sort(compareRewardEvents),
  };
};

export const fetchStudentRewardEventProgressAsync = async (
  eventId: string,
  studentId: string
): Promise<StudentRewardEventProgress | null> => {
  const overview = await fetchStudentRewardOverviewAsync(studentId);

  return overview.events.find((event) => event.id === eventId) ?? null;
};

export const useStudentRewardOverviewQuery = ({
  studentId,
  isEnabled,
}: UseStudentRewardOverviewQueryParams): UseQueryResult<StudentRewardOverview, Error> =>
  useQuery({
    queryKey: studentRewardOverviewQueryKey(studentId),
    queryFn: async () => fetchStudentRewardOverviewAsync(studentId),
    enabled: isEnabled,
  });

export const useStudentRewardEventQuery = ({
  eventId,
  studentId,
  isEnabled,
}: UseStudentRewardEventQueryParams): UseQueryResult<StudentRewardEventProgress | null, Error> =>
  useQuery({
    queryKey: studentRewardEventQueryKey(eventId, studentId),
    queryFn: async () => fetchStudentRewardEventProgressAsync(eventId, studentId),
    enabled: isEnabled,
  });
