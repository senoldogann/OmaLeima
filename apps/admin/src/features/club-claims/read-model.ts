import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchClubEventContextAsync } from "@/features/club-events/context";
import type {
  ClubClaimCandidateRecord,
  ClubClaimEventRecord,
  ClubClaimProgressRecord,
  ClubClaimsSnapshot,
  ClubRecentRewardClaimRecord,
} from "@/features/club-claims/types";

const operationalEventLimit = 6;
const visibleCandidateLimit = 30;
const visibleProgressLimit = 30;
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

type StudentLabelRow = {
  display_name: string | null;
  event_id: string;
  student_id: string;
};

const createCandidateKey = (eventId: string, rewardTierId: string, studentId: string): string =>
  `${eventId}:${rewardTierId}:${studentId}`;

const createMaskedStudentLabel = (studentId: string): string => `Student ...${studentId.slice(-4)}`;

const createStudentLabelKey = (eventId: string, studentId: string): string => `${eventId}:${studentId}`;

const createStudentLabel = (
  labelsByStudentEvent: Map<string, string>,
  eventId: string,
  studentId: string
): string => labelsByStudentEvent.get(createStudentLabelKey(eventId, studentId)) ?? createMaskedStudentLabel(studentId);

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

const fetchStudentLabelsAsync = async (
  supabase: SupabaseClient,
  eventIds: string[]
): Promise<StudentLabelRow[]> => {
  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .rpc("get_club_claim_student_labels", {
      p_event_ids: eventIds,
    })
    .returns<StudentLabelRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load student labels for club claims: ${error.message}`);
  }

  return (data ?? []) as unknown as StudentLabelRow[];
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

const buildStudentLabelsByEvent = (rows: StudentLabelRow[]): Map<string, string> =>
  new Map(
    rows.flatMap((row) => {
      const label = row.display_name?.trim() ?? "";

      return label.length > 0 ? [[createStudentLabelKey(row.event_id, row.student_id), label] as const] : [];
    })
  );

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

const compareProgress = (left: ClubClaimProgressRecord, right: ClubClaimProgressRecord): number => {
  if (left.eventId !== right.eventId) {
    return left.eventName.localeCompare(right.eventName);
  }

  if (left.missingStampCount !== right.missingStampCount) {
    return left.missingStampCount - right.missingStampCount;
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
  existingClaims: Map<string, RewardClaimRow>,
  labelsByStudentEvent: Map<string, string>
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
              studentLabel: createStudentLabel(labelsByStudentEvent, event.id, registration.student_id),
            },
          ];
        });
      });
    })
    .sort(compareCandidates);

const createProgressRecords = (
  events: EventRow[],
  rewardTiersByEvent: Map<string, RewardTierRow[]>,
  registrationsByEvent: Map<string, RegistrationRow[]>,
  stampCounts: Map<string, number>,
  existingClaims: Map<string, RewardClaimRow>,
  labelsByStudentEvent: Map<string, string>
): ClubClaimProgressRecord[] =>
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

          if (stampCount >= rewardTier.required_stamp_count) {
            return [];
          }

          return [
            {
              eventId: event.id,
              eventName: event.name,
              inventoryRemaining,
              inventoryTotal: rewardTier.inventory_total,
              missingStampCount: rewardTier.required_stamp_count - stampCount,
              rewardTierId: rewardTier.id,
              rewardTitle: rewardTier.title,
              rewardType: rewardTier.reward_type,
              requiredStampCount: rewardTier.required_stamp_count,
              stampCount,
              studentId: registration.student_id,
              studentLabel: createStudentLabel(labelsByStudentEvent, event.id, registration.student_id),
            },
          ];
        });
      });
    })
    .sort(compareProgress);

const createRecentClaims = (
  claims: RewardClaimRow[],
  eventById: Map<string, EventRow>,
  rewardTierById: Map<string, RewardTierRow>,
  labelsByStudentEvent: Map<string, string>
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
        studentLabel: createStudentLabel(labelsByStudentEvent, claim.event_id, claim.student_id),
      };
    })
    .sort((left, right) => new Date(right.claimedAt).getTime() - new Date(left.claimedAt).getTime());

const takeVisibleRowsByEvent = <TRecord>(
  records: TRecord[],
  limitPerEvent: number,
  selectEventId: (record: TRecord) => string
): TRecord[] => {
  const visibleCountByEvent = new Map<string, number>();

  return records.filter((record) => {
    const eventId = selectEventId(record);
    const currentCount = visibleCountByEvent.get(eventId) ?? 0;

    if (currentCount >= limitPerEvent) {
      return false;
    }

    visibleCountByEvent.set(eventId, currentCount + 1);
    return true;
  });
};

export const fetchClubClaimsSnapshotAsync = async (
  supabase: SupabaseClient
): Promise<ClubClaimsSnapshot> => {
  const context = await fetchClubEventContextAsync(supabase);
  const clubIds = context.memberships.map((membership) => membership.clubId);
  const eventRows = (await fetchOperationalEventsAsync(supabase, clubIds)).sort(compareEvents);
  const eventIds = eventRows.map((event) => event.id);
  const [registrationRows, rewardTierRows, stampRows, rewardClaimRows, studentLabelRows] = await Promise.all([
    fetchRegisteredStudentsAsync(supabase, eventIds),
    fetchActiveRewardTiersAsync(supabase, eventIds),
    fetchValidStampsAsync(supabase, eventIds),
    fetchRewardClaimsAsync(supabase, eventIds),
    fetchStudentLabelsAsync(supabase, eventIds),
  ]);
  const rewardTiersByEvent = buildRewardTiersByEvent(rewardTierRows);
  const registrationsByEvent = buildRegistrationsByEvent(registrationRows);
  const stampCounts = buildStampCounts(stampRows);
  const existingClaims = buildExistingClaims(rewardClaimRows);
  const labelsByStudentEvent = buildStudentLabelsByEvent(studentLabelRows);
  const candidates = createClaimableCandidates(
    eventRows,
    rewardTiersByEvent,
    registrationsByEvent,
    stampCounts,
    existingClaims,
    labelsByStudentEvent
  );
  const progress = createProgressRecords(
    eventRows,
    rewardTiersByEvent,
    registrationsByEvent,
    stampCounts,
    existingClaims,
    labelsByStudentEvent
  );
  const eventById = new Map(eventRows.map((row) => [row.id, row] as const));
  const rewardTierById = buildRewardTierById(rewardTierRows);
  const recentClaims = createRecentClaims(rewardClaimRows, eventById, rewardTierById, labelsByStudentEvent);
  const visibleCandidates = takeVisibleRowsByEvent(
    candidates,
    visibleCandidateLimit,
    (candidate) => candidate.eventId
  );
  const visibleProgress = takeVisibleRowsByEvent(
    progress,
    visibleProgressLimit,
    (record) => record.eventId
  );
  const visibleRecentClaims = takeVisibleRowsByEvent(
    recentClaims,
    visibleRecentClaimLimit,
    (claim) => claim.eventId
  );
  const claimableCandidateCountByEvent = new Map<string, number>();
  const progressCandidateCountByEvent = new Map<string, number>();
  const recentClaimCountByEvent = new Map<string, number>();

  candidates.forEach((candidate) => {
    claimableCandidateCountByEvent.set(
      candidate.eventId,
      (claimableCandidateCountByEvent.get(candidate.eventId) ?? 0) + 1
    );
  });

  progress.forEach((record) => {
    progressCandidateCountByEvent.set(
      record.eventId,
      (progressCandidateCountByEvent.get(record.eventId) ?? 0) + 1
    );
  });

  rewardClaimRows.forEach((claim) => {
    recentClaimCountByEvent.set(
      claim.event_id,
      (recentClaimCountByEvent.get(claim.event_id) ?? 0) + 1
    );
  });

  return {
    candidates: visibleCandidates,
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
      progressCandidateCount: progressCandidateCountByEvent.get(event.id) ?? 0,
      recentClaimCount: recentClaimCountByEvent.get(event.id) ?? 0,
      startAt: event.start_at,
    })),
    progress: visibleProgress,
    recentClaims: visibleRecentClaims,
    summary: {
      claimableCandidateCount: candidates.length,
      operationalEventCount: eventRows.length,
      progressCandidateCount: progress.length,
      recentClaimCount: rewardClaimRows.length,
      visibleCandidateCount: visibleCandidates.length,
      visibleClaimCount: visibleRecentClaims.length,
      visibleProgressCount: visibleProgress.length,
    },
  };
};
