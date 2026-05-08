import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import { clubDashboardQueryKey } from "@/features/club/club-dashboard";

const visibleRecentClaimLimit = 20;

export type ClubClaimEventRecord = {
  activeRewardTierCount: number;
  city: string;
  claimableCandidateCount: number;
  eventId: string;
  eventStatus: "ACTIVE" | "COMPLETED";
  name: string;
  recentClaimCount: number;
  startAt: string;
};

export type ClubClaimCandidateRecord = {
  eventId: string;
  eventName: string;
  inventoryRemaining: number | null;
  inventoryTotal: number | null;
  rewardTierId: string;
  rewardTitle: string;
  rewardType: "COUPON" | "ENTRY" | "HAALARIMERKKI" | "OTHER" | "PATCH" | "PRODUCT";
  requiredStampCount: number;
  stampCount: number;
  studentId: string;
  studentLabel: string;
};

export type ClubRecentRewardClaimRecord = {
  claimedAt: string;
  eventId: string;
  eventName: string;
  notes: string | null;
  rewardClaimId: string;
  rewardTierId: string;
  rewardTitle: string;
  status: "CLAIMED" | "REVOKED";
  studentId: string;
  studentLabel: string;
};

export type ClubClaimsSummary = {
  claimableCandidateCount: number;
  operationalEventCount: number;
  recentClaimCount: number;
  visibleCandidateCount: number;
  visibleClaimCount: number;
};

export type ClubClaimsSnapshot = {
  candidates: ClubClaimCandidateRecord[];
  events: ClubClaimEventRecord[];
  recentClaims: ClubRecentRewardClaimRecord[];
  summary: ClubClaimsSummary;
};

export type ClubRewardClaimConfirmVariables = {
  eventId: string;
  notes: string;
  rewardTierId: string;
  studentId: string;
  userId: string;
};

export type ClubRewardClaimMutationResponse = {
  message: string;
  rewardClaimId: string | null;
  status: string;
};

type ClubMembershipRow = {
  club_id: string;
};

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

type ClaimRewardFunctionResponse = {
  message?: unknown;
  rewardClaimId?: unknown;
  status?: unknown;
};

type UseClubClaimsQueryParams = {
  userId: string;
  isEnabled: boolean;
};

export const clubClaimsQueryKey = (userId: string) => ["club-claims", userId] as const;

const createCandidateKey = (eventId: string, rewardTierId: string, studentId: string): string =>
  `${eventId}:${rewardTierId}:${studentId}`;

const createMaskedStudentLabel = (studentId: string): string => `Student ...${studentId.slice(-8)}`;

const fetchClubMembershipsAsync = async (userId: string): Promise<ClubMembershipRow[]> => {
  const { data, error } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .returns<ClubMembershipRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load active club memberships for reward claims and user ${userId}: ${error.message}`);
  }

  return data;
};

const fetchOperationalEventsAsync = async (clubIds: string[]): Promise<EventRow[]> => {
  if (clubIds.length === 0) {
    return [];
  }

  const oldestRelevantEndAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();

  const { data, error } = await supabase
    .from("events")
    .select("id,club_id,name,city,start_at,end_at,status")
    .in("club_id", clubIds)
    .in("status", ["ACTIVE", "COMPLETED"])
    .gte("end_at", oldestRelevantEndAt)
    .order("start_at", {
      ascending: false,
    })
    .returns<EventRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load club reward claim events: ${error.message}`);
  }

  return data;
};

const fetchRegisteredStudentsAsync = async (eventIds: string[]): Promise<RegistrationRow[]> => {
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
    throw new Error(`Failed to load club reward claim registrations: ${error.message}`);
  }

  return data;
};

const fetchActiveRewardTiersAsync = async (eventIds: string[]): Promise<RewardTierRow[]> => {
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

const fetchValidStampsAsync = async (eventIds: string[]): Promise<StampRow[]> => {
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

const fetchRewardClaimsAsync = async (eventIds: string[]): Promise<RewardClaimRow[]> => {
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
  new Map(
    rows
      .filter((row) => row.status === "CLAIMED")
      .map((row) => [createCandidateKey(row.event_id, row.reward_tier_id, row.student_id), row] as const)
  );

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

const compareCandidates = (left: ClubClaimCandidateRecord, right: ClubClaimCandidateRecord): number => {
  if (left.eventName !== right.eventName) {
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

const normalizeClaimFunctionResponse = (value: ClaimRewardFunctionResponse | null): ClubRewardClaimMutationResponse => {
  if (value === null || typeof value.status !== "string") {
    throw new Error("Reward claim function returned an invalid response body.");
  }

  return {
    message: typeof value.message === "string" ? value.message : "Reward handoff request completed.",
    rewardClaimId: typeof value.rewardClaimId === "string" ? value.rewardClaimId : null,
    status: value.status,
  };
};

export const fetchClubClaimsSnapshotAsync = async (userId: string): Promise<ClubClaimsSnapshot> => {
  const memberships = await fetchClubMembershipsAsync(userId);
  const clubIds = memberships.map((membership) => membership.club_id);
  const events = await fetchOperationalEventsAsync(clubIds);
  const eventIds = events.map((event) => event.id);
  const [registrations, rewardTiers, stamps, rewardClaims] = await Promise.all([
    fetchRegisteredStudentsAsync(eventIds),
    fetchActiveRewardTiersAsync(eventIds),
    fetchValidStampsAsync(eventIds),
    fetchRewardClaimsAsync(eventIds),
  ]);
  const rewardTiersByEvent = buildRewardTiersByEvent(rewardTiers);
  const candidates = createClaimableCandidates(
    events,
    rewardTiersByEvent,
    buildRegistrationsByEvent(registrations),
    buildStampCounts(stamps),
    buildExistingClaims(rewardClaims)
  );
  const eventById = new Map(events.map((event) => [event.id, event] as const));
  const rewardTierById = buildRewardTierById(rewardTiers);
  const recentClaims = createRecentClaims(rewardClaims, eventById, rewardTierById);
  const claimableCandidateCountByEvent = new Map<string, number>();
  const recentClaimCountByEvent = new Map<string, number>();

  candidates.forEach((candidate) => {
    claimableCandidateCountByEvent.set(
      candidate.eventId,
      (claimableCandidateCountByEvent.get(candidate.eventId) ?? 0) + 1
    );
  });

  rewardClaims.forEach((claim) => {
    recentClaimCountByEvent.set(claim.event_id, (recentClaimCountByEvent.get(claim.event_id) ?? 0) + 1);
  });

  return {
    candidates,
    events: events.map((event) => ({
      activeRewardTierCount: (rewardTiersByEvent.get(event.id) ?? []).length,
      city: event.city,
      claimableCandidateCount: claimableCandidateCountByEvent.get(event.id) ?? 0,
      eventId: event.id,
      eventStatus: event.status,
      name: event.name,
      recentClaimCount: recentClaimCountByEvent.get(event.id) ?? 0,
      startAt: event.start_at,
    })),
    recentClaims,
    summary: {
      claimableCandidateCount: candidates.length,
      operationalEventCount: events.length,
      recentClaimCount: rewardClaims.length,
      visibleCandidateCount: candidates.length,
      visibleClaimCount: recentClaims.length,
    },
  };
};

export const confirmClubRewardClaimAsync = async ({
  eventId,
  notes,
  rewardTierId,
  studentId,
}: ClubRewardClaimConfirmVariables): Promise<ClubRewardClaimMutationResponse> => {
  const { data, error } = await supabase.functions.invoke("claim-reward", {
    body: {
      eventId,
      notes: notes.trim().length === 0 ? null : notes.trim(),
      rewardTierId,
      studentId,
    },
  });

  if (error !== null) {
    throw new Error(`Reward claim function failed for event ${eventId} and student ${studentId}: ${error.message}`);
  }

  return normalizeClaimFunctionResponse(data as ClaimRewardFunctionResponse | null);
};

export const useClubClaimsQuery = ({
  userId,
  isEnabled,
}: UseClubClaimsQueryParams): UseQueryResult<ClubClaimsSnapshot, Error> =>
  useQuery({
    queryKey: clubClaimsQueryKey(userId),
    queryFn: async () => fetchClubClaimsSnapshotAsync(userId),
    enabled: isEnabled,
  });

export const useConfirmClubRewardClaimMutation = (): UseMutationResult<
  ClubRewardClaimMutationResponse,
  Error,
  ClubRewardClaimConfirmVariables
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: confirmClubRewardClaimAsync,
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: clubClaimsQueryKey(variables.userId),
        }),
        queryClient.invalidateQueries({
          queryKey: clubDashboardQueryKey(variables.userId),
        }),
      ]);
    },
  });
};
