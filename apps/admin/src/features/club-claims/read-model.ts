import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchClubEventContextAsync } from "@/features/club-events/context";
import type {
  ClubClaimCandidateRecord,
  ClubClaimEventRecord,
  ClubClaimsSnapshot,
  ClubRecentRewardClaimRecord,
} from "@/features/club-claims/types";

const operationalEventLimit = 6;
const visibleCandidateLimit = 30;
const visibleRecentClaimLimit = 20;

type EventRow = {
  city: string;
  club_id: string;
  end_at: string;
  id: string;
  name: string;
  start_at: string;
  status: ClubClaimEventRecord["eventStatus"];
};

type RegistrationRow = {
  event_id: string;
  student_id: string;
};

type RewardTierRow = {
  event_id: string;
  id: string;
  inventory_claimed: number;
  inventory_total: number | null;
  required_stamp_count: number;
  reward_type: ClubClaimCandidateRecord["rewardType"];
  title: string;
};

type RewardClaimRow = {
  claimed_at: string;
  event_id: string;
  id: string;
  notes: string | null;
  reward_tier_id: string;
  status: ClubRecentRewardClaimRecord["status"];
  student_id: string;
};

type StampRow = {
  event_id: string;
  student_id: string;
};

const createCandidateKey = (eventId: string, rewardTierId: string, studentId: string): string =>
  `${eventId}:${rewardTierId}:${studentId}`;

const createMaskedStudentLabel = (studentId: string): string => `Student ...${studentId.slice(-4)}`;

const fetchOperationalEventsAsync = async (
  supabase: SupabaseClient,
  clubIds: string[]
): Promise<EventRow[]> => {
  if (clubIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("events")
    .select("id,club_id,name,city,start_at,end_at,status")
    .in("club_id", clubIds)
    .in("status", ["ACTIVE", "COMPLETED"])
    .order("start_at", {
      ascending: false,
    })
    .limit(operationalEventLimit)
    .returns<EventRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load club claim events: ${error.message}`);
  }

  return data;
};

const fetchRegisteredStudentsAsync = async (
  supabase: SupabaseClient,
  eventIds: string[]
): Promise<RegistrationRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("event_registrations")
    .select("event_id,student_id")
    .in("event_id", eventIds)
    .eq("status", "REGISTERED")
    .returns<RegistrationRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load club claim registrations: ${error.message}`);
  }

  return data;
};

const fetchActiveRewardTiersAsync = async (
  supabase: SupabaseClient,
  eventIds: string[]
): Promise<RewardTierRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("reward_tiers")
    .select("id,event_id,title,required_stamp_count,reward_type,inventory_total,inventory_claimed")
    .in("event_id", eventIds)
    .eq("status", "ACTIVE")
    .order("required_stamp_count", {
      ascending: true,
    })
    .returns<RewardTierRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load active reward tiers for club claims: ${error.message}`);
  }

  return data;
};

const fetchValidStampsAsync = async (
  supabase: SupabaseClient,
  eventIds: string[]
): Promise<StampRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("stamps")
    .select("event_id,student_id")
    .in("event_id", eventIds)
    .eq("validation_status", "VALID")
    .returns<StampRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load valid stamps for club claims: ${error.message}`);
  }

  return data;
};

const fetchRewardClaimsAsync = async (
  supabase: SupabaseClient,
  eventIds: string[]
): Promise<RewardClaimRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("reward_claims")
    .select("id,event_id,reward_tier_id,student_id,status,claimed_at,notes")
    .in("event_id", eventIds)
    .order("claimed_at", {
      ascending: false,
    })
    .returns<RewardClaimRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load reward claim history: ${error.message}`);
  }

  return data;
};

const buildStampCounts = (rows: StampRow[]): Map<string, number> => {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const key = `${row.event_id}:${row.student_id}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return counts;
};

const buildExistingClaims = (rows: RewardClaimRow[]): Map<string, RewardClaimRow> =>
  new Map(rows.map((row) => [createCandidateKey(row.event_id, row.reward_tier_id, row.student_id), row] as const));

const buildRewardTierById = (rows: RewardTierRow[]): Map<string, RewardTierRow> =>
  new Map(rows.map((row) => [row.id, row] as const));

const buildRewardTiersByEvent = (rows: RewardTierRow[]): Map<string, RewardTierRow[]> => {
  const rowsByEvent = new Map<string, RewardTierRow[]>();

  rows.forEach((row) => {
    const currentRows = rowsByEvent.get(row.event_id) ?? [];
    rowsByEvent.set(row.event_id, [...currentRows, row]);
  });

  return rowsByEvent;
};

const buildRegistrationsByEvent = (rows: RegistrationRow[]): Map<string, RegistrationRow[]> => {
  const rowsByEvent = new Map<string, RegistrationRow[]>();

  rows.forEach((row) => {
    const currentRows = rowsByEvent.get(row.event_id) ?? [];
    rowsByEvent.set(row.event_id, [...currentRows, row]);
  });

  return rowsByEvent;
};

const compareEvents = (left: EventRow, right: EventRow): number => {
  if (left.status !== right.status) {
    return left.status === "ACTIVE" ? -1 : 1;
  }

  return new Date(right.start_at).getTime() - new Date(left.start_at).getTime();
};

const compareCandidates = (left: ClubClaimCandidateRecord, right: ClubClaimCandidateRecord): number => {
  if (left.eventId !== right.eventId) {
    return left.eventName.localeCompare(right.eventName);
  }

  if (left.requiredStampCount !== right.requiredStampCount) {
    return left.requiredStampCount - right.requiredStampCount;
  }

  if (left.stampCount !== right.stampCount) {
    return right.stampCount - left.stampCount;
  }

  return left.studentLabel.localeCompare(right.studentLabel);
};

const createClaimableCandidates = (
  events: EventRow[],
  rewardTiersByEvent: Map<string, RewardTierRow[]>,
  registrationsByEvent: Map<string, RegistrationRow[]>,
  stampCounts: Map<string, number>,
  existingClaims: Map<string, RewardClaimRow>
): ClubClaimCandidateRecord[] =>
  events
    .flatMap((event) => {
      const rewardTiers = rewardTiersByEvent.get(event.id) ?? [];
      const registrations = registrationsByEvent.get(event.id) ?? [];

      return registrations.flatMap((registration) => {
        const stampCount = stampCounts.get(`${event.id}:${registration.student_id}`) ?? 0;

        return rewardTiers.flatMap((rewardTier) => {
          const claimKey = createCandidateKey(event.id, rewardTier.id, registration.student_id);
          const existingClaim = existingClaims.get(claimKey) ?? null;
          const inventoryRemaining =
            rewardTier.inventory_total === null
              ? null
              : Math.max(rewardTier.inventory_total - rewardTier.inventory_claimed, 0);

          if (existingClaim !== null) {
            return [];
          }

          if (inventoryRemaining !== null && inventoryRemaining <= 0) {
            return [];
          }

          if (stampCount < rewardTier.required_stamp_count) {
            return [];
          }

          return [
            {
              eventId: event.id,
              eventName: event.name,
              inventoryRemaining,
              inventoryTotal: rewardTier.inventory_total,
              rewardTierId: rewardTier.id,
              rewardTitle: rewardTier.title,
              rewardType: rewardTier.reward_type,
              requiredStampCount: rewardTier.required_stamp_count,
              stampCount,
              studentId: registration.student_id,
              studentLabel: createMaskedStudentLabel(registration.student_id),
            },
          ];
        });
      });
    })
    .sort(compareCandidates);

const createRecentClaims = (
  claims: RewardClaimRow[],
  eventById: Map<string, EventRow>,
  rewardTierById: Map<string, RewardTierRow>
): ClubRecentRewardClaimRecord[] =>
  claims
    .map((claim) => {
      const event = eventById.get(claim.event_id);
      const rewardTier = rewardTierById.get(claim.reward_tier_id);

      return {
        claimedAt: claim.claimed_at,
        eventId: claim.event_id,
        eventName: event?.name ?? "Unknown event",
        notes: claim.notes,
        rewardClaimId: claim.id,
        rewardTierId: claim.reward_tier_id,
        rewardTitle: rewardTier?.title ?? `Reward ...${claim.reward_tier_id.slice(-4)}`,
        status: claim.status,
        studentId: claim.student_id,
        studentLabel: createMaskedStudentLabel(claim.student_id),
      };
    })
    .sort((left, right) => new Date(right.claimedAt).getTime() - new Date(left.claimedAt).getTime())
    .slice(0, visibleRecentClaimLimit);

export const fetchClubClaimsSnapshotAsync = async (
  supabase: SupabaseClient
): Promise<ClubClaimsSnapshot> => {
  const context = await fetchClubEventContextAsync(supabase);
  const clubIds = context.memberships.map((membership) => membership.clubId);
  const eventRows = (await fetchOperationalEventsAsync(supabase, clubIds)).sort(compareEvents);
  const eventIds = eventRows.map((event) => event.id);
  const [registrationRows, rewardTierRows, stampRows, rewardClaimRows] = await Promise.all([
    fetchRegisteredStudentsAsync(supabase, eventIds),
    fetchActiveRewardTiersAsync(supabase, eventIds),
    fetchValidStampsAsync(supabase, eventIds),
    fetchRewardClaimsAsync(supabase, eventIds),
  ]);
  const rewardTiersByEvent = buildRewardTiersByEvent(rewardTierRows);
  const registrationsByEvent = buildRegistrationsByEvent(registrationRows);
  const stampCounts = buildStampCounts(stampRows);
  const existingClaims = buildExistingClaims(rewardClaimRows);
  const candidates = createClaimableCandidates(
    eventRows,
    rewardTiersByEvent,
    registrationsByEvent,
    stampCounts,
    existingClaims
  );
  const eventById = new Map(eventRows.map((row) => [row.id, row] as const));
  const rewardTierById = buildRewardTierById(rewardTierRows);
  const recentClaims = createRecentClaims(rewardClaimRows, eventById, rewardTierById);
  const claimableCandidateCountByEvent = new Map<string, number>();
  const recentClaimCountByEvent = new Map<string, number>();

  candidates.forEach((candidate) => {
    claimableCandidateCountByEvent.set(
      candidate.eventId,
      (claimableCandidateCountByEvent.get(candidate.eventId) ?? 0) + 1
    );
  });

  rewardClaimRows.forEach((claim) => {
    recentClaimCountByEvent.set(
      claim.event_id,
      (recentClaimCountByEvent.get(claim.event_id) ?? 0) + 1
    );
  });

  return {
    candidates: candidates.slice(0, visibleCandidateLimit),
    events: eventRows.map((event) => ({
      activeRewardTierCount: (rewardTiersByEvent.get(event.id) ?? []).length,
      city: event.city,
      claimableCandidateCount: claimableCandidateCountByEvent.get(event.id) ?? 0,
      clubId: event.club_id,
      clubName:
        context.memberships.find((membership) => membership.clubId === event.club_id)?.clubName ?? "Unknown club",
      eventId: event.id,
      eventStatus: event.status,
      name: event.name,
      recentClaimCount: recentClaimCountByEvent.get(event.id) ?? 0,
      startAt: event.start_at,
    })),
    recentClaims,
    summary: {
      claimableCandidateCount: candidates.length,
      operationalEventCount: eventRows.length,
      recentClaimCount: rewardClaimRows.length,
      visibleCandidateCount: Math.min(candidates.length, visibleCandidateLimit),
      visibleClaimCount: recentClaims.length,
    },
  };
};
